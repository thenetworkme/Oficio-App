# Oficio

Registra tus horas de práctica hasta llegar a las 10.000 horas de maestría en cada habilidad. Incluye Pomodoro integrado, estadísticas, recordatorios, logros con celebración y 8 temas de color (Catppuccin y otros).

Built with Next.js (App Router) + TypeScript, Tailwind CSS v4, shadcn/ui-style components on Radix primitives, Firebase (Auth + Firestore), zustand, react-hook-form + zod, date-fns, Recharts, and a hand-written PWA service worker with Web Push.

The original design brief (`design-reference/PROMPT.md`) specified Supabase/Postgres; this build uses **Firebase (Auth + Firestore)** instead, per the project owner's explicit request. `design-reference/docs/data-model.sql` is kept only as historical reference for the data shape — nothing in the app talks to Postgres/Supabase.

## Stack

- Next.js 16 (App Router), React 19, TypeScript (strict)
- Tailwind CSS v4 (`@theme inline` tokens), Radix UI primitives, `lucide-react`
- Firebase Authentication (Email/Password + Google) and Cloud Firestore
- `zustand` (+ `persist`) for the Pomodoro timer session
- `react-hook-form` + `zod`, `date-fns` (locale `es`)
- `recharts` for the monthly-hours chart; the weekly bars and 14-week consistency heatmap are plain CSS grids, matching the design reference
- `web-push` + VAPID for sending notifications; a hand-written service worker (`public/sw.js`) for installability and push delivery
- Vitest (pure logic) and Playwright (end-to-end smoke tests)

