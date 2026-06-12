# syntax=docker/dockerfile:1.7

FROM node:22.22.3-alpine3.23 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache bash curl jq && corepack enable && corepack prepare pnpm@9.8.0 --activate
WORKDIR /workspace

FROM base AS fetcher
COPY pnpm-lock.yaml ./
RUN pnpm fetch

FROM fetcher AS tooling
COPY package.json pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY apps ./apps
COPY libs ./libs
COPY tools ./tools
RUN pnpm install --offline --frozen-lockfile
CMD ["pnpm", "deploy:bootstrap:production"]
