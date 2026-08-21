// ============================================================
// Monster Study — Batalhas: balanceamento, ligas e habilidades
// ============================================================
import { MONSTERS, MONSTERS_BY_ID } from "../monsters";
import { RARITY_ORDER, type RarityId } from "../config";

export const TEAM_SIZE = 6;

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

export function leagueProgress(trophies: number): {
  league: League;
  next: League | null;
  pct: number;
  missing: number;
} {
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
  | { type: "fortify"; defPct: number; healPct: number }
  // ---- expansão ----
  | { type: "poison"; mult: number; dotPct: number; turns: number }
  | { type: "break_def"; mult: number; defPct: number }
  | { type: "haste"; mult: number; spdPct: number }
  | { type: "slow"; mult: number; spdPct: number }
  | { type: "double_edge"; mult: number; selfPct: number }
  | { type: "team_shield"; pct: number }
  | { type: "purge"; healPct: number; defPct: number }
  /** eco temporal: o dano de agora se repete sozinho no próximo turno */
  | { type: "echo"; mult: number; echoPct: number; turns: number }
  /** veredito: marca permanente — o alvo sofre mais dano e alimenta quem o ferir */
  | { type: "judgment"; markPct: number; lifestealPct: number; abilityLifestealPct: number }
  /** eclipse do início: dano proporcional à vida ATUAL do alvo (curva interpolada) */
  | {
      type: "eclipse";
      /** pontos da curva: [pct de vida do alvo, multiplicador] */
      curve: [number, number][];
      /** recuo sofrido quando o multiplicador passa de 1,0 (fração do dano da habilidade) */
      recoilPct: number;
      /** vida mínima do alvo (fração) para aplicar a Marca do Eclipse */
      markThreshold: number;
      /** dano extra do próximo golpe recebido pelo marcado */
      markPct: number;
    };

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
    cooldown: 4,
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
  // ---------------- Expansão de habilidades ----------------
  {
    id: "sopro_toxico",
    name: "Sopro Tóxico",
    icon: "☠️",
    description: "Envenena o adversário: dano contínuo por vários turnos que ignora escudos.",
    cooldown: 3,
    effect: { type: "poison", mult: 1.05, dotPct: 0.3, turns: 4 },
  },
  {
    id: "corrosao",
    name: "Corrosão",
    icon: "🧪",
    description: "Fere e derrete a armadura inimiga, reduzindo a defesa dele.",
    cooldown: 3,
    effect: { type: "break_def", mult: 1.15, defPct: 0.35 },
  },
  {
    id: "rajada_de_vento",
    name: "Rajada de Vento",
    icon: "🌪️",
    description: "Golpe leve que acelera o usuário, ajudando a atacar primeiro.",
    cooldown: 3,
    effect: { type: "haste", mult: 0.85, spdPct: 0.3 },
  },
  {
    id: "ventania_cortante",
    name: "Ventania Cortante",
    icon: "🍃",
    description: "Três cortes de ar em sequência.",
    cooldown: 3,
    effect: { type: "damage_hits", mult: 0.8, hits: 3 },
  },
  {
    id: "ferrugem",
    name: "Ferrugem",
    icon: "⚙️",
    description: "Enferruja o oponente, tirando velocidade dele por toda a batalha.",
    cooldown: 3,
    effect: { type: "slow", mult: 1.0, spdPct: 0.25 },
  },
  {
    id: "avalanche",
    name: "Avalanche",
    icon: "🪨",
    description: "Impacto devastador — mas o próprio usuário sofre parte do recuo.",
    cooldown: 4,
    effect: { type: "double_edge", mult: 2.9, selfPct: 0.12 },
  },
  {
    id: "muralha_de_aco",
    name: "Muralha de Aço",
    icon: "🛡️",
    description: "Ergue escudos de metal para toda a equipe.",
    cooldown: 4,
    effect: { type: "team_shield", pct: 0.18 },
  },
  {
    id: "purificar",
    name: "Purificar",
    icon: "🌬️",
    description: "Limpa veneno, queimadura e reduções, cura e reforça a defesa.",
    cooldown: 4,
    effect: { type: "purge", healPct: 0.2, defPct: 0.25 },
  },
  {
    id: "eco_temporal",
    name: "Eco Temporal",
    icon: "⏳",
    description:
      "Fere o oponente e deixa um eco do golpe: nos próximos turnos o mesmo dano se repete sozinho, mesmo que Chronavyr troque de alvo.",
    cooldown: 4,
    effect: { type: "echo", mult: 1.35, echoPct: 0.7, turns: 2 },
  },
  {
    id: "veredito_do_equinocio",
    name: "Veredito do Equinócio",
    icon: "⚖️",
    description:
      "Não causa dano próprio: marca o adversário até a morte dele. O marcado sofre +20% de dano de qualquer fonte e, sempre que é ferido, quem atacou drena 25% do dano em vida (12% se o golpe vier de uma habilidade especial). A marca não acumula. Recarga: 4 rodadas, mas a primeira recarga é mais rápida (3).",
    cooldown: 4,
    effect: { type: "judgment", markPct: 0.2, lifestealPct: 0.25, abilityLifestealPct: 0.12 },
  },
  {
    id: "eclipse_do_inicio",
    name: "Eclipse do Início",
    icon: "👁️",
    description:
      "Aetheryon concentra o eclipse sobre o alvo: quanto MAIS vida atual o inimigo tiver, maior o dano (160% do ataque com vida cheia, descendo até 60% com o alvo quase caído). Respeita defesa e elementos. Se o multiplicador passar de 100%, Aetheryon sofre 20% do dano da habilidade como recuo. Contra alvos com 80%+ de vida, aplica 🌑 Marca do Eclipse: o próximo dano recebido pelo alvo é +10% (1 rodada, não acumula). Recarga: 4 rodadas.",
    cooldown: 4,
    effect: {
      type: "eclipse",
      curve: [
        [1.0, 1.6],
        [0.9, 1.45],
        [0.75, 1.25],
        [0.5, 1.0],
        [0.25, 0.75],
        [0.1, 0.6],
      ],
      recoilPct: 0.2,
      markThreshold: 0.8,
      markPct: 0.1,
    },
  },
];

