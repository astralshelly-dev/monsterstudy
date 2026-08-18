import { getSnapshot } from "@/lib/game/state";

/**
 * Camada de áudio do jogo: um único AudioContext com dois barramentos
 * (música e efeitos), tudo sintetizado no navegador — sem arquivos.
 */

let ctx: AudioContext | null = null;
let masterMusic: GainNode | null = null;
let masterSfx: GainNode | null = null;

export function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) {
      ctx = new Ctor();
      masterMusic = ctx.createGain();
      masterMusic.gain.value = 0;
      masterMusic.connect(ctx.destination);
      masterSfx = ctx.createGain();
      masterSfx.gain.value = 1;
      masterSfx.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

type Settings = {
  sounds?: boolean;
  music?: boolean;
  musicVolume?: number;
  sfxVolume?: number;
};

function settings(): Settings {
  try {
    return (getSnapshot().settings ?? {}) as Settings;
  } catch {
    return {};
  }
}

export function sfxVolume(): number {
  const s = settings();
  if (s.sounds === false) return 0;
  return Math.max(0, Math.min(1, s.sfxVolume ?? 0.7));
}

export function musicVolume(): number {
  const s = settings();
  if (s.music === false) return 0;
  return Math.max(0, Math.min(1, s.musicVolume ?? 0.35));
}

export function sfxBus(): GainNode | null {
  const ac = audioCtx();
  if (!ac || !masterSfx) return null;
  masterSfx.gain.value = sfxVolume();
  return masterSfx;
}

export function musicBus(): GainNode | null {
  audioCtx();
  return masterMusic;
}

// ------------------------------------------------------------
// Blocos básicos de síntese
// ------------------------------------------------------------

type ToneOptions = {
  freq: number;
  start?: number;
  dur?: number;
  gain?: number;
  type?: OscillatorType;
  detune?: number;
  glideTo?: number;
  bus?: GainNode | null;
};

export function tone({
  freq,
  start = 0,
  dur = 0.2,
  gain = 0.16,
  type = "triangle",
  detune = 0,
  glideTo,
  bus,
}: ToneOptions) {
  const ac = audioCtx();
  const out = bus ?? sfxBus();
  if (!ac || !out) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t0 + dur);
  if (detune) osc.detune.setValueAtTime(detune, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + Math.min(0.05, dur * 0.35));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(out);
  osc.start(t0);
  osc.stop(t0 + dur + 0.06);
}

