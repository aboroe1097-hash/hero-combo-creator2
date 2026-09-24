// Synthesized audio. There is not a single sound file in this project, so the
// siege gets its audio the same way the reference games do: WebAudio
// oscillators and filtered noise, built at runtime.
//
// Nothing plays until unlock() runs from a real user gesture, which is what
// browsers require; if WebAudio is missing the whole module degrades to no-ops.

const STORAGE_KEY = 'vts_siege_muted';

export function createAudio() {
  let context = null;
  let master = null;
  let noiseBuffer = null;
  let muted = false;

  try {
    muted = localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    muted = false;
  }

  function ensureContext() {
    if (context) return context;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = muted ? 0 : 0.32;
    master.connect(context.destination);
    const length = Math.floor(context.sampleRate * 1.1);
    noiseBuffer = context.createBuffer(1, length, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
    return context;
  }

  function tone({ freq, to, type = 'sine', duration = 0.18, gain = 0.5, delay = 0, sweepTime }) {
    if (!context || muted) return;
    const at = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const amp = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, at);
    if (to && to !== freq) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + (sweepTime || duration));
    }
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(gain, at + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(amp);
    amp.connect(master);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.04);
  }

  function noise({ duration = 0.2, gain = 0.35, filter = 900, delay = 0, sweepTo }) {
    if (!context || muted) return;
    const at = context.currentTime + delay;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    const bandpass = context.createBiquadFilter();
    bandpass.type = 'lowpass';
    bandpass.frequency.setValueAtTime(filter, at);
    if (sweepTo) bandpass.frequency.exponentialRampToValueAtTime(Math.max(60, sweepTo), at + duration);
    const amp = context.createGain();
    amp.gain.setValueAtTime(gain, at);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(bandpass);
    bandpass.connect(amp);
    amp.connect(master);
    source.start(at);
    source.stop(at + duration + 0.02);
  }

  const SOUNDS = {
    attackIce: () => {
      tone({ freq: 1180, to: 620, type: 'triangle', duration: 0.16, gain: 0.22 });
      noise({ duration: 0.1, gain: 0.1, filter: 4200, sweepTo: 1400 });
    },
    attackFire: () => {
      tone({ freq: 220, to: 90, type: 'sawtooth', duration: 0.2, gain: 0.24 });
      noise({ duration: 0.16, gain: 0.16, filter: 1600, sweepTo: 320 });
    },
    hit: () => noise({ duration: 0.09, gain: 0.16, filter: 2600, sweepTo: 900 }),
    kill: (options) => {
      const step = Math.min(6, options?.step || 0);
      const base = 320 * 2 ** (step / 12);
      tone({ freq: base, type: 'square', duration: 0.1, gain: 0.16 });
      tone({ freq: base * 1.5, type: 'square', duration: 0.14, gain: 0.12, delay: 0.05 });
    },
    pickup: (options) => {
      const step = Math.min(8, options?.step || 0);
      const base = 720 * 2 ** (step / 12);
      tone({ freq: base, type: 'sine', duration: 0.12, gain: 0.2 });
      tone({ freq: base * 2, type: 'sine', duration: 0.18, gain: 0.1, delay: 0.03 });
    },
    build: () => {
      tone({ freq: 160, to: 90, type: 'square', duration: 0.22, gain: 0.24 });
      noise({ duration: 0.24, gain: 0.2, filter: 900, sweepTo: 220 });
    },
    towerShot: () => tone({ freq: 540, to: 360, type: 'triangle', duration: 0.1, gain: 0.12 }),
    nova: () => {
      tone({ freq: 90, to: 40, type: 'sawtooth', duration: 0.9, gain: 0.34 });
      noise({ duration: 0.85, gain: 0.3, filter: 5200, sweepTo: 200 });
      tone({ freq: 880, to: 1760, type: 'triangle', duration: 0.5, gain: 0.14 });
    },
    coreHit: () => {
      tone({ freq: 120, to: 58, type: 'sine', duration: 0.4, gain: 0.34 });
      noise({ duration: 0.3, gain: 0.2, filter: 700, sweepTo: 180 });
    },
    playerHit: () => {
      tone({ freq: 300, to: 150, type: 'square', duration: 0.16, gain: 0.2 });
      noise({ duration: 0.14, gain: 0.16, filter: 2200, sweepTo: 600 });
    },
    playerDown: () => {
      tone({ freq: 420, to: 90, type: 'triangle', duration: 0.7, gain: 0.26 });
    },
    revived: () => {
      tone({ freq: 320, type: 'sine', duration: 0.16, gain: 0.2 });
      tone({ freq: 480, type: 'sine', duration: 0.22, gain: 0.18, delay: 0.09 });
    },
    wave: () => {
      tone({ freq: 196, type: 'sawtooth', duration: 0.5, gain: 0.2 });
      tone({ freq: 294, type: 'sawtooth', duration: 0.5, gain: 0.16, delay: 0.14 });
    },
    boss: () => {
      tone({ freq: 98, to: 74, type: 'sawtooth', duration: 1.1, gain: 0.32 });
      tone({ freq: 147, to: 110, type: 'square', duration: 1.1, gain: 0.16, delay: 0.08 });
    },
    victory: () => {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) =>
        tone({ freq, type: 'triangle', duration: 0.42, gain: 0.2, delay: index * 0.12 })
      );
    },
    defeat: () => {
      [392, 329.63, 261.63].forEach((freq, index) =>
        tone({ freq, type: 'sine', duration: 0.7, gain: 0.22, delay: index * 0.22 })
      );
    },
    ui: () => tone({ freq: 620, type: 'sine', duration: 0.07, gain: 0.14 }),

    // Per-element impacts: ice is glassy and high, fire is a low crackle.
    hitIce: () => {
      tone({ freq: 2100 + Math.random() * 300, to: 1500, type: 'sine', duration: 0.07, gain: 0.08 });
      noise({ duration: 0.05, gain: 0.08, filter: 6200, sweepTo: 3000 });
    },
    hitFire: () => {
      noise({ duration: 0.11, gain: 0.14, filter: 1300, sweepTo: 380 });
      tone({ freq: 140, to: 80, type: 'triangle', duration: 0.08, gain: 0.1 });
    },
    killIce: (options) => {
      const step = Math.min(8, options?.step || 0);
      const base = 1320 * 2 ** (step / 12);
      tone({ freq: base, type: 'triangle', duration: 0.12, gain: 0.14 });
      tone({ freq: base * 1.26, type: 'sine', duration: 0.2, gain: 0.1, delay: 0.04 });
      noise({ duration: 0.16, gain: 0.12, filter: 7000, sweepTo: 2500 });
    },
    killFire: (options) => {
      const step = Math.min(8, options?.step || 0);
      const base = 180 * 2 ** (step / 12);
      tone({ freq: base, to: base * 0.5, type: 'sawtooth', duration: 0.22, gain: 0.16 });
      noise({ duration: 0.28, gain: 0.2, filter: 1800, sweepTo: 200 });
    },
    crit: () => {
      tone({ freq: 1760, to: 2640, type: 'square', duration: 0.08, gain: 0.08 });
      tone({ freq: 880, type: 'triangle', duration: 0.12, gain: 0.1, delay: 0.02 });
    },
    dash: () => noise({ duration: 0.18, gain: 0.16, filter: 3600, sweepTo: 700 }),
    dodge: () => tone({ freq: 990, to: 1480, type: 'sine', duration: 0.14, gain: 0.12 }),
    ult: () => {
      tone({ freq: 110, to: 220, type: 'sawtooth', duration: 0.8, gain: 0.26 });
      tone({ freq: 660, to: 1320, type: 'triangle', duration: 0.6, gain: 0.14, delay: 0.1 });
      noise({ duration: 0.7, gain: 0.22, filter: 4000, sweepTo: 600 });
    },
    telegraph: () => {
      tone({ freq: 70, to: 55, type: 'sawtooth', duration: 1.1, gain: 0.22 });
      tone({ freq: 440, type: 'square', duration: 0.09, gain: 0.08, delay: 0.1 });
      tone({ freq: 440, type: 'square', duration: 0.09, gain: 0.08, delay: 0.5 });
      tone({ freq: 520, type: 'square', duration: 0.09, gain: 0.1, delay: 0.9 });
    },
    slam: () => {
      tone({ freq: 60, to: 30, type: 'sine', duration: 0.6, gain: 0.4 });
      noise({ duration: 0.5, gain: 0.3, filter: 900, sweepTo: 120 });
    },
    shieldBreak: () => {
      noise({ duration: 0.22, gain: 0.18, filter: 8000, sweepTo: 3000 });
      tone({ freq: 1560, to: 780, type: 'triangle', duration: 0.2, gain: 0.1 });
    },
    streak: (options) => {
      const level = Math.min(4, options?.level || 0);
      [0, 4, 7, 12].forEach((semi, index) =>
        tone({
          freq: 392 * 2 ** ((semi + level * 2) / 12),
          type: 'triangle',
          duration: 0.18,
          gain: 0.14,
          delay: index * 0.06,
        })
      );
    },
    upgrade: (options) => {
      const level = Math.min(5, options?.level || 2);
      for (let index = 0; index < level; index += 1) {
        tone({ freq: 330 * 2 ** ((index * 4) / 12), type: 'square', duration: 0.1, gain: 0.1, delay: index * 0.05 });
      }
      noise({ duration: 0.2, gain: 0.12, filter: 1200, sweepTo: 300 });
    },
    bossDown: () => {
      tone({ freq: 196, to: 98, type: 'sawtooth', duration: 0.9, gain: 0.26 });
      [523.25, 659.25, 783.99].forEach((freq, index) =>
        tone({ freq, type: 'triangle', duration: 0.3, gain: 0.14, delay: 0.3 + index * 0.1 })
      );
    },
    step: () => {
      tone({ freq: 880, type: 'sine', duration: 0.09, gain: 0.12 });
      tone({ freq: 1320, type: 'sine', duration: 0.12, gain: 0.1, delay: 0.06 });
    },
  };

  return {
    unlock() {
      const ctx = ensureContext();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    play(name, options) {
      if (muted) return;
      const sound = SOUNDS[name];
      if (!sound || !context) return;
      try {
        sound(options);
      } catch {
        /* audio is decoration; never let it break a run */
      }
    },
    setMuted(value) {
      muted = Boolean(value);
      if (master) master.gain.value = muted ? 0 : 0.32;
      try {
        localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
      } catch {
        /* private mode: keep the in-memory value */
      }
      return muted;
    },
    isMuted: () => muted,
    dispose() {
      if (context) context.close();
      context = null;
      master = null;
    },
  };
}
