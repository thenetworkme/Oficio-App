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
        // Selecting a different ambient sound from a click is itself a user
        // gesture: if one was already playing (or we're mid-session),
        // restart immediately with the new choice.
        if (isAmbientRunning.current) {
          if (id === "none") {
            ambient.stopAmbient();
            isAmbientRunning.current = false;
          } else {
            ambient.startAmbient(id);
          }
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
