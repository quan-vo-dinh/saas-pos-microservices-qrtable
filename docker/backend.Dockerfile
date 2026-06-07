# syntax=docker/dockerfile:1.7

FROM node:22.22.3-alpine3.23 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.8.0 --activate
WORKDIR /workspace

# Stage 1: Fetch dependencies based only on lockfile
FROM base AS fetcher
COPY pnpm-lock.yaml ./
RUN pnpm fetch

# Stage 2: Install dependencies offline
FROM fetcher AS deps
COPY package.json pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY apps ./apps
COPY libs ./libs
RUN pnpm install --offline --frozen-lockfile

# Stage 3: Build specific service
FROM deps AS build
ARG APP_NAME
RUN test -n "$APP_NAME"
RUN pnpm nx build "$APP_NAME" --configuration=production
RUN pnpm --dir "dist/apps/$APP_NAME" install --prod --frozen-lockfile

# Stage 4: Production Runtime
FROM node:22.22.3-alpine3.23 AS runtime
ARG APP_NAME
ENV NODE_ENV=production
ENV APP_NAME=$APP_NAME
WORKDIR /app
RUN addgroup -g 1001 -S qrtable && adduser -S qrtable -u 1001 -G qrtable
COPY --from=build --chown=qrtable:qrtable /workspace/dist/apps/${APP_NAME} ./
USER qrtable
EXPOSE 3300 3301 3303 3304 3305 3306 3307 3308 3201 3203 3204 3205 3206 3207 3208
CMD ["node", "main.js"]
