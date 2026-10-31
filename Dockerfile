# --- Stage 1: build the bundle ---
FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Stage 2: serve it, proxying the API to the backend ---
# Unprivileged variant: runs as a non-root user and listens on 8080.
FROM nginxinc/nginx-unprivileged:1.27-alpine

# Where the FastAPI backend is reachable from this container. The default is the
# `web` service of the backend repo's docker/docker-compose.yml.
ENV BACKEND_URL=http://web:7860

# The image's entrypoint runs envsubst over /etc/nginx/templates/**/*.template
# into /etc/nginx/conf.d/, keeping subdirectories. The proxy snippet lands in
# conf.d/snippets/, which nginx.conf's conf.d/*.conf glob does not load directly.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/backend-proxy.conf /etc/nginx/templates/snippets/backend-proxy.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
