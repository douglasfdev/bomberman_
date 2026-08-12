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

  server.get('/api/user', (req, res) => {
    res.json(req.user || null);
  });

  server.post('/api/auth/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.redirect('/');
    });
  });

  // Rota de Webhook (já existente)
  server.post('/api/webhook/payment', async (req, res) => {
    const { email, status } = req.body;

    if (status === 'paid') {
      await prisma.user.update({
        where: { email },
        data: { isDonor: true },
      });
      io.to(email).emit('payment_approved', { isDonor: true });
    }

    res.sendStatus(200);
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
