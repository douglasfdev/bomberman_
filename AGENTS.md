# AGENTS.md

3D Bomberman: Angular 22 + Three.js frontend with SSR, Express backend in the same Node server, PostgreSQL via Prisma 7. Auth = Passport Google OAuth + express-session; payments = Woovi PIX; real-time = Socket.io on the same HTTP server.

## Commands

- `npm start` — dev server (`ng serve`). `npm run dev:ssr` — dev server with SSR/backend.
- `npm run build` — production SSR build → `dist/bomberman/`; run it with `npm run serve:ssr:bomberman` (listens on `PORT`, default 4000).
- `npm test` — unit tests (Vitest via Angular's `unit-test` builder). Single spec: `npx ng test --include '**/game-logic.service.spec.ts'`. Specs live next to sources in `src/app/core/*.spec.ts`.
- Prisma: `npm run migrate:dev` (create/apply locally), `npm run migrate` (deploy), `npm run generate`. `postinstall` runs generate automatically.

## Gotchas

- `.env` is required; loaded via `dotenv` in both `src/server.ts` and `prisma.config.ts`. Vars: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `APP_BASE_URL` (see `.env.example`); prod also needs `WOOVI_API_KEY`, `WOOVI_API_BASE_URL`.
- Production builds execute server code during prerender → they fail without env vars set (why the Dockerfile passes them as build-args).
- Prisma client is generated into `src/generated/prisma` (not node_modules). Import from there and re-run `npm run generate` after editing `prisma/schema.prisma`.
- Container healthcheck hits `GET /api/user`.

## Architecture

- `src/server.ts` is the single backend entrypoint: Express + Angular SSR engine + session/OAuth + all API routes (`/api/auth`, `/api/payments`, `/api/webhooks`, `/api/skins`, `/api/achievements`, …) + Socket.io. Auth routes also answer without the `/api` prefix for Vercel rewrites.
- Game code separates pure logic from rendering: signals-based state in `src/app/core/` (`game-logic.service.ts`, `level.service.ts`, unit-tested), Three.js isolated in `src/app/render/` (`three-engine.service.ts`, `scene-builder.service.ts`), wired by `src/app/game/game.component.ts`. Keep this split so game logic stays testable without WebGL.
- Backend services in `src/services/` (prisma, user, skin, achievement, woovi); routes in `src/routes/`; PII (tax ID) is encrypted via `src/utils/encryption.util.ts` before storage.

## Deploy

Push to `main` → `.github/workflows/deploy-pages.yml` builds a Docker image to GHCR and SSH-deploys to a VPS running docker-compose on port 4000. `vercel.json` + `api/index.ts` are an alternative Vercel target, not the active deploy path.

## Conventions

- TypeScript strict + strict templates; Prettier with printWidth 100, singleQuote.
- Comments and UI text are written in Portuguese.
