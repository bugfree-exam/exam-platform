FROM node:22-bookworm-slim AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates \
      openssl \
    && rm -rf /var/lib/apt/lists/*


# ------------------------------------------------------------
# Устанавливаем все зависимости
# ------------------------------------------------------------
FROM base AS deps

COPY package.json package-lock.json ./

RUN npm ci


# ------------------------------------------------------------
# Собираем Next.js
# ------------------------------------------------------------
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Эти значения нужны только для прохождения next build.
# Настоящие секреты попадут только в runtime-контейнер.
ENV APP_ENV=development
ENV APP_URL=http://localhost:3000
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV JWT_SECRET=build-only-secret-not-used-at-runtime-123456789012345678901234567890
ENV SESSION_COOKIE_NAME=exam_without_bugs_session
ENV SESSION_TTL_DAYS=14
ENV COOKIE_SECURE=false
ENV UPLOAD_DIR=./public/uploads

RUN npx prisma generate
RUN npm run build


# ------------------------------------------------------------
# Отдельный образ для запуска Prisma migrations
# ------------------------------------------------------------
FROM base AS migrator

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Временный адрес нужен только на этапе генерации Prisma Client.
# Подключение к реальной базе здесь не выполняется.
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build

RUN npx prisma generate

CMD ["npx", "prisma", "migrate", "deploy"]


# ------------------------------------------------------------
# Минимальный runtime-образ приложения
# ------------------------------------------------------------
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

RUN mkdir -p /app/public/uploads \
    && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "server.js"]