"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { Card, CardHeading } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { SessionSaveDialog } from "@/components/timer/SessionSaveDialog";
import { CelebrationDialog } from "@/components/achievements/CelebrationDialog";
import { useTimerStore } from "@/store/timer-store";
import { cycleDotsFilled, modeTotalSeconds, type PomodoroMode } from "@/lib/timer";
import { useAppData } from "@/lib/hooks/useAppData";
import { saveSession } from "@/lib/firestore/sessions";
import { useCelebration } from "@/lib/hooks/useCelebration";
import { resolveSkillColor } from "@/lib/skill-color";
import { formatMinutes, formatTimeEs } from "@/lib/format";
import { dateKeyInTz } from "@/lib/tz";

const RING_CIRCUMFERENCE = 2 * Math.PI * 150;

const MODE_TABS: { id: PomodoroMode; label: string }[] = [
  { id: "focus", label: "Enfoque" },
  { id: "short", label: "Descanso corto" },
  { id: "long", label: "Descanso largo" },
];

export default function TemporizadorPage() {
  const { user, skills, profile, sessions, timezone, todayKey } = useAppData();
  const store = useTimerStore();
  const { celebration, enqueueCelebration, closeCelebration } = useCelebration();
  const [now, setNow] = useState(() => Date.now());
  const [intention, setIntentionLocal] = useState(store.intention);

  // Sync configured durations from the profile once loaded.
  useEffect(() => {
    if (!profile) return;
    store.setDurations({
      focusMin: profile.pomodoroFocusMin,
      shortMin: profile.pomodoroShortMin,
      longMin: profile.pomodoroLongMin,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.pomodoroFocusMin, profile?.pomodoroShortMin, profile?.pomodoroLongMin]);

  // Tick every second while running, purely to re-render; the actual
  // remaining time is always derived from Date.now(), never decremented.
  // Uses useLayoutEffect (not useEffect) so `now` is refreshed synchronously,
  // before paint, the instant `running` flips to true: while paused the
  // interval below is torn down, so `now` goes stale; without this, resuming
  // after any real pause would briefly (until the next 1s tick) compute
  // `remaining` against that stale `now` instead of the fresh `startedAt`
  // that start() just set, showing a wrong, inflated time.
  useLayoutEffect(() => {
    if (!store.running) return;
    // Synchronous on purpose: this must land before paint (see comment
    // above), which is exactly what useLayoutEffect + a sync setState gives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [store.running]);

  const total = modeTotalSeconds(store.mode, store.durations);
  const remaining = store.getRemainingSeconds(now);

  useEffect(() => {
    if (store.running && remaining <= 0) {
      store.completeFocusPeriod();
    }
  }, [remaining, store.running, store]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const ringColor = store.mode === "focus" ? "var(--accent)" : "var(--a2)";
  const dashOffset = total > 0 ? RING_CIRCUMFERENCE * (1 - remaining / total) : 0;
  const filled = cycleDotsFilled(store.completedFocusCount, store.mode);

  const selectedSkill = skills.find((s) => s.id === store.skillId) ?? skills[0] ?? null;

  const todaySessions = useMemo(
    () =>
      sessions
        .filter((s) => dateKeyInTz(new Date(s.startedAt), timezone) === todayKey)
        .sort((a, b) => a.startedAt - b.startedAt),
    [sessions, timezone, todayKey],
  );

  async function handleSaveSession(quality: number, note: string) {
    const pending = store.pendingSave;
    store.clearPendingSave();
    if (!pending || !user || !pending.skillId) return;
    const skill = skills.find((s) => s.id === pending.skillId);
    if (!skill) return;
    const result = await saveSession({
      userId: user.uid,
      skillId: skill.id,
      startedAt: Date.now() - pending.durationMin * 60_000,
      durationMin: pending.durationMin,
      quality,
      note: note || null,
      pomodoros: pending.pomodoros,
      source: "timer",
    });
    enqueueCelebration(result.milestonesCrossed, {
      skillName: skill.name,
      skillColor: resolveSkillColor(skill.color),
      startedAt: skill.createdAt,
    });
  }

  return (
    <>
      <header className="flex flex-col gap-1">
        <span className="label-xs">Pomodoro</span>
        <h1 className="m-0 text-4xl font-extrabold leading-tight tracking-tight">Una cosa a la vez.</h1>
      </header>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-label="Temporizador" className="flex min-w-0 flex-[2_1_480px] flex-col items-center gap-7 rounded-card border border-line bg-card p-7">
          <div role="group" aria-label="Modo" className="flex flex-wrap justify-center gap-1.5 rounded-2xl border border-line bg-bg p-1.5">
            {MODE_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={store.mode === t.id}
                onClick={() => store.setMode(t.id)}
                className="min-h-11 rounded-button px-5 text-[15px] font-semibold"
                style={{
                  background: store.mode === t.id ? "var(--track)" : "transparent",
                  color: store.mode === t.id ? "var(--text)" : "var(--muted)",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative flex aspect-square w-80 max-w-full items-center justify-center">
            <svg viewBox="0 0 320 320" width="100%" height="100%" className="absolute inset-0 -rotate-90" aria-hidden="true">
              <circle cx="160" cy="160" r="150" fill="none" stroke="var(--track)" strokeWidth="10" />
              <circle
                cx="160"
                cy="160"
                r="150"
                fill="none"
                stroke={ringColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="relative flex flex-col items-center gap-1.5">
              <span role="timer" className="font-num text-[72px] font-medium leading-none tracking-tight">
                {mm}:{ss}
              </span>
              <span className="text-[15px] text-muted">
                {store.mode === "focus" ? "Enfoque profundo" : store.mode === "short" ? "Descanso corto" : "Descanso largo"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button
              type="button"
              aria-label="Reiniciar"
              onClick={store.reset}
              className="flex size-13 items-center justify-center rounded-full border border-line"
            >
              <RotateCcw size={22} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={store.running ? "Pausar" : "Iniciar"}
              onClick={store.running ? store.pause : store.start}
              className="flex size-20 items-center justify-center rounded-full"
              style={{ background: ringColor, color: "var(--on)" }}
            >
              {store.running ? <Pause size={30} fill="currentColor" aria-hidden="true" /> : <Play size={30} fill="currentColor" aria-hidden="true" />}
            </button>
            <button
              type="button"
              aria-label="Saltar al siguiente"
              onClick={store.skip}
              className="flex size-13 items-center justify-center rounded-full border border-line"
            >
              <SkipForward size={22} aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted">
            <div role="img" aria-label={`Pomodoro ${Math.min(filled + (store.mode === "focus" ? 1 : 0), 4)} de 4`} className="flex gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="size-3.5 rounded-full border-2"
                  style={{
                    background: i < filled ? "var(--accent)" : "transparent",
                    borderColor: i < filled ? "var(--accent)" : "var(--line)",
                  }}
                />
              ))}
            </div>
            <span>Pomodoro {Math.min(filled + (store.mode === "focus" ? 1 : 0), 4)} de 4</span>
          </div>
        </section>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <Card className="flex flex-col gap-4 p-5.5">
            <CardHeading>¿Qué vas a practicar?</CardHeading>
            <div role="group" aria-label="Habilidad" className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <Chip
                  key={s.id}
                  pressed={store.skillId === s.id}
                  dotColor={resolveSkillColor(s.color)}
                  onClick={() => store.setSkill(s.id)}
                >
                  {s.name}
                </Chip>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="intencion" className="text-[13px] text-muted">
                Intención de esta sesión
              </label>
              <input
                id="intencion"
                type="text"
                value={intention}
                onChange={(e) => {
                  setIntentionLocal(e.target.value);
                  store.setIntention(e.target.value);
                }}
                placeholder="Ej. Terminar el módulo de autenticación"
                className="box-border w-full min-h-[46px] rounded-button border border-line bg-bg px-3.5 text-[15px] placeholder:text-muted"
              />
            </div>
          </Card>

          <Card className="flex flex-col gap-1.5 p-5.5">
            <CardHeading className="mb-1">Sesiones de hoy</CardHeading>
            {todaySessions.length === 0 ? (
              <p className="py-3 text-sm text-muted">Aún no registras sesiones hoy.</p>
            ) : (
              todaySessions.map((s) => {
                const skill = skills.find((sk) => sk.id === s.skillId);
                return (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 border-t border-line py-3">
                    <span className="font-num min-w-16 text-[13px] text-muted">{formatTimeEs(new Date(s.startedAt))}</span>
                    <span className="min-w-[100px] flex-1 font-semibold">{skill?.name ?? "—"}</span>
                    <span className="font-num text-sm">{formatMinutes(s.durationMin)}</span>
                  </div>
                );
              })
            )}
          </Card>

          <Card className="flex flex-col gap-1 p-4.5 px-5.5">
            <span className="label-xs">Ciclo configurado</span>
            <span className="font-num text-[15px]">
              {store.durations.focusMin} · {store.durations.shortMin} · {store.durations.longMin} min
            </span>
          </Card>
        </aside>
      </div>

      <SessionSaveDialog
        open={Boolean(store.pendingSave) && selectedSkill != null}
        durationMin={store.pendingSave?.durationMin ?? 0}
        skillName={selectedSkill?.name ?? ""}
        onSave={handleSaveSession}
        onDiscard={store.clearPendingSave}
      />

      <CelebrationDialog
        open={celebration.open}
        onClose={closeCelebration}
        skillName={celebration.skillName}
        skillColor={celebration.skillColor}
        hours={celebration.hours}
        achievedAt={celebration.achievedAt}
        startedAt={celebration.startedAt}
      />
    </>
  );
}
