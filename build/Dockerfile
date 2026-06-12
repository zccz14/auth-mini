FROM rust:1.91-bookworm AS builder

WORKDIR /src
COPY openapi.yaml ./openapi.yaml
COPY sql ./sql
COPY rust-backend ./rust-backend

RUN cargo build --manifest-path rust-backend/Cargo.toml --release

FROM debian:bookworm-slim AS runtime

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates \
	&& rm -rf /var/lib/apt/lists/* \
	&& useradd --system --uid 10001 --home-dir /var/lib/auth-mini --create-home --shell /usr/sbin/nologin auth-mini \
	&& mkdir -p /var/lib/auth-mini \
	&& chown -R auth-mini:auth-mini /var/lib/auth-mini

COPY --from=builder /src/rust-backend/target/release/auth-mini /usr/local/bin/auth-mini

USER 10001
WORKDIR /var/lib/auth-mini
VOLUME ["/var/lib/auth-mini"]
EXPOSE 7777

ENTRYPOINT ["auth-mini"]
CMD ["start", "/var/lib/auth-mini/auth-mini.sqlite", "--host", "0.0.0.0", "--port", "7777", "--issuer", "http://localhost:7777"]
