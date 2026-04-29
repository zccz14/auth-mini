ARG NODE_IMAGE=node:24.14.1-trixie-slim

FROM ${NODE_IMAGE} AS runtime

# https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md#handling-kernel-signals
RUN apt-get update \
	&& apt-get install -y --no-install-recommends tini \
	&& rm -rf /var/lib/apt/lists/* \
	&& ln -sf /usr/bin/tini /tini
ENTRYPOINT ["/tini", "--"]

WORKDIR /app

COPY package.json package-lock.json ./
COPY node_modules ./node_modules
COPY dist ./dist
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
