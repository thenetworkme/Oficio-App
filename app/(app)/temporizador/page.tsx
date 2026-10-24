"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeading } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Input, Label } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AmbientPicker } from "@/components/sound/AmbientPicker";
import { SessionSaveDialog } from "@/components/timer/SessionSaveDialog";
import { FullscreenTimer } from "@/components/timer/FullscreenTimer";
import { FullscreenStopwatch } from "@/components/timer/FullscreenStopwatch";
import { CelebrationDialog } from "@/components/achievements/CelebrationDialog";
import { BreakNotifyInline } from "@/components/notifications/BreakNotifyInline";
import { useTimerStore } from "@/store/timer-store";
import { useStopwatchStore } from "@/store/stopwatch-store";
import { cycleDotsFilled, modeTotalSeconds, type PomodoroMode } from "@/lib/timer";
import { formatStopwatchClock, MIN_STOPWATCH_MS } from "@/lib/stopwatch";
import { useAppData } from "@/lib/hooks/useAppData";
import { saveSession } from "@/lib/firestore/sessions";
import { updateProfile } from "@/lib/firestore/profiles";
import { watchChallenges } from "@/lib/firestore/challenges";
import { dayNumberForDate } from "@/lib/challenge";
import { useCelebration } from "@/lib/hooks/useCelebration";
import { notifyLibreBreak, notifyPeriodComplete } from "@/lib/notifications/browserNotify";
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import { useSound } from "@/lib/sound/SoundProvider";
import { resolveSkillColor } from "@/lib/skill-color";
import { formatInt, formatMinutes, formatTimeEs } from "@/lib/format";
import { dateKeyInTz } from "@/lib/tz";
import type { Challenge } from "@/lib/types";

const MODE_TABS: { id: PomodoroMode; label: string }[] = [
  { id: "focus", label: "Foco" },
  { id: "short", label: "Descanso corto" },
  { id: "long", label: "Descanso largo" },
];

type ScreenMode = "pomodoro" | "libre";
const SCREEN_TABS: { id: ScreenMode; label: string }[] = [
  { id: "pomodoro", label: "Pomodoro" },
  { id: "libre", label: "Libre" },
];

// Short/long break tip cards shown on the normal (non-fullscreen) panel —
// matches design-reference/pomodoro/html/PomoPausaCorta.dc.html /
// PomoPausaLarga.dc.html, which are literally this same Timer page with an
// extra `.card` tip block between the timer and the task list while a break
// mode is active.
const BREAK_TIPS: Record<"short" | "long", { title: string; body: string }> = {
  short: { title: "Levántate y estira", body: "Mira lejos, toma agua y relaja los hombros. Son solo cinco minutos." },
  long: { title: "Muévete un rato", body: "Camina, come algo ligero y deja el teléfono. Volverás con la cabeza clara." },
};

const HOURS_GOAL = 10_000;

/** Reference's `.tabw` pill: transparent/hover-tinted when off, a soft black
 * overlay + bold when selected — used for the Pomodoro mode tabs sitting on
 * the translucent `tone="tint"` card. */
function ModeTabPill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className="rounded-[4px] px-3 py-1 text-[15px] transition-colors"
      style={{
        background: on ? "rgb(0 0 0 / 15%)" : "transparent",
        color: "var(--mode-ink)",
        fontWeight: on ? 600 : 400,
        opacity: on ? 1 : 0.95,
      }}
    >
      {children}
    </button>
  );
}

/** The Pomodoro/Libre screen-type toggle — no reference equivalent (this
 * design has no "Sesión libre" concept), styled as a segmented pair of
 * translucent-on-color pills sitting directly on --mode-bg, echoing the
 * header's own NavPill treatment so it reads as "part of this design"
 * rather than a foreign control. See the final report for this judgment
 * call. */