export const ABILITIES_BY_ID: Record<string, Ability> = Object.fromEntries(ABILITIES.map((a) => [a.id, a]));

/**
 * Cada monstro tem UMA habilidade fixa (nunca aleatória).
 * A distribuição é determinística: derivada da ordem do bestiário.
 */
/** habilidades exclusivas: nunca entram na distribuição automática */
const EXCLUSIVE_ABILITIES = ["veredito_do_equinocio", "eclipse_do_inicio"];

const ABILITY_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  const pool = ABILITIES.filter((a) => !EXCLUSIVE_ABILITIES.includes(a.id));
  MONSTERS.forEach((m, i) => {
    const tier = RARITY_ORDER.indexOf(m.rarity);
    // raridades altas começam mais adiante na lista (habilidades mais impactantes)
    const idx = (i * 5 + tier * 3) % pool.length;
    map[m.id] = pool[idx]!.id;
  });
  // ajustes de identidade para os mais emblemáticos
  map["astraeon"] = "onda_expansiva";
  map["luminara"] = "canto_restaurador";
  map["aetheryon"] = "eclipse_do_inicio";
  map["emberfang"] = "chama_persistente";

  map["moonfang"] = "carga_final";
  map["barkgolem"] = "postura_ancestral";
  map["abyssaria"] = "sugar_essencia";
  map["voltyx"] = "rajada_dupla";
  // expansão: identidade dos novos elementos
  map["cragling"] = "avalanche";
  map["terrabor"] = "postura_ancestral";
  map["gaiaruk"] = "avalanche";
  map["ferrik"] = "ferrugem";
  map["chromaw"] = "corrosao";
  map["titanox"] = "muralha_de_aco";
  map["zephyx"] = "rajada_de_vento";
  map["gustwing"] = "ventania_cortante";
  map["aeromyr"] = "purificar";
  map["toxlet"] = "sopro_toxico";
  map["venomyra"] = "sopro_toxico";
  map["malachor"] = "corrosao";
  map["quartzox"] = "muralha_de_aco";
  map["thornmaw"] = "sopro_toxico";
  map["abyssquill"] = "sopro_toxico";
  map["tempestrix"] = "rajada_de_vento";
  map["mistmote"] = "ventania_cortante";
  map["pebbly"] = "postura_ancestral";
  map["dunecoil"] = "ferrugem";
  map["chronavyr"] = "eco_temporal";
  map["equinoxis"] = "veredito_do_equinocio";
  return map;
})();

