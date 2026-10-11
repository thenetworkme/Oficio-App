import { NextResponse } from "next/server";

/**
 * Follow-up, not yet implemented: this is where a Vercel Cron Job would call
 * in to find reminders due "now" and dispatch Web Push notifications for
 * them via lib/push/send-server.ts.
 *
 * It isn't wired up because reading Firestore from a server route needs the
 * Firebase Admin SDK (a service account), which this build doesn't set up —
 * everywhere else in the app reads Firestore from the signed-in client
 * instead. To finish this:
 *   1. Add `firebase-admin`, initialize it here with a service account
 *      (FIREBASE_SERVICE_ACCOUNT_* env vars, kept server-only).
 *   2. Query `reminders` where enabled == true, matching today's weekday
 *      and a timeOfDay within the cron's firing window, resolving each
 *      reminder's timezone from its user's `profiles` doc.
 *   3. For each match, read that user's `pushSubscriptions` and call
 *      sendPushNotification for each one; prune subscriptions that come
 *      back with a 404/410 (expired).
 *   4. For "streak_guard" reminders specifically, skip sending if
 *      needsStreakGuard() (lib/streak.ts) says the minimum is already met.
 *   5. Schedule it with a `crons` entry in vercel.json hitting this route,
 *      authenticated with the same CRON_SECRET used by /api/push/send.
 */
export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Cron de recordatorios pendiente de implementar (ver comentario en route.ts)." },
    { status: 501 },
  );
}