function ScreenTypeTab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className="inline-flex h-9 items-center rounded-chip border px-4 text-[13px] font-semibold uppercase tracking-[0.08em] transition-colors"
      style={
        on
          ? { background: "var(--mode-ink)", color: "var(--mode-bg)", borderColor: "transparent" }
          : { background: "var(--card-tint)", color: "var(--mode-ink)", borderColor: "var(--card-tint-border)" }
      }
    >
      {children}
    </button>
  );
}

export default function TemporizadorPage() {
  const { user, skills, profile, sessions, timezone, todayKey, streak } = useAppData();
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

  // Same pattern as the Pomodoro durations sync above, for the libre
  // break-reminder settings: read from Profile on mount/sync so the user's
  // choice (made from either the fullscreen popover or the normal panel
  // card below) follows them across sessions/devices.
  useEffect(() => {
    if (!profile) return;
    stopwatch.setBreakSettings(profile.libreBreakReminderMin, profile.libreBreakLengthMin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.libreBreakReminderMin, profile?.libreBreakLengthMin]);

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
  // tests/timer-clock-sync.test.tsx). Also ticks while `onBreak` (even
  // though `running` is false during a break) so the break countdown
  // resyncs on resume/reopen with the exact same correctness.
  useLayoutEffect(() => {
    if (!stopwatch.running && !stopwatch.onBreak) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSwNow(Date.now());
    const id = setInterval(() => setSwNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [stopwatch.running, stopwatch.onBreak]);

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
  // "Sesión libre" no longer has a skill picker (the user's explicit ask:
  // libre sessions are only identified by their free-text intention, and
  // their hours aren't counted toward any skill's goal), so this is only
  // ever non-null for a leftover persisted skillId from before that change
  // — never defaults to the first skill the way Pomodoro's selectedSkill
  // does above.
  const stopwatchSelectedSkill = stopwatch.skillId ? skills.find((s) => s.id === stopwatch.skillId) ?? null : null;
  const stopwatchHasTime = stopwatch.running || stopwatchElapsedMs > 0;

  // --- Libre break reminder ---------------------------------------------
  // msSinceLastBreak and breakRemainingMs are recomputed every render from
  // swNow (the same 1s wall-clock tick driving stopwatchElapsedMs above),
  // so both the trigger check and the countdown display share one ticking
  // mechanism rather than a second timer.
  const msSinceLastBreak = stopwatch.getMsSinceLastBreak(swNow);
  const breakThresholdMs = stopwatch.breakReminderMin ? stopwatch.breakReminderMin * 60_000 : null;
  const breakRemainingMs = stopwatch.getBreakRemainingMs(swNow);

  // Mirrors the Pomodoro "remaining <= 0" effect below: when enough RUNNING
  // time has passed since the last break, auto-pause and start the break
  // countdown. The in-app sound plays regardless of tab visibility — the
  // whole point is interrupting active practice, so it can't depend on the
  // tab being "visible". This moment uses playBreakReminder() rather than
  // playComplete() specifically so it's unmistakable without looking at the
  // screen (the user's explicit ask) — every other "something finished"
  // moment in this app (Pomodoro periods, achievements, break-END below)
  // shares the same soft completion chime, which is exactly what made this
  // feel unrecognizable before. notifyLibreBreak no longer only fires when
  // the tab isn't visible — see its doc comment in browserNotify.ts.
  useEffect(() => {
    if (stopwatch.running && !stopwatch.onBreak && breakThresholdMs != null && msSinceLastBreak >= breakThresholdMs) {
      sound.playBreakReminder();
      notifyLibreBreak("start", notifications.notificationsEnabled);
      stopwatch.triggerBreak();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msSinceLastBreak, stopwatch.running, stopwatch.onBreak, breakThresholdMs, stopwatch]);

  // When the break countdown reaches zero, notify and end the break —
  // WITHOUT auto-resuming (see store/stopwatch-store.ts's endBreak): the
  // stopwatch stays paused so the user has to deliberately come back.
  useEffect(() => {
    if (stopwatch.onBreak && breakRemainingMs <= 0) {
      sound.playComplete();
      notifyLibreBreak("end", notifications.notificationsEnabled);
      stopwatch.endBreak();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakRemainingMs, stopwatch.onBreak, stopwatch]);

  function handleChangeBreakSettings(reminderMin: number | null, lengthMin: number) {
    stopwatch.setBreakSettings(reminderMin, lengthMin);
    if (user) void updateProfile(user.uid, { libreBreakReminderMin: reminderMin, libreBreakLengthMin: lengthMin });
  }

  function handleEndBreakNow() {
    sound.playClick();
    stopwatch.endBreak();
  }

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
        .sort((a, b) => b.startedAt - a.startedAt),
    [sessions, timezone, todayKey],
  );
  const todaySessionsMinutes = useMemo(() => todaySessions.reduce((a, s) => a + s.durationMin, 0), [todaySessions]);

  // "Sesión libre" equivalent of the Pomodoro "Tomate n de 4" counter: how
  // much free-session practice happened today, at a glance.
  const todayLibreSessions = useMemo(() => todaySessions.filter((s) => s.source === "stopwatch"), [todaySessions]);
  const todayLibreMinutes = todayLibreSessions.reduce((a, s) => a + s.durationMin, 0);

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
    if (!pending || !user) {
      stopwatch.clearPendingSave();
      return;
    }
    // "Sesión libre" sessions have no skill (the user's explicit ask: these
    // hours are general free time, not counted toward any skill's goal) —
    // pending.skillId is null in the normal case, but this stays null-safe
    // in case a leftover persisted skillId exists from before that change.
    const skill = pending.skillId ? skills.find((s) => s.id === pending.skillId) ?? null : null;
    // Same reasoning as handleSaveSession above: pendingSave (persisted in
    // store/stopwatch-store.ts) is only cleared after a successful write, so
    // a dropped connection right as the stopwatch stops doesn't silently
    // lose the session — it survives in localStorage and this dialog stays
    // open for a retry.
    const result = await saveSession({
      userId: user.uid,
      skillId: pending.skillId,
      startedAt: Date.now() - pending.durationMin * 60_000,
      durationMin: pending.durationMin,
      quality,
      note: note || null,
      pomodoros: 0,
      source: "stopwatch",
    });
    stopwatch.clearPendingSave();
    // Milestones can't be crossed with no skill (result.milestonesCrossed
    // is always [] in that case, which enqueueCelebration already no-ops
    // on), and there's no skill name/color to show without one, so this
    // only ever enqueues a celebration for the (now rare) legacy case where
    // a skill was still attached.
    if (skill) {
      enqueueCelebration(result.milestonesCrossed, {
        skillName: skill.name,
        skillColor: resolveSkillColor(skill.color),
        startedAt: skill.createdAt,
      });
    }
    return result;
  }

  // "#{{session}}" + message, matching PomoTimer.dc.html's own formula:
  // session = tomates done so far (+1 while actively in a focus period).
  const pomoMessage =
    store.mode === "focus" ? (intention.trim() ? intention : "¡Hora de enfocar!") : "¡Hora de descansar!";
  const breakTip = store.mode === "short" || store.mode === "long" ? BREAK_TIPS[store.mode] : null;

  // Root --mode-bg: Pomodoro follows the live store mode; "Sesión libre" has
  // no modes of its own (no reference screen for it either — see the
  // report), so it stays on the resting focus-red, same as the reference's
  // own idle/default state.
  const rootModeBg = screenMode === "pomodoro" ? `var(--mode-${store.mode})` : "var(--mode-focus)";

  return (
    <>
      <div
        className="-mx-5 -mt-9 flex flex-col gap-8 px-5 pb-14 pt-8 transition-[background] duration-[400ms] sm:-mx-10 sm:px-10"
        style={{ "--mode-bg": rootModeBg, background: "var(--mode-bg)" } as React.CSSProperties}
      >
        <div role="group" aria-label="Tipo de sesión" className="mx-auto flex w-full max-w-[480px] gap-2">
          {SCREEN_TABS.map((t) => (
            <ScreenTypeTab key={t.id} on={screenMode === t.id} onClick={() => { sound.playClick(); setScreenMode(t.id); }}>
              {t.label}
            </ScreenTypeTab>
          ))}
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => sound.setSoundEffectsEnabled(!sound.soundEffectsEnabled)}
            aria-label={sound.soundEffectsEnabled ? "Silenciar sonidos" : "Activar sonidos"}
            title={sound.soundEffectsEnabled ? "Silenciar sonidos" : "Activar sonidos"}
            className="flex size-9 items-center justify-center rounded-chip text-mode-ink transition-colors hover:bg-card-tint"
          >
            {sound.soundEffectsEnabled ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
          </button>
        </div>

        {screenMode === "pomodoro" && (
          <div className="mx-auto flex w-full max-w-[480px] flex-col gap-8">
            <Card tone="tint" className="flex flex-col items-center gap-6 px-5 py-6 text-center sm:px-8">
              <div role="tablist" aria-label="Modo" className="flex flex-wrap justify-center gap-1">
                {MODE_TABS.map((t) => (
                  <ModeTabPill key={t.id} on={store.mode === t.id} onClick={() => store.setMode(t.id)}>
                    {t.label}
                  </ModeTabPill>
                ))}
              </div>

              <div
                role="timer"
                aria-label={`Tiempo restante ${mm}:${ss}`}
                className="font-sans text-[64px] font-bold leading-none tracking-tight text-mode-ink tabular-nums sm:text-[88px] md:text-[120px]"
              >
                {mm}:{ss}
              </div>

              <Button variant="go" size="lg" pressed={store.running} onClick={handlePlayPause}>
                {store.running ? "Pausar" : remaining === total ? "Empezar" : "Seguir"}
              </Button>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <Button variant="onColor" size="md" onClick={handleReset}>
                  Reiniciar
                </Button>
                <Button variant="onColor" size="md" onClick={handleSkip}>
                  Saltar
                </Button>
                <button
                  type="button"
                  onClick={() => setFullscreen(true)}
                  className="inline-flex h-11 items-center rounded-chip border border-card-tint-border bg-card-tint px-5 text-[15px] font-semibold text-mode-ink transition-colors hover:bg-white/30"
                >
                  Pantalla completa
                </button>
              </div>
            </Card>

            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-[16px] text-mode-ink-muted">#{n}</span>
              <p className="m-0 text-[18px] font-medium text-mode-ink">{pomoMessage}</p>
            </div>

            {breakTip && (
              <Card tone="tint" className="px-5 py-4">
                <div className="text-[16px] font-bold text-mode-ink">{breakTip.title}</div>
                <p className="m-0 mt-1 text-[14px] text-mode-ink-muted">{breakTip.body}</p>
              </Card>
            )}

            <Card tone="solid" className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-3 sm:gap-5 sm:p-6">
              <div>
                <div className="label-xs mb-3">Habilidad</div>
                <div role="group" aria-label="Habilidad" className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <Chip key={s.id} pressed={store.skillId === s.id} dotColor={resolveSkillColor(s.color)} onClick={() => store.setSkill(s.id)}>
                      {s.name}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="intencion">Intención</Label>
                <Input
                  id="intencion"
                  type="text"
                  value={intention}
                  onChange={(e) => {
                    setIntentionLocal(e.target.value);
                    store.setIntention(e.target.value);
                  }}
                  placeholder="¿Qué vas a practicar?"
                />
              </div>
              <AmbientPicker label="Ambiente" />
            </Card>
          </div>
        )}

        {screenMode === "libre" && (
          <div className="mx-auto flex w-full max-w-[480px] flex-col gap-8">
            <Card tone="tint" className="flex flex-col items-center gap-6 px-5 py-6 text-center sm:px-8">
              <span className="label-xs text-mode-ink-muted">Sesión libre</span>

              <div role="timer" aria-label="Tiempo transcurrido" className="font-sans text-[64px] font-bold leading-none tracking-tight text-mode-ink tabular-nums sm:text-[88px] md:text-[120px]">
                {formatStopwatchClock(stopwatchElapsedMs)}
              </div>
              <p className="m-0 max-w-[360px] text-[14px] text-mode-ink-muted">
                Sin ciclos ni duración fija: pulsa Empezar, practica, y Detén cuando termines.
              </p>

              <Button variant="go" size="lg" pressed={stopwatch.running} onClick={handleStopwatchPlayPause}>
                {stopwatch.running ? "Pausar" : "Empezar"}
              </Button>

              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <Button variant="onColor" size="md" onClick={handleStopwatchStop} disabled={!stopwatchHasTime}>
                  Detener
                </Button>
                <Button variant="onColor" size="md" onClick={handleStopwatchReset}>
                  Reiniciar
                </Button>
                <button
                  type="button"
                  onClick={() => setLibreFullscreen(true)}
                  className="inline-flex h-11 items-center rounded-chip border border-card-tint-border bg-card-tint px-5 text-[15px] font-semibold text-mode-ink transition-colors hover:bg-white/30"
                >
                  Pantalla completa
                </button>
              </div>

              {tooShortNotice && (
                <div className="w-full rounded-card bg-black/15 px-4 py-3 text-[14px] text-mode-ink">
                  Practica al menos {MIN_STOPWATCH_MS / 60_000} minuto para poder guardar la sesión. Tu tiempo sigue contando: pulsa Empezar para seguir.
                </div>
              )}

              {/* Break reminder is store state (not fullscreen-local), so it must
                  show up here too if it triggers while the user is on this
                  normal panel rather than in fullscreen — the polished
                  dedicated break view with tips is fullscreen-only, but this
                  inline banner keeps the normal panel from looking broken or
                  stuck. */}
              {stopwatch.onBreak && (
                <div className="flex w-full flex-wrap items-center justify-between gap-3 rounded-card bg-black/15 px-4 py-3 text-[14px] text-mode-ink">
                  <span>
                    Es hora de un descanso de {stopwatch.breakLengthMin} min · quedan {formatStopwatchClock(breakRemainingMs)}
                  </span>
                  <Button variant="onColor" size="sm" onClick={handleEndBreakNow}>
                    Terminar ahora
                  </Button>
                </div>
              )}
            </Card>

            <div className="text-center text-[16px] text-mode-ink">
              {todayLibreSessions.length === 0
                ? "Hoy: ninguna sesión libre aún"
                : `Hoy: ${todayLibreSessions.length} sesión${todayLibreSessions.length === 1 ? "" : "es"} libre${todayLibreSessions.length === 1 ? "" : "s"} · ${formatMinutes(todayLibreMinutes)}`}
            </div>

            <Card tone="solid" className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-3 sm:gap-5 sm:p-6">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sw-intencion">Intención</Label>
                <Input
                  id="sw-intencion"
                  type="text"
                  value={swIntention}
                  onChange={(e) => {
                    setSwIntentionLocal(e.target.value);
                    stopwatch.setIntention(e.target.value);
                  }}
                  placeholder="¿En qué vas a trabajar?"
                />
              </div>
              <AmbientPicker label="Ambiente" />
              <div className="flex flex-col gap-3">
                <div>
                  <div className="label-xs mb-1.5">Recordatorio de descanso</div>
                  <p className="m-0 text-[13px] text-card-solid-muted">Pausa automáticamente la sesión libre para avisarte de tomar un descanso.</p>
                </div>
                <BreakNotifyInline />
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(140px,100%),1fr))] gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="sw-break-min">Cada (min, 0 = off)</Label>
                    <Input
                      id="sw-break-min"
                      type="number"
                      min={0}
                      max={240}
                      inputMode="numeric"
                      value={stopwatch.breakReminderMin ?? 0}
                      onChange={(e) => {
                        const v = Math.max(0, Math.round(Number(e.target.value) || 0));
                        handleChangeBreakSettings(v > 0 ? v : null, stopwatch.breakLengthMin);
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="sw-break-length">Duración (min)</Label>
                    <Input
                      id="sw-break-length"
                      type="number"
                      min={1}
                      max={60}
                      inputMode="numeric"
                      disabled={!stopwatch.breakReminderMin}
                      value={stopwatch.breakLengthMin}
                      onChange={(e) => {
                        const v = Math.max(1, Math.round(Number(e.target.value) || 1));
                        handleChangeBreakSettings(stopwatch.breakReminderMin, v);
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* "Tareas" has no equivalent in this app's data model (only a
            free-text intención per session, no persisted checklist — see the
            final report) — repurposed into an honest read-only log of
            today's already-SAVED sessions, in the reference's `.wc` task-row
            visual language (white rows, skill-colored accent, duration on
            the right) rather than fabricating checkbox/task state that
            doesn't actually persist anywhere. */}
        {todaySessions.length > 0 && (
          <div className="mx-auto w-full max-w-[480px]">
            <div className="mb-3.5 flex items-center justify-between border-b-2 border-card-tint-border pb-3.5">
              <h2 className="m-0 text-[18px] font-semibold text-mode-ink">Sesiones de hoy</h2>
              <span className="text-[14px] text-mode-ink-muted">{formatMinutes(todaySessionsMinutes)}</span>
            </div>
            <div className="flex flex-col gap-2">
              {todaySessions.map((s) => {
                const skill = skills.find((sk) => sk.id === s.skillId);
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3.5 rounded-card border-l-[6px] bg-card-solid px-4.5 py-3.5 text-card-solid-ink"
                    style={{ borderLeftColor: skill ? resolveSkillColor(skill.color) : "transparent" }}
                  >
                    <span className="min-w-0 flex-1 truncate text-[16px] font-semibold">{skill?.name ?? "Sesión libre"}</span>
                    <span className="shrink-0 text-[13px] text-card-solid-muted">{formatTimeEs(new Date(s.startedAt))}</span>
                    <span className="font-num shrink-0 text-[15px] font-bold">{formatMinutes(s.durationMin)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {skills.length > 0 && (
          <Card tone="tint" className="mx-auto w-full max-w-[480px] px-5 pb-2 pt-5 sm:px-6">
            <div className="mb-3.5 flex items-baseline justify-between">
              <CardHeading className="text-mode-ink">Hacia las 10.000 horas</CardHeading>
              {streak > 0 && <span className="text-[13px] text-mode-ink-muted">Racha {streak} día{streak === 1 ? "" : "s"}</span>}
            </div>
            {skills.map((s) => {
              const hours = s.totalMinutes / 60;
              return (
                <div key={s.id} className="border-t border-card-tint-border py-3">
                  <div className="flex items-center justify-between text-[15px] font-medium text-mode-ink">
                    <span>{s.name}</span>
                    <span className="font-num">{formatInt(hours)} h</span>
                  </div>
                  <ProgressBar
                    pct={(hours / HOURS_GOAL) * 100}
                    color="var(--mode-ink)"
                    trackColor="rgb(0 0 0 / 15%)"
                    height={6}
                    className="mt-2"
                    ariaLabel={`${s.name}: ${formatInt(hours)} de ${formatInt(HOURS_GOAL)} horas`}
                  />
                </div>
              );
            })}
          </Card>
        )}
      </div>

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
        intention={swIntention}
        breakReminderMin={stopwatch.breakReminderMin}
        breakLengthMin={stopwatch.breakLengthMin}
        onBreak={stopwatch.onBreak}
        breakRemainingMs={breakRemainingMs}
        onChangeBreakSettings={handleChangeBreakSettings}
        onEndBreakNow={handleEndBreakNow}
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
        initialNote={intention}
        onSave={handleSaveSession}
        onDiscard={store.clearPendingSave}
      />

      <SessionSaveDialog
        open={Boolean(stopwatch.pendingSave)}
        durationMin={stopwatch.pendingSave?.durationMin ?? 0}
        skillName={stopwatchSelectedSkill?.name ?? ""}
        initialNote={swIntention}
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
