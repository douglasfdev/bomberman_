#!/bin/sh
set -e

# As variáveis já chegam como env vars via --env-file do docker compose.
# Não precisa carregar .env manualmente — apenas valida que DATABASE_URL existe.
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL não está definida. Verifique o .env no host e o env_file do compose."
  exit 1
fi

echo "🚀 Iniciando servidor..."
exec node dist/bomberman/server/server.mjs
