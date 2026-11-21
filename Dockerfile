# ==============================================================================
# Unified Production Dockerfile (Multi-stage: React SPA + Express API + Prisma)
# ==============================================================================
# Stage 1: Build Frontend (React + TypeScript + Vite)
FROM node:22-alpine AS client-builder
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm ci
COPY client ./client/
ENV VITE_API_URL=""
RUN npm --workspace=client run build

# Stage 2: Build Backend (Express + TypeScript + Prisma)
FROM node:22-alpine AS server-builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm ci
COPY server ./server/
RUN npx prisma generate --schema=server/prisma/schema.prisma && npm --workspace=server run build

# Stage 3: Unified Production Runtime (Serves API + Built React SPA)
FROM node:22-alpine AS production
WORKDIR /app/server
RUN apk add --no-cache openssl

COPY --from=server-builder /app/package*.json /app/
COPY --from=server-builder /app/node_modules /app/node_modules
COPY --from=server-builder /app/server/package*.json ./
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/src ./src
COPY --from=server-builder /app/server/prisma ./prisma
COPY --from=server-builder /app/server/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=client-builder /app/client/dist /app/client/dist

RUN chmod +x ./docker-entrypoint.sh && chown -R node:node /app

ENV NODE_ENV=production
ENV TZ=Asia/Bangkok
ENV PORT=3000
EXPOSE 3000

USER node

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
