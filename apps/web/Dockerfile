FROM node:24-bookworm-slim AS build

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
WORKDIR /workspace
COPY . .
RUN npm ci
RUN npm exec nx -- build web

FROM nginxinc/nginx-unprivileged:alpine AS runtime

ARG APP_REVISION
ENV APP_REVISION=${APP_REVISION}
ENV NGINX_ENVSUBST_FILTER=APP_REVISION
COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /workspace/dist/apps/web /usr/share/nginx/html

EXPOSE 8080