## 1. Firebase project setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication** → Sign-in method → enable **Email/Password** and **Google**.
3. **Firestore Database** → Create database (start in production mode; the rules below lock it down).
4. **Project settings → General → Your apps** → add a **Web app**, copy the config values into your `.env.local` (see `.env.example`).
5. Deploy the security rules and indexes from this repo (requires the [Firebase CLI](https://firebase.google.com/docs/cli)):

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add            # pick your project, once
   firebase deploy --only firestore:rules,firestore:indexes
   ```

   `firestore.rules` restricts every collection to `request.auth.uid == resource.data.userId` (profiles are keyed by uid directly). `firestore.indexes.json` declares the composite indexes the app's queries need (sessions by user+date, sessions by skill+date, skills/reminders by user+createdAt). Without deploying these, Firestore throws a one-time error in the browser console on first query, with a console link to auto-create the missing index — but doing it via the CLI up front avoids that.

### Firestore data model

Translated from `design-reference/docs/data-model.sql` (see `lib/types.ts` for the TypeScript shapes):

- `profiles/{uid}` — one per user, created automatically right after sign-up (client-side, in `AuthProvider`).
- `skills/{skillId}` — top-level collection with a `userId` field (rather than a subcollection), so a single query can list "all my skills". Holds a **denormalized `totalMinutes` counter** instead of summing every session on each read: `lib/firestore/sessions.ts#saveSession` updates it inside a Firestore transaction together with the new session document, so it can never drift even under concurrent writes. This trades a touch more write-side complexity for dashboards that don't need to fetch (and sum) potentially thousands of sessions just to show a number.
- `sessions/{sessionId}` — one per logged practice session (timer or manual).
- `reminders/{reminderId}`, `pushSubscriptions/{id}` — straightforward per-user collections.
- `achievements/{skillId_hours}` — **deterministic document id** (`${skillId}_${hours}`) instead of a unique constraint (Firestore has none): writing the same milestone twice is a harmless overwrite, which makes `recordCrossedMilestones` safe to call more than once for the same crossing.

## 2. Web Push (VAPID)

```bash
npx web-push generate-vapid-keys
```

Put the public key in `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` and the private key in `WEB_PUSH_VAPID_PRIVATE_KEY`; set `WEB_PUSH_VAPID_SUBJECT` to a `mailto:` address. Pick any long random string for `CRON_SECRET`.

## 3. Environment variables

```bash
cp .env.example .env.local
# fill in the Firebase + VAPID values
```

In Vercel: Project Settings → Environment Variables → add the same names for Production/Preview/Development.

## 4. Running locally

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
npm run start     # serve the production build
```

## 5. Tests

```bash
npm run test        # Vitest: milestones, projection, streak, timer math, es-ES formatting
npm run test:watch
npm run e2e          # Playwright smoke tests (see "Known limitations")
```

## 6. Deploying to Vercel

1. Import the repo in Vercel.
2. Add the environment variables from `.env.example`.
3. Deploy — `next build` runs the same checks as locally.
4. In Firebase Console → Authentication → Settings → **Authorized domains**, add your Vercel domain(s) (Google sign-in will fail otherwise).

## Known limitations / follow-ups

- **Reminder push dispatch (cron) is not implemented.** `POST /api/push/send` sends a single Web Push notification given a subscription (guarded by `CRON_SECRET`), and the client-side "Activar notificaciones" flow in `/recordatorios` requests permission, subscribes, and stores the subscription in Firestore. What's missing is the job that finds reminders due *right now* and calls that endpoint for each matching user — `app/api/cron/reminders/route.ts` is a stub with the exact steps to finish it (it needs the Firebase Admin SDK with a service account, since every other server/client read in this app intentionally goes through the signed-in client SDK instead). Once implemented, wire it up with a `crons` entry in `vercel.json` and this file can lose this paragraph.
- **Playwright**: `playwright.config.ts` and `e2e/auth.spec.ts` are in place (login screen renders, the auth guard redirects `/` to `/login`, the login/register toggle works), but this sandbox's network policy blocked downloading Playwright's bundled Chromium (`npx playwright install chromium` was refused by the egress proxy), so these were written and build-checked but **not actually executed** here. Run `npx playwright install chromium && npm run e2e` in an environment with normal internet access to verify them, and `npm run build`'s success plus the Vitest suite are what this session could actually confirm end to end. Deeper flows (create a skill → start the timer → log hours → see a milestone celebration) need a signed-in session; the cleanest way to add those is the [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite) seeded with a test user, which isn't wired up yet.
- **Weekly review / streak-guard reminder timing** is modeled in the data (`reminders.kind`) and `lib/streak.needsStreakGuard`, but nothing currently *fires* it automatically — that's the same cron gap as above.
- **"Cambiar foto" (profile avatar upload)** on `/ajustes` → Perfil is intentionally disabled with a tooltip: it needs Firebase Storage, which isn't set up (no bucket rules, no upload flow). The avatar always falls back to the user's initial on a solid accent circle.
- **"Horas por mes" uses Recharts**, per the brief; the weekly bars and 14-week heatmap are hand-rolled CSS grids, matching `design-reference/html/*.dc.html` pixel-for-pixel rather than going through a chart library for shapes a chart library doesn't really help with.
- Reminder "next occurrence" text on the dashboard is a simple same-day label (time + day-of-week summary), not a full "next matching weekday" calculation.

## Project layout

```
app/
  (app)/            # routes behind the sidebar + auth guard (AppShell)
    page.tsx         "/"              dashboard
    temporizador/    "/temporizador"  Pomodoro timer
    estadisticas/    "/estadisticas"  stats
    logros/          "/logros"        achievements + celebration
    recordatorios/   "/recordatorios" reminders + Web Push opt-in
    registrar/       "/registrar"     manual session logging
    habilidades/[id] "/habilidades/:id" skill detail
    ajustes/         "/ajustes"       theme + accent settings
  habilidades/nueva/ "/habilidades/nueva" onboarding wizard (no sidebar)
  login/             "/login"         email/password + Google, register toggle
  api/push/send/     POST — sends one Web Push notification
  api/cron/reminders/ stub — see "Known limitations"
lib/
  firebase.ts, firestore/*  Firebase client + Firestore data-access layer
  auth/AuthProvider.tsx     Firebase Auth context
  theme/                    design tokens, ThemeProvider, pre-paint bootstrap
  milestones.ts, projection.ts, streak.ts, timer.ts, format.ts, manual-log.ts
                             pure, unit-tested logic (no Firebase imports)
  push/                     Web Push subscribe (client) + send (server)
store/timer-store.ts        persisted zustand Pomodoro store
components/                 UI kit, layout shell, dashboard/skill/timer/
                             achievement widgets
design-reference/           the designer's original mockups, tokens, PNGs
                             and the Supabase schema — reference only
```
