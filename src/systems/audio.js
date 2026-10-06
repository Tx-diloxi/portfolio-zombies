// Sons synthétisés avec la Web Audio API (aucun fichier audio).
let ctx = null;
let master = null;
let noiseBuffer = null;

export function initAudio() {
  if (ctx) return ctx.resume();
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuffer.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function env(gain, t, attack, decay, peak) {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function noise({ duration = 0.2, freq = 1000, type = 'lowpass', peak = 0.8, attack = 0.002, volume = 1, sweepTo }) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, t);
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t + duration);
  const g = ctx.createGain();
  env(g, t, attack, duration, peak * volume);
  src.connect(filter).connect(g).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + duration + attack + 0.05);
}

function tone({ freq = 440, type = 'sine', duration = 0.2, peak = 0.3, delay = 0, slideTo, volume = 1 }) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
  const g = ctx.createGain();
  env(g, t, 0.01, duration, peak * volume);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

export const sfx = {
  pistol() {
    noise({ duration: 0.25, freq: 2400, sweepTo: 300, peak: 1 });
    tone({ freq: 140, type: 'square', duration: 0.08, peak: 0.25, slideTo: 50 });
  },
  smg() {
    noise({ duration: 0.12, freq: 3000, sweepTo: 500, peak: 0.7 });
    tone({ freq: 110, type: 'square', duration: 0.05, peak: 0.15, slideTo: 50 });
  },
  empty() {
    tone({ freq: 1800, type: 'square', duration: 0.03, peak: 0.1 });
  },
  reload() {
    tone({ freq: 900, type: 'square', duration: 0.04, peak: 0.12 });
    tone({ freq: 600, type: 'square', duration: 0.05, peak: 0.12, delay: 0.35 });
    tone({ freq: 1100, type: 'square', duration: 0.04, peak: 0.12, delay: 0.7 });
  },
  knife() {
    noise({ duration: 0.15, freq: 4000, type: 'bandpass', sweepTo: 1500, peak: 0.4 });
  },
  hit() {
    noise({ duration: 0.08, freq: 600, peak: 0.5 });
  },
  hurt() {
    noise({ duration: 0.3, freq: 300, peak: 0.9 });
    tone({ freq: 90, type: 'sawtooth', duration: 0.25, peak: 0.2, slideTo: 60 });
  },
  groan(volume = 1) {
    if (volume < 0.03) return;
    const f = 70 + Math.random() * 60;
    tone({ freq: f, type: 'sawtooth', duration: 0.7 + Math.random() * 0.5, peak: 0.12, slideTo: f * 0.7, volume });
    noise({ duration: 0.6, freq: 500, type: 'bandpass', peak: 0.15, volume });
  },
  purchase() {
    tone({ freq: 1318, type: 'triangle', duration: 0.12, peak: 0.25 });
    tone({ freq: 1760, type: 'triangle', duration: 0.3, peak: 0.25, delay: 0.1 });
  },
  denied() {
    tone({ freq: 160, type: 'square', duration: 0.2, peak: 0.15 });
  },
  door() {
    noise({ duration: 1.2, freq: 200, sweepTo: 80, peak: 0.6, attack: 0.05 });
  },
  read() {
    tone({ freq: 660, type: 'sine', duration: 0.15, peak: 0.15 });
    tone({ freq: 990, type: 'sine', duration: 0.2, peak: 0.12, delay: 0.08 });
  },
  roundStart() {
    [55, 82.4, 110].forEach((f) => tone({ freq: f, type: 'sawtooth', duration: 3, peak: 0.12 }));
    [220, 207.6, 196].forEach((f, i) => tone({ freq: f, type: 'triangle', duration: 0.9, peak: 0.15, delay: i * 0.6 }));
  },
  roundEnd() {
    [196, 233, 293].forEach((f, i) => tone({ freq: f, type: 'triangle', duration: 1.4, peak: 0.12, delay: i * 0.25 }));
  },
  perk() {
    [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, type: 'square', duration: 0.18, peak: 0.08, delay: i * 0.12 }));
  },
};
