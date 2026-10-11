"use client";

import { useCallback, useState } from "react";

export interface CelebrationState {
  open: boolean;
  skillName: string;
  skillColor: string;
  hours: number;
  achievedAt: number | null;
  startedAt: number | null;
}

const INITIAL: CelebrationState = {
  open: false,
  skillName: "",
  skillColor: "var(--accent)",
  hours: 1,
  achievedAt: null,
  startedAt: null,
};

/** Queues one milestone celebration at a time; if a session crosses several
 * milestones at once, they're shown one after another in ascending order. */
export function useCelebration() {
  const [queue, setQueue] = useState<Omit<CelebrationState, "open">[]>([]);
  const [current, setCurrent] = useState<CelebrationState>(INITIAL);

  const enqueue = useCallback(
    (milestones: number[], meta: { skillName: string; skillColor: string; startedAt: number | null }) => {
      if (milestones.length === 0) return;
      const now = Date.now();
      const items = milestones.map((hours) => ({ ...meta, hours, achievedAt: now }));
      setQueue((q) => {
        const next = [...q, ...items];
        if (!current.open) {
          const [head, ...rest] = next;
          setCurrent({ ...head, open: true });
          return rest;
        }
        return next;
      });
    },
    [current.open],
  );

  const close = useCallback(() => {
    setQueue((q) => {
      if (q.length === 0) {
        setCurrent((c) => ({ ...c, open: false }));
        return q;
      }
      const [head, ...rest] = q;
      setCurrent({ ...head, open: true });
      return rest;
    });
  }, []);

  return { celebration: current, enqueueCelebration: enqueue, closeCelebration: close };
}
