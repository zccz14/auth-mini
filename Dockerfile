ARG NODE_IMAGE=node:24.14.1-trixie-slim

FROM ${NODE_IMAGE} AS builder

# Image contract for v1 (linux/amd64 only):
# - final image contains node, dist/index.js, dist/sdk/singleton-iife.js,
#   and tini as init process
# - final image does not depend on checked-out repo source files at runtime,
#   but it does include runtime SQL assets required by auth-mini init
# - runtime image exposes /data and provides auth-mini on PATH
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM ${NODE_IMAGE} AS runtime

# https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#handling-kernel-signals
ARG TINI_VERSION=v0.19.0
ARG TARGETARCH
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini-static-${TARGETARCH} /tini
RUN chmod a+x /tini
ENTRYPOINT ["/tini", "--"]

WORKDIR /app

COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY sql ./sql

RUN chmod 0755 /app/dist/index.js \
    && ln -sf /app/dist/index.js /usr/local/bin/auth-mini \
    && mkdir -p /data \
    && chown -R node:node /data

USER node

VOLUME ["/data"]
CMD ["auth-mini", "start", "/data/auth.sqlite", "--host", "127.0.0.1", "--port", "7777"]
