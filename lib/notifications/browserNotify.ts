// Native OS notifications for Pomodoro period completion — the browser
// `Notification` Web API, NOT Firebase Cloud Messaging. Purely client-side,
// same-tab-independent desktop notifications; no server/push subscription
// involved. Kept as a plain module (rather than a React context) since all
// it needs to do is "fire a notification right now, given the current
// state" — there's no state here worth wrapping in a provider beyond the
// `notificationsEnabled` flag, which already lives on Profile and is synced
// by lib/notifications/NotificationProvider.tsx.
import type { PomodoroMode } from "@/lib/timer";

/** Guards every call site: this is a Next.js app, these modules also run
 * server-side during SSR, where `Notification`/`window` don't exist. */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

const COPY: Record<PomodoroMode, { title: string; body: string }> = {
  focus: {
    title: "¡Sesión de enfoque terminada!",
    body: "Buen trabajo. Tómate un descanso.",
  },
  short: {
    title: "Descanso terminado, ¡a por el siguiente enfoque!",
    body: "Vuelve cuando quieras, tu tomate te espera.",
  },
  long: {
    title: "Descanso largo terminado, ¡a por el siguiente enfoque!",
    body: "Un ciclo completo hecho. Cuando quieras, seguimos.",
  },
};

/**
 * Fires a native OS notification for the period that just finished —
 * called from the exact spot `sound.playComplete()` already is (see
 * app/(app)/temporizador/page.tsx), so both fire at the same moment.
 *
 * Only actually shows anything when all of these hold:
 * - the user opted in (`notificationsEnabled`, persisted on Profile)
 * - the Notification API exists in this browser
 * - permission is already "granted" (never requested here — requesting
 *   happens once, from a user gesture, in NotificationProvider)
 * - the tab is not the visible/focused one — the in-app sound + toast
 *   already cover the foreground case, so a native notification on top of
 *   that would be double feedback.
 */
export function notifyPeriodComplete(mode: PomodoroMode, notificationsEnabled: boolean): void {
  if (!notificationsEnabled) return;
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;

  const { title, body } = COPY[mode];
  try {
    new Notification(title, { body, icon: "/icons/icon-192.png" });
  } catch {
    // Some browsers can still throw (e.g. permission revoked between the
    // check above and here) — never let a notification failure break the
    // timer flow.
  }
}

const LIBRE_BREAK_COPY: Record<"start" | "end", { title: string; body: string }> = {
  start: {
    title: "Hora de un descanso",
    body: "Llevas un buen rato en sesión libre. Tu tiempo quedó en pausa — vuelve cuando quieras.",
  },
  end: {
    title: "¿Seguimos?",
    body: "Tu descanso terminó. Tu sesión libre te espera, pulsa Dale cuando estés listo.",
  },
};

/**
 * Fires a native OS notification for the "Sesión libre" break reminder —
 * the SECONDARY feedback channel, for when the tab isn't focused. The
 * PRIMARY feedback (the break actually starting/ending, with its own sound
 * and the fullscreen/inline break view appearing) happens regardless of tab
 * visibility, from the same spot in temporizador/page.tsx that calls this.
 *
 * Same guard conditions as notifyPeriodComplete, including the
 * visibility check — that guard only prevents a REDUNDANT OS notification
 * on top of the in-app feedback while the tab is visible, it never
 * suppresses the in-app feedback itself.
 */
export function notifyLibreBreak(kind: "start" | "end", notificationsEnabled: boolean): void {
  if (!notificationsEnabled) return;
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;

  const { title, body } = LIBRE_BREAK_COPY[kind];
  try {
    new Notification(title, { body, icon: "/icons/icon-192.png" });
  } catch {
    // See notifyPeriodComplete's identical catch above.
  }
}
