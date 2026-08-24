module.exports = {
  apps: [
    {
      name: 'bomberman',
      script: './dist/bomberman/server/server.mjs',
      cwd: '/var/www/bomberman',
      // Carrega o .env explicitamente (PM2 >= 5.x suporta env_file)
      env_file: '/var/www/bomberman/.env',
      env: {
        NODE_ENV: 'production',
        PORT: '4000',
      },
    },
  ],
};
