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


const browserDistFolder = join(dirname(fileURLToPath(import.meta.url)), '../browser');

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });

const prisma = new PrismaClient({
  adapter,
});

const angularApp = new AngularNodeAppEngine();
export function app(): express.Express {
  const server = express();
  const serverDir = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDir, '../browser');
  const indexHtml = join(serverDir, 'index.server.html');
  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // Middlewares essenciais
  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));

  // Configuração da Sessão
  server.use(
    session({
      secret: process.env['SESSION_SECRET'] || 'default-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production', // Usar cookies seguros em produção
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
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await prisma.user.upsert({
            where: { email: profile.emails![0].value },
            update: {
              name: profile.displayName,
              googleId: profile.id,
            },
            create: {
              email: profile.emails![0].value,
              name: profile.displayName,
              googleId: profile.id,
            },
          });
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
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

  // Rotas de Autenticação
  server.get('/api/auth/google', passport.authenticate('google'));

  server.get(
    '/api/auth/google/callback',
    passport.authenticate('google', {
      failureRedirect: '/',
      successRedirect: '/',
    })
  );

  // Microsoft OAuth (optional) - requires `passport-microsoft` package and env vars
  try {
    // Dynamically require to avoid hard dependency errors in environments without the package
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Strategy: MicrosoftStrategy } = require('passport-microsoft');

    passport.use(
      new MicrosoftStrategy(
        {
          clientID: process.env['MICROSOFT_CLIENT_ID'],
          clientSecret: process.env['MICROSOFT_CLIENT_SECRET'],
          callbackURL: process.env['APP_BASE_URL'] + '/api/auth/microsoft/callback',
          scope: ['user.read', 'openid', 'profile', 'email'],
        },
        async (accessToken: string, refreshToken: string, profile: any, done: any) => {
          try {
            const email = profile.emails && profile.emails[0] && profile.emails[0].value;
            if (!email) return done(new Error('No email in Microsoft profile'));

            // Upsert user by email and store microsoftId when available
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
      passport.authenticate('microsoft', {
        failureRedirect: '/',
        successRedirect: '/',
      })
    );
  } catch (err) {
    console.warn('passport-microsoft not configured or not installed; skipping Microsoft OAuth routes');
  }

  // Informações do usuário atual (SSR-friendly)
  server.get('/api/user', (req, res) => {
    // Expose minimal info suitable for SSR; frontend can request this endpoint to render donor state and personalize UI
    if (!req.user) return res.json(null);

    const { id, email, name, isDonor } = req.user as any;
    res.json({ id, email, name, isDonor: !!isDonor });
  });

  server.post('/api/auth/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
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
      enabled: process.env['ADSENSE_ENABLED'] === '1' || false,
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
      io.to(user.email).emit('payment_approved', { isDonor: true });
      res.json({ ok: true });
    } catch (error) {
      console.error('Error marking donor:', error);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  // Rota de Webhook estendida para diversos provedores de pagamento (BMC, Ko-fi, Stripe, etc.)
  server.post('/api/webhook/payment', async (req, res) => {
    const { email, status, provider } = req.body;

    if (!email) return res.status(400).json({ error: 'missing_email' });

    if (status === 'paid' || status === 'succeeded') {
      try {
        const update: any = { isDonor: true };
        // if provider included a provider-specific id for the payer, persist it (e.g., buyme customer id)
        if (req.body.providerCustomerId && provider === 'buyme') {
          update.buymeId = req.body.providerCustomerId;
        }

        await prisma.user.update({ where: { email }, data: update });
        io.to(email).emit('payment_approved', { isDonor: true, provider: provider || 'unknown' });
        return res.sendStatus(200);
      } catch (err) {
        console.error('Webhook processing error:', err);
        return res.sendStatus(500);
      }
    }

    res.sendStatus(204);
  });

  // Servir arquivos estáticos
  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y'
  }));

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

// O restante do seu código para iniciar o servidor...
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
