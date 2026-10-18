FROM node:20-alpine AS deps

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --frozen-lockfile --filter @citymind/web...


FROM deps AS builder

# NEXT_PUBLIC_* values are inlined into the browser bundle at build time, so the
# public API URL must be supplied here, not at container start.
ARG NEXT_PUBLIC_API_URL=http://127.0.0.1:8100
ARG NEXT_PUBLIC_DATA_CONTROLLER_NAME=""
ARG NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL=""
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_DATA_CONTROLLER_NAME="${NEXT_PUBLIC_DATA_CONTROLLER_NAME}" \
    NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL=${NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL} \
    NEXT_OUTPUT=standalone \
    NODE_ENV=production

COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
RUN pnpm --filter @citymind/web build


FROM node:20-alpine AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 10001 nodejs \
    && adduser --system --uid 10001 --ingroup nodejs nextjs

WORKDIR /app

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
# Standalone output does not include public/; without this the logo and every other
# static asset return 404 in production.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
RUN mkdir -p /app/apps/web/.next/cache && chown -R nextjs:nodejs /app/apps/web/.next/cache

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/login').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "apps/web/server.js"]
