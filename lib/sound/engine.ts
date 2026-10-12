/**
 * Short UI feedback sounds, synthesized entirely with the Web Audio API —
 * no audio files, no licensing concerns, works offline. See AGENTS.md: the
 * user explicitly chose code-synthesized sound over shipped audio assets.
 *
 * The AudioContext is created lazily (never at module load time): browsers
 * warn/block constructing one before a user gesture, and this module can be
 * imported during the Next.js server build where `AudioContext` doesn't
 * exist at all. Every exported function guards itself and is a safe no-op
 * in that environment.
 */
import { dbToGain, noteFreq } from "@/lib/sound/math";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// --- Tunable envelope/waveform constants -----------------------------------

const CLICK = { freq: noteFreq(-4), duration: 0.045, gainDb: -14, type: "triangle" as OscillatorType };

const START = { f1: noteFreq(-9), f2: noteFreq(-2), duration: 0.09, gap: 0.06, gainDb: -10, type: "sine" as OscillatorType };
const PAUSE = { f1: noteFreq(-2), f2: noteFreq(-9), duration: 0.09, gap: 0.06, gainDb: -10, type: "sine" as OscillatorType };

// A soft two-partial bell: a fundamental plus a fifth above, with a gentle
// exponential decay — this is the most "important" sound per the brief, so
// it's tuned to be pleasant rather than alert-sounding.
const COMPLETE = {
  partials: [
    { semitones: 12, gainDb: -8 }, // octave above A4
    { semitones: 19, gainDb: -14 }, // fifth above that
  ],
  attack: 0.01,
  decay: 1.1,
  type: "sine" as OscillatorType,
};

const SUCCESS = {
  partials: [
    { semitones: 7, gainDb: -9 },
    { semitones: 12, gainDb: -12 },
  ],
  attack: 0.008,
  decay: 0.7,
  type: "sine" as OscillatorType,
};

// Three-note ascending pattern, clearly distinct from COMPLETE's soft
// two-partial simultaneous bell: these notes play one after another
// (like START/PAUSE's two-tone blip, but three notes instead of two and
// stepping upward rather than just high/low), so it reads as its own
// little "ta-da, time's up" phrase rather than another variant of the
// generic completion chime — the whole point per the user's report: they
// need to recognize break time without looking at the screen. Still a
// plain triangle wave at a gentle volume/duration, matching this file's
// calm-productivity-app tone rather than anything alarm-like.
const BREAK_REMINDER = {
  notes: [-5, 0, 7], // stepwise-ish ascending triad, ending on the fifth
  duration: 0.16,
  gap: 0.1,
  gainDb: -11,
  type: "triangle" as OscillatorType,
};

/** Plays one oscillator tone with a short linear attack + exponential release envelope. */
function tone(
  audio: AudioContext,
  freq: number,
  type: OscillatorType,
  gainDb: number,
  volume: number,
  startAt: number,
  duration: number,
  attack = 0.005,
) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const peak = Math.max(0.0001, dbToGain(gainDb) * volume);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(peak, startAt + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

function chime(
  audio: AudioContext,
  partials: { semitones: number; gainDb: number }[],
  type: OscillatorType,
  attack: number,
  decay: number,
  volume: number,
) {
  const now = audio.currentTime;
  for (const p of partials) {
    tone(audio, noteFreq(p.semitones), type, p.gainDb, volume, now, decay, attack);
  }
}

/** A very short, soft tick for general button presses. */
export function playClick(volume = 1): void {
  const audio = getCtx();
  if (!audio) return;
  tone(audio, CLICK.freq, CLICK.type, CLICK.gainDb, volume, audio.currentTime, CLICK.duration, 0.002);
}

/** Short, distinct two-tone blip (low -> high) for starting the Pomodoro. */
export function playStart(volume = 1): void {
  const audio = getCtx();
  if (!audio) return;
  const now = audio.currentTime;
  tone(audio, START.f1, START.type, START.gainDb, volume, now, START.duration);
  tone(audio, START.f2, START.type, START.gainDb, volume, now + START.gap, START.duration);
}

/** Short, distinct two-tone blip (high -> low) for pausing the Pomodoro. */
export function playPause(volume = 1): void {
  const audio = getCtx();
  if (!audio) return;
  const now = audio.currentTime;
  tone(audio, PAUSE.f1, PAUSE.type, PAUSE.gainDb, volume, now, PAUSE.duration);
  tone(audio, PAUSE.f2, PAUSE.type, PAUSE.gainDb, volume, now + PAUSE.gap, PAUSE.duration);
}

/** A pleasant short chime for when a Pomodoro period finishes. */
export function playComplete(volume = 1): void {
  const audio = getCtx();
  if (!audio) return;
  chime(audio, COMPLETE.partials, COMPLETE.type, COMPLETE.attack, COMPLETE.decay, volume);
}

/** A bright, short chime for saves/purchases/finishing a challenge. */
export function playSuccess(volume = 1): void {
  const audio = getCtx();
  if (!audio) return;
  chime(audio, SUCCESS.partials, SUCCESS.type, SUCCESS.attack, SUCCESS.decay, volume);
}

/**
 * A distinctive three-note ascending phrase for "it's break time" in Sesión
 * libre — deliberately NOT the same sound as playComplete() (which also
 * covers Pomodoro period completion, achievement saves, etc.), so this one
 * moment is instantly recognizable without looking at the screen.
 */
export function playBreakReminder(volume = 1): void {
  const audio = getCtx();
  if (!audio) return;
  const now = audio.currentTime;
  BREAK_REMINDER.notes.forEach((semitones, i) => {
    tone(
      audio,
      noteFreq(semitones),
      BREAK_REMINDER.type,
      BREAK_REMINDER.gainDb,
      volume,
      now + i * BREAK_REMINDER.gap,
      BREAK_REMINDER.duration,
    );
  });
}
