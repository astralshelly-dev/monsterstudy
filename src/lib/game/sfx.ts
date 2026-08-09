import { RARITIES, RARITY_ORDER, type RarityId } from "@/lib/game/config";
import { getSnapshot } from "@/lib/game/state";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function soundsEnabled(): boolean {
  try {
    return getSnapshot().settings.sounds !== false;
  } catch {
    return true;
  }
}

type ToneOptions = {
  freq: number;
  start: number;
  dur: number;
  gain?: number;
  type?: OscillatorType;
  detune?: number;
};

function tone(ac: AudioContext, { freq, start, dur, gain = 0.16, type = "triangle", detune = 0 }: ToneOptions) {
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (detune) osc.detune.setValueAtTime(detune, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.05, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function sparkle(ac: AudioContext, start: number, count: number) {
  for (let i = 0; i < count; i++) {
    tone(ac, {
      freq: 1400 + i * 180 + Math.random() * 200,
      start: start + i * 0.055,
      dur: 0.14,
      gain: 0.05,
      type: "sine",
    });
  }
}

/** Escala maior estendida (semitons a partir da tônica) */
const SCALE = [0, 4, 7, 12, 16, 19, 24, 28, 31, 36];
const BASE = 261.63; // C4
const note = (semi: number) => BASE * Math.pow(2, semi / 12);

/**
 * Fanfarra de recompensa. Quanto maior a raridade, mais notas, mais camadas
 * e mais brilho — de dois bipes simples (comum) a um arpejo épico (divino).
 */
export function playRewardSfx(rarity: RarityId) {
  if (!soundsEnabled()) return;
  const ac = audio();
  if (!ac) return;
  const tier = Math.max(0, RARITY_ORDER.indexOf(rarity));
  const drama = RARITIES[rarity]?.drama ?? tier;

  const noteCount = 2 + tier; // 2 → 9 notas
  const step = 0.15 - Math.min(0.05, tier * 0.008);
  const gain = 0.13 + tier * 0.012;

  for (let i = 0; i < noteCount; i++) {
    const semi = SCALE[i % SCALE.length]! + Math.floor(i / SCALE.length) * 12;
    tone(ac, {
      freq: note(semi),
      start: i * step,
      dur: step * 1.9,
      gain,
      type: tier >= 4 ? "sawtooth" : "triangle",
    });
    // camada de oitava para raridades altas (mais "animado")
    if (tier >= 3) {
      tone(ac, {
        freq: note(semi + 12),
        start: i * step + 0.02,
        dur: step * 1.4,
        gain: gain * 0.45,
        type: "sine",
      });
    }
    if (tier >= 5) {
      tone(ac, {
        freq: note(semi + 7),
        start: i * step + 0.01,
        dur: step * 1.4,
        gain: gain * 0.3,
        type: "square",
        detune: 6,
      });
    }
  }

  const end = noteCount * step;

  // acorde final
  if (tier >= 2) {
    for (const semi of [12, 16, 19, 24].slice(0, 2 + Math.min(2, tier - 2))) {
      tone(ac, { freq: note(semi), start: end, dur: 0.6 + drama * 0.08, gain: gain * 0.7, type: "triangle" });
    }
  }
  // brilhos
  if (tier >= 3) sparkle(ac, end + 0.05, 2 + tier);
  // baixo grave nas raridades supremas
  if (tier >= 5) {
    tone(ac, { freq: note(-24), start: end, dur: 1.1 + drama * 0.1, gain: 0.2, type: "sine" });
  }
  if (tier >= 6) {
    tone(ac, { freq: note(-12), start: end + 0.12, dur: 1.2, gain: 0.14, type: "sawtooth" });
  }
}

/** Alarme suave de fim de cronômetro: dois toques ascendentes repetidos. */
export function playTimerEndSfx() {
  if (!soundsEnabled()) return;
  const ac = audio();
  if (!ac) return;
  for (let rep = 0; rep < 2; rep++) {
    const base = rep * 0.62;
    tone(ac, { freq: note(12), start: base, dur: 0.24, gain: 0.16, type: "sine" });
    tone(ac, { freq: note(19), start: base + 0.22, dur: 0.32, gain: 0.16, type: "sine" });
  }
}

/** Som curto e neutro para sessões sem monstro (ex.: encerrada muito cedo). */
export function playNoRewardSfx() {
  if (!soundsEnabled()) return;
  const ac = audio();
  if (!ac) return;
  tone(ac, { freq: note(4), start: 0, dur: 0.22, gain: 0.12, type: "triangle" });
  tone(ac, { freq: note(-3), start: 0.2, dur: 0.4, gain: 0.12, type: "triangle" });
}