export function abilityFor(monsterId: string): Ability {
  const id = ABILITY_MAP[monsterId] ?? ABILITIES[0]!.id;
  return ABILITIES_BY_ID[id] ?? ABILITIES[0]!;
}

// ------------------------------------------------------------
// Atributos de combate
// ------------------------------------------------------------
/** força dos efeitos da habilidade especial conforme o nível (dano, cura, escudo…) */
export function abilityScale(level: number): number {
  return 1 + (Math.max(1, level) - 1) * 0.06;
}

export type MonsterBattleStats = {
  maxHp: number;
  atk: number;
  def: number;
  /** iniciativa: quem tem mais velocidade ataca primeiro */
  spd: number;
};

/**
 * Velocidade é uma característica de CADA monstro (não da raridade):
 * criaturas ágeis (felinos, aves, faíscas) correm muito mais que
 * criaturas pesadas (golens, baleias, tanques de pedra). Um lendário
 * pode perfeitamente ser mais lento que um comum.
 */
export const SPEED_FACTOR: Record<string, number> = {
  // comuns
  mosslet: 0.72,
  pebbly: 0.78,
  drippet: 1.02,
  sparkid: 1.34,
  frostnib: 0.95,
  vinelet: 0.85,
  twiglin: 0.98,
  sandpip: 1.16,
  // incomuns
  thornhop: 1.28,
  tidewhisk: 1.12,
  cindertail: 1.22,
  glaciva: 0.9,
  dunecoil: 1.05,
  lumibug: 1.3,
  mistmote: 1.24,
  glowfin: 1.08,
  // raros
  ashmole: 0.8,
  emberfang: 1.26,
  moonfang: 1.36,
  abyssquill: 0.94,
  barkgolem: 0.6,
  mirasand: 1.1,
  petalynx: 1.42,
  quartzox: 0.66,
  bloomserp: 1.04,
  starkit: 1.32,
  // super raros
  stormhorn: 1.14,
  voidbloom: 0.86,
  kraveel: 1.2,
  magmaw: 0.7,
  thornmaw: 0.9,
  voltyx: 1.46,
  // épicos
  aurelith: 0.96,
  cryotaur: 0.82,
  sylvaqueen: 1.06,
  obsidrake: 1.18,
  tempestrix: 1.4,
  dunephar: 0.88,
  // lendários
  solmyrr: 1.1,
  nebulith: 1.0,
  thundrix: 1.44,
  seraphae: 1.3,
  // míticos
  eclipsaur: 0.76,
  arcanyx: 1.08,
  abyssaria: 0.68,
  umbraleth: 1.34,
  // divinos
  astraeon: 1.02,
  luminara: 1.22,
  chronavyr: 1.34,
  equinoxis: 1.1,
  // expansão
  cragling: 0.68,
  terrabor: 0.74,
  gaiaruk: 0.58,
  ferrik: 0.8,
  chromaw: 1.4,
  titanox: 0.64,
  zephyx: 1.36,
  gustwing: 1.43,
  aeromyr: 1.45,
  toxlet: 0.9,
  venomyra: 1.16,
  malachor: 1.0,
  // secreto
  aetheryon: 1.38,
};

export function speedFactor(monsterId: string): number {
  return SPEED_FACTOR[monsterId] ?? 1;
}

