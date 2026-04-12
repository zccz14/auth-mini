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
COPY scripts ./scripts
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM ${NODE_IMAGE} AS runtime

# https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#handling-kernel-signals
ARG TINI_VERSION=v0.19.0
ARG TARGETARCH
ARG TINI_SHA256_AMD64=c5b0666b4cb676901f90dfcb37106783c5fe2077b04590973b885950611b30ee
ARG TINI_SHA256_ARM64=eae1d3aa50c48fb23b8cbdf4e369d0910dfc538566bfd09df89a774aa84a48b9
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini-static-${TARGETARCH} /tini
RUN case "${TARGETARCH}" in \
		amd64) tini_sha256="${TINI_SHA256_AMD64}" ;; \
		arm64) tini_sha256="${TINI_SHA256_ARM64}" ;; \
		*) echo "unsupported TARGETARCH: ${TARGETARCH}" >&2; exit 1 ;; \
	esac \
	&& printf '%s  %s\n' "${tini_sha256}" /tini | sha256sum -c - \
	&& chmod a+x /tini
ENTRYPOINT ["/tini", "--"]

WORKDIR /app

COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY sql ./sql

RUN chmod 0755 /app/dist/index.js \
	&& chmod 0644 /app/package.json /app/package-lock.json \
	&& chmod 0755 /app/sql \
	&& chmod 0644 /app/sql/schema.sql \
    && ln -sf /app/dist/index.js /usr/local/bin/auth-mini \
    && mkdir -p /data \
    && chown -R node:node /data

USER node

VOLUME ["/data"]
CMD ["auth-mini", "start", "/data/auth.sqlite", "--port", "7777"]
