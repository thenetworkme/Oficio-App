"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useAppData } from "@/lib/hooks/useAppData";
import { MobileBottomNav, MobileTopBar } from "./MobileNav";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { streak, profile } = useAppData();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-muted">Cargando…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-wrap items-stretch">
      <Sidebar streakDays={streak} minMinutes={profile?.dailyMinForStreak ?? 30} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main className="mx-auto flex w-full max-w-[1112px] flex-1 flex-col gap-7 px-5 py-7 pb-24 sm:px-8 sm:py-9 lg:pb-12">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
