/**
 * Every sound in the site, synthesised in WebAudio. No audio files.
 *
 * Small UI sounds are half of what makes a headset feel physical, and they
 * are also the first thing people mute on the web — so nothing here plays
 * until the visitor turns sound on, and every call is a no-op before that.
 * Synthesis keeps the payload at zero and lets each sound be tuned in code.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ambientNodes: { stop: () => void } | null = null;

let audioOn = false;
/** Sound is opt-in; nothing here makes a noise until this is set. */
export const setAudioEnabled = (on: boolean) => {
  audioOn = on;
};
const enabled = () => audioOn;

/** Creates the context lazily; browsers require a gesture before audio can start. */
function ensure() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0.6;
  master.connect(ctx.destination);
  return ctx;
}

function tone(
  frequency: number,
  duration: number,
  {
    type = "sine",
    gain = 0.08,
    to,
    attack = 0.004,
    pan = 0,
  }: { type?: OscillatorType; gain?: number; to?: number; attack?: number; pan?: number } = {},
) {
  const c = ensure();
  if (!c || !master) return;
  if (c.state === "suspended") void c.resume();

  const osc = c.createOscillator();
  const env = c.createGain();
  const panner = c.createStereoPanner();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, c.currentTime);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, c.currentTime + duration);

  env.gain.setValueAtTime(0, c.currentTime);
  env.gain.linearRampToValueAtTime(gain, c.currentTime + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);

  panner.pan.value = pan;
  osc.connect(env).connect(panner).connect(master);
  osc.start();
  osc.stop(c.currentTime + duration + 0.02);
}

function noise(duration: number, { gain = 0.05, from = 400, to = 4000 }: { gain?: number; from?: number; to?: number } = {}) {
  const c = ensure();
  if (!c || !master) return;
  const length = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;

  const source = c.createBufferSource();
  source.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(from, c.currentTime);
  filter.frequency.exponentialRampToValueAtTime(to, c.currentTime + duration);

  const env = c.createGain();
  env.gain.setValueAtTime(gain, c.currentTime);
  env.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);

  source.connect(filter).connect(env).connect(master);
  source.start();
}

export const sfx = {
  /** Hover over something interactive. Barely there. */
  tick(pan = 0) {
    if (!enabled()) return;
    tone(1800, 0.05, { gain: 0.025, pan });
  },
  /** Pinch: the click of a hand-tracked press. */
  pinch(pan = 0) {
    if (!enabled()) return;
    tone(900, 0.07, { to: 420, gain: 0.07, pan });
    tone(2400, 0.03, { gain: 0.02, pan });
  },
  /** Release: a softer, upward version of the pinch. */
  release(pan = 0) {
    if (!enabled()) return;
    tone(480, 0.06, { to: 760, gain: 0.04, pan });
  },
  /** A panel flying through the air. */
  whoosh(speed = 1) {
    if (!enabled()) return;
    noise(0.28 + Math.min(speed, 3) * 0.06, { gain: 0.05, from: 300, to: 2400 });
  },
  /** Achievement chime: a dry three-note rise. */
  chime() {
    if (!enabled()) return;
    tone(523.25, 0.32, { gain: 0.05 });
    setTimeout(() => tone(659.25, 0.32, { gain: 0.05 }), 90);
    setTimeout(() => tone(783.99, 0.5, { gain: 0.06 }), 180);
  },
  /** Headset boot: a rising pad. */
  boot() {
    if (!enabled()) return;
    tone(110, 1.4, { to: 220, gain: 0.06, attack: 0.4, type: "triangle" });
    tone(220, 1.6, { to: 440, gain: 0.03, attack: 0.6 });
  },

  /** The room tone of the environment. Idempotent. */
  ambient(on: boolean) {
    if (on && !enabled()) return;
    if (!on) {
      ambientNodes?.stop();
      ambientNodes = null;
      return;
    }
    if (ambientNodes) return;
    const c = ensure();
    if (!c || !master) return;
    if (c.state === "suspended") void c.resume();

    const env = c.createGain();
    env.gain.setValueAtTime(0, c.currentTime);
    env.gain.linearRampToValueAtTime(0.035, c.currentTime + 2.5);

    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 320;

    const oscillators = [55, 55.4, 82.5].map((f, i) => {
      const osc = c.createOscillator();
      osc.type = i === 2 ? "triangle" : "sine";
      osc.frequency.value = f;
      osc.connect(filter);
      osc.start();
      return osc;
    });

    // A slow LFO on the filter so the pad breathes rather than drones.
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    filter.connect(env).connect(master);

    ambientNodes = {
      stop: () => {
        const now = c.currentTime;
        env.gain.cancelScheduledValues(now);
        env.gain.setValueAtTime(env.gain.value, now);
        env.gain.linearRampToValueAtTime(0, now + 0.8);
        setTimeout(() => {
          oscillators.forEach((o) => o.stop());
          lfo.stop();
        }, 900);
      },
    };
  },
};
