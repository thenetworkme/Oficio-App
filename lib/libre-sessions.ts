import type { PracticeSession } from "@/lib/types";

/** One "Sesión libre" entry as shown in the Estadísticas recent-sessions list. */
export interface LibreSessionEntry {
  id: string;
  skillId: string;
  startedAt: number;
  durationMin: number;
  note: string | null;
}

export interface LibreSessionsSummary {
  /** Libre (stopwatch-sourced) sessions logged since `monthStart`. */
  monthCount: number;
  /** Total minutes across those month-to-date libre sessions. */
  monthMinutes: number;
  /** All-time libre sessions, most recent first, capped at `limit` (default 8). */
  recent: LibreSessionEntry[];
  /** Whether the user has ever logged a libre session (independent of the cap above). */
  hasAny: boolean;
}

/**
 * Pulls out the "Sesión libre" (source === "stopwatch") slice of stats from
 * the full session list: how much libre practice happened this month (same
 * month-to-date pattern as `pomodorosMonth` in estadisticas/page.tsx), plus
 * a recency-sorted list of the most recent libre sessions for display —
 * each carrying its `note`, which (after the SessionSaveDialog fix) holds
 * the "Intención de esta sesión" objective the user typed in, when present.
 */
export function summarizeLibreSessions(
  sessions: Pick<PracticeSession, "id" | "skillId" | "startedAt" | "durationMin" | "note" | "source">[],
  monthStart: number,
  limit = 8,
): LibreSessionsSummary {
  const libre = sessions.filter((s) => s.source === "stopwatch");
  const monthLibre = libre.filter((s) => s.startedAt >= monthStart);
  const recent = [...libre].sort((a, b) => b.startedAt - a.startedAt).slice(0, limit);
  return {
    monthCount: monthLibre.length,
    monthMinutes: monthLibre.reduce((a, s) => a + s.durationMin, 0),
    recent: recent.map((s) => ({ id: s.id, skillId: s.skillId, startedAt: s.startedAt, durationMin: s.durationMin, note: s.note })),
    hasAny: libre.length > 0,
  };
}
