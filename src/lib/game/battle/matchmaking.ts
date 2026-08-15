// ============================================================
// Monster Study — Matchmaking (PvP assíncrono)
//
// Hoje: TOTALMENTE ALEATÓRIO (qualquer jogador pode encontrar qualquer outro).
// Para trocar por matchmaking baseado em troféus/nível no futuro, basta
// implementar outra função `Matchmaker` e apontar `activeMatchmaker` para ela.
// ============================================================
import { randomProfiles, type PublicProfile } from "../cloud";
import { MONSTERS, MONSTERS_BY_ID } from "../monsters";
import { RARITY_ORDER } from "../config";
import { abilityStyle, monsterPower, TEAM_SIZE } from "./config";
import type { AiBehavior } from "./engine";

export type TeamSlot = { monsterId: string; level: number };

export type Opponent = {
  /** de onde veio o adversário */
  source: "player" | "bot";
  name: string;
  publicId: string | null;
  avatar: string;
  avatarMonsterId: string | null;
  level: number;
  trophies: number;
  team: TeamSlot[];
  behavior: AiBehavior;
};

export type MatchContext = {
  /** meu id público (para nunca enfrentar a mim mesmo) */
  myPublicId: string | null;
  myLevel: number;
  myTrophies: number;
  /** média de nível dos meus monstros — usado para os bots */
  myTeamLevel: number;
  /** maior tier de raridade que eu já tenho — a IA acompanha esse patamar */
  myTeamTier?: number;
  authenticated: boolean;
};

export type Matchmaker = (ctx: MatchContext) => Promise<Opponent>;

const BEHAVIORS: AiBehavior[] = ["ofensivo", "defensivo", "equilibrado"];
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

export function teamFromProfile(p: PublicProfile): TeamSlot[] {
  return Object.entries(p.monsters)
    .filter(([id]) => MONSTERS_BY_ID[id])
    .map(([id, v]) => ({ monsterId: id, level: Math.max(1, v.level) }))
    .sort((a, z) => monsterPower(z.monsterId, z.level) - monsterPower(a.monsterId, a.level))
    .slice(0, TEAM_SIZE);
}

/**
 * Monta a equipe do bot acompanhando o patamar do jogador e o estilo pedido:
 * ofensivo prioriza habilidades de dano, defensivo prioriza proteção/cura e
 * equilibrado mistura os dois.
 */
export function botTeam(
  teamLevel: number,
  playerLevel: number,
  exclude: string[] = [],
  opts?: { behavior?: AiBehavior; tier?: number },
): TeamSlot[] {
  const maxIndex = RARITY_ORDER.length - 2; // sem "secreto"
  const byLevel = 1 + Math.floor(playerLevel / 3);
  const maxTier = Math.min(maxIndex, Math.max(byLevel, (opts?.tier ?? 0)));
  const minTier = Math.max(0, maxTier - 2);
  const inRange = MONSTERS.filter(
    (m) =>
      m.rarity !== "secreto" &&
      RARITY_ORDER.indexOf(m.rarity) <= maxTier &&
      RARITY_ORDER.indexOf(m.rarity) >= minTier &&
      !exclude.includes(m.id),
  );
  const pool = inRange.length >= TEAM_SIZE
    ? inRange
    : MONSTERS.filter((m) => m.rarity !== "secreto" && !exclude.includes(m.id));

  const behavior = opts?.behavior ?? "equilibrado";
  const offensive = pool.filter((m) => abilityStyle(m.id) === "ofensivo");
  const defensive = pool.filter((m) => abilityStyle(m.id) === "defensivo");
  /** quantos monstros de suporte o estilo pede */
  const wantSupport = behavior === "defensivo" ? TEAM_SIZE - 1 : behavior === "ofensivo" ? 0 : 1;

  const chosen: TeamSlot[] = [];
  const used = new Set<string>();
  const take = (from: typeof pool) => {
    const options = from.filter((m) => !used.has(m.id));
    if (options.length === 0) return false;
    const m = pick(options);
    used.add(m.id);
    // times mais alinhados ao estilo ficam com raridade mais alta
    const bonus = behavior === "equilibrado" ? 0 : 1;
    const lvl = Math.max(1, Math.min(10, Math.round(teamLevel + bonus + (Math.random() * 2 - 1))));
    chosen.push({ monsterId: m.id, level: lvl });
    return true;
  };

  for (let i = 0; i < wantSupport; i += 1) if (!take(defensive)) take(pool);
  while (chosen.length < TEAM_SIZE) {
    const ok = behavior === "defensivo" ? take(pool) : take(offensive) || take(pool);
    if (!ok && !take(pool)) break;
  }
  // as raridades mais fortes entram primeiro em campo
  return chosen.sort((a, z) => monsterPower(z.monsterId, z.level) - monsterPower(a.monsterId, a.level));
}