/** Ruído filtrado — usado em impactos e no vento da Lua de Sangue. */
export function noise({
  start = 0,
  dur = 0.2,
  gain = 0.12,
  freq = 1200,
  q = 1,
  type = "bandpass",
  bus,
}: {
  start?: number;
  dur?: number;
  gain?: number;
  freq?: number;
  q?: number;
  type?: BiquadFilterType;
  bus?: GainNode | null;
}) {
  const ac = audioCtx();
  const out = bus ?? sfxBus();
  if (!ac || !out) return;
  const t0 = ac.currentTime + start;
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(out);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

const A_MINOR = [220, 246.94, 261.63, 293.66, 329.63, 349.23, 415.3]; // A B C D E F G#
export const noteAt = (i: number) => {
  const oct = Math.floor(i / A_MINOR.length);
  return A_MINOR[((i % A_MINOR.length) + A_MINOR.length) % A_MINOR.length]! * Math.pow(2, oct);
};

// ------------------------------------------------------------
// Efeitos sonoros
// ------------------------------------------------------------

export type SfxName =
  | "click"
  | "navigate"
  | "purchase"
  | "error"
  | "damage"
  | "damageWeak"
  | "damageSuper"
  | "damageCrit"
  | "ability"
  | "heal"
  | "switch"
  | "victory"
  | "defeat"
  | "coin";

export function playSfx(name: SfxName) {
  if (sfxVolume() <= 0) return;
  if (!audioCtx()) return;
  switch (name) {
    case "click":
      tone({ freq: 880, dur: 0.06, gain: 0.05, type: "sine" });
      tone({ freq: 1320, start: 0.03, dur: 0.05, gain: 0.03, type: "sine" });
      break;
    case "navigate":
      tone({ freq: 523.25, dur: 0.09, gain: 0.05, type: "triangle" });
      tone({ freq: 783.99, start: 0.06, dur: 0.12, gain: 0.04, type: "sine" });
      break;
    case "purchase":
      tone({ freq: 659.25, dur: 0.12, gain: 0.1, type: "triangle" });
      tone({ freq: 987.77, start: 0.1, dur: 0.16, gain: 0.09, type: "triangle" });
      tone({ freq: 1318.5, start: 0.2, dur: 0.22, gain: 0.07, type: "sine" });
      break;
    case "coin":
      tone({ freq: 1244.5, dur: 0.07, gain: 0.07, type: "square" });
      tone({ freq: 1661.2, start: 0.05, dur: 0.1, gain: 0.05, type: "square" });
      break;
    case "error":
      tone({ freq: 233.08, dur: 0.18, gain: 0.1, type: "sawtooth", glideTo: 155 });
      break;
    case "damage":
      noise({ dur: 0.16, gain: 0.14, freq: 900, q: 0.8 });
      tone({ freq: 196, dur: 0.16, gain: 0.11, type: "triangle", glideTo: 120 });
      break;
    case "damageWeak":
      noise({ dur: 0.1, gain: 0.07, freq: 2200, q: 1.4 });
      tone({ freq: 330, dur: 0.09, gain: 0.05, type: "sine", glideTo: 260 });
      break;
    case "damageSuper":
      noise({ dur: 0.24, gain: 0.2, freq: 600, q: 0.6 });
      tone({ freq: 150, dur: 0.3, gain: 0.16, type: "sawtooth", glideTo: 70 });
      tone({ freq: 660, start: 0.02, dur: 0.2, gain: 0.08, type: "square", glideTo: 330 });
      break;
    case "damageCrit":
      noise({ dur: 0.34, gain: 0.24, freq: 420, q: 0.5 });
      tone({ freq: 110, dur: 0.42, gain: 0.2, type: "sawtooth", glideTo: 55 });
      tone({ freq: 880, start: 0.03, dur: 0.26, gain: 0.1, type: "square", glideTo: 220 });
      break;
    case "ability":
      for (let i = 0; i < 5; i++) {
        tone({ freq: noteAt(4 + i), start: i * 0.045, dur: 0.3, gain: 0.08, type: "triangle" });
      }
      tone({ freq: noteAt(11), start: 0.24, dur: 0.6, gain: 0.09, type: "sine" });
      noise({ start: 0.2, dur: 0.5, gain: 0.06, freq: 3000, q: 0.7, type: "highpass" });
      break;
    case "heal":
      tone({ freq: noteAt(2), dur: 0.22, gain: 0.08, type: "sine" });
      tone({ freq: noteAt(5), start: 0.12, dur: 0.3, gain: 0.07, type: "sine" });
      break;
    case "switch":
      noise({ dur: 0.22, gain: 0.08, freq: 1500, q: 0.6 });
      tone({ freq: 392, dur: 0.16, gain: 0.07, type: "triangle", glideTo: 587 });
      break;
    case "victory":
      [0, 2, 4, 7].forEach((s, i) =>
        tone({ freq: noteAt(4 + s), start: i * 0.13, dur: 0.5, gain: 0.11, type: "triangle" }),
      );
      break;
    case "defeat":
      [0, -2, -4].forEach((s, i) =>
        tone({ freq: noteAt(4 + s), start: i * 0.2, dur: 0.7, gain: 0.1, type: "sine" }),
      );
      tone({ freq: 82.4, start: 0.4, dur: 1.2, gain: 0.12, type: "sine" });
      break;
  }
}

// ------------------------------------------------------------
// Música ambiente — tema Lua de Sangue
// ------------------------------------------------------------

let musicTimer: number | null = null;
let musicBar = 0;
let musicSuspended = false;
let musicRunning = false;

function scheduleBar() {
  const bus = musicBus();
  const ac = audioCtx();
  if (!bus || !ac) return;
  const bar = musicBar++;
  const beat = 1.05; // ~57 bpm
  const root = [0, 5, 3, 4][bar % 4]!; // i - VI - IV - V (modal, misterioso)

  // drone grave
  tone({ freq: noteAt(root) / 4, dur: beat * 4.4, gain: 0.16, type: "sine", bus });
  tone({
    freq: noteAt(root) / 2,
    dur: beat * 4.2,
    gain: 0.06,
    type: "triangle",
    detune: -6,
    bus,
  });

  // pad de quinta/terça
  tone({ freq: noteAt(root + 2), start: 0.2, dur: beat * 3.4, gain: 0.05, type: "sine", bus });
  tone({ freq: noteAt(root + 4), start: 0.4, dur: beat * 3.2, gain: 0.045, type: "sine", bus });

  // vento distante
  noise({ start: 0.1, dur: beat * 4, gain: 0.03, freq: 520, q: 0.4, type: "lowpass", bus });

  // arpejo elegante, esparso
  const pattern = [0, 4, 2, 7, 4, 9];
  for (let i = 0; i < pattern.length; i++) {
    if ((bar + i) % 3 === 2) continue; // deixa respiros
    tone({
      freq: noteAt(root + 7 + pattern[i]!),
      start: 0.25 + i * (beat * 0.62),
      dur: 0.9,
      gain: 0.045,
      type: "triangle",
      bus,
    });
  }

  // sino ao longe a cada 4 compassos
  if (bar % 4 === 0) {
    tone({ freq: noteAt(root + 14), start: beat * 0.5, dur: 2.6, gain: 0.05, type: "sine", bus });
    tone({ freq: noteAt(root + 16), start: beat * 0.6, dur: 2.2, gain: 0.025, type: "sine", bus });
  }
}

function applyMusicGain() {
  const ac = audioCtx();
  const bus = musicBus();
  if (!ac || !bus) return;
  const target = musicSuspended || !musicRunning ? 0 : musicVolume() * 0.9;
  bus.gain.cancelScheduledValues(ac.currentTime);
  bus.gain.setValueAtTime(bus.gain.value, ac.currentTime);
  bus.gain.linearRampToValueAtTime(target, ac.currentTime + 1.4);
}

export function startMusic() {
  if (typeof window === "undefined") return;
  if (!audioCtx()) return;
  if (!musicRunning) {
    musicRunning = true;
    scheduleBar();
    musicTimer = window.setInterval(scheduleBar, 4200);
  }
  applyMusicGain();
}

export function stopMusic() {
  musicRunning = false;
  applyMusicGain();
  if (musicTimer !== null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
}

/** Silencia (ou libera) a música — usado durante sessões de estudo/leitura. */
export function setMusicSuspended(suspended: boolean) {
  musicSuspended = suspended;
  applyMusicGain();
}

export function refreshMusicVolume() {
  applyMusicGain();
}

export function isMusicRunning() {
  return musicRunning;
}
