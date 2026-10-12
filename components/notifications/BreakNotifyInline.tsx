"use client";

import { Bell, BellOff } from "lucide-react";
import { useState } from "react";
import { useNotifications } from "@/lib/notifications/NotificationProvider";

/**
 * Compact inline affordance for the "Recordatorio de descanso" settings
 * cards (both the normal panel in temporizador/page.tsx and the fullscreen
 * popover in FullscreenStopwatch.tsx): a user configuring a libre break
 * reminder has no reason to know the Windows/OS-level notification piece
 * requires a SEPARATE opt-in, normally only surfaced in Ajustes -> Perfil.
 * This lets them turn it on right here, without leaving the Temporizador
 * screen, reusing the exact same useNotifications() flow (and the exact
 * same "denied"/"unsupported" messaging already used in PerfilPanel) rather
 * than inventing a second settings surface.
 */
export function BreakNotifyInline() {
  const notifications = useNotifications();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Only matters when notificationsEnabled is false: tells us whether the
  // browser already said "no" in the past (so we show the re-enable-from-
  // browser-settings message instead of a button that would just prompt
  // again and get silently auto-denied).
  const alreadyDenied =
    typeof window !== "undefined" && "Notification" in window && Notification.permission === "denied";

  async function handleEnable() {
    setBusy(true);
    setNote("");
    try {
      const outcome = await notifications.setNotificationsEnabled(true);
      if (outcome === "denied") {
        setNote("Bloqueaste los avisos en tu navegador. Para activarlos, cámbialo desde los ajustes de notificaciones del navegador.");
      } else if (outcome === "unsupported") {
        setNote("Tu navegador no admite notificaciones de escritorio.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (notifications.notificationsEnabled) {
    return (
      <p className="m-0 flex items-center gap-2 text-sm text-muted">
        <Bell size={16} aria-hidden="true" className="shrink-0" />
        Recibirás un aviso de tu sistema cuando sea hora de descansar.
      </p>
    );
  }

  if (!notifications.notificationsSupported) {
    return (
      <p className="m-0 flex items-center gap-2 text-sm text-muted">
        <BellOff size={16} aria-hidden="true" className="shrink-0" />
        Tu navegador no admite notificaciones de escritorio.
      </p>
    );
  }

  if (alreadyDenied) {
    return (
      <p className="m-0 flex items-center gap-2 text-sm text-muted">
        <BellOff size={16} aria-hidden="true" className="shrink-0" />
        Bloqueaste los avisos en tu navegador. Para activarlos, cámbialo desde los ajustes de notificaciones del navegador.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        onClick={handleEnable}
        disabled={busy}
        className="bx press flex min-h-9 items-center gap-2 rounded-chip border-[3px] border-ink bg-card px-3 text-[13px] font-bold disabled:opacity-60"
      >
        <Bell size={15} aria-hidden="true" />
        Avisarme también por notificación
      </button>
      {note && (
        <p role="status" className="m-0 w-full text-sm text-muted">
          {note}
        </p>
      )}
    </div>
  );
}