/**
 * Perfil físico de CADA monstro: vida, ataque e defesa vêm do que faz sentido
 * para a criatura (uma baleia cósmica tem muita vida e pouco dano; um lince
 * elétrico o contrário). A raridade ainda pesa, mas pouco.
 */
export type StatProfile = { hp: number; atk: number; def: number };

export const STAT_PROFILE: Record<string, StatProfile> = {
  // ---- comuns ----
  mosslet: { hp: 3.45, atk: 0.82, def: 1.12 },
  pebbly: { hp: 3.3, atk: 0.85, def: 1.35 },
  drippet: { hp: 3.0, atk: 0.95, def: 0.95 },
  sparkid: { hp: 2.4, atk: 1.28, def: 0.8 },
  frostnib: { hp: 3.76, atk: 1.05, def: 1.0 },
  vinelet: { hp: 3.24, atk: 0.9, def: 1.05 },
  twiglin: { hp: 2.85, atk: 1.0, def: 0.95 },
  sandpip: { hp: 2.55, atk: 1.12, def: 0.85 },
  cragling: { hp: 3.66, atk: 0.9, def: 1.4 },
  toxlet: { hp: 2.85, atk: 1.1, def: 0.9 },
  ferrik: { hp: 3.0, atk: 0.95, def: 1.38 },
  // ---- incomuns ----
  thornhop: { hp: 2.63, atk: 1.2, def: 0.9 },
  tidewhisk: { hp: 3.06, atk: 1.0, def: 0.98 },
  cindertail: { hp: 2.7, atk: 1.22, def: 0.85 },
  glaciva: { hp: 3.6, atk: 0.88, def: 1.22 },
  dunecoil: { hp: 3.0, atk: 1.05, def: 1.0 },
  lumibug: { hp: 2.4, atk: 1.15, def: 0.85 },
  mistmote: { hp: 2.55, atk: 1.05, def: 0.95 },
  glowfin: { hp: 2.85, atk: 1.08, def: 0.92 },
  zephyx: { hp: 2.46, atk: 1.18, def: 0.85 },
  // ---- raros ----
  ashmole: { hp: 3.54, atk: 0.95, def: 1.28 },
  emberfang: { hp: 2.76, atk: 1.35, def: 0.88 },
  moonfang: { hp: 2.85, atk: 1.3, def: 0.9 },
  abyssquill: { hp: 3.0, atk: 1.12, def: 0.95 },
  barkgolem: { hp: 4.35, atk: 0.82, def: 1.5 },
  mirasand: { hp: 2.7, atk: 1.18, def: 0.88 },
  petalynx: { hp: 2.55, atk: 1.28, def: 0.85 },
  quartzox: { hp: 3.36, atk: 0.88, def: 1.45 },
  bloomserp: { hp: 3.15, atk: 1.08, def: 0.98 },
  starkit: { hp: 2.46, atk: 1.22, def: 0.88 },
  gustwing: { hp: 2.85, atk: 1.3, def: 0.82 },
  terrabor: { hp: 3.9, atk: 0.92, def: 1.42 },
  // ---- super raros ----
  stormhorn: { hp: 3.45, atk: 1.15, def: 1.08 },
  voidbloom: { hp: 3.15, atk: 1.2, def: 0.95 },
  kraveel: { hp: 3.66, atk: 1.05, def: 1.0 },
  magmaw: { hp: 4.05, atk: 1.25, def: 1.05 },
  thornmaw: { hp: 3.56, atk: 1.22, def: 0.9 },
  voltyx: { hp: 2.4, atk: 1.42, def: 0.82 },
  venomyra: { hp: 2.7, atk: 1.32, def: 0.9 },
  chromaw: { hp: 2.76, atk: 1.2, def: 1.25 },
  // ---- épicos ----
  aurelith: { hp: 2.85, atk: 1.22, def: 0.95 },
  cryotaur: { hp: 4.26, atk: 1.05, def: 1.35 },
  sylvaqueen: { hp: 3.15, atk: 1.15, def: 1.05 },
  obsidrake: { hp: 3.3, atk: 1.3, def: 1.15 },
  tempestrix: { hp: 2.7, atk: 1.32, def: 0.88 },
  dunephar: { hp: 3.45, atk: 1.0, def: 1.25 },
  gaiaruk: { hp: 4.5, atk: 1.0, def: 1.45 },
  aeromyr: { hp: 2.64, atk: 1.25, def: 0.95 },
  // ---- lendários ----
  solmyrr: { hp: 3.36, atk: 1.3, def: 1.05 },
  nebulith: { hp: 4.6, atk: 0.82, def: 1.2 }, // baleia: muita vida, pouco dano
  thundrix: { hp: 2.7, atk: 1.4, def: 0.92 },
  seraphae: { hp: 3.15, atk: 1.05, def: 1.15 },
  chronavyr: { hp: 3.0, atk: 1.18, def: 1.05 },
  titanox: { hp: 4.2, atk: 1.05, def: 1.55 },
  // ---- míticos ----
  eclipsaur: { hp: 4.05, atk: 1.1, def: 1.3 },
  arcanyx: { hp: 2.76, atk: 1.38, def: 0.95 },
  abyssaria: { hp: 4.35, atk: 1.0, def: 1.18 },
  umbraleth: { hp: 2.85, atk: 1.4, def: 0.9 },
  malachor: { hp: 3.0, atk: 1.35, def: 1.0 },
  // ---- divinos ----
  astraeon: { hp: 3.75, atk: 1.2, def: 1.25 },
  equinoxis: { hp: 3.6, atk: 1.05, def: 1.2 },
  luminara: { hp: 3.3, atk: 1.15, def: 1.15 },
  // ---- secreto ----
  aetheryon: { hp: 3.6, atk: 1.35, def: 1.15 },
};

