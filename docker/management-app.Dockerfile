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

# Stage 3: Build management-app with build-time env vars
FROM deps AS build
ARG NEXT_PUBLIC_BFF_URL
ARG NEXT_PUBLIC_BFF_BASE_URL
ARG NEXT_PUBLIC_CUSTOMER_PWA_URL
ENV NEXT_PUBLIC_BFF_URL=$NEXT_PUBLIC_BFF_URL
ENV NEXT_PUBLIC_BFF_BASE_URL=$NEXT_PUBLIC_BFF_BASE_URL
ENV NEXT_PUBLIC_CUSTOMER_PWA_URL=$NEXT_PUBLIC_CUSTOMER_PWA_URL

RUN pnpm nx build management-app

# Stage 4: Production Runtime
FROM node:22.22.3-alpine3.23 AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -g 1001 -S qrtable && adduser -S qrtable -u 1001 -G qrtable

# Copy Next.js standalone folder and assets
COPY --from=build --chown=qrtable:qrtable /workspace/apps/management-app/.next/standalone ./
COPY --from=build --chown=qrtable:qrtable /workspace/apps/management-app/.next/static ./apps/management-app/.next/static
COPY --from=build --chown=qrtable:qrtable /workspace/apps/management-app/public ./apps/management-app/public

USER qrtable
EXPOSE 3000
CMD ["node", "apps/management-app/server.js"]
