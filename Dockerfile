
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./

RUN npm install


COPY . .

RUN DATABASE_URL="mongodb://dummy" npx prisma generate
RUN npm run build


FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN addgroup -g 1001 nodejs \
  && adduser -S -u 1001 -G nodejs nextjs
USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