export function statProfile(monsterId?: string): StatProfile {
  return (monsterId ? STAT_PROFILE[monsterId] : undefined) ?? { hp: 1, atk: 1, def: 1 };
}

export function battleStats(rarity: RarityId, level: number, monsterId?: string): MonsterBattleStats {
  const tier = RARITY_ORDER.indexOf(rarity);
  const lv = Math.max(1, level);
  const p = statProfile(monsterId);
  return {
    // a raridade dá uma base; o perfil da criatura define o resto
    maxHp: Math.round((86 + tier * 11) * p.hp * (1 + (lv - 1) * 0.09)),
    atk: Math.round((21 + tier * 3.7) * p.atk * (1 + (lv - 1) * 0.09)),
    def: Math.round((7 + tier * 1.8) * p.def * (1 + (lv - 1) * 0.07)),
    // a velocidade vem das características do monstro; a raridade quase não conta
    spd: Math.round((24 + tier * 0.6) * (monsterId ? speedFactor(monsterId) : 1) * (1 + (lv - 1) * 0.05) * 10) / 10,
  };
}

export function monsterPower(monsterId: string, level: number): number {
  const def = MONSTERS_BY_ID[monsterId];
  if (!def) return 0;
  const s = battleStats(def.rarity, level, monsterId);
  return s.maxHp * 0.5 + s.atk * 6 + s.def * 4 + s.spd * 2;
}

/** estilos de habilidade — usados pela IA para montar times coerentes */
export const OFFENSIVE_EFFECTS = [
  "damage",
  "damage_hits",
  "execute",
  "burn",
  "splash",
  "rage",
  "poison",
  "break_def",
  "double_edge",
  "haste",
  "echo",
  "judgment",
] as const;
export const DEFENSIVE_EFFECTS = [
  "shield",
  "fortify",
  "team_heal",
  "drain",
  "weaken",
  "team_shield",
  "purge",
  "slow",
] as const;

export function abilityStyle(monsterId: string): "ofensivo" | "defensivo" {
  const t = abilityFor(monsterId).effect.type;
  return (DEFENSIVE_EFFECTS as readonly string[]).includes(t) ? "defensivo" : "ofensivo";
}
