# ================================================
# FASE 1 — BUILDER (compila Next.js)
# ================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Dipendenze di sistema minime (libc6-compat evita errori di next/headless-gl)
RUN apk add --no-cache libc6-compat

# Copio manifest per caching npm
COPY package*.json ./

# Installo tutte le dipendenze (dev incluse per build)
RUN npm install

# Copio il resto del progetto
COPY . .

# Build in modalità standalone
RUN npm run build


# ================================================
# FASE 2 — RUNNER (runtime leggero)
# ================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Installo solo le dipendenze runtime
COPY package*.json ./
RUN npm install --omit=dev

# Copio l'output standalone e gli asset statici
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Utente non-root (best practice Cloud Run)
RUN addgroup -g 1001 nodejs \
  && adduser -S -u 1001 -G nodejs nextjs
USER nextjs

EXPOSE 8080

# Next standalone espone server.js
CMD ["node", "server.js"]
