# ================================================================
# Veyonix Backend — Dockerfile
# Multi-stage build: builder → production
# Node.js 22 LTS Alpine
# ================================================================

# ── Stage 1: Base ─────────────────────────────────────────────
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── Stage 2: Dependencies ─────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-config/package.json ./packages/shared-config/
COPY packages/tsconfig/package.json ./packages/tsconfig/

RUN pnpm install --frozen-lockfile --filter=@veyonix/backend...

# ── Stage 3: Builder ──────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY . .

# Generate Prisma client
RUN pnpm --filter=@veyonix/backend prisma generate

# Build shared packages first
RUN pnpm --filter=@veyonix/shared-types build
RUN pnpm --filter=@veyonix/shared-config build

# Build backend
RUN pnpm --filter=@veyonix/backend build

# ── Stage 4: Production ───────────────────────────────────────
FROM node:22-alpine AS production
RUN apk add --no-cache libc6-compat openssl dumb-init

# Create non-root user for security
RUN addgroup --system --gid 1001 veyonix && \
    adduser --system --uid 1001 --ingroup veyonix veyonix

WORKDIR /app

# Copy only what's needed
COPY --from=builder --chown=veyonix:veyonix /app/apps/backend/dist ./dist
COPY --from=builder --chown=veyonix:veyonix /app/apps/backend/prisma ./prisma
COPY --from=builder --chown=veyonix:veyonix /app/apps/backend/package.json ./package.json
COPY --from=builder --chown=veyonix:veyonix /app/node_modules ./node_modules
COPY --from=builder --chown=veyonix:veyonix /app/apps/backend/node_modules ./apps/backend/node_modules

USER veyonix

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health/live', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run migrations then start
CMD ["sh", "-c", "node -e \"require('@prisma/client')\" && node dist/server.js"]
