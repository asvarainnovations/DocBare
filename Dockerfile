# Install dependencies only when needed
FROM node:20-slim AS deps
WORKDIR /app
# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
COPY prisma ./prisma
ENV NODE_ENV=development
RUN npm ci

# Rebuild the source code only when needed
FROM node:20-slim AS builder
WORKDIR /app
# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY .env.production .env
ENV NODE_ENV=production
# Generate Prisma client (for debian-openssl-3.0.x)
RUN npx prisma generate
# Build Next.js app
RUN npm run build

# Production image, copy all files and run next
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install OpenSSL for Prisma runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Add a non-root user to run the app
RUN addgroup --gid 1001 nodejs && adduser --uid 1001 --gid 1001 --disabled-password nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.env .env

# Create cache directories and set proper permissions
RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next

USER nextjs

# Cloud Run expects the app to listen on $PORT
ENV PORT=8080
EXPOSE 8080

CMD ["npx", "next", "start"]