const BOT_NAMES = [
  "Caçador Errante",
  "Guardião do Ateneu",
  "Aprendiz de Sombras",
  "Escriba de Pergaminhos",
  "Sentinela da Torre",
  "Domador Nômade",
];

export function makeBotOpponent(
  ctx: MatchContext,
  opts?: { exclude?: string[]; behavior?: AiBehavior },
): Opponent {
  const behavior = opts?.behavior ?? pick(BEHAVIORS);
  return {
    source: "bot",
    name: pick(BOT_NAMES),
    publicId: null,
    avatar: "art:arcanist",
    avatarMonsterId: null,
    level: Math.max(1, ctx.myLevel + Math.round(Math.random() * 2 - 1)),
    trophies: ctx.myTrophies,
    team: botTeam(ctx.myTeamLevel, ctx.myLevel, opts?.exclude ?? [], {
      behavior,
      tier: ctx.myTeamTier,
    }),
    behavior,
  };
}

/** transforma um perfil público em adversário (usado na batalha amistosa) */
export function opponentFromProfile(p: PublicProfile): Opponent {
  return {
    source: "player",
    name: p.displayName,
    publicId: p.publicId,
    avatar: p.avatar,
    avatarMonsterId: p.avatarMonsterId,
    level: p.level,
    trophies: Number(p.stats.trophies ?? 0),
    team: teamFromProfile(p),
    behavior: pick(BEHAVIORS),
  };
}

/** Matchmaking aleatório: sorteia qualquer jogador cadastrado, sem critérios. */
export const randomMatchmaker: Matchmaker = async (ctx) => {
  if (ctx.authenticated) {
    const profiles = await randomProfiles(120);
    const candidates = profiles.filter(
      (p) => p.publicId !== ctx.myPublicId && Object.keys(p.monsters).length > 0,
    );
    if (candidates.length > 0) {
      const p = pick(candidates);
      return {
        source: "player",
        name: p.displayName,
        publicId: p.publicId,
        avatar: p.avatar,
        avatarMonsterId: p.avatarMonsterId,
        level: p.level,
        trophies: Number(p.stats.trophies ?? 0),
        team: teamFromProfile(p),
        behavior: pick(BEHAVIORS),
      };
    }
  }
  // sem jogadores disponíveis (offline ou base vazia): adversário simulado
  return makeBotOpponent(ctx);
};

/**
 * Futuro: matchmaking por troféus/nível.
 * Troque `activeMatchmaker = trophyMatchmaker` quando quiser ativar.
 */
export const trophyMatchmaker: Matchmaker = async (ctx) => {
  if (ctx.authenticated) {
    const profiles = await randomProfiles(120);
    const candidates = profiles
      .filter((p) => p.publicId !== ctx.myPublicId && Object.keys(p.monsters).length > 0)
      .sort(
        (a, z) =>
          Math.abs(Number(a.stats.trophies ?? 0) - ctx.myTrophies) -
          Math.abs(Number(z.stats.trophies ?? 0) - ctx.myTrophies),
      )
      .slice(0, 10);
    if (candidates.length > 0) {
      const p = pick(candidates);
      return {
        source: "player",
        name: p.displayName,
        publicId: p.publicId,
        avatar: p.avatar,
        avatarMonsterId: p.avatarMonsterId,
        level: p.level,
        trophies: Number(p.stats.trophies ?? 0),
        team: teamFromProfile(p),
        behavior: pick(BEHAVIORS),
      };
    }
  }
  return makeBotOpponent(ctx);
};

/** ponto único de troca do algoritmo de matchmaking */
export const activeMatchmaker: Matchmaker = randomMatchmaker;

export function findOpponent(ctx: MatchContext): Promise<Opponent> {
  return activeMatchmaker(ctx);
}

/** adversário de treino (IA) — sempre com monstros diferentes dos do jogador */
export function trainingOpponent(ctx: MatchContext, ownedIds: string[], behavior?: AiBehavior): Opponent {
  const bot = makeBotOpponent(ctx, { exclude: ownedIds, ...(behavior ? { behavior } : {}) });
  return { ...bot, name: `IA ${bot.behavior}` };
}
