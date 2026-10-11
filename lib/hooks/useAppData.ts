"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { watchSkills } from "@/lib/firestore/skills";
import { watchSessionsSince } from "@/lib/firestore/sessions";
import { computeCurrentStreak, type DailyMinutes } from "@/lib/streak";
import { dateKeyInTz } from "@/lib/tz";
import type { PracticeSession, Skill } from "@/lib/types";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/** Live skills + last-90-days sessions for the signed-in user, plus derived streak info. */
export function useAppData() {
  const { user, profile } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Reset local state when the signed-in user changes (including signing
  // out), before the subscriptions below deliver their own snapshots.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) {
      setSkills([]);
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubSkills = watchSkills(user.uid, setSkills);
    const unsubSessions = watchSessionsSince(user.uid, Date.now() - NINETY_DAYS_MS, (s) => {
      setSessions(s);
      setLoading(false);
    });
    return () => {
      unsubSkills();
      unsubSessions();
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [user]);

  const timezone = profile?.timezone ?? "America/Santo_Domingo";

  const dailyMinutes = useMemo<DailyMinutes>(() => {
    const map: DailyMinutes = {};
    for (const s of sessions) {
      const key = dateKeyInTz(new Date(s.startedAt), timezone);
      map[key] = (map[key] ?? 0) + s.durationMin;
    }
    return map;
  }, [sessions, timezone]);

  const todayKey = dateKeyInTz(new Date(), timezone);
  const minDaily = profile?.dailyMinForStreak ?? 30;
  const streak = useMemo(
    () => computeCurrentStreak(dailyMinutes, minDaily, todayKey),
    [dailyMinutes, minDaily, todayKey],
  );

  const todayMinutes = dailyMinutes[todayKey] ?? 0;

  const weekStartMs = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0 Sun .. 6 Sat
    const diffToMonday = (day + 6) % 7;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - diffToMonday);
    return monday.getTime();
  }, []);

  const weekMinutes = useMemo(
    () => sessions.filter((s) => s.startedAt >= weekStartMs).reduce((acc, s) => acc + s.durationMin, 0),
    [sessions, weekStartMs],
  );

  const totalHours = useMemo(() => skills.reduce((acc, s) => acc + s.totalMinutes / 60, 0), [skills]);

  return {
    user,
    profile,
    skills,
    sessions,
    dailyMinutes,
    timezone,
    todayKey,
    todayMinutes,
    weekMinutes,
    totalHours,
    streak,
    loading,
  };
}
