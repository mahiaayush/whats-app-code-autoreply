# Multi-stage Dockerfile for Property WhatsApp AI Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate

# Copy monorepo configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./

# Copy packages required by backend
COPY packages/shared-types ./packages/shared-types
COPY packages/validation ./packages/validation
COPY packages/prompts ./packages/prompts
COPY packages/config ./packages/config

# Copy backend application
COPY apps/backend ./apps/backend

# Install dependencies and build all dependencies and backend
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @property-ai/backend... build

# ==============================================================================
# Runner Stage
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Install curl for container health check
RUN apk add --no-cache curl

# Copy monorepo artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/backend ./apps/backend

USER node

EXPOSE 3000

HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

CMD ["node", "apps/backend/dist/index.js"]
