// ============================================================
// Monster Study — Evento temporário 🌕🔴 LUA DE SANGUE
// Camada temporária: moeda própria, loja própria e 10 skins
// exclusivas. Não altera a economia normal do jogo.
// ============================================================

import type { RarityId } from "./config";

export const BLOOD_MOON = {
  id: "blood_moon_2026",
  name: "Lua de Sangue",
  icon: "🌕🔴",
  coinIcon: "🩸",
  coinName: "Moeda da Lua de Sangue",
  /** janela do evento (UTC) */
  startsAt: "2026-08-18T00:00:00.000Z",
  endsAt: "2026-09-01T00:00:00.000Z",
  /** 1 moeda por minuto REAL de estudo/leitura registrado (≈60/hora) */
  coinSeconds: 60,
  description:
    "Enquanto a Lua de Sangue estiver no céu, cada minuto de estudo ou leitura rende Moedas da Lua de Sangue. Gaste-as na loja do evento — o que você comprar fica para sempre na sua coleção.",
} as const;

export type BloodMoonSkin = {
  id: string;
  monsterId: string;
  name: string;
  rarity: RarityId;
  price: number;
  description: string;
  /** acessório temático desenhado sobre o monstro */
  accessory: string;
  /** variação visual (classe CSS) */
  fx: "aura" | "moon" | "ember" | "veil" | "eclipse";
};

/** 10 skins exclusivas: 3 divinas, 3 míticas, 4 lendárias */
export const BLOOD_MOON_SKINS: BloodMoonSkin[] = [
  // ---------- Divinos ----------
  {
    id: "bm_skin_equinoxis",
    monsterId: "equinoxis",
    name: "Equinoxis — Eclipse Rubro",
    rarity: "divino",
    price: 1800,
    description: "Manto de eclipse e halo carmesim girando atrás do juiz do equinócio.",
    accessory: "🌑",
    fx: "eclipse",
  },
  {
    id: "bm_skin_luminara",
    monsterId: "luminara",
    name: "Luminara — Véu Sangrento",
    rarity: "divino",
    price: 1650,
    description: "Véu translúcido escarlate e pequenas luas orbitando a criatura.",
    accessory: "🌘",
    fx: "veil",
  },
  {
    id: "bm_skin_astraeon",
    monsterId: "astraeon",
    name: "Astraeon — Coroa Escarlate",
    rarity: "divino",
    price: 1500,
    description: "Coroa de luar vermelho e poeira estelar rubra ao redor das asas.",
    accessory: "👑",
    fx: "aura",
  },
  // ---------- Míticos ----------
  {
    id: "bm_skin_eclipsaur",
    monsterId: "eclipsaur",
    name: "Eclipsaur — Presságio Carmesim",
    rarity: "mitico",
    price: 1050,
    description: "Marcas rituais vermelhas e um eclipse suspenso sobre a cabeça.",
    accessory: "🔴",
    fx: "moon",
  },
  {
    id: "bm_skin_abyssaria",
    monsterId: "abyssaria",
    name: "Abyssaria — Maré Escarlate",
    rarity: "mitico",
    price: 980,
    description: "Correntes de água tingida de sangue e brilho profundo carmesim.",
    accessory: "🩸",
    fx: "veil",
  },
  {
    id: "bm_skin_umbraleth",
    monsterId: "umbraleth",
    name: "Umbraleth — Sombra Rubra",
    rarity: "mitico",
    price: 920,
    description: "Sombra que sangra luz vermelha, com olhos de lua cheia.",
    accessory: "🌒",
    fx: "eclipse",
  },
  // ---------- Lendários ----------
  {
    id: "bm_skin_chronavyr",
    monsterId: "chronavyr",
    name: "Chronavyr — Hora Vermelha",
    rarity: "lendario",
    price: 660,
    description: "Engrenagens rubras e um relógio de lua marcando a noite do evento.",
    accessory: "⏳",
    fx: "moon",
  },
  {
    id: "bm_skin_solmyrr",
    monsterId: "solmyrr",
    name: "Solmyrr — Sol Eclipsado",
    rarity: "lendario",
    price: 620,
    description: "O sol da criatura escurece e ganha uma coroa de fogo carmesim.",
    accessory: "🌗",
    fx: "ember",
  },
  {
    id: "bm_skin_thundrix",
    monsterId: "thundrix",
    name: "Thundrix — Trovão Sangrento",
    rarity: "lendario",
    price: 560,
    description: "Relâmpagos vermelhos e faíscas escarlates acompanhando o rugido.",
    accessory: "⚡",
    fx: "ember",
  },
  {
    id: "bm_skin_titanox",
    monsterId: "titanox",
    name: "Titanox — Armadura Rubra",
    rarity: "lendario",
    price: 520,
    description: "Placas de ferro tingidas de vermelho com selos de lua gravados.",
    accessory: "🛡️",
    fx: "aura",
  },
];

export const BLOOD_MOON_SKINS_BY_ID: Record<string, BloodMoonSkin> = Object.fromEntries(
  BLOOD_MOON_SKINS.map((s) => [s.id, s]),
);

export const BLOOD_MOON_SKIN_BY_MONSTER: Record<string, BloodMoonSkin> = Object.fromEntries(
  BLOOD_MOON_SKINS.map((s) => [s.monsterId, s]),
);

/** cosméticos de perfil vendidos na loja do evento (ids existem em cosmetics.ts) */
export type BloodMoonCosmetic = { cosmeticId: string; price: number };

export const BLOOD_MOON_COSMETICS: BloodMoonCosmetic[] = [
  { cosmeticId: "badge_bloodmoon", price: 180 },
  { cosmeticId: "title_bloodmoon", price: 300 },
  { cosmeticId: "fx_bloodmoon", price: 420 },
  { cosmeticId: "frame_bloodmoon", price: 700 },
];

export const BLOOD_MOON_PRICES_BY_COSMETIC: Record<string, number> = Object.fromEntries(
  BLOOD_MOON_COSMETICS.map((c) => [c.cosmeticId, c.price]),
);

export function bloodMoonStart(): number {
  return Date.parse(BLOOD_MOON.startsAt);
}

export function bloodMoonEnd(): number {
  return Date.parse(BLOOD_MOON.endsAt);
}

export function bloodMoonActive(now = Date.now()): boolean {
  return now >= bloodMoonStart() && now < bloodMoonEnd();
}

export function bloodMoonEnded(now = Date.now()): boolean {
  return now >= bloodMoonEnd();
}

/** tempo restante formatado: "6d 14h 03m" */
export function bloodMoonRemaining(now = Date.now()) {
  const ms = Math.max(0, bloodMoonEnd() - now);
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return { ms, days, hours, minutes, label: `${days}d ${hours}h ${String(minutes).padStart(2, "0")}m` };
}

/** classes visuais da skin (aplicadas sobre a arte original do monstro) */
export function skinFxClass(fx: BloodMoonSkin["fx"]): string {
  return `bm-skin bm-skin-${fx}`;
}
