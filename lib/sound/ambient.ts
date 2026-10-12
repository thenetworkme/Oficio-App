/**
 * Looping ambient background sound. All three kinds play real recordings
 * (public/sounds/ambient/*.mp3 — see CREDITS.md in that folder) decoded and
 * looped through Web Audio, because the earlier fully-synthesized versions
 * sounded unconvincing (user feedback). Only one ambient sound plays at a
 * time; starting a new one stops whatever was playing. Never call
 * startAmbient() outside a user gesture (a click handler) — browsers block
 * audio that starts any other way, and this module relies on that gesture
 * rather than fighting it. Loading a recording is async (fetch + decode),
 * but the AudioContext itself is still created/resumed synchronously inside
 * the gesture via getCtx(), so the context unlocks immediately even though
 * playback starts a moment later once decoding finishes.
 */

export type AmbientKind = "rain" | "waves" | "lofi" | "thunder" | "fireplace" | "night" | "forest" | "coffeeshop";

const RECORDED_SOUND_URL: Record<AmbientKind, string> = {
  rain: "/sounds/ambient/rain.mp3",
  waves: "/sounds/ambient/waves.mp3",
  lofi: "/sounds/ambient/lofi.mp3",
  thunder: "/sounds/ambient/thunder.mp3",
  fireplace: "/sounds/ambient/fireplace.mp3",
  night: "/sounds/ambient/night.mp3",
  forest: "/sounds/ambient/forest.mp3",
  coffeeshop: "/sounds/ambient/coffeeshop.mp3",
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

async function loadBuffer(audio: AudioContext, kind: AmbientKind): Promise<AudioBuffer> {
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
 * within this call (via getCtx()) so it unlocks immediately, even though
 * actual playback starts a moment later once the recording has been
 * fetched and decoded (cached after the first load).
 */
export function startAmbient(kind: AmbientKind): void {
  const audio = getCtx();
  if (!audio) return;
  stopAmbient();
  const myGeneration = generation;
  const master = getMaster(audio);
  activeKind = kind;

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
