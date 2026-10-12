"use client";

import { Maximize2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Card, CardHeading } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { AmbientPicker } from "@/components/sound/AmbientPicker";
import { SessionSaveDialog } from "@/components/timer/SessionSaveDialog";
import { FullscreenTimer } from "@/components/timer/FullscreenTimer";
import { FullscreenStopwatch } from "@/components/timer/FullscreenStopwatch";
import { CelebrationDialog } from "@/components/achievements/CelebrationDialog";
import { useTimerStore } from "@/store/timer-store";
import { useStopwatchStore } from "@/store/stopwatch-store";
import { cycleDotsFilled, modeTotalSeconds, type PomodoroMode } from "@/lib/timer";
import { formatStopwatchClock, MIN_STOPWATCH_MS } from "@/lib/stopwatch";
import { useAppData } from "@/lib/hooks/useAppData";
import { saveSession } from "@/lib/firestore/sessions";
import { watchChallenges } from "@/lib/firestore/challenges";
import { dayNumberForDate } from "@/lib/challenge";
import { useCelebration } from "@/lib/hooks/useCelebration";
import { notifyPeriodComplete } from "@/lib/notifications/browserNotify";
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import { useSound } from "@/lib/sound/SoundProvider";
import { resolveSkillColor } from "@/lib/skill-color";
import { formatMinutes, formatTimeEs } from "@/lib/format";
import { dateKeyInTz } from "@/lib/tz";
import type { Challenge } from "@/lib/types";

const MODE_TABS: { id: PomodoroMode; label: string }[] = [
  { id: "focus", label: "Enfoque" },
  { id: "short", label: "Corto" },
  { id: "long", label: "Largo" },
];

const MODE_FRUIT: Record<PomodoroMode, string> = { focus: "var(--a2)", short: "var(--a3)", long: "#7CC4FF" };
const MODE_LABEL: Record<PomodoroMode, string> = { focus: "Modo enfoque", short: "Respira", long: "Descanso largo" };

type ScreenMode = "pomodoro" | "libre";
const SCREEN_TABS: { id: ScreenMode; label: string }[] = [
  { id: "pomodoro", label: "Pomodoro" },
  { id: "libre", label: "Libre" },
];

