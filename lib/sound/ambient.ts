/**
 * Looping ambient background sound. "Rain" and "waves" play real recordings
 * (public/sounds/ambient/*.mp3 — see CREDITS.md in that folder) decoded and
 * looped through Web Audio, because the earlier fully-synthesized versions
 * of those two sounded unconvincing (user feedback). "Lofi" is still a
 * synthesized pad (not flagged as a problem, and a convincing lofi loop is
 * much harder to source cleanly licensed than ambient noise). Only one
 * ambient sound plays at a time; starting a new one stops whatever was
 * playing. Never call startAmbient() outside a user gesture (a click
 * handler) — browsers block audio that starts any other way, and this
 * module relies on that gesture rather than fighting it. Loading a
 * recording is async (fetch + decode), but the AudioContext itself is
 * still created/resumed synchronously inside the gesture via getCtx(), so
 * the context unlocks immediately even though playback starts a moment
 * later once decoding finishes.
 */

export type AmbientKind = "rain" | "waves" | "lofi";

const RECORDED_SOUND_URL: Record<"rain" | "waves", string> = {
  rain: "/sounds/ambient/rain.mp3",
  waves: "/sounds/ambient/waves.mp3",
};

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let activeKind: AmbientKind | null = null;
let cleanupFns: (() => void)[] = [];
let currentVolume = 0.5;
/** Bumped by every startAmbient()/stopAmbient() call so an in-flight async
 * decode from a superseded call can detect it's stale and bail out instead
 * of starting playback after something else has already taken over. */
let generation = 0;
const bufferCache = new Map<string, Promise<AudioBuffer>>();

async function loadBuffer(audio: AudioContext, kind: "rain" | "waves"): Promise<AudioBuffer> {
  const url = RECORDED_SOUND_URL[kind];
  let pending = bufferCache.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
        return res.arrayBuffer();
      })
      .then((data) => audio.decodeAudioData(data));
    bufferCache.set(url, pending);
    // Don't cache a failed fetch/decode — let the next attempt retry.
    pending.catch(() => bufferCache.delete(url));
  }
  return pending;
}

function startRecording(audio: AudioContext, master: GainNode, buffer: AudioBuffer): () => void {
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(master);
  source.start();
  return () => {
    source.stop();
    source.disconnect();
  };
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function getMaster(audio: AudioContext): GainNode {
  if (!masterGain) {
    masterGain = audio.createGain();
    masterGain.gain.value = currentVolume;
    masterGain.connect(audio.destination);
  }
  return masterGain;
}

function startLofi(audio: AudioContext, master: GainNode): () => void {
  // A soft, slow chord pad: a few detuned oscillators per note, long
  // attack/release, through a gentle low-pass filter.
  const chordSemitonesFromA4 = [-9, -5, -2, 2]; // a mellow add9-ish voicing
  const nodes: OscillatorNode[] = [];
  const gains: GainNode[] = [];

  const lowpass = audio.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 1100;

  const padGain = audio.createGain();
  padGain.gain.value = 0.4;

  lowpass.connect(padGain);
  padGain.connect(master);

  const now = audio.currentTime;
  for (const semi of chordSemitonesFromA4) {
    const freq = 440 * Math.pow(2, semi / 12) / 2; // drop an octave, pad register
    for (const detune of [-6, 6]) {
      const osc = audio.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const g = audio.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.06, now + 3);
      osc.connect(g);
      g.connect(lowpass);
      osc.start(now);
      nodes.push(osc);
      gains.push(g);
    }
  }

  // Gentle low-pass filter sweep over a long cycle.
  const sweep = audio.createOscillator();
  sweep.type = "sine";
  sweep.frequency.value = 0.05;
  const sweepDepth = audio.createGain();
  sweepDepth.gain.value = 300;
  sweep.connect(sweepDepth);
  sweepDepth.connect(lowpass.frequency);
  sweep.start();

  return () => {
    const stopAt = audio.currentTime;
    for (const g of gains) {
      g.gain.cancelScheduledValues(stopAt);
      g.gain.setValueAtTime(g.gain.value, stopAt);
      g.gain.linearRampToValueAtTime(0.0001, stopAt + 0.4);
    }
    sweep.stop();
    setTimeout(() => {
      for (const osc of nodes) {
        osc.stop();
        osc.disconnect();
      }
      for (const g of gains) g.disconnect();
      lowpass.disconnect();
      padGain.disconnect();
      sweep.disconnect();
      sweepDepth.disconnect();
    }, 450);
  };
}

/** Stops whatever ambient sound is currently playing, if any. */
export function stopAmbient(): void {
  generation++; // cancels any in-flight recording load from a previous call
  for (const fn of cleanupFns) fn();
  cleanupFns = [];
  activeKind = null;
}

/**
 * Starts the given ambient loop. Only call this from a user gesture (click
 * handler) — the AudioContext itself is created/resumed synchronously
 * within this call (via getCtx()) so it unlocks immediately, even for
 * "rain"/"waves" where actual playback starts a moment later once the
 * recording has been fetched and decoded (cached after the first load).
 */
export function startAmbient(kind: AmbientKind): void {
  const audio = getCtx();
  if (!audio) return;
  stopAmbient();
  const myGeneration = generation;
  const master = getMaster(audio);
  activeKind = kind;

  if (kind === "lofi") {
    cleanupFns = [startLofi(audio, master)];
    return;
  }

  loadBuffer(audio, kind)
    .then((buffer) => {
      if (generation !== myGeneration) return; // superseded by a newer start/stop call
      cleanupFns = [startRecording(audio, master, buffer)];
    })
    .catch((err) => {
      console.error(`[ambient] failed to load "${kind}" recording`, err);
      if (generation === myGeneration) activeKind = null;
    });
}

/** Sets the ambient master volume (0-1), live, even while playing. */
export function setAmbientVolume(volume01: number): void {
  currentVolume = Math.min(1, Math.max(0, volume01));
  if (masterGain) masterGain.gain.value = currentVolume;
}

export function getActiveAmbientKind(): AmbientKind | null {
  return activeKind;
}
