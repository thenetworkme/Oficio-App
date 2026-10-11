"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { updateProfile } from "@/lib/firestore/profiles";
import { DEFAULT_PROFILE } from "@/lib/types";
import { isNotificationSupported } from "./browserNotify";

/** Outcome of a toggle-on attempt, so the caller can show the right inline
 * message: "granted" persisted the setting, "denied" means the browser's
 * permission prompt was answered no (or was already "denied" before), and
 * "unsupported" means this browser has no Notification API at all. */
export type NotificationPermissionOutcome = "granted" | "denied" | "unsupported";

interface NotificationContextValue {
  notificationsEnabled: boolean;
  notificationsSupported: boolean;
  /**
   * Turning on: requests permission (a user gesture is required — call this
   * only from a click handler) and persists `notificationsEnabled: true`
   * ONLY if permission comes back "granted". Never auto-requests permission
   * on its own.
   * Turning off: always just persists `false`, no permission involved.
   */
  setNotificationsEnabled: (enabled: boolean) => Promise<NotificationPermissionOutcome>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [enabled, setEnabled] = useState(DEFAULT_PROFILE.notificationsEnabled);

  useEffect(() => {
    if (!profile) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(profile.notificationsEnabled);
  }, [profile]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notificationsEnabled: enabled,
      notificationsSupported: isNotificationSupported(),
      async setNotificationsEnabled(next) {
        if (!next) {
          setEnabled(false);
          if (profile) void updateProfile(profile.uid, { notificationsEnabled: false });
          return "granted";
        }
        if (!isNotificationSupported()) return "unsupported";
        // Only request when not already denied/granted from a previous
        // session — requestPermission() resolves immediately to the
        // existing value without prompting again in that case anyway, but
        // being explicit avoids relying on that browser behavior.
        const permission =
          Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
        if (permission === "granted") {
          setEnabled(true);
          if (profile) void updateProfile(profile.uid, { notificationsEnabled: true });
          return "granted";
        }
        return "denied";
      },
    }),
    [enabled, profile],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
