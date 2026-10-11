# Oficio

Registra tus horas de práctica hasta llegar a las 10.000 horas de maestría en cada habilidad. Incluye Pomodoro integrado, estadísticas, recordatorios, logros con celebración, una mascota (Tomi) con monedas/XP/tienda de recompensas, y 8 temas de color (Catppuccin y otros) en el sistema visual **"Pegatina"** (neo-brutalista, stickers).

Built with Next.js (App Router) + TypeScript, Tailwind CSS v4, shadcn/ui-style components on Radix primitives, Firebase (Auth + Firestore), zustand, react-hook-form + zod, date-fns, Recharts, and a hand-written PWA service worker with Web Push.

The original design brief (`design-reference/PROMPT.md`) specified Supabase/Postgres; this build uses **Firebase (Auth + Firestore)** instead, per the project owner's explicit request. `design-reference/docs/data-model.sql` is kept only as historical reference for the data shape — nothing in the app talks to Postgres/Supabase.

## Design system — "Pegatina"

The whole app was redesigned from the earlier flat/dark style to **Pegatina**: a neo-brutalist, sticker look — paper background, 3px ink borders, hard offset drop shadows (6px at rest, 9px on hover, 2px + shift on press/"squish"), 14px radius, and small deterministic per-card rotation (-2°..2°, derived from the card's id so it doesn't jitter on re-render — see `lib/sticker-rotation.ts`). Text uses **Space Grotesk** (500/700) and every numeric value (hours, times, percentages, coins, XP) uses **Space Mono** (400/700), both via `next/font/google`.

The source mockups live in `design-reference/pegatina/` (15 `.dc.html` prototypes + matching PNGs + `docs/pegatina-tokens.json` + the future Rive/Muza integration prompt) — the reference for this redesign, not shipped code. `design-reference/` (no `pegatina/` suffix) holds the *previous* design package, kept only as history.

The 8-theme switcher (Oficio renamed to **Pegatina** + Catppuccin Mocha/Macchiato/Frappé/Latte + Nord/Gruvbox/Rosé Pine) keeps the same architecture as before (CSS vars + Tailwind v4 `@theme inline` + a pre-paint boot script in `components/theme/ThemeScript.tsx`, see `lib/theme/tokens.ts` / `lib/theme/apply.ts`) but the token *names* changed: `bg/card/line/text/muted/on/track/sel` → `paper/card/ink/muted/shadow/a1/a2/a3/danger`. The structural look (borders/shadows/radius/rotation) is constant across every theme — only the color values swap; this is different from the old system, where some themes read "softer". The accent picker also changed shape: instead of each theme owning its own list of accent options, there's one fixed 5-swatch palette (Ámbar/Rosa/Verde/Cielo/Naranja) that overrides only `--a1`, matching the mockup's `PegatinaAjustes.dc.html`.

## Mascot (Tomi) — Rive/Muza deferred

The mascot everywhere in the app (Panel hero card, Tienda sticky preview, the practice-session-close celebration, the auth screens) is **Tomi**, the placeholder tomato character — its SVG was extracted verbatim from the Pegatina mockups into `components/mascot/Mascot.tsx`, not redrawn. Equipped hat/cape/accessory/background are simple percentage-positioned SVG overlay layers (bg behind, body, acc, hat in front), tuned specifically for Tomi's fixed (non-animated) body.

**Not implemented, by design**: the planned Rive-based "Muza" cat mascot (`design-reference/pegatina/PROMPT-RIVE-MUZA.md`) — there is no `.riv` file in this repo and the user explicitly asked to defer it. `Mascot`'s prop shape (`size`, `mood`, `hat`/`cape`/`acc`/`bg`, `className`, `onClick`) is deliberately the shape a future Rive-backed version would also take, so swapping the implementation later shouldn't require touching call sites. The overlay positioning will need redoing for an animated character. Reactions (bounce on Pomodoro completion, spin on purchase, pulse on level-up, a "sleepy" droop variant) are done with CSS keyframes (`app/globals.css`), not Framer Motion — the repo doesn't have it installed and a dependency wasn't worth adding for this; they respect `prefers-reduced-motion`.

## Pomodoro fullscreen focus screens (new)

