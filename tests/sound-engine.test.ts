import { beforeEach, describe, expect, it, vi } from "vitest";
import { playBreakReminder, playComplete, playClick, playStart, playPause, playSuccess } from "@/lib/sound/engine";

/**
 * lib/sound/engine.ts synthesizes everything via Web Audio, which doesn't
 * exist in jsdom — so this fakes just enough of the API surface
 * (AudioContext/OscillatorNode/GainNode) to observe what each exported
 * function actually schedules, without needing a real audio backend.
 *
 * Primary goal: prove playBreakReminder() is NOT just playComplete() under a
 * different name — the user explicitly needs break-time to be recognizable
 * without looking at the screen, so its oscillator frequencies/timing must
 * differ from the existing "soft two-partial bell" used everywhere else
 * (period completion, achievement saves, etc).
 */

interface FakeOsc {
  type: OscillatorType | "";
  frequency: { value: number };
  startedAt?: number;
  connect: () => void;
  start: (t: number) => void;
  stop: () => void;
}

let createdOscillators: FakeOsc[] = [];

class FakeGainParam {
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

class FakeGainNode {
  gain = new FakeGainParam();
  connect() {}
}

class FakeAudioContext {
  currentTime = 0;
  destination = {};
  state: AudioContextState = "running";
  createOscillator(): FakeOsc {
    const osc: FakeOsc = {
      type: "sine",
      frequency: { value: 0 },
      connect: () => {},
      start(t: number) {
        osc.startedAt = t;
      },
      stop: () => {},
    };
    createdOscillators.push(osc);
    return osc;
  }
  createGain() {
    return new FakeGainNode();
  }
  resume() {
    return Promise.resolve();
  }
}

beforeEach(() => {
  createdOscillators = [];
  vi.stubGlobal("AudioContext", FakeAudioContext);
});

function frequenciesAndTimes(): { freq: number; at: number }[] {
  return createdOscillators.map((o) => ({ freq: Math.round(o.frequency.value), at: o.startedAt ?? -1 }));
}

describe("playBreakReminder", () => {
  it("is distinguishable from playComplete: different oscillator frequency pattern", () => {
    playComplete(1);
    const completePattern = frequenciesAndTimes();

    createdOscillators = [];
    playBreakReminder(1);
    const breakPattern = frequenciesAndTimes();

    // Not the same number of tones, and not the same set of frequencies —
    // either difference alone proves it's a distinct sound, but both hold.
    expect(breakPattern.length).not.toBe(0);
    expect(breakPattern.map((p) => p.freq).sort()).not.toEqual(completePattern.map((p) => p.freq).sort());
  });

  it("plays 3 sequential (not simultaneous) notes, unlike playComplete's simultaneous partials", () => {
    playBreakReminder(1);
    const pattern = frequenciesAndTimes();
    expect(pattern).toHaveLength(3);
    // Sequential: each note starts strictly after the previous one.
    expect(pattern[1].at).toBeGreaterThan(pattern[0].at);
    expect(pattern[2].at).toBeGreaterThan(pattern[1].at);

    createdOscillators = [];
    playComplete(1);
    const completePattern = frequenciesAndTimes();
    // playComplete's partials all start at the same instant (`now`).
    const uniqueStartTimes = new Set(completePattern.map((p) => p.at));
    expect(uniqueStartTimes.size).toBe(1);
  });

  it("ascends in pitch (each note higher than the last)", () => {
    playBreakReminder(1);
    const pattern = frequenciesAndTimes();
    expect(pattern[1].freq).toBeGreaterThan(pattern[0].freq);
    expect(pattern[2].freq).toBeGreaterThan(pattern[1].freq);
  });

  it("is a safe no-op when AudioContext is unavailable (SSR-safe guard)", () => {
    vi.unstubAllGlobals();
    expect(() => playBreakReminder(1)).not.toThrow();
  });
});

// Sanity check that the gate pattern used by SoundProvider (checking
// `enabled` before calling into engine.ts) is meaningful: every exported
// play* function here actually schedules an oscillator when called, so
// SoundProvider's `if (enabled) engine.playX()` is the only thing standing
// between a call and real sound — exercised end-to-end in
// sound-provider-mute.test.tsx.
describe("engine.ts exports all schedule oscillators when AudioContext exists", () => {
  it.each([
    ["playClick", playClick],
    ["playStart", playStart],
    ["playPause", playPause],
    ["playComplete", playComplete],
    ["playSuccess", playSuccess],
    ["playBreakReminder", playBreakReminder],
  ])("%s schedules at least one oscillator", (_name, fn) => {
    createdOscillators = [];
    (fn as (v?: number) => void)(1);
    expect(createdOscillators.length).toBeGreaterThan(0);
  });
});
