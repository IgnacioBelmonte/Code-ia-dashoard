# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
# Avoid npm self-update during image build (network flake risk). Retry install a few times.
RUN set -eux; \
  if [ -f package-lock.json ]; then \
    for i in 1 2 3; do npm ci && break || (echo "npm ci failed (attempt $i), retrying..."; sleep 5); done; \
  else \
    for i in 1 2 3; do npm i && break || (echo "npm i failed (attempt $i), retrying..."; sleep 5); done; \
  fi

FROM node:22-bookworm-slim AS builder
WORKDIR /app

ARG APP_GIT_SHA=unknown
ENV APP_GIT_SHA=$APP_GIT_SHA

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["/bin/sh", "-c", "npm run start -- -H 0.0.0.0 -p 3000"]
