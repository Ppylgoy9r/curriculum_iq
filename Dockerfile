# Use Node.js 20 slim as base image
FROM node:20-slim AS builder

# Install system dependencies for Prisma and building
RUN apt-get update && apt-get install -y \
    openssl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the frontend
RUN npm run build

# --- Runtime Stage ---
FROM node:20-slim AS runner

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy backend source and node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/tsconfig.server.json ./tsconfig.server.json

# Environment variables with defaults
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/curriculum_iq?schema=public"
ENV OLLAMA_URL="http://host.docker.internal:11434"
ENV OLLAMA_MODEL="qwen2.5:3b"

# Expose backend port
EXPOSE 3001

# Start script to handle migrations and server
RUN printf "#!/bin/sh\nnpx prisma db push\nnpm run server\n" > start.sh && chmod +x start.sh

CMD ["./start.sh"]
