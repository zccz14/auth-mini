FROM node:20-slim AS builder

# Image contract for v1 (linux/amd64 only):
# - final image contains node, dist/index.js, dist/sdk/singleton-iife.js,
#   cloudflared, and /app/docker/entrypoint.sh
# - final image does not depend on checked-out repo source files at runtime
# - runtime image exposes /data and provides auth-mini on PATH
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-slim AS runtime

ARG CLOUDFLARED_VERSION=2026.3.0
ARG CLOUDFLARED_SHA256=4a9e50e6d6d798e90fcd01933151a90bf7edd99a0a55c28ad18f2e16263a5c30

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL -o /usr/local/bin/cloudflared "https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/cloudflared-linux-amd64" \
    && printf '%s  %s\n' "$CLOUDFLARED_SHA256" /usr/local/bin/cloudflared | sha256sum -c - \
    && chmod 0755 /usr/local/bin/cloudflared \
    && cloudflared --version | grep -F "$CLOUDFLARED_VERSION"

COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY docker/entrypoint.sh ./docker/entrypoint.sh

RUN chmod 0755 /app/docker/entrypoint.sh /app/dist/index.js \
    && ln -sf /app/dist/index.js /usr/local/bin/auth-mini \
    && mkdir -p /data

VOLUME ["/data"]

ENTRYPOINT ["/app/docker/entrypoint.sh"]