export default function TemporizadorPage() {
  const { user, skills, profile, sessions, timezone, todayKey } = useAppData();
  const store = useTimerStore();
  const stopwatch = useStopwatchStore();
  const { celebration, enqueueCelebration, closeCelebration } = useCelebration();
  const sound = useSound();
  const notifications = useNotifications();
  const [now, setNow] = useState(() => Date.now());
  const [swNow, setSwNow] = useState(() => Date.now());
  const [intention, setIntentionLocal] = useState(store.intention);
  const [swIntention, setSwIntentionLocal] = useState(stopwatch.intention);
  const [screenMode, setScreenMode] = useState<ScreenMode>("pomodoro");
  // Brief inline notice when the user hits "Detener" before the minimum
  // loggable duration — cleared on the next stopwatch action rather than a
  // timeout, so it never disappears mid-read if the user is away.
  const [tooShortNotice, setTooShortNotice] = useState(false);
  // Purely presentational view state for the fullscreen takeover — the
  // store already tracks mode/running/timing, so this doesn't need to live
  // in it; it just resets to "normal" on navigation, which is fine.
  const [fullscreen, setFullscreen] = useState(false);
  const [zen, setZen] = useState(false);
  const [libreFullscreen, setLibreFullscreen] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

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

  // Same wall-clock resync pattern as above, applied to the "Sesión libre"
  // stopwatch: without this, resuming after a long pause would briefly show
  // a stale (too-small) elapsed time until the next 1s tick — the same bug
  // class the Pomodoro countdown had before this fix (see
  // tests/timer-clock-sync.test.tsx).
  useLayoutEffect(() => {
    if (!stopwatch.running) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSwNow(Date.now());
    const id = setInterval(() => setSwNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [stopwatch.running]);

  // Resets local state when the signed-in user changes, before the
  // subscription below delivers its own snapshot (same pattern as
  // useAppData's skills/sessions reset).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) {
      setChallenges([]);
      return;
    }
    return watchChallenges(user.uid, setChallenges);
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Zen is a focus-only variant (there's no zen chrome for the break
  // screens in the design): rather than an effect fighting the mode change,
  // this is derived directly so leaving focus mode (a break starting, or
  // skipping/resetting) drops back to the regular colored fullscreen view
  // with no extra render.
  const zenActive = zen && store.mode === "focus";

  const total = modeTotalSeconds(store.mode, store.durations);
  const remaining = store.getRemainingSeconds(now);

  useEffect(() => {
    if (store.running && remaining <= 0) {
      sound.playComplete();
      notifyPeriodComplete(store.mode, notifications.notificationsEnabled);
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

  const challengeDayLabel = useMemo(() => {
    if (!selectedSkill) return null;
    const active = challenges.find((c) => c.skillId === selectedSkill.id && c.status === "active");
    if (!active) return null;
    const startKey = dateKeyInTz(new Date(active.startedAt), timezone);
    const day = dayNumberForDate(startKey, todayKey);
    return day >= 1 ? `reto día ${day}` : null;
  }, [selectedSkill, challenges, timezone, todayKey]);

  function handleFinishNow() {
    sound.playComplete();
    notifyPeriodComplete(store.mode, notifications.notificationsEnabled);
    sound.stopAmbient();
    store.completeFocusPeriod();
  }

  function handleExtend(seconds: number) {
    sound.playClick();
    store.extend(seconds);
  }

  const stopwatchElapsedMs = stopwatch.getElapsedMs(swNow);
  const stopwatchSelectedSkill = skills.find((s) => s.id === stopwatch.skillId) ?? skills[0] ?? null;
  const stopwatchHasTime = stopwatch.running || stopwatchElapsedMs > 0;

  function handleStopwatchPlayPause() {
    setTooShortNotice(false);
    if (stopwatch.running) {
      sound.playPause();
      sound.stopAmbient();
      stopwatch.pause();
    } else if (stopwatchElapsedMs > 0) {
      sound.playStart();
      sound.startAmbientIfSelected();
      stopwatch.resume();
    } else {
      sound.playStart();
      sound.startAmbientIfSelected();
      stopwatch.start();
    }
  }

  function handleStopwatchStop(): boolean {
    sound.stopAmbient();
    const longEnough = stopwatch.stop();
    if (longEnough) {
      sound.playComplete();
    } else {
      // Too short to log (see lib/stopwatch's MIN_STOPWATCH_MS): the elapsed
      // time is still banked (stop() pauses rather than discarding), so the
      // user can resume and keep practicing instead of losing it.
      sound.playPause();
      setTooShortNotice(true);
    }
    return longEnough;
  }

  function handleStopwatchReset() {
    sound.playClick();
    sound.stopAmbient();
    setTooShortNotice(false);
    stopwatch.reset();
  }

  const todaySessions = useMemo(
    () =>
      sessions
        .filter((s) => dateKeyInTz(new Date(s.startedAt), timezone) === todayKey)
        .sort((a, b) => a.startedAt - b.startedAt),
    [sessions, timezone, todayKey],
  );

  async function handleSaveSession(quality: number, note: string) {
    const pending = store.pendingSave;
    if (!pending || !user || !pending.skillId) {
      store.clearPendingSave();
      return;
    }
    const skill = skills.find((s) => s.id === pending.skillId);
    if (!skill) {
      store.clearPendingSave();
      return;
    }
    // Note: pendingSave is NOT cleared until the write below actually
    // succeeds. pendingSave is itself persisted (store/timer-store.ts), so
    // if saveSession throws — e.g. connectivity drops right as the focus
    // period ends, and the transaction it runs can't reach Firestore — the
    // just-completed session isn't lost: it survives in localStorage and
    // this dialog stays open (SessionSaveDialog is keyed off
    // `store.pendingSave`) so the user can retry once back online, instead
    // of the completed Pomodoro silently vanishing.
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
    store.clearPendingSave();
    enqueueCelebration(result.milestonesCrossed, {
      skillName: skill.name,
      skillColor: resolveSkillColor(skill.color),
      startedAt: skill.createdAt,
    });
    return result;
  }

  async function handleSaveStopwatchSession(quality: number, note: string) {
    const pending = stopwatch.pendingSave;
    if (!pending || !user || !pending.skillId) {
      stopwatch.clearPendingSave();
      return;
    }
    const skill = skills.find((s) => s.id === pending.skillId);
    if (!skill) {
      stopwatch.clearPendingSave();
      return;
    }
    // Same reasoning as handleSaveSession above: pendingSave (persisted in
    // store/stopwatch-store.ts) is only cleared after a successful write, so
    // a dropped connection right as the stopwatch stops doesn't silently
    // lose the session — it survives in localStorage and this dialog stays
    // open for a retry.
    const result = await saveSession({
      userId: user.uid,
      skillId: skill.id,
      startedAt: Date.now() - pending.durationMin * 60_000,
      durationMin: pending.durationMin,
      quality,
      note: note || null,
      pomodoros: 0,
      source: "stopwatch",
    });
    stopwatch.clearPendingSave();
    enqueueCelebration(result.milestonesCrossed, {
      skillName: skill.name,
      skillColor: resolveSkillColor(skill.color),
      startedAt: skill.createdAt,
    });
    return result;
  }

  return (
    <>
      <div role="group" aria-label="Tipo de sesión" className="flex flex-wrap gap-2.5">
        {SCREEN_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={screenMode === t.id}
            onClick={() => {
              sound.playClick();
              setScreenMode(t.id);
            }}
            className="bx press min-h-12 px-4.5 text-[16px] font-bold"
            style={
              screenMode === t.id
                ? {
                    background: "var(--ink)",
                    color: "var(--paper)",
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

      {screenMode === "pomodoro" && (
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
            <span
              role="timer"
              className="font-num text-[88px] font-bold leading-none tracking-tight sm:text-[120px]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
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

          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="bx press flex min-h-13 items-center justify-center gap-2 bg-card text-[16px] font-bold"
          >
            <Maximize2 size={18} aria-hidden="true" />
            Modo enfoque (pantalla completa)
          </button>

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
          </div>
          </div>
        </>
      )}

      {screenMode === "libre" && (
        <div className="flex flex-wrap items-center justify-center gap-10">
          <div className="relative flex items-center justify-center">
            <div
              className="bx flex size-[320px] flex-col items-center justify-center gap-1 rounded-full text-ink-solid sm:size-[400px]"
              style={{ background: "var(--a3)", boxShadow: "10px 10px 0 var(--shadow)" }}
            >
              <span
                role="timer"
                className="font-num text-[72px] font-bold leading-none tracking-tight sm:text-[100px]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatStopwatchClock(stopwatchElapsedMs)}
              </span>
              <span className="label-xs !text-ink-solid font-bold opacity-70">Sesión libre</span>
            </div>
            <div
              className="bx absolute -right-3 top-10 px-4 py-2 text-[18px] font-bold text-ink-solid"
              style={{ background: "var(--a1)", transform: "rotate(8deg)" }}
            >
              {stopwatch.running ? "¡Dale que vas bien!" : stopwatchHasTime ? "En pausa" : "¡A darle!"}
            </div>
          </div>

          <div className="flex min-w-[300px] flex-1 flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <p className="m-0 max-w-[320px] text-sm text-muted">
                Sin ciclos ni duración fija: pulsa Dale, practica, y Detener cuando termines.
              </p>
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
              onClick={handleStopwatchPlayPause}
              className="bx press min-h-[84px] text-[28px] font-bold"
              style={{ background: "var(--ink)", color: "var(--paper)", boxShadow: "6px 6px 0 var(--a3)" }}
            >
              {stopwatch.running ? "Pausa" : "Dale"}
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleStopwatchStop}
                disabled={!stopwatchHasTime}
                className="bx press min-h-13 flex-1 bg-card text-[16px] font-bold disabled:opacity-60"
              >
                Detener
              </button>
              <button type="button" onClick={handleStopwatchReset} className="bx press min-h-13 flex-1 bg-card text-[16px] font-bold">
                Reiniciar
              </button>
            </div>

            <button
              type="button"
              onClick={() => setLibreFullscreen(true)}
              className="bx press flex min-h-13 items-center justify-center gap-2 bg-card text-[16px] font-bold"
            >
              <Maximize2 size={18} aria-hidden="true" />
              Modo libre (pantalla completa)
            </button>

            {tooShortNotice && (
              <div className="bx px-4 py-2.5 text-[15px] font-bold text-ink-solid" style={{ background: "var(--a1)" }}>
                Practica al menos {MIN_STOPWATCH_MS / 60_000} minuto para poder guardar la sesión. Tu tiempo sigue contando: pulsa Dale para seguir.
              </div>
            )}

            <Card className="flex flex-col gap-3 p-4.5">
              <CardHeading className="text-[18px]">Sonido ambiente</CardHeading>
              <AmbientPicker label="Elige un ambiente" />
            </Card>

            <Card className="flex flex-col gap-3 p-4.5">
              <CardHeading className="text-[18px]">¿Qué vas a practicar?</CardHeading>
              <div role="group" aria-label="Habilidad" className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <Chip
                    key={s.id}
                    pressed={stopwatch.skillId === s.id}
                    dotColor={resolveSkillColor(s.color)}
                    onClick={() => stopwatch.setSkill(s.id)}
                  >
                    {s.name}
                  </Chip>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="sw-intencion" className="label-xs">
                  Intención de esta sesión
                </label>
                <input
                  id="sw-intencion"
                  type="text"
                  value={swIntention}
                  onChange={(e) => {
                    setSwIntentionLocal(e.target.value);
                    stopwatch.setIntention(e.target.value);
                  }}
                  placeholder="Ej. Improvisar sobre un acorde"
                  className="box-border w-full min-h-12 rounded-button border-[3px] border-ink bg-card px-3.5 text-[15px] placeholder:text-muted"
                />
              </div>
            </Card>
          </div>
        </div>
      )}

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

      <FullscreenTimer
        open={fullscreen}
        mode={store.mode}
        zen={zenActive}
        running={store.running}
        remaining={remaining}
        total={total}
        dotsFilled={filled}
        currentTomato={n}
        skill={selectedSkill}
        intention={intention}
        challengeDayLabel={challengeDayLabel}
        onToggleRunning={handlePlayPause}
        onExtend={handleExtend}
        onFinishNow={handleFinishNow}
        onSkipBreak={handleSkip}
        onToggleZen={() => setZen((z) => !z)}
        onExit={() => {
          setZen(false);
          setFullscreen(false);
        }}
      />

      <FullscreenStopwatch
        open={libreFullscreen}
        running={stopwatch.running}
        elapsedMs={stopwatchElapsedMs}
        hasTime={stopwatchHasTime}
        tooShortNotice={tooShortNotice}
        skill={stopwatchSelectedSkill}
        intention={swIntention}
        onToggleRunning={handleStopwatchPlayPause}
        onStop={() => {
          // Only exit fullscreen once the session actually saved (banked a
          // pendingSave); if it was too short, stay on screen so the
          // "too short" notice is visible and the user can keep practicing.
          if (handleStopwatchStop()) setLibreFullscreen(false);
        }}
        onExit={() => setLibreFullscreen(false)}
      />

      <SessionSaveDialog
        open={Boolean(store.pendingSave) && selectedSkill != null}
        durationMin={store.pendingSave?.durationMin ?? 0}
        skillName={selectedSkill?.name ?? ""}
        onSave={handleSaveSession}
        onDiscard={store.clearPendingSave}
      />

      <SessionSaveDialog
        open={Boolean(stopwatch.pendingSave) && stopwatchSelectedSkill != null}
        durationMin={stopwatch.pendingSave?.durationMin ?? 0}
        skillName={stopwatchSelectedSkill?.name ?? ""}
        onSave={handleSaveStopwatchSession}
        onDiscard={stopwatch.clearPendingSave}
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
