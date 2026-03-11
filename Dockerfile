FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY shared/ ./shared/
COPY server/ ./server/
COPY drizzle.config.ts ./
COPY app.json ./

RUN npx drizzle-kit generate

RUN npx esbuild server/index.ts server/migrate.ts \
    --platform=node \
    --packages=external \
    --bundle \
    --format=esm \
    --outdir=server_dist

FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/server_dist/     ./server_dist/
COPY --from=builder /app/server/templates/ ./server/templates/
COPY --from=builder /app/app.json          ./app.json
COPY --from=builder /app/migrations/       ./migrations/

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 5000
CMD ["./docker-entrypoint.sh"]
