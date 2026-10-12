"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { updateProfile } from "@/lib/firestore/profiles";
import * as ambient from "@/lib/sound/ambient";
import * as engine from "@/lib/sound/engine";
import { DEFAULT_PROFILE, type AmbientSoundId } from "@/lib/types";

interface SoundContextValue {
  soundEffectsEnabled: boolean;
  soundEffectsVolume: number;
  ambientSoundId: AmbientSoundId;
  ambientVolume: number;
  setSoundEffectsEnabled: (enabled: boolean) => void;
  setSoundEffectsVolume: (volume: number) => void;
  /** Persists the choice and, if the Pomodoro is currently running, starts/stops the loop immediately. */
  setAmbientSoundId: (id: AmbientSoundId) => void;
  setAmbientVolume: (volume: number) => void;
  /** Starts the selected ambient loop (no-op if "none") — call only from a user gesture. */
  startAmbientIfSelected: () => void;
  stopAmbient: () => void;
  playClick: () => void;
  playStart: () => void;
  playPause: () => void;
  playComplete: () => void;
  playSuccess: () => void;
  playBreakReminder: () => void;
  /**
   * All-in-one-mute for the fullscreen quick-access popover (SoundControl in
   * FullscreenTimer.tsx/FullscreenStopwatch.tsx): flips soundEffectsEnabled
   * (silencing playClick/playStart/.../playBreakReminder the same as always)
   * AND, unlike setSoundEffectsEnabled alone, also stops/resumes any
   * currently-playing ambient loop. Deliberately separate from
   * setSoundEffectsEnabled so Ajustes -> Perfil's own "Efectos de sonido"
   * switch stays a narrow, granular toggle that never touches ambient sound
   * out from under the user — only this quick-access button means "silence
   * everything right now". See AGENTS task notes: a user with an ambient
   * loop playing clicked "Efectos activados" expecting total silence and
   * got none, because that toggle only ever gated the short effect chimes.
   */
  toggleAllSound: () => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [enabled, setEnabled] = useState(DEFAULT_PROFILE.soundEffectsEnabled);
  const [fxVolume, setFxVolume] = useState(DEFAULT_PROFILE.soundEffectsVolume);
  const [ambientId, setAmbientIdState] = useState<AmbientSoundId>(DEFAULT_PROFILE.ambientSoundId);
  const [ambientVol, setAmbientVolState] = useState(DEFAULT_PROFILE.ambientVolume);
  // Tracks whether ambient audio is actually playing right now, so a change
  // of selection while running can restart the engine; never auto-started.
  const isAmbientRunning = useRef(false);
  // Separate from isAmbientRunning above: remembers whether ambient was
  // playing at the exact moment toggleAllSound() muted it, so toggling back
  // on resumes the SAME sound rather than guessing from whatever
  // isAmbientRunning happens to be (which toggleAllSound itself just set to
  // false while muting).
  const wasAmbientPlayingBeforeMute = useRef(false);

  useEffect(() => {
    if (!profile) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(profile.soundEffectsEnabled);
    setFxVolume(profile.soundEffectsVolume);
    setAmbientIdState(profile.ambientSoundId);
    setAmbientVolState(profile.ambientVolume);
  }, [profile]);

  useEffect(() => {
    ambient.setAmbientVolume(ambientVol);
  }, [ambientVol]);

  // Stop ambient audio on unmount (e.g. navigating away/signing out) so it
  // never keeps looping silently in the background.
  useEffect(() => {
    return () => {
      ambient.stopAmbient();
      isAmbientRunning.current = false;
    };
  }, []);

  const value = useMemo<SoundContextValue>(
    () => ({
      soundEffectsEnabled: enabled,
      soundEffectsVolume: fxVolume,
      ambientSoundId: ambientId,
      ambientVolume: ambientVol,
      setSoundEffectsEnabled(next) {
        setEnabled(next);
        if (profile) void updateProfile(profile.uid, { soundEffectsEnabled: next });
      },
      setSoundEffectsVolume(next) {
        setFxVolume(next);
        if (profile) void updateProfile(profile.uid, { soundEffectsVolume: next });
      },
      setAmbientSoundId(id) {
        setAmbientIdState(id);
        if (profile) void updateProfile(profile.uid, { ambientSoundId: id });
        // Picking a chip is itself a user gesture — play it immediately so
        // it doubles as a preview, regardless of whether the Pomodoro is
        // running (e.g. picking it from Ajustes, with no timer in sight,
        // should still be audible). Previously this only restarted the
        // engine if ambient was *already* playing, so the very first pick
        // was always silent — see startAmbientIfSelected() below for the
        // separate, non-interactive "resume on Play" path.
        if (id === "none") {
          ambient.stopAmbient();
          isAmbientRunning.current = false;
        } else {
          ambient.startAmbient(id);
          isAmbientRunning.current = true;
        }
      },
      setAmbientVolume(next) {
        setAmbientVolState(next);
        ambient.setAmbientVolume(next);
        if (profile) void updateProfile(profile.uid, { ambientVolume: next });
      },
      startAmbientIfSelected() {
        if (ambientId === "none") return;
        ambient.startAmbient(ambientId);
        isAmbientRunning.current = true;
      },
      stopAmbient() {
        ambient.stopAmbient();
        isAmbientRunning.current = false;
      },
      playClick() {
        if (enabled) engine.playClick(fxVolume);
      },
      playStart() {
        if (enabled) engine.playStart(fxVolume);
      },
      playPause() {
        if (enabled) engine.playPause(fxVolume);
      },
      playComplete() {
        if (enabled) engine.playComplete(fxVolume);
      },
      playSuccess() {
        if (enabled) engine.playSuccess(fxVolume);
      },
      playBreakReminder() {
        if (enabled) engine.playBreakReminder(fxVolume);
      },
      toggleAllSound() {
        const next = !enabled;
        setEnabled(next);
        if (profile) void updateProfile(profile.uid, { soundEffectsEnabled: next });
        if (!next) {
          // Muting: remember whether ambient was actually playing right
          // now, then silence it too — this is what makes the button a
          // genuine "mute everything" control instead of only gating the
          // short effect chimes.
          wasAmbientPlayingBeforeMute.current = isAmbientRunning.current;
          if (isAmbientRunning.current) {
            ambient.stopAmbient();
            isAmbientRunning.current = false;
          }
        } else if (wasAmbientPlayingBeforeMute.current && ambientId !== "none") {
          // Unmuting from this same button, with a user gesture (the click
          // itself), so resuming audio here is allowed — bring back the
          // same ambient sound that was playing when it got muted.
          ambient.startAmbient(ambientId);
          isAmbientRunning.current = true;
          wasAmbientPlayingBeforeMute.current = false;
        }
      },
    }),
    [enabled, fxVolume, ambientId, ambientVol, profile],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used within SoundProvider");
  return ctx;
}
