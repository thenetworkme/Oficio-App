"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { listChallengeDays, watchChallenges } from "@/lib/firestore/challenges";
import { computeChallengeStreak, computeDayStates, totalInvestedMin } from "@/lib/challenge";
import { dateKeyInTz } from "@/lib/tz";
import type { Challenge, ChallengeDay } from "@/lib/types";

export interface ChallengeStats {
  challenge: Challenge;
  days: ChallengeDay[];
  currentDayNumber: number;
  states: ReturnType<typeof computeDayStates>["states"];
  streak: ReturnType<typeof computeChallengeStreak>;
  investedMin: number;
}

/** Live challenges for the signed-in user, each enriched with its days and
 * derived stats (day states, streak, invested minutes) via lib/challenge.ts. */
export function useChallenges() {
  const { user, profile } = useAuth();
  const timezone = profile?.timezone ?? "America/Santo_Domingo";
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [daysByChallenge, setDaysByChallenge] = useState<Record<string, ChallengeDay[]>>({});
  const [loading, setLoading] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) {
      setChallenges([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return watchChallenges(user.uid, (list) => {
      setChallenges(list);
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(challenges.map((c) => listChallengeDays(c.id).then((days) => [c.id, days] as const))).then((pairs) => {
      if (cancelled) return;
      setDaysByChallenge(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [challenges]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const stats = useMemo<ChallengeStats[]>(() => {
    const todayKey = dateKeyInTz(new Date(), timezone);
    return challenges.map((challenge) => {
      const days = daysByChallenge[challenge.id] ?? [];
      const startKey = dateKeyInTz(new Date(challenge.startedAt), timezone);
      const elapsed = Math.floor((Date.parse(`${todayKey}T00:00:00Z`) - Date.parse(`${startKey}T00:00:00Z`)) / 86_400_000) + 1;
      const currentDayNumber = Math.min(challenge.totalDays, Math.max(1, elapsed));
      const { states } = computeDayStates(
        challenge.totalDays,
        currentDayNumber,
        days.map((d) => ({ dayNumber: d.dayNumber, durationMin: d.durationMin })),
        challenge.graceDaysAllowed,
      );
      return {
        challenge,
        days,
        currentDayNumber,
        states,
        streak: computeChallengeStreak(states),
        investedMin: totalInvestedMin(days.map((d) => ({ dayNumber: d.dayNumber, durationMin: d.durationMin }))),
      };
    });
  }, [challenges, daysByChallenge, timezone]);

  return { challenges, stats, loading, timezone };
}
