"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Card, CardHeading } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { AmbientPicker } from "@/components/sound/AmbientPicker";
import { SessionSaveDialog } from "@/components/timer/SessionSaveDialog";
import { CelebrationDialog } from "@/components/achievements/CelebrationDialog";
import { useTimerStore } from "@/store/timer-store";
import { cycleDotsFilled, modeTotalSeconds, type PomodoroMode } from "@/lib/timer";
import { useAppData } from "@/lib/hooks/useAppData";
import { saveSession } from "@/lib/firestore/sessions";
import { useCelebration } from "@/lib/hooks/useCelebration";
import { useSound } from "@/lib/sound/SoundProvider";
import { resolveSkillColor } from "@/lib/skill-color";
import { formatMinutes, formatTimeEs } from "@/lib/format";
import { dateKeyInTz } from "@/lib/tz";

const MODE_TABS: { id: PomodoroMode; label: string }[] = [
  { id: "focus", label: "Enfoque" },
  { id: "short", label: "Corto" },
  { id: "long", label: "Largo" },
];

const MODE_FRUIT: Record<PomodoroMode, string> = { focus: "var(--a2)", short: "var(--a3)", long: "#7CC4FF" };
const MODE_LABEL: Record<PomodoroMode, string> = { focus: "Modo enfoque", short: "Respira", long: "Descanso largo" };

export default function TemporizadorPage() {
  const { user, skills, profile, sessions, timezone, todayKey } = useAppData();
  const store = useTimerStore();
  const { celebration, enqueueCelebration, closeCelebration } = useCelebration();
  const sound = useSound();
  const [now, setNow] = useState(() => Date.now());
  const [intention, setIntentionLocal] = useState(store.intention);

  useEffect(() => {
    if (!profile) return;
    store.setDurations({
      focusMin: profile.pomodoroFocusMin,
      shortMin: profile.pomodoroShortMin,
      longMin: profile.pomodoroLongMin,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.pomodoroFocusMin, profile?.pomodoroShortMin, profile?.pomodoroLongMin]);

  useLayoutEffect(() => {
    if (!store.running) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [store.running]);

  const total = modeTotalSeconds(store.mode, store.durations);
  const remaining = store.getRemainingSeconds(now);

  useEffect(() => {
    if (store.running && remaining <= 0) {
      sound.playComplete();
      sound.stopAmbient();
      store.completeFocusPeriod();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, store.running, store]);

  function handlePlayPause() {
    if (store.running) {
      sound.playPause();
      sound.stopAmbient();
      store.pause();
    } else {
      sound.playStart();
      sound.startAmbientIfSelected();
      store.start();
    }
  }

  function handleReset() {
    sound.playClick();
    sound.stopAmbient();
    store.reset();
  }

  function handleSkip() {
    sound.playClick();
    sound.stopAmbient();
    store.skip();
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const filled = cycleDotsFilled(store.completedFocusCount, store.mode);
  const n = Math.min(filled + (store.mode === "focus" ? 1 : 0), 4);

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
    return result;
  }

  return (
    <>
      <div className="label-xs -mb-2 font-bold">
        Tomate {n} de 4 · {selectedSkill?.name ?? "—"}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-10">
        <div className="relative flex items-center justify-center">
          <div
            className="bx flex size-[320px] flex-col items-center justify-center gap-1 rounded-full text-ink-solid sm:size-[400px]"
            style={{ background: MODE_FRUIT[store.mode], boxShadow: "10px 10px 0 var(--shadow)" }}
          >
            <span role="timer" className="font-num text-[88px] font-bold leading-none tracking-tight sm:text-[120px]">
              {mm}:{ss}
            </span>
            <span className="label-xs !text-ink-solid font-bold opacity-70">{MODE_LABEL[store.mode]}</span>
          </div>
          <div
            className="bx absolute -right-3 top-10 px-4 py-2 text-[18px] font-bold text-ink-solid"
            style={{ background: "var(--a1)", transform: "rotate(8deg)" }}
          >
            {store.running ? "¡Sin distraerte!" : remaining === total ? "¡A darle!" : "En pausa"}
          </div>
        </div>

        <div className="flex min-w-[300px] flex-1 flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div role="group" aria-label="Modo" className="flex flex-wrap gap-2.5">
              {MODE_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={store.mode === t.id}
                  onClick={() => store.setMode(t.id)}
                  className="bx press min-h-12 px-4.5 text-[16px] font-bold"
                  style={
                    store.mode === t.id
                      ? {
                          background: "var(--a1)",
                          color: "var(--ink-solid)",
                          boxShadow: "2px 2px 0 var(--shadow)",
                          transform: "translate(4px,4px)",
                        }
                      : { background: "var(--card)" }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => sound.setSoundEffectsEnabled(!sound.soundEffectsEnabled)}
              aria-label={sound.soundEffectsEnabled ? "Silenciar sonidos" : "Activar sonidos"}
              title={sound.soundEffectsEnabled ? "Silenciar sonidos" : "Activar sonidos"}
              className="bx press flex size-12 items-center justify-center bg-card"
            >
              {sound.soundEffectsEnabled ? (
                <Volume2 size={20} aria-hidden="true" />
              ) : (
                <VolumeX size={20} aria-hidden="true" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handlePlayPause}
            className="bx press min-h-[84px] text-[28px] font-bold"
            style={{ background: "var(--ink)", color: "var(--paper)", boxShadow: "6px 6px 0 var(--a2)" }}
          >
            {store.running ? "Pausa" : "Dale"}
          </button>

          <div className="flex gap-3">
            <button type="button" onClick={handleReset} className="bx press min-h-13 flex-1 bg-card text-[16px] font-bold">
              Reiniciar
            </button>
            <button type="button" onClick={handleSkip} className="bx press min-h-13 flex-1 bg-card text-[16px] font-bold">
              Saltar
            </button>
          </div>

          <Card className="flex flex-col gap-3 p-4.5">
            <CardHeading className="text-[18px]">Sonido ambiente</CardHeading>
            <AmbientPicker label="Elige un ambiente" />
          </Card>

          <Card className="flex flex-col gap-3 p-4.5">
            <CardHeading className="text-[18px]">¿Qué vas a practicar?</CardHeading>
            <div role="group" aria-label="Habilidad" className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <Chip key={s.id} pressed={store.skillId === s.id} dotColor={resolveSkillColor(s.color)} onClick={() => store.setSkill(s.id)}>
                  {s.name}
                </Chip>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="intencion" className="label-xs">
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
                className="box-border w-full min-h-12 rounded-button border-[3px] border-ink bg-card px-3.5 text-[15px] placeholder:text-muted"
              />
            </div>
          </Card>

          <div className="flex gap-2.5" aria-label="Tomates de hoy">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="size-9 rounded-full border-[3px] border-ink" style={{ background: i < filled ? "var(--a2)" : "var(--card)" }} />
            ))}
          </div>

          {todaySessions.length > 0 && (
            <Card className="flex flex-col gap-1 p-4.5">
              <CardHeading className="mb-1 text-[16px]">Sesiones de hoy</CardHeading>
              {todaySessions.map((s) => {
                const skill = skills.find((sk) => sk.id === s.skillId);
                return (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 border-t-2 border-dashed border-ink py-2.5">
                    <span className="font-num min-w-16 text-[13px] text-muted">{formatTimeEs(new Date(s.startedAt))}</span>
                    <span className="min-w-[100px] flex-1 font-bold">{skill?.name ?? "—"}</span>
                    <span className="font-num text-sm">{formatMinutes(s.durationMin)}</span>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
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