`/temporizador` now has a fullscreen takeover, from `design-reference/pomodoro-fullscreen/` (`PegatinaFoco`/`PegatinaFocoZen`/`PegatinaPausaCorta`/`PegatinaPausaLarga`). It's implemented as **one** `components/timer/FullscreenTimer.tsx` component, not four routes or a second timer: it's a Radix `Dialog`-based overlay (reusing the focus-trap/portal/`aria-modal` machinery `SessionSaveDialog` already relies on) mounted over the existing Temporizador page, switching its colored "Foco" vs. green "descanso corto" vs. blue "descanso largo" content purely off the existing `store.mode`, plus a local `zen` boolean for the black/minimal variant. All the timer math, sound effects (`playStart`/`playPause`/`playComplete`) and the session-save flow stay exactly where they were — the fullscreen buttons just call the same store methods/`useSound()` the normal screen's `handlePlayPause`/`handleSkip`/`completeFocusPeriod` already use, so there's one source of truth and sounds never double-fire.

- Entry: "Modo enfoque (pantalla completa)" button on the normal Temporizador screen. Exit: "Salir ✕" (or Escape) back to the normal screen; "Modo zen"/"Salir del modo zen" (or Escape) toggles the black variant without losing timer state. Zen is focus-only — leaving focus mode (a break starting) drops it automatically (derived, not an effect).
- "+5 min"/"+2 min" extend the running or paused period via a new `store.extend(seconds)`: it bumps `remainingAtStart` by `seconds`, which `getRemainingSeconds()` already treats as the "remaining as of now/startedAt" baseline (the same quantity `pause()`/`start()` read and write), so it adds exactly `seconds` of remaining time regardless of how much has already elapsed — no stale-time bug reintroduced. A parallel `extraSeconds` counter (reset whenever the period itself resets) is added to the progress-bar total so the bar keeps making sense after an extension. Covered by new tests in `tests/timer-store.test.ts`.
- "Terminar ya" calls `store.completeFocusPeriod()` directly (the same completion path a natural countdown-to-zero uses) rather than a second completion code path. "Saltar descanso" calls the existing `store.skip()`.
- The break checklists (stretch/water/look away; walk/eat+water/screen-free) are local-only UI state, not persisted, and reset per-break via a `key` remount rather than an effect.
- The giant time display now has `font-variant-numeric: tabular-nums` (added to the non-fullscreen Temporizador's time display too, for consistency) so digits don't jitter, per the mockup's own callout.

## Economy / Shop (new)

A full coins/XP/level/shop layer, from `design-reference/pegatina/docs/pegatina-tokens.json` cross-checked against `PegatinaTienda.dc.html`/`PegatinaCierre.dc.html`'s scripts:

- **Formulas** (`lib/economy.ts`, unit-tested in `tests/economy.test.ts`): `coinsPerSession = round(durationMin/25*10) + (quality>=4 ? 5 : 0)`; `xp = round(durationMin*(0.8 + quality*0.1))`. `quality` is the existing `sessions.quality` rating (1-5); manual log entries can have `quality === null` — treated as not qualifying for the coin bonus and as `0` in the XP formula's quality term (so an unrated session still earns the base coins-per-minute and a reduced-but-nonzero XP amount). This is a judgement call, not shown explicitly in the mockup (its quality picker always has a default).
- **Level curve** (inferred, flagged here as an assumption): the mockup only shows one data point — "Nv. 14" with a per-level bar reading "X / 2.400 XP" — never an explicit formula. `lib/economy.ts` uses a flat **2400 XP per level**, which matches that one point exactly and is simple/monotonic. If the real intended curve is escalating (e.g. each level needs more XP than the last), this will need revisiting.
- **Welcome bonus**: 100 coins, granted exactly once per account via a Firestore transaction (`ensurePetAndGrantWelcomeBonus`), called from `AuthProvider` on every sign-in (idempotent — a no-op once `pets/{uid}` exists) rather than only from `/onboarding`, so it's granted reliably even if a user skips onboarding.
- **Shop catalog** (`lib/shop.ts`): hats `cap`(0, default), `chef`(120), `top`(150), `wiz`(250), `crown`(400, requires pet level 15); capes `red`(200), `star`(350), `master`(800, requires 5,000 total practice hours summed across *all* skills); accessories `glass`(90), `mono`(100), `bow`(60), `scarf`(130); backgrounds `cream`(0, default), `mint`(80), `sky`(80), `lilac`(100), `sunset`(120). Thumbnails are emoji placeholders, per the mockup package's own README ("las miniaturas... usan emojis").
- **Firestore model** (`lib/firestore/economy.ts`, see "Firestore data model" below for the collections/rules): `pets/{uid}.coins` is a denormalized running balance, updated — together with its `coinLedger` audit entry — inside a single `runTransaction`, same pattern as `skills.totalMinutes`. The ledger is append-only (security rules allow `create`/`read` only, never `update`/`delete`).
- **Purchase trust boundary**: buying an item is a **client-initiated** Firestore transaction (reads `pets/{uid}`, checks coins/level/hours, checks it isn't already owned, then atomically decrements coins + writes `inventory` + `coinLedger`). This is atomic and safe against races between concurrent purchases, but — consistent with this project's existing choice to avoid the Admin SDK — it is *not* enforced by trusted server logic; a modified client could in principle run different logic against the same security rules. Same spirit as this file's other "known limitations": flagged, not hidden.
- **Where it's awarded**: every saved practice session (`lib/firestore/sessions.ts#saveSession`, used by both the timer and manual log) calls `awardSessionEconomy` right after the milestone check.

## Retos (challenges) — new

A "learn something in X days" feature (e.g. "30 days of guitar"), from `design-reference/retos/` (6 `.dc.html` mockups + PNGs + README, reference only):

- **Routes**: `/retos` (list, active/completed/paused tabs + KPIs), `/retos/nuevo` (create form with a live side-panel projection), `/retos/[id]` (board: hero card, stat tiles, month calendar of day cells, recent diary), `/retos/[id]/dia` (today's diary; pass `?day=N` to open a past day), `/retos/[id]/galeria` (Fotos / Día 1 vs hoy / Diario tabs), `/retos/[id]/cierre` (completed vs. unfinished closure). Nav entry added to `Sidebar`/`MobileNav` right after "Panel", before "Temporizador", matching the mockup's own nav order (its top pill-bar chrome itself was **not** copied — only the existing sidebar/bottom-nav pattern was extended).
- **Coins/XP formula reused, not forked**: the Retos README's own formula (`coins = round(min/25*10) + 5 if ánimo>=4; xp = round(min*(0.8+ánimo*0.1))`) is **identical** to `lib/economy.ts`'s existing session formula — "ánimo" (mood, 1-5) is simply passed through as the existing `quality` parameter. `lib/firestore/challenges.ts#saveChallengeDay` calls the existing `saveSession`/`coinsPerSession`/`xpForSession` directly; there is only one coin economy in the app.
- **Firestore model** (see `lib/types.ts`):
  - `challenges/{id}` — `userId`, `skillId`, `name`, `why` ("mi porqué"), `totalDays`, `dailyGoalMin`, `graceDaysAllowed`, `graceDaysUsed` (denormalized, recomputed from `challengeDays` on every save), `color`, `startedAt`, `reminderTime`, `reminderEnabled`, `status` (`active`/`completed`/`paused`/`abandoned`), `createdAt`, `completedAt`.
  - `challengeDays/{challengeId}_{dayNumber}` — **deterministic id**, same convention as `achievements/{skillId}_{hours}`, so re-saving a day is an idempotent overwrite rather than a duplicate. Holds `durationMin`, `note`, `tags`, `photoUrls`, `mood`, `difficulty`, and `sessionId` (the `sessions` doc it created).
  - Saving a day's diary creates a **real `sessions` document** via the existing `saveSession` transactional path (bumps the linked skill's `totalMinutes`, runs milestone checks) tagged `source: "challenge"` + `challengeId` (new optional field on `PracticeSession`, and `"challenge"` added to `SessionSource`). Re-saving a day first reverses its previous session (`deleteSession`) so editing a day never double-counts minutes/coins/XP/skill-hours.
  - "Max 3 active challenges" (`MAX_ACTIVE_CHALLENGES` in `lib/types.ts`) is enforced client-side before create (`canStartNewChallenge`), consistent with this app's existing trust model for client-enforced rules (see "Economy / Shop" above on the purchase transaction).
  - **New rules**: `firestore.rules` gained `challenges/{challengeId}` and `challengeDays/{challengeDayId}`, same `userId == request.auth.uid` pattern as every other collection. **New indexes**: `firestore.indexes.json` gained `challenges` (`userId` asc + `createdAt` desc) and `challengeDays` (`challengeId` asc + `dayNumber` asc).
- **Day-state/streak math** (`lib/challenge.ts`, unit-tested in `tests/challenge.test.ts`): a challenge's streak is scoped to its own `1..totalDays` sequence, so it's new pure logic rather than a call into the app-wide `lib/streak.ts`. A past day with no logged minutes consumes one of the challenge's grace days (in order) until the budget runs out, after which it's "missed"; the current streak counts back from the most recent `done`/`grace` day, stopping at the first `missed` day.
- **Firebase Storage, set up for real** (not stubbed, unlike the existing "Cambiar foto" avatar upload — see "Known limitations"): `lib/firebase.ts#getFirebaseStorage()` (same lazy-init pattern as Auth/Firestore), `storage.rules` (new file at the repo root — Storage rules are separate from Firestore rules) scoping `challenge-photos/{uid}/...` to that uid, and `lib/storage/challenge-photos.ts` for upload/validate (image types only, 8 MB cap, mirrored client-side and in `storage.rules`)/delete. The diary day screen uploads up to 8 photos per day with a per-photo uploading state.
  - **Deploy**: Firebase Storage must be **enabled for the project in the Firebase console first** — unlike Firestore/Auth it is not on by default. Then `firebase deploy --only firestore:rules,firestore:indexes,storage` (storage.rules deploys with the `storage` target).
- **Inferred/simplified, documented here rather than left silent**:
  - The day-state calendar's "day de gracia"/"perdido" colors (`lib/challenge-ui.ts`) use the mockup's fixed sky-blue/pink rather than the theme's `--a1`/`--a2`/`--a3` (already spoken for by "today"/"done"/the challenge's own color) — these two stay constant across themes instead of flipping with the active palette.
  - The diary's tag picker uses a generic set (`Técnica`/`Teoría`/`Repaso`/`Proyecto`/`Error`/`Avance`) instead of the mockup's guitar-specific tags, since a challenge can be linked to any skill.
  - The closure screen (`/retos/[id]/cierre`) reuses the existing `Mascot` component (celebrate/sleepy moods) instead of redrawing the mockup's separate "Chispa" dog character — consistent with this project's one-mascot approach everywhere else.
  - "Racha de retos" on the list page and the closure screen's reward/bar numbers are all derived live from `challengeDays`, not hardcoded — the mockup's own sample numbers are illustrative, not computed from its DAYS array either.

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
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

   `firestore.rules` restricts every collection to `request.auth.uid == resource.data.userId` (profiles/pets/equipped are keyed by uid directly). `firestore.indexes.json` declares the composite indexes the app's queries need (sessions by user+date, sessions by skill+date, skills/reminders by user+createdAt, challenges by user+createdAt, challengeDays by challenge+dayNumber). Without deploying these, Firestore throws a one-time error in the browser console on first query, with a console link to auto-create the missing index — but doing it via the CLI up front avoids that. **No new composite index is needed for the economy collections**: `inventory` and `coinLedger` are only ever queried with a single `userId ==` equality filter and no `orderBy`, which Firestore indexes automatically; `pets`/`equipped` are only ever read by direct document id (`uid`), never queried. `storage.rules` (Retos diary photos) is a **separate file and a separate deploy target** from the Firestore rules — see "Retos (challenges)" below; Storage itself must be enabled in the Firebase console first.

### Firestore data model

Translated from `design-reference/docs/data-model.sql` (see `lib/types.ts` for the TypeScript shapes):

- `profiles/{uid}` — one per user, created automatically right after sign-up (client-side, in `AuthProvider`). Now also carries `onboardingCompletedAt` (epoch ms, null until `/onboarding` finishes or is skipped).
- `skills/{skillId}` — top-level collection with a `userId` field (rather than a subcollection), so a single query can list "all my skills". Holds a **denormalized `totalMinutes` counter** instead of summing every session on each read: `lib/firestore/sessions.ts#saveSession` updates it inside a Firestore transaction together with the new session document, so it can never drift even under concurrent writes. This trades a touch more write-side complexity for dashboards that don't need to fetch (and sum) potentially thousands of sessions just to show a number.
- `sessions/{sessionId}` — one per logged practice session (timer or manual).
- `reminders/{reminderId}`, `pushSubscriptions/{id}` — straightforward per-user collections.
- `achievements/{skillId_hours}` — **deterministic document id** (`${skillId}_${hours}`) instead of a unique constraint (Firestore has none): writing the same milestone twice is a harmless overwrite, which makes `recordCrossedMilestones` safe to call more than once for the same crossing.
- `pets/{uid}` — the user's mascot: `name`, `xp`, `coins` (denormalized running balance), `createdAt`. Keyed by uid directly, like `profiles/{uid}`.
- `equipped/{uid}` — currently worn items: `hat`/`cape`/`acc`/`bg` (item id or null). Keyed by uid directly.
- `inventory/{id}` — one doc per owned shop item: `userId`, `itemId`, `acquiredAt`.
- `coinLedger/{id}` — append-only audit trail: `userId`, `delta`, `reason`, `createdAt`. Security rules allow `create`/`read` only — no `update`/`delete`, even by the owner.
- `challenges/{id}`, `challengeDays/{challengeId_dayNumber}` — see "Retos (challenges)" above.

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

- **The Rive/Muza mascot is deferred, by design** — see "Mascot (Tomi)" above. Tomi's overlay-positioning approach is tuned for a static body and will need redoing once an animated character exists.
- **The pet level curve (flat 2400 XP/level) is an inferred assumption**, not something the mockups spell out explicitly — see "Economy / Shop" above. If the intended curve is escalating, `lib/economy.ts#XP_PER_LEVEL`/`levelForXp` is the one place to change it (and its test in `tests/economy.test.ts`).
- **The shop purchase transaction is client-initiated, not server-enforced** — see "Economy / Shop" above for the exact trust boundary. Consistent with this project's existing choice to avoid the Admin SDK/Cloud Functions.
- **`/registro`'s "Registrarme con Google" and `/login`'s "Continuar con Google" call the same `signInWithGoogle`** (Firebase doesn't distinguish sign-up from sign-in for an OAuth provider). A Google user who is actually brand-new is routed to `/onboarding`; an *existing* Google user who clicks "Registrarme" on `/registro` by mistake will also land on `/onboarding` once more, but `/onboarding` immediately redirects to `/` if `profiles.onboardingCompletedAt` is already set, so this is harmless, just a possible extra redirect hop.
- **The per-skill "Nv. X" tag shown on the old Panel mockup's stamp cards doesn't correspond to any derivable formula** from the sample data (e.g. 312h tagged "Nv. 7" while 1284h is "Nv. 12" isn't a consistent curve) — `StampAlbumCard` shows the actual stamp count instead (real, derived data) rather than inventing a second, skill-scoped leveling system alongside the pet's XP-based one.
- **Reminder push dispatch (cron) is not implemented.** `POST /api/push/send` sends a single Web Push notification given a subscription (guarded by `CRON_SECRET`), and the client-side "Activar notificaciones" flow in `/recordatorios` requests permission, subscribes, and stores the subscription in Firestore. What's missing is the job that finds reminders due *right now* and calls that endpoint for each matching user — `app/api/cron/reminders/route.ts` is a stub with the exact steps to finish it (it needs the Firebase Admin SDK with a service account, since every other server/client read in this app intentionally goes through the signed-in client SDK instead). Once implemented, wire it up with a `crons` entry in `vercel.json` and this file can lose this paragraph.
- **Playwright**: `playwright.config.ts` and `e2e/auth.spec.ts` are in place (login/registro/recuperar screens render, the auth guard redirects `/` to `/login`), but this sandbox's network policy blocked downloading Playwright's bundled Chromium (`npx playwright install chromium` was refused by the egress proxy), so these were written and build-checked but **not actually executed** here. Run `npx playwright install chromium && npm run e2e` in an environment with normal internet access to verify them, and `npm run build`'s success plus the Vitest suite are what this session could actually confirm end to end. Deeper flows (create a skill → start the timer → log hours → see a milestone celebration, the full `/onboarding` flow, buying a shop item) need a signed-in session; the cleanest way to add those is the [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite) seeded with a test user, which isn't wired up yet.
- **Weekly review / streak-guard reminder timing** is modeled in the data (`reminders.kind`) and `lib/streak.needsStreakGuard`, but nothing currently *fires* it automatically — that's the same cron gap as above.
- **"Cambiar foto" (profile avatar upload)** on `/ajustes` → Perfil is still intentionally disabled with a tooltip — this is now a deliberate inconsistency, not a gap: Firebase Storage **is** set up as of Retos (`lib/firebase.ts#getFirebaseStorage()`, `storage.rules`, `lib/storage/challenge-photos.ts`), but reusing it for the avatar flow (a different upload path/UI) was out of scope for this session. The avatar still falls back to the user's initial on a solid accent circle; wiring it up now just needs a small upload component under an `avatars/{uid}/...` Storage path and a matching rule, not the Storage setup itself.
- **"Horas por mes" uses Recharts**, per the brief; the weekly bars and 14-week heatmap are hand-rolled CSS grids, matching `design-reference/html/*.dc.html` pixel-for-pixel rather than going through a chart library for shapes a chart library doesn't really help with.
- Reminder "next occurrence" text on the dashboard is a simple same-day label (time + day-of-week summary), not a full "next matching weekday" calculation.
- **Visual fidelity varies by screen, intentionally**, given the size of this redesign: Panel, Temporizador, Ajustes, Tienda and the auth/onboarding screens got full structural rewrites against the Pegatina mockups; Estadísticas, Logros, Recordatorios and the Habilidad detail page got every old color-token/border fixed to the new Pegatina look (so nothing looks broken or mixed-style) plus `bx`-class cards, but keep more of their pre-existing layout rather than a full pixel-for-pixel rebuild against their `.dc.html` counterparts. If deeper fidelity on those is wanted, the mockups are in `design-reference/pegatina/html/`.
- **Mascot micro-interactions are basic CSS**, not fine-tuned: the bounce/spin/pulse/sleepy reactions exist and respect `prefers-reduced-motion`, but weren't hand-tuned against the mockup's exact timing/easing.

## Project layout

```
app/
  (app)/            # routes behind the sidebar + auth guard (AppShell)
    page.tsx         "/"              Panel ("Hoy"): streak, mascot, week, stamp album
    temporizador/    "/temporizador"  Pomodoro timer ("Tomate")
    estadisticas/    "/estadisticas"  stats ("Números")
    logros/          "/logros"        achievements timeline + celebration
    tienda/          "/tienda"        shop: buy/equip hats/capes/acc/backgrounds
    recordatorios/   "/recordatorios" reminders + Web Push opt-in
    registrar/       "/registrar"     manual session logging
    habilidades/[id] "/habilidades/:id" skill detail
    ajustes/         "/ajustes"       Perfil + Apariencia (theme/accent)
    retos/           "/retos"         Retos list (active/completed/paused)
    retos/nuevo/     "/retos/nuevo"   create-challenge form + live projection
    retos/[id]/      "/retos/:id"            board: hero, stat tiles, calendar, diary feed
                     "/retos/:id/dia"        today's (or ?day=N's) diary entry
                     "/retos/:id/galeria"    photos / día 1 vs hoy / diario tabs
                     "/retos/:id/cierre"     completed/unfinished closure
  habilidades/nueva/ "/habilidades/nueva" create-skill wizard, 4 steps (no sidebar)
  login/             "/login"         email/password + Google sign-in
  registro/          "/registro"      sign-up (email or Google) -> /onboarding
  recuperar/         "/recuperar"     real Firebase password-reset email
  onboarding/        "/onboarding"    first-run: name Tomi, first skill, pace, welcome coins
  api/push/send/     POST — sends one Web Push notification
  api/cron/reminders/ stub — see "Known limitations"
lib/
  firebase.ts, firestore/*  Firebase client + Firestore data-access layer
                             (economy.ts: pet/inventory/equipped/ledger + purchase tx;
                              challenges.ts: Retos CRUD + saveChallengeDay)
  storage/challenge-photos.ts Firebase Storage upload/validate/delete for diary photos
  auth/AuthProvider.tsx     Firebase Auth context (+ sendPasswordReset)
  theme/                    Pegatina design tokens, ThemeProvider, pre-paint bootstrap
  economy.ts, shop.ts        coins/XP/level formulas + shop catalog (pure, unit-tested)
  challenge.ts, challenge-ui.ts  Retos day-state/streak/projection math (pure,
                             unit-tested) + shared day-cell color/label mapping
  sticker-rotation.ts        deterministic per-card rotation
  milestones.ts, projection.ts, streak.ts, timer.ts, format.ts, manual-log.ts
                             pure, unit-tested logic (no Firebase imports)
  push/                     Web Push subscribe (client) + send (server)
store/timer-store.ts        persisted zustand Pomodoro store
components/
  mascot/Mascot.tsx          Tomi SVG + mood/equip overlays (Rive swap-in point)
  auth/AuthShell.tsx          shared two-pane layout for login/registro/recuperar
  ui/                        Pegatina-styled kit (Button/Card/Chip/Input/Dialog/...)
  layout/, dashboard/, skills/, timer/, achievements/, settings/, stats/, pwa/
design-reference/
  pegatina/                  current design package (mockups/PNGs/tokens/Rive prompt) — reference only
  retos/                     Retos (challenges) design package (6 mockups/PNGs/README) — reference only
  (older files)              previous design package, kept as history
```
