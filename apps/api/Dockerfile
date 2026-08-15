FROM node:24-bookworm-slim AS build

WORKDIR /workspace
COPY . .
RUN npm ci
RUN npm exec nx -- build api

FROM node:24-bookworm-slim AS runtime

ARG APP_REVISION
ENV APP_REVISION=${APP_REVISION}
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /workspace/dist/apps/api/main.js ./main.js

USER node
EXPOSE 3000
CMD ["node", "main.js"]
