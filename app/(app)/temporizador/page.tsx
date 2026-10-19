"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Card, CardHeading } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { DotDigits } from "@/components/ui/DotDigits";
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
import { formatMinutes, formatTimeEs } from "@/lib/format";
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

/** A row of text toggle buttons in the reference's ".opt" style: muted
 * label, a small signal-colored dot bullet + ink text when selected. Used
 * for mode/screen tabs and the "Habilidad" skill picker list. */
function OptTab({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.1em] transition-colors ${className ?? ""}`}
      style={{ color: on ? "var(--ink)" : "var(--muted)" }}
    >
      {on && <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ background: "var(--signal)" }} />}
      {children}
    </button>
  );
}

function TickStrip({ total, elapsed }: { total: number; elapsed: number }) {
  const minutes = Math.max(1, Math.round(total / 60));
  const ticks = Array.from({ length: minutes }, (_, i) => ({
    h: (i + 1) % 5 === 0 ? 28 : 18,
    bg: elapsed >= (i + 1) * 60 ? "var(--ink)" : elapsed > i * 60 ? "var(--signal)" : "var(--line)",
  }));
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.max(0, Math.round(s)) % 60).padStart(2, "0")}`;
  return (
    <div className="w-full max-w-[880px]">
      <div className="flex items-end gap-1" style={{ height: 28 }}>
        {ticks.map((t, i) => (
          <i key={i} aria-hidden="true" className="flex-1 rounded-[1px] transition-[background]" style={{ height: t.h, background: t.bg }} />
        ))}
      </div>
      <div className="label-xs mt-2 flex justify-between text-[10px]">
        <span>{fmt(elapsed)}</span>
        <span>{fmt(total)}</span>
      </div>
    </div>
  );
}

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
        .sort((a, b) => a.startedAt - b.startedAt),
    [sessions, timezone, todayKey],
  );

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

  const elapsed = total - remaining;
  const session = String((store.completedFocusCount % 4) + 1).padStart(2, "0");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-5">
        <div role="group" aria-label="Tipo de sesión" className="flex flex-wrap gap-7">
          {SCREEN_TABS.map((t) => (
            <OptTab key={t.id} on={screenMode === t.id} onClick={() => { sound.playClick(); setScreenMode(t.id); }}>
              {t.label}
            </OptTab>
          ))}
        </div>
      </div>

      {screenMode === "pomodoro" && (
        <>
          <div className="flex flex-wrap items-center gap-5 pt-6">
            <div role="tablist" aria-label="Modo" className="flex flex-1 flex-wrap gap-7">
              {MODE_TABS.map((t) => (
                <OptTab key={t.id} on={store.mode === t.id} onClick={() => store.setMode(t.id)}>
                  {t.label}
                </OptTab>
              ))}
            </div>
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => sound.setSoundEffectsEnabled(!sound.soundEffectsEnabled)}
                aria-label={sound.soundEffectsEnabled ? "Silenciar sonidos" : "Activar sonidos"}
                title={sound.soundEffectsEnabled ? "Silenciar sonidos" : "Activar sonidos"}
                className="text-muted transition-colors hover:text-ink"
              >
                {sound.soundEffectsEnabled ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
              </button>
              <button type="button" onClick={() => setFullscreen(true)} className="label-xs underline decoration-border underline-offset-4 transition-colors hover:text-ink">
                Pantalla completa
              </button>
              <span className="label-xs">
                Sesión <span className="text-ink">{session}</span> / 04
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-8 py-14">
            <div className="overflow-x-auto">
              <DotDigits value={`${mm}:${ss}`} size={26} gap={9} running={store.running} ariaLabel={`Tiempo restante ${mm}:${ss}`} />
            </div>
            <TickStrip total={total} elapsed={elapsed} />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex min-h-[52px] items-center gap-2.5 rounded-button border border-border px-6 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors hover:border-border-hover hover:bg-card"
              >
                Reiniciar
              </button>
              <button
                type="button"
                onClick={handlePlayPause}
                className="inline-flex min-h-[52px] min-w-[200px] items-center justify-center gap-3 rounded-button border border-signal bg-signal px-6 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-ink-solid transition-colors hover:brightness-110"
              >
                {store.running ? <Pause size={14} aria-hidden="true" fill="currentColor" /> : <Play size={14} aria-hidden="true" fill="currentColor" />}
                {store.running ? "Pausar" : remaining === total ? "Empezar" : "Seguir"}
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="inline-flex min-h-[52px] items-center gap-2.5 rounded-button border border-border px-6 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors hover:border-border-hover hover:bg-card"
              >
                Saltar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 border-t border-line sm:grid-cols-3">
            <div className="py-6 pr-0 sm:pr-7">
              <div className="label-xs mb-3.5">Habilidad</div>
              <div role="group" aria-label="Habilidad" className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <Chip key={s.id} pressed={store.skillId === s.id} dotColor={resolveSkillColor(s.color)} onClick={() => store.setSkill(s.id)}>
                    {s.name}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="border-t border-line py-6 sm:border-l sm:border-t-0 sm:px-7">
              <div className="label-xs mb-3.5">Intención</div>
              <input
                id="intencion"
                type="text"
                value={intention}
                onChange={(e) => {
                  setIntentionLocal(e.target.value);
                  store.setIntention(e.target.value);
                }}
                placeholder="¿Qué vas a practicar?"
                className="w-full min-h-10 border-0 border-b border-border bg-transparent px-0 pb-3 pt-2 text-[16px] text-ink placeholder:text-muted focus:border-signal focus:outline-none"
              />
            </div>
            <div className="border-t border-line py-6 sm:border-l sm:border-t-0 sm:pl-7">
              <AmbientPicker label="Ambiente" />
            </div>
          </div>
        </>
      )}

      {screenMode === "libre" && (
        <>
          <div className="flex flex-wrap items-center gap-5 pt-6">
            <span className="label-xs flex-1">
              {todayLibreSessions.length === 0
                ? "Hoy: ninguna sesión libre aún"
                : `Hoy: ${todayLibreSessions.length} sesión${todayLibreSessions.length === 1 ? "" : "es"} libre${todayLibreSessions.length === 1 ? "" : "s"} · ${formatMinutes(todayLibreMinutes)}`}
            </span>
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => sound.setSoundEffectsEnabled(!sound.soundEffectsEnabled)}
                aria-label={sound.soundEffectsEnabled ? "Silenciar sonidos" : "Activar sonidos"}
                title={sound.soundEffectsEnabled ? "Silenciar sonidos" : "Activar sonidos"}
                className="text-muted transition-colors hover:text-ink"
              >
                {sound.soundEffectsEnabled ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
              </button>
              <button type="button" onClick={() => setLibreFullscreen(true)} className="label-xs underline decoration-border underline-offset-4 transition-colors hover:text-ink">
                Pantalla completa
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-8 py-14">
            <div className="overflow-x-auto">
              <DotDigits value={formatStopwatchClock(stopwatchElapsedMs)} size={26} gap={9} running={stopwatch.running} ariaLabel="Tiempo transcurrido" />
            </div>
            <p className="m-0 max-w-[420px] text-center text-sm text-muted">
              Sin ciclos ni duración fija: pulsa Empezar, practica, y Detener cuando termines.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleStopwatchPlayPause}
                className="inline-flex min-h-[52px] min-w-[200px] items-center justify-center gap-3 rounded-button border border-signal bg-signal px-6 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-ink-solid transition-colors hover:brightness-110"
              >
                {stopwatch.running ? <Pause size={14} aria-hidden="true" fill="currentColor" /> : <Play size={14} aria-hidden="true" fill="currentColor" />}
                {stopwatch.running ? "Pausar" : "Empezar"}
              </button>
              <button
                type="button"
                onClick={handleStopwatchStop}
                disabled={!stopwatchHasTime}
                className="inline-flex min-h-[52px] items-center gap-2.5 rounded-button border border-border px-6 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors hover:border-border-hover hover:bg-card disabled:pointer-events-none disabled:opacity-50"
              >
                Detener
              </button>
              <button
                type="button"
                onClick={handleStopwatchReset}
                className="inline-flex min-h-[52px] items-center gap-2.5 rounded-button border border-border px-6 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors hover:border-border-hover hover:bg-card"
              >
                Reiniciar
              </button>
            </div>

            {tooShortNotice && (
              <div className="max-w-[560px] rounded-card border border-line bg-card px-5 py-3 text-center text-[14px] text-ink">
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
              <div className="flex max-w-[640px] flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-card px-5 py-3 text-[14px] text-ink">
                <span>
                  Es hora de un descanso de {stopwatch.breakLengthMin} min · quedan {formatStopwatchClock(breakRemainingMs)}
                </span>
                <button
                  type="button"
                  onClick={handleEndBreakNow}
                  className="inline-flex min-h-9 items-center rounded-chip border border-border px-3.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors hover:border-border-hover"
                >
                  Terminar descanso ahora
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 border-t border-line sm:grid-cols-3">
            <div className="py-6 pr-0 sm:pr-7">
              <div className="label-xs mb-3.5">Intención</div>
              <input
                id="sw-intencion"
                type="text"
                value={swIntention}
                onChange={(e) => {
                  setSwIntentionLocal(e.target.value);
                  stopwatch.setIntention(e.target.value);
                }}
                placeholder="¿En qué vas a trabajar?"
                className="w-full min-h-10 border-0 border-b border-border bg-transparent px-0 pb-3 pt-2 text-[16px] text-ink placeholder:text-muted focus:border-signal focus:outline-none"
              />
            </div>
            <div className="border-t border-line py-6 sm:border-l sm:border-t-0 sm:px-7">
              <AmbientPicker label="Ambiente" />
            </div>
            <div className="border-t border-line py-6 sm:border-l sm:border-t-0 sm:pl-7">
              <div className="label-xs mb-3.5">Recordatorio de descanso</div>
              <p className="m-0 mb-3 text-[13px] text-muted">Pausa automáticamente la sesión libre para avisarte de tomar un descanso.</p>
              <BreakNotifyInline />
              <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))] gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="sw-break-min" className="label-xs">
                    Cada (min, 0 = off)
                  </label>
                  <input
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
                    className="w-full min-h-10 border-0 border-b border-border bg-transparent px-0 pb-3 pt-2 text-[15px] text-ink focus:border-signal focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="sw-break-length" className="label-xs">
                    Duración (min)
                  </label>
                  <input
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
                    className="w-full min-h-10 border-0 border-b border-border bg-transparent px-0 pb-3 pt-2 text-[15px] text-ink focus:border-signal focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {todaySessions.length > 0 && (
        <Card className="flex flex-col gap-1 p-5">
          <CardHeading className="mb-1 text-[16px]">Sesiones de hoy</CardHeading>
          {todaySessions.map((s) => {
            const skill = skills.find((sk) => sk.id === s.skillId);
            return (
              <div key={s.id} className="flex flex-wrap items-center gap-3 border-t border-line py-2.5">
                <span className="font-num min-w-16 text-[13px] text-muted">{formatTimeEs(new Date(s.startedAt))}</span>
                <span className="min-w-[100px] flex-1">{skill?.name ?? "Sesión libre"}</span>
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
