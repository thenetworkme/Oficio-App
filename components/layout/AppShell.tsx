"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AjustesModal } from "@/components/settings/AjustesModal";
import { LogrosModal } from "@/components/achievements/LogrosModal";
import { TopNav } from "./TopNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  // Logros/Ajustes are modals, not routes (see TopNav's own comment) —
  // owned here, one level above TopNav, so they stay mounted/openable
  // from every (app) route rather than being tied to one page.
  const [logrosOpen, setLogrosOpen] = useState(false);
  const [ajustesOpen, setAjustesOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // New sign-ups land here right after creating their account/running the
  // onboarding redirect from /registro; if they somehow reach an app route
  // without having finished /onboarding, send them there once.
  useEffect(() => {
    if (!authLoading && user && profile && !profile.onboardingCompletedAt) router.replace("/onboarding");
  }, [authLoading, user, profile, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <span className="label-xs">Cargando…</span>
      </div>
    );
  }

  // Phase-1 "Pomodoro" note: <TopNav> paints its own full-bleed --mode-bg
  // background (defaults to focus-red) regardless of what's below it — see
  // its own file comment + app/globals.css's --mode-bg contract. This
  // wrapper's `bg-paper` is left as-is on purpose: forcing every
  // not-yet-redesigned page onto a colored background now would strand
  // their text/card contrast (built for the old near-black/white --paper),
  // see globals.css's "Backward compatibility" section. A page that wants
  // the full reference look sets `--mode-bg`/uses --card-solid/--card-tint
  // on its OWN root as it gets redesigned.
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <TopNav onOpenLogros={() => setLogrosOpen(true)} onOpenAjustes={() => setAjustesOpen(true)} />
      {/* `isolate` gives <main> its own stacking context, which is what
          actually makes the ModeBackdrop escape hatch (see its own file
          comment) work: without it, ModeBackdrop's `fixed -z-10` layer
          paints BEHIND this wrapper's own `bg-paper` background instead of
          in front of it — negative-z descendants paint before a non-
          positioned ancestor's background in the same stacking context, per
          CSS2.1 Appendix E — so every redesigned page using ModeBackdrop
          silently fell back to the near-black dark-theme --paper fill
          everywhere except the header, which paints its own background
          directly. Caught via a real-Chromium render of AppShell + a page
          (not a page rendered in isolation, which hides this entirely). */}
      <main className="isolate mx-auto flex w-full max-w-[1360px] flex-1 flex-col gap-7 px-5 py-9 sm:px-10">{children}</main>
      <LogrosModal open={logrosOpen} onOpenChange={setLogrosOpen} />
      <AjustesModal open={ajustesOpen} onOpenChange={setAjustesOpen} />
    </div>
  );
}
