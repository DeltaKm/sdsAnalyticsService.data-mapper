#!/bin/zsh

########################################
# CONFIGURAZIONE BASE
########################################
PROJECT_ID="sdsanalyticsservice"
REGION="europe-west1"
REPO="data-mapper-repo"
SERVICE="data-mapper"
VERSION_FILE="./.version"
LOGFILE="./deploy.log"

########################################
# VARIABILI DA .env
########################################
if [ ! -f .env ]; then
  echo "ERRORE: file .env mancante" | tee $LOGFILE
  exit 1
fi

TELEGRAM_CHAT_ID=$(grep "^TELEGRAM_CHAT_ID=" .env | cut -d '=' -f2-)
TELEGRAM_BOT_TOKEN=$(grep "^TELEGRAM_BOT_TOKEN=" .env | cut -d '=' -f2-)

if [ -z "$TELEGRAM_CHAT_ID" ] || [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "ERRORE: variabili Telegram mancanti nel file .env" | tee $LOGFILE
  exit 1
fi

format_duration() {
  local total=$1
  local mins=$(( total / 60 ))
  local secs=$(( total % 60 ))

  if [ $mins -gt 0 ]; then
    printf "%dm%02ds" $mins $secs
  else
    printf "%ds" $secs
  fi
}

########################################
# LOG HEADER
########################################
echo "==== DEPLOY DATA-MAPPER INIZIATO ==== " | tee $LOGFILE
echo "Data: $(date)" | tee -a $LOGFILE

START_TIME=$(date +%s)

########################################
# VERSIONAMENTO SEMVER
########################################
if [ ! -f "$VERSION_FILE" ]; then
  echo "1.0.0" > $VERSION_FILE
fi

VERSION=$(cat $VERSION_FILE)
IFS='.' read MAJOR MINOR PATCH <<< "$VERSION"

COMMITS=$(git log -n 20 --pretty=format:"%s")
LATEST_COMMIT=$(git log -1 --pretty=format:"%s")

if [ -z "$LATEST_COMMIT" ]; then
  LATEST_COMMIT="commit sconosciuto"
fi

if echo "$COMMITS" | grep -qi "BREAKING:" ; then
  MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0
elif echo "$COMMITS" | grep -qi "feat:" ; then
  MINOR=$((MINOR + 1)); PATCH=0
else
  PATCH=$((PATCH + 1))
fi

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo $NEW_VERSION > $VERSION_FILE
TAG="v$NEW_VERSION"

echo "Nuova versione: $TAG" | tee -a $LOGFILE

IMAGE="europe-west1-docker.pkg.dev/$PROJECT_ID/$REPO/$SERVICE:$TAG"

########################################
# DOCKER BUILD
########################################
echo "Build Docker..." | tee -a $LOGFILE

docker build --platform linux/amd64 \
  -t $IMAGE . 2>&1 | tee -a $LOGFILE

BUILD_EXIT=${pipestatus[1]:-0}

if [ $BUILD_EXIT -ne 0 ]; then
  MSG="ERRORE: build Docker fallita per $SERVICE ($TAG)"
  echo $MSG | tee -a $LOGFILE
  curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d chat_id="$TELEGRAM_CHAT_ID" -d text="$MSG"
  exit 1
fi

########################################
# PUSH SU ARTIFACT REGISTRY
########################################
echo "Push immagine..." | tee -a $LOGFILE

docker push $IMAGE 2>&1 \
  | grep -v "Waiting" \
  | grep -v "Preparing" \
  | grep -v "Layer" \
  | tee -a $LOGFILE

PUSH_EXIT=${pipestatus[1]:-0}

if [ $PUSH_EXIT -ne 0 ]; then
  MSG="ERRORE: push fallito per $SERVICE ($TAG)"
  echo $MSG | tee -a $LOGFILE
  curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d chat_id="$TELEGRAM_CHAT_ID" -d text="$MSG"
  exit 1
fi

########################################
# RECUPERO REVISIONE CORRENTE
########################################
OLD_REVISION=$(gcloud run services describe $SERVICE \
  --region $REGION --format='value(status.latestReadyRevisionName)' 2>/dev/null)

echo "Old revision: $OLD_REVISION" | tee -a $LOGFILE

########################################
# DEPLOY CLOUD RUN
########################################
echo "Deploy Cloud Run..." | tee -a $LOGFILE

gcloud run deploy $SERVICE \
  --image $IMAGE \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 2>&1 | tee -a $LOGFILE

DEPLOY_EXIT=${pipestatus[1]:-0}

if [ $DEPLOY_EXIT -ne 0 ]; then
  MSG="ERRORE: deploy fallito per $SERVICE ($TAG)"
  echo $MSG | tee -a $LOGFILE

  curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d chat_id="$TELEGRAM_CHAT_ID" -d text="$MSG"

  if [ -n "$OLD_REVISION" ]; then
    gcloud run services update-traffic $SERVICE \
      --to-revisions="$OLD_REVISION"=100 --region $REGION
  fi

  exit 1
fi

URL=$(gcloud run services describe $SERVICE --region $REGION --format='value(status.url)')

########################################
# HEALTH CHECK
########################################
echo "Health check..." | tee -a $LOGFILE
sleep 3
curl -f "$URL/api/health" 2>&1 | tee -a $LOGFILE

HC_EXIT=${pipestatus[1]:-0}

if [ $HC_EXIT -ne 0 ]; then
  MSG="ERRORE: health check fallito per $SERVICE ($TAG). Rollback eseguito"
  echo $MSG | tee -a $LOGFILE

  curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d chat_id="$TELEGRAM_CHAT_ID" -d text="$MSG"

  if [ -n "$OLD_REVISION" ]; then
    gcloud run services update-traffic $SERVICE \
      --to-revisions="$OLD_REVISION"=100 --region $REGION
  fi

  exit 1
fi

########################################
# SUCCESSO
########################################
END_TIME=$(date +%s)
ELAPSED=$(( END_TIME - START_TIME ))
DURATION=$(format_duration $ELAPSED)

MSG="cluster-$SERVICE deploy completato - $LATEST_COMMIT (durata: $DURATION)"
echo $MSG | tee -a $LOGFILE

curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
  -d chat_id="$TELEGRAM_CHAT_ID" -d text="$MSG"

curl -s -F document=@$LOGFILE \
  "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendDocument" \
  -F chat_id="$TELEGRAM_CHAT_ID" \
  -F caption="Log deploy $SERVICE"

echo "Fine deploy $SERVICE $TAG" | tee -a $LOGFILE
