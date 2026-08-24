import 'zone.js/node';
import 'dotenv/config';
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
import { prismaClient } from './services/prisma';
import { PrismaPg } from "@prisma/adapter-pg";
import paymentRoutes from './routes/paymentRoutes';
import webhookRoutes from './routes/webhookRoutes';
import skinRoutes from './routes/skinRoutes';
import achievementRoutes from './routes/achievementRoutes';

const serverDir = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDir, '../browser');

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });

const angularApp = new AngularNodeAppEngine({ trustProxyHeaders: true });

export let io: Server;

export function app(): express.Express {
  const server = express();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  server.set('trust proxy', 'loopback');

  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));

  server.use(
    session({
      secret: process.env['SESSION_SECRET'] || 'default-secret-change-in-prod',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false,          // HTTP, não HTTPS
        sameSite: 'lax',        // necessário para o redirect do Google OAuth funcionar
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  server.use(passport.initialize());
  server.use(passport.session());

  // Só registra a strategy se as variáveis estiverem disponíveis.
  // Durante o prerender do build (Angular CLI) elas não existem.
  if (process.env['GOOGLE_CLIENT_ID'] && process.env['GOOGLE_CLIENT_SECRET']) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env['GOOGLE_CLIENT_ID'],
          clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
          callbackURL: (process.env['APP_BASE_URL'] || '') + '/auth/google/callback',
          scope: ['profile', 'email'],
        },
        async (accessToken: any, refreshToken: any, profile: any, done: any) => {
          try {
            const email = profile.emails?.[0]?.value?.toLowerCase().trim();
            if (!email) return done(new Error('No email provided'));

          let user = await prismaClient.user.findUnique({ where: { googleId: profile.id } });

          if (user) {
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
  } // fim do if GOOGLE_CLIENT_ID

  // --- MUDANÇAS DE ROTA AQUI ---
  // Passamos a suportar tanto /api/auth quanto apenas /auth para driblar a Vercel
  server.get(['/api/auth/google', '/auth/google'], passport.authenticate('google', { scope: ['profile', 'email'] }));

  server.get(['/api/auth/google/callback', '/auth/google/callback'], (req, res, next) => {
    passport.authenticate('google', (err: any, user: any) => {
      if (err) {
        return res.status(500).send('Erro no login, veja o console');
      }
      if (!user) return res.redirect('/');
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        res.redirect('/');
      });
    })(req, res, next);
  });

  // MUDANÇA: de server.post para server.all para interceptar acessos GET e POST
  server.all(['/api/auth/logout', '/auth/logout'], (req: any, res: any, next: any) => {
    req.logout((err: any) => {
      if (err) return next(err);
      res.redirect('/');
    });
  });

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

  server.use('/api/payments', paymentRoutes);
  server.use('/api/webhooks', webhookRoutes);
  server.use('/api/skins', skinRoutes);
  server.use('/api/achievements', achievementRoutes);

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
        return res.sendStatus(500);
      }
    }

    res.sendStatus(204);
  });

  // MUDANÇA: Substituido o `.all` problemático por `.use`
  server.use('/socket.io', (req, res) => {
    res.status(501).json({ error: 'WebSockets not supported on Vercel Serverless' });
  });

  server.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  server.use(
    express.static(browserDistFolder, {
      maxAge: '1y',
      index: false,
      redirect: false,
    })
  );

  server.use((req, res, next) => {
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