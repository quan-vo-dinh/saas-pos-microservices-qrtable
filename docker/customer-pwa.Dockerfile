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

# Stage 3: Build customer-pwa with build-time env vars
FROM deps AS build
ARG VITE_BFF_URL
ARG VITE_TENANT_ID
ENV VITE_BFF_URL=$VITE_BFF_URL
ENV VITE_TENANT_ID=$VITE_TENANT_ID

RUN pnpm nx build customer-pwa

# Stage 4: Web Server
FROM nginx:1.30.1-alpine3.23 AS runtime
COPY --from=build /workspace/apps/customer-pwa/dist /usr/share/nginx/html
COPY docker/nginx/customer-pwa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
