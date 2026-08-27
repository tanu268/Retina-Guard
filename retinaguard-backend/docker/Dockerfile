# ─── RetinaGuard backend — production image ─────────────────────────────────
# Multi-stage build: compile better-sqlite3's native addon in a build stage
# with full toolchain, then ship a slim runtime image without it.

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN groupadd -r retinaguard && useradd -r -g retinaguard retinaguard \
    && mkdir -p /app/data /app/uploads \
    && chown -R retinaguard:retinaguard /app

COPY --from=build --chown=retinaguard:retinaguard /app/node_modules ./node_modules
COPY --chown=retinaguard:retinaguard . .

USER retinaguard
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "src/server.js"]
