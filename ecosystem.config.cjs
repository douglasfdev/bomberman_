// As variáveis de ambiente são gravadas no .env pelo workflow de CI/CD.
// O dotenv é carregado dentro do server.ts (import 'dotenv/config'),
// portanto o PM2 só precisa garantir NODE_ENV e PORT.
module.exports = {
  apps: [
    {
      name: 'bomberman',
      script: './dist/bomberman/server/server.mjs',
      cwd: '/var/www/bomberman',
      env: {
        NODE_ENV: 'production',
        PORT: '4000',
      },
    },
  ],
};
