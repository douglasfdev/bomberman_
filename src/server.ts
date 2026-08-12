import 'zone.js/node';
import { APP_BASE_HREF } from '@angular/common';
import {
  AngularNodeAppEngine,
  CommonEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './main.server';
import { Server } from 'socket.io';
import { createServer } from 'node:http';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import 'dotenv/config';
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";

const serverDir = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDir, '../browser');
const indexHtml = join(serverDir, 'index.server.html');

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter });

const angularApp = new AngularNodeAppEngine();

export function app(): express.Express {
  const server = express();
  const commonEngine = new CommonEngine();

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

  // Configuração da Estratégia Google do Passport
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env['GOOGLE_CLIENT_ID']!,
        clientSecret: process.env['GOOGLE_CLIENT_SECRET']!,
        callbackURL: process.env['APP_BASE_URL'] + '/api/auth/google/callback',
        scope: ['profile', 'email'],
      },
      async (accessToken: any, refreshToken: any, profile: any, done: any) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email provided'));
          const user = await prisma.user.upsert({
            where: { email },
            update: { name: profile.displayName, googleId: profile.id },
            create: { email, name: profile.displayName, googleId: profile.id },
          });
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Microsoft OAuth (optional)
  try {
    const { Strategy: MicrosoftStrategy } = require('passport-microsoft');
    passport.use(
      new MicrosoftStrategy(
        {
          clientID: process.env['MICROSOFT_CLIENT_ID'],
          clientSecret: process.env['MICROSOFT_CLIENT_SECRET'],
          callbackURL: process.env['APP_BASE_URL'] + '/api/auth/microsoft/callback',
          scope: ['user.read', 'openid', 'profile', 'email'],
        },
        async (accessToken: any, refreshToken: any, profile: any, done: any) => {
          try {
            const email = profile?.emails?.[0]?.value;
            if (!email) return done(new Error('No email in Microsoft profile'));
            const user = await prisma.user.upsert({
              where: { email },
              update: { name: profile.displayName || profile.username, microsoftId: profile.id },
              create: { email, name: profile.displayName || profile.username, microsoftId: profile.id },
            });
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
    console.warn('passport-microsoft not configured or installed; skipping Microsoft OAuth routes');
  }

  // Rotas de Autenticação Google
  server.get('/api/auth/google', passport.authenticate('google'));
  server.get(
    '/api/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/', successRedirect: '/' })
  );

  // Serialização e Deserialização do Usuário para a sessão
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Informações do usuário atual (SSR-friendly)
  server.get('/api/user', (req, res) => {
    if (!req.user) return res.json(null);
    const user = req.user as any;
    res.json({ id: user.id, email: user.email, name: user.name, isDonor: !!user.isDonor });
  });

  // Endpoint dedicado para status de doador (leve e seguro para SSR)
  server.get('/api/donor/status', (req, res) => {
    if (!req.user) return res.json({ isDonor: false });
    const user = req.user as any;
    res.json({ isDonor: !!user.isDonor });
  });

  server.post('/api/auth/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.redirect('/');
    });
  });

  // Endpoint para retornar configuração de anúncios (AdSense) para o frontend SSR
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

  // Endpoints para links de doação / informações (Ko-fi, BuyMeACoffee, PIX QR)
  server.get('/api/donate/links', (req, res) => {
    res.json({
      koFi: process.env['KOFI_URL'] || null,
      buyMeACoffee: process.env['BMC_URL'] || null,
      pixQrUrl: process.env['PIX_QR_URL'] || null,
      pixCode: process.env['PIX_CODE'] || null,
    });
  });

  // Allow authenticated users to mark themselves as donors (useful for redirect-based flows)
  server.post('/api/donate/mark-donor', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const user = req.user as any;

    try {
      await prisma.user.update({ where: { id: user.id }, data: { isDonor: true } });
      io?.to(user.email).emit('payment_approved', { isDonor: true });
      res.json({ ok: true });
    } catch (error) {
      console.error('Error marking donor:', error);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  // Rota de Webhook estendida para diversos provedores de pagamento
  server.post('/api/webhook/payment', async (req, res) => {
    const { email, status, provider } = req.body;

    if (!email) return res.status(400).json({ error: 'missing_email' });

    if (status === 'paid' || status === 'succeeded') {
      try {
        const update: any = { isDonor: true };
        if (req.body.providerCustomerId && provider === 'buyme') {
          update.buymeId = req.body.providerCustomerId;
        }

        await prisma.user.update({ where: { email }, data: update });
        io?.to(email).emit('payment_approved', { isDonor: true, provider: provider || 'unknown' });
        return res.sendStatus(200);
      } catch (err) {
        console.error('Webhook processing error:', err);
        return res.sendStatus(500);
      }
    }

    res.sendStatus(204);
  });

  // Servir arquivos estáticos
  server.get('*.*', express.static(browserDistFolder, { maxAge: '1y' }));

  // Rota principal do Angular SSR
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    // Pula o SSR para as rotas de API
    if (originalUrl.startsWith('/api')) {
      return next();
    }

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}

// Inicialização do servidor e Socket.io
const port = process.env['PORT'] || 4000;
const expressApp = app();
const httpServer = createServer(expressApp);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  socket.on('join_room', (email: string) => {
    socket.join(email);
  });
});

httpServer.listen(port, () => {
  console.log(`Node Express server listening on http://localhost:${port}`);
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app().use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app().use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app().listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app());
