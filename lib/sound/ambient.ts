/**
 * Looping ambient background sound, synthesized entirely with Web Audio
 * nodes — no <audio> tags, no files. Only one ambient sound plays at a
 * time; starting a new one stops whatever was playing. Never call
 * startAmbient() outside a user gesture (a click handler) — browsers block
 * audio that starts any other way, and this module relies on that gesture
 * rather than fighting it.
 */

export type AmbientKind = "rain" | "waves" | "lofi";

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let activeKind: AmbientKind | null = null;
let cleanupFns: (() => void)[] = [];
let currentVolume = 0.5;

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

/** Builds a looping buffer of white noise, `seconds` long. */
function makeNoiseBuffer(audio: AudioContext, seconds: number): AudioBuffer {
  const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * seconds), audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function startRain(audio: AudioContext, master: GainNode): () => void {
  const noise = audio.createBufferSource();
  noise.buffer = makeNoiseBuffer(audio, 4);
  noise.loop = true;

  // Band-limit the hiss into something closer to steady rainfall.
  const bandpass = audio.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 2200;
  bandpass.Q.value = 0.6;

  const lowpass = audio.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 3200;

  const bedGain = audio.createGain();
  bedGain.gain.value = 0.55;

  noise.connect(bandpass);
  bandpass.connect(lowpass);
  lowpass.connect(bedGain);
  bedGain.connect(master);
  noise.start();

  // Occasional subtle "drop" impulses layered on top: short, randomly
  // timed, randomly pitched clicks through their own bandpass.
  let dropTimer: ReturnType<typeof setTimeout> | null = null;
  function scheduleDrop() {
    const delay = 150 + Math.random() * 500;
    dropTimer = setTimeout(() => {
      const now = audio.currentTime;
      const drop = audio.createOscillator();
      drop.type = "sine";
      drop.frequency.value = 900 + Math.random() * 1200;
      const dropFilter = audio.createBiquadFilter();
      dropFilter.type = "highpass";
      dropFilter.frequency.value = 1500;
      const dropGain = audio.createGain();
      dropGain.gain.setValueAtTime(0.0001, now);
      dropGain.gain.linearRampToValueAtTime(0.09, now + 0.002);
      dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      drop.connect(dropFilter);
      dropFilter.connect(dropGain);
      dropGain.connect(master);
      drop.start(now);
      drop.stop(now + 0.08);
      scheduleDrop();
    }, delay);
  }
  scheduleDrop();

  return () => {
    if (dropTimer) clearTimeout(dropTimer);
    noise.stop();
    noise.disconnect();
    bandpass.disconnect();
    lowpass.disconnect();
    bedGain.disconnect();
  };
}

function startWaves(audio: AudioContext, master: GainNode): () => void {
  const noise = audio.createBufferSource();
  noise.buffer = makeNoiseBuffer(audio, 6);
  noise.loop = true;

  const lowpass = audio.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 900;

  const bedGain = audio.createGain();
  bedGain.gain.value = 0.5;

  // Slow LFO modulating the filter cutoff to create a swell/recede rhythm.
  const lfo = audio.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.12; // ~8s per cycle
  const lfoDepth = audio.createGain();
  lfoDepth.gain.value = 600;
  lfo.connect(lfoDepth);
  lfoDepth.connect(lowpass.frequency);

  // A second LFO (gain) so the loudness swells with the brightness.
  const ampLfo = audio.createOscillator();
  ampLfo.type = "sine";
  ampLfo.frequency.value = 0.12;
  const ampDepth = audio.createGain();
  ampDepth.gain.value = 0.22;
  ampLfo.connect(ampDepth);
  ampDepth.connect(bedGain.gain);

  noise.connect(lowpass);
  lowpass.connect(bedGain);
  bedGain.connect(master);
  noise.start();
  lfo.start();
  ampLfo.start();

  return () => {
    noise.stop();
    lfo.stop();
    ampLfo.stop();
    noise.disconnect();
    lowpass.disconnect();
    bedGain.disconnect();
    lfo.disconnect();
    lfoDepth.disconnect();
    ampLfo.disconnect();
    ampDepth.disconnect();
  };
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
  for (const fn of cleanupFns) fn();
  cleanupFns = [];
  activeKind = null;
}

/** Starts the given ambient loop. Only call this from a user gesture (click handler). */
export function startAmbient(kind: AmbientKind): void {
  const audio = getCtx();
  if (!audio) return;
  stopAmbient();
  const master = getMaster(audio);
  const stop =
    kind === "rain" ? startRain(audio, master) : kind === "waves" ? startWaves(audio, master) : startLofi(audio, master);
  cleanupFns = [stop];
  activeKind = kind;
}

/** Sets the ambient master volume (0-1), live, even while playing. */
export function setAmbientVolume(volume01: number): void {
  currentVolume = Math.min(1, Math.max(0, volume01));
  if (masterGain) masterGain.gain.value = currentVolume;
}

export function getActiveAmbientKind(): AmbientKind | null {
  return activeKind;
}
