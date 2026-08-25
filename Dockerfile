# ─────────────────────────────────────────────
# Stage 1: deps — instala todas as dependências
# ─────────────────────────────────────────────
FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma/ ./prisma/

RUN npm pkg delete scripts.postinstall && \
    npm ci --no-audit --no-fund

# ─────────────────────────────────────────────
# Stage 2: builder — compila o Angular SSR
# ─────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

# Build-args necessários para o Angular SSR não quebrar no prerender
ARG DATABASE_URL
ARG DIRECT_URL
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG APP_BASE_URL
ARG SESSION_SECRET

# Expõe como variáveis de ambiente apenas durante o build
ENV DATABASE_URL=$DATABASE_URL \
    DIRECT_URL=$DIRECT_URL \
    GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID \
    GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET \
    APP_BASE_URL=$APP_BASE_URL \
    SESSION_SECRET=$SESSION_SECRET \
    NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

# Gera Prisma Client e faz o build
RUN npx prisma generate && npm run build

# Remove devDependencies — só runtime fica
RUN npm prune --omit=dev --no-audit --no-fund

# ─────────────────────────────────────────────
# Stage 3: runner — imagem final mínima
# ─────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

# Prisma precisa de openssl no Alpine
RUN apk add --no-cache openssl

# Usuário não-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copia apenas o necessário para runtime
COPY --from=builder --chown=appuser:appgroup /app/dist            ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules    ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json    ./package.json
COPY --from=builder --chown=appuser:appgroup /app/prisma          ./prisma
COPY --from=builder --chown=appuser:appgroup /app/src/generated   ./src/generated
# prisma.config.ts é necessário para o prisma migrate deploy encontrar a URL
COPY --from=builder --chown=appuser:appgroup /app/prisma.config.ts ./prisma.config.ts

# Entrypoint que carrega o .env antes de rodar migrations e o servidor
COPY --chown=appuser:appgroup entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER appuser

EXPOSE 4000

ENV NODE_ENV=production \
    PORT=4000

CMD ["sh", "./entrypoint.sh"]
