#!/bin/sh
set -e

# Carrega o .env se existir (variáveis de runtime injetadas pelo docker compose)
if [ -f /app/.env ]; then
  export $(grep -v '^#' /app/.env | xargs)
fi

# Roda migrations com DATABASE_URL disponível
echo "🔄 Rodando migrations..."
npx prisma migrate deploy

echo "🚀 Iniciando servidor..."
exec node dist/bomberman/server/server.mjs
