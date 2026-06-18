FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN corepack enable && pnpm install --filter @citymind/web... --frozen-lockfile=false

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["pnpm", "dev", "--hostname", "0.0.0.0"]

