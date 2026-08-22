import 'zone.js/node';
import { APP_BASE_HREF } from '@angular/common';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node'
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { Server } from 'socket.io';
import { createServer } from 'node:http';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import 'dotenv/config';
import { prismaClient } from './services/prisma';
import { PrismaPg } from "@prisma/adapter-pg";
import paymentRoutes from './routes/paymentRoutes';
import webhookRoutes from './routes/webhookRoutes';
import skinRoutes from './routes/skinRoutes';
import achievementRoutes from './routes/achievementRoutes';

const serverDir = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDir, '../browser');

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });

// Inicializa o motor SSR moderno do Angular
// Nota: Ajustado para evitar erro de sintaxe do código original
const angularApp = new AngularNodeAppEngine();

// Declarado no topo para que as rotas da API consiga enxergar o Socket.io
export let io: Server;

export function app(): express.Express {
  const server = express();

  if (!process.env['APP_BASE_URL']) {
    console.warn(
      '[config] APP_BASE_URL não definida — o callbackURL do OAuth ficará relativo ' +
      '("/api/auth/google/callback") e pode não bater com o Redirect URI cadastrado no ' +
      'Google Cloud Console, causando "invalid_grant" no login.'
    );
  }

  if (process.env['NODE_ENV'] === 'production' && !process.env['SESSION_STORE_URL']) {
    console.warn(
      '[config] Rodando em produção sem um session store dedicado (ex.: Redis). ' +
      'O express-session está usando MemoryStore, que não é compartilhado entre processos. ' +
      'Se este app rodar em cluster (PM2/pm2-cluster, múltiplas instâncias), o worker que recebe ' +
      'o callback do OAuth pode não enxergar a sessão criada pelo worker que iniciou o login, ' +
      'gerando falhas intermitentes no fluxo de autenticação.'
    );
  }

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Middlewares essenciais
  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));

  // Configuração da Sessão
  server.use(
    session({
      secret: process.env['SESSION_SECRET'] || 'default-secret-change-in-prod',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
      },
    })
  );

  // Inicialização do Passport
  server.use(passport.initialize());
  server.use(passport.session());

  // Configuração da Estratégia Google
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env['GOOGLE_CLIENT_ID']!,
        clientSecret: process.env['GOOGLE_CLIENT_SECRET']!,
        callbackURL: (process.env['APP_BASE_URL'] || '') + '/api/auth/google/callback',
        scope: ['profile', 'email'],
      },
      async (accessToken: any, refreshToken: any, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase().trim();
          if (!email) return done(new Error('No email provided'));

          // Primeiro tenta achar pelo googleId, que é a chave estável entre logins.
          let user = await prismaClient.user.findUnique({ where: { googleId: profile.id } });

          if (user) {
            // Já existe conta vinculada a esse Google. Só atualiza nome/e-mail se mudaram.
            if (user.email !== email || user.name !== profile.displayName) {
              user = await prismaClient.user.update({
                where: { googleId: profile.id },
                data: { email, name: profile.displayName },
              });
            }
          } else {
            try {
              user = await prismaClient.user.upsert({
                where: { email },
                update: { name: profile.displayName, googleId: profile.id },
                create: { email, name: profile.displayName, googleId: profile.id },
              });
            } catch (err: any) {
              // Corrida: outro request já criou/atualizou esse googleId entre o findUnique
              // e o upsert (ex.: callback disparado duas vezes). Recupera o registro existente
              // em vez de derrubar o login com P2002.
              if (err?.code === 'P2002') {
                user = await prismaClient.user.findUnique({ where: { googleId: profile.id } });
                if (!user) throw err;
              } else {
                throw err;
              }
            }
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Microsoft OAuth (opcional)
  try {
    const { Strategy: MicrosoftStrategy } = require('passport-microsoft');
    passport.use(
      new MicrosoftStrategy(
        {
          clientID: process.env['MICROSOFT_CLIENT_ID'],
          clientSecret: process.env['MICROSOFT_CLIENT_SECRET'],
          callbackURL: (process.env['APP_BASE_URL'] || '') + '/api/auth/microsoft/callback',
          scope: ['user.read', 'openid', 'profile', 'email'],
        },
        async (accessToken: any, refreshToken: any, profile: any, done: any) => {
          try {
            const email = profile?.emails?.[0]?.value?.toLowerCase().trim();
            if (!email) return done(new Error('No email in Microsoft profile'));

            let user = await prismaClient.user.findUnique({ where: { microsoftId: profile.id } });

            if (user) {
              if (user.email !== email) {
                user = await prismaClient.user.update({
                  where: { microsoftId: profile.id },
                  data: { email, name: profile.displayName || profile.username },
                });
              }
            } else {
              try {
                user = await prismaClient.user.upsert({
                  where: { email },
                  update: { name: profile.displayName || profile.username, microsoftId: profile.id },
                  create: { email, name: profile.displayName || profile.username, microsoftId: profile.id },
                });
              } catch (err: any) {
                if (err?.code === 'P2002') {
                  user = await prismaClient.user.findUnique({ where: { microsoftId: profile.id } });
                  if (!user) throw err;
                } else {
                  throw err;
                }
              }
            }

            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );

    server.get('/api/auth/microsoft', passport.authenticate('microsoft'));
    server.get(
      '/api/auth/microsoft/callback',
      passport.authenticate('microsoft', { failureRedirect: '/', successRedirect: '/' })
    );
  } catch (err) {
    console.warn('passport-microsoft not configured or installed; skipping routes');
  }

  // Rotas de Autenticação Google
  server.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  server.get('/api/auth/google/callback', (req, res, next) => {
    passport.authenticate('google', (err: any, user: any) => {
      if (err) {
        console.error('--- ERRO OAUTH GOOGLE (completo) ---');
        console.error(require('util').inspect(err, { depth: null, colors: true }));
        console.error('Chaves do erro:', Object.keys(err));
        return res.status(500).send('Erro no login, veja o console');
      }
      if (!user) return res.redirect('/');
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        res.redirect('/');
      });
    })(req, res, next);
  });

  // Serialização do Usuário
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prismaClient.user.findUnique({ where: { id } });
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Rotas de Pagamento (Woovi/Pix)
  server.use('/api/payments', paymentRoutes);
  server.use('/api/webhooks', webhookRoutes);
  server.use('/api/skins', skinRoutes);
  server.use('/api/achievements', achievementRoutes);

  // Endpoints da API
  server.get('/api/user', (req: any, res: any) => {
    if (!req.user) return res.json(null);
    const user = req.user as any;
    res.json({ id: user.id, email: user.email, name: user.name, isDonor: !!user.isDonor, skinTier: user.skinTier, selectedSkin: user.selectedSkin });
  });

  server.get('/api/donor/status', (req: any, res: any) => {
    if (!req.user) return res.json({ isDonor: false });
    const user = req.user as any;
    res.json({ isDonor: !!user.isDonor });
  });

  server.post('/api/auth/logout', (req: any, res: any, next: any) => {
    req.logout((err: any) => {
      if (err) return next(err);
      res.redirect('/');
    });
  });

  server.get('/api/ads/config', (req, res) => {
    const config = {
      adSenseClient: process.env['ADSENSE_CLIENT_ID'] || null,
      slots: {
        layout: process.env['ADSENSE_SLOT_LAYOUT'] || null,
        menu: process.env['ADSENSE_SLOT_MENU'] || null,
        victory: process.env['ADSENSE_SLOT_VICTORY'] || null,
        defeat: process.env['ADSENSE_SLOT_DEFEAT'] || null,
      },
      enabled: process.env['ADSENSE_ENABLED'] === '1',
    };
    res.json(config);
  });

  server.get('/api/donate/links', (req, res) => {
    res.json({
      koFi: process.env['KOFI_URL'] || null,
      buyMeACoffee: process.env['BMC_URL'] || null,
      pixQrUrl: process.env['PIX_QR_URL'] || null,
      pixCode: process.env['PIX_CODE'] || null,
    });
  });

  server.post('/api/donate/mark-donor', async (req: any, res: any) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const user = req.user as any;

    try {
      await prismaClient.user.update({ where: { id: user.id }, data: { isDonor: true } });
      io?.to(user.email).emit('payment_approved', { isDonor: true });
      res.json({ ok: true });
    } catch (error) {
      console.error('Error marking donor:', error);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  server.post('/api/webhook/payment', async (req: any, res: any) => {
    const { email, status, provider } = req.body;

    if (!email) return res.status(400).json({ error: 'missing_email' });

    if (status === 'paid' || status === 'succeeded') {
      try {
        const update: any = { isDonor: true };
        if (req.body.providerCustomerId && provider === 'buyme') {
          update.buymeId = req.body.providerCustomerId;
        }

        await prismaClient.user.update({ where: { email }, data: update });
        io?.to(email).emit('payment_approved', { isDonor: true, provider: provider || 'unknown' });
        return res.sendStatus(200);
      } catch (err) {
        console.error('Webhook processing error:', err);
        return res.sendStatus(500);
      }
    }

    res.sendStatus(204);
  });

  // SERVIR ARQUIVOS ESTÁCTICOS
  server.use(
    express.static(browserDistFolder, {
      maxAge: '1y',
      index: false,
      redirect: false,
    })
  );

  // ROTA PRINCIPAL DO ANGULAR SSR
  server.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }

    angularApp
      .handle(req)
      .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
      .catch(next);
  });

  return server;
}

const expressApp = app();
const httpServer = createServer(expressApp);

io = new Server(httpServer, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  socket.on('join_room', (email: string) => {
    socket.join(email);
  });
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;

  httpServer.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(expressApp);