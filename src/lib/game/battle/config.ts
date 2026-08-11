// ============================================================
// Monster Study — Batalhas: balanceamento, ligas e habilidades
// ============================================================
import { MONSTERS, MONSTERS_BY_ID } from "../monsters";
import { RARITY_ORDER, type RarityId } from "../config";

export const TEAM_SIZE = 3;

/** troféus ganhos/perdidos por partida ranqueada */
export const TROPHY_WIN = { min: 20, max: 35 } as const;
export const TROPHY_LOSS = { min: 17, max: 25 } as const;

export type League = {
  id: string;
  name: string;
  icon: string;
  min: number;
  /** classe de gradiente reaproveitada do design system */
  surface: string;
  text: string;
};

export const LEAGUES: League[] = [
  { id: "bronze", name: "Bronze", icon: "🥉", min: 0, surface: "rarity-comum", text: "text-rarity-comum" },
  { id: "prata", name: "Prata", icon: "🥈", min: 400, surface: "rarity-incomum", text: "text-rarity-incomum" },
  { id: "ouro", name: "Ouro", icon: "🥇", min: 900, surface: "rarity-raro", text: "text-rarity-raro" },
  { id: "diamante", name: "Diamante", icon: "💎", min: 1500, surface: "rarity-super", text: "text-rarity-super" },
  { id: "mitico", name: "Mítico", icon: "🔮", min: 2200, surface: "rarity-epico", text: "text-rarity-epico" },
  { id: "lendario", name: "Lendário", icon: "🐉", min: 3000, surface: "rarity-lendario", text: "text-rarity-lendario" },
  { id: "mestre", name: "Mestre", icon: "👑", min: 4000, surface: "rarity-mitico", text: "text-rarity-mitico" },
  { id: "pro", name: "PRO", icon: "⚡", min: 5200, surface: "rarity-divino", text: "text-rarity-divino" },
];

export function leagueOf(trophies: number): League {
  let out = LEAGUES[0]!;
  for (const l of LEAGUES) if (trophies >= l.min) out = l;
  return out;
}

export function nextLeagueOf(trophies: number): League | null {
  return LEAGUES.find((l) => l.min > trophies) ?? null;
}

export function leagueProgress(trophies: number): { league: League; next: League | null; pct: number; missing: number } {
  const league = leagueOf(trophies);
  const next = nextLeagueOf(trophies);
  if (!next) return { league, next: null, pct: 100, missing: 0 };
  const span = next.min - league.min;
  const pct = Math.max(0, Math.min(100, ((trophies - league.min) / span) * 100));
  return { league, next, pct, missing: next.min - trophies };
}

// ------------------------------------------------------------
// Habilidades
// ------------------------------------------------------------
export type AbilityEffect =
  | { type: "damage"; mult: number; ignoreDef?: boolean }
  | { type: "damage_hits"; mult: number; hits: number }
  | { type: "execute"; mult: number; bonusMult: number; threshold: number }
  | { type: "drain"; mult: number; healPct: number }
  | { type: "burn"; mult: number; dotPct: number; turns: number }
  | { type: "splash"; mult: number; benchPct: number }
  | { type: "team_heal"; pct: number }
  | { type: "rage"; atkPct: number }
  | { type: "weaken"; atkPct: number }
  | { type: "shield"; pct: number }
  | { type: "fortify"; defPct: number; healPct: number };

export type Ability = {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** turnos entre usos (a habilidade dispara sozinha quando pronta) */
  cooldown: number;
  effect: AbilityEffect;
};

export const ABILITIES: Ability[] = [
  {
    id: "golpe_pesado",
    name: "Golpe Pesado",
    icon: "💥",
    description: "Um impacto brutal que causa dano muito acima do ataque básico.",
    cooldown: 3,
    effect: { type: "damage", mult: 2.2 },
  },
  {
    id: "canto_restaurador",
    name: "Canto Restaurador",
    icon: "💚",
    description: "Recupera vida de toda a equipe.",
    cooldown: 4,
    effect: { type: "team_heal", pct: 0.22 },
  },
  {
    id: "furia_crescente",
    name: "Fúria Crescente",
    icon: "🔥",
    description: "Aumenta o próprio ataque de forma acumulativa.",
    cooldown: 3,
    effect: { type: "rage", atkPct: 0.35 },
  },
  {
    id: "presenca_sombria",
    name: "Presença Sombria",
    icon: "🌑",
    description: "Reduz o ataque do monstro adversário em campo.",
    cooldown: 3,
    effect: { type: "weaken", atkPct: 0.3 },
  },
  {
    id: "carga_final",
    name: "Carga Final",
    icon: "☄️",
    description: "Causa dano extra contra adversários já feridos.",
    cooldown: 3,
    effect: { type: "execute", mult: 1.5, bonusMult: 1.2, threshold: 0.4 },
  },
  {
    id: "casca_arcana",
    name: "Casca Arcana",
    icon: "🛡️",
    description: "Cria um escudo que absorve o próximo dano recebido.",
    cooldown: 3,
    effect: { type: "shield", pct: 0.4 },
  },
  {
    id: "sugar_essencia",
    name: "Sugar Essência",
    icon: "🩸",
    description: "Fere o oponente e converte parte do dano em vida.",
    cooldown: 3,
    effect: { type: "drain", mult: 1.4, healPct: 0.55 },
  },
  {
    id: "lanca_perfurante",
    name: "Lança Perfurante",
    icon: "🗡️",
    description: "Ataque que ignora completamente a defesa inimiga.",
    cooldown: 3,
    effect: { type: "damage", mult: 1.75, ignoreDef: true },
  },
  {
    id: "rajada_dupla",
    name: "Rajada Dupla",
    icon: "⚡",
    description: "Dois golpes rápidos em sequência.",
    cooldown: 2,
    effect: { type: "damage_hits", mult: 0.95, hits: 2 },
  },
  {
    id: "chama_persistente",
    name: "Chama Persistente",
    icon: "🕯️",
    description: "Queima o adversário, causando dano por vários turnos.",
    cooldown: 3,
    effect: { type: "burn", mult: 1.1, dotPct: 0.35, turns: 3 },
  },
  {
    id: "onda_expansiva",
    name: "Onda Expansiva",
    icon: "🌊",
    description: "Atinge o monstro em campo e respinga na reserva inimiga.",
    cooldown: 4,
    effect: { type: "splash", mult: 1.5, benchPct: 0.35 },
  },
  {
    id: "postura_ancestral",
    name: "Postura Ancestral",
    icon: "🧱",
    description: "Eleva a própria defesa e recupera um pouco de vida.",
    cooldown: 3,
    effect: { type: "fortify", defPct: 0.45, healPct: 0.12 },
  },
];

export const ABILITIES_BY_ID: Record<string, Ability> = Object.fromEntries(
  ABILITIES.map((a) => [a.id, a]),
);

/**
 * Cada monstro tem UMA habilidade fixa (nunca aleatória).
 * A distribuição é determinística: derivada da ordem do bestiário.
 */
const ABILITY_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  MONSTERS.forEach((m, i) => {
    const tier = RARITY_ORDER.indexOf(m.rarity);
    // raridades altas começam mais adiante na lista (habilidades mais impactantes)
    const idx = (i * 5 + tier * 3) % ABILITIES.length;
    map[m.id] = ABILITIES[idx]!.id;
  });
  // ajustes de identidade para os mais emblemáticos
  map['astraeon'] = "onda_expansiva";
  map['luminara'] = "canto_restaurador";
  map['aetheryon'] = "golpe_pesado";
  map['emberfang'] = "chama_persistente";
  map['moonfang'] = "carga_final";
  map['barkgolem'] = "postura_ancestral";
  map['abyssaria'] = "sugar_essencia";
  map['voltyx'] = "rajada_dupla";
  return map;
})();

export function abilityFor(monsterId: string): Ability {
  const id = ABILITY_MAP[monsterId] ?? ABILITIES[0]!.id;
  return ABILITIES_BY_ID[id] ?? ABILITIES[0]!;
}

// ------------------------------------------------------------
// Atributos de combate
// ------------------------------------------------------------
export type MonsterBattleStats = {
  maxHp: number;
  atk: number;
  def: number;
};

export function battleStats(rarity: RarityId, level: number): MonsterBattleStats {
  const tier = RARITY_ORDER.indexOf(rarity);
  const lv = Math.max(1, level);
  return {
    maxHp: Math.round((72 + tier * 16) * (1 + (lv - 1) * 0.07)),
    atk: Math.round((18 + tier * 5.4) * (1 + (lv - 1) * 0.07)),
    def: Math.round((6 + tier * 2.6) * (1 + (lv - 1) * 0.05)),
  };
}

export function monsterPower(monsterId: string, level: number): number {
  const def = MONSTERS_BY_ID[monsterId];
  if (!def) return 0;
  const s = battleStats(def.rarity, level);
  return s.maxHp * 0.5 + s.atk * 6 + s.def * 4;
}
