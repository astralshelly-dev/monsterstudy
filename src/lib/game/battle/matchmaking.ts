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
import { monsterPower, TEAM_SIZE } from "./config";
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
  authenticated: boolean;
};

export type Matchmaker = (ctx: MatchContext) => Promise<Opponent>;

const BEHAVIORS: AiBehavior[] = ["ofensivo", "defensivo", "equilibrado"];
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

function teamFromProfile(p: PublicProfile): TeamSlot[] {
  return Object.entries(p.monsters)
    .filter(([id]) => MONSTERS_BY_ID[id])
    .map(([id, v]) => ({ monsterId: id, level: Math.max(1, v.level) }))
    .sort((a, z) => monsterPower(z.monsterId, z.level) - monsterPower(a.monsterId, a.level))
    .slice(0, TEAM_SIZE);
}

/** monta uma equipe de bot próxima do nível do jogador, com monstros variados */
export function botTeam(teamLevel: number, playerLevel: number, exclude: string[] = []): TeamSlot[] {
  const maxTier = Math.min(RARITY_ORDER.length - 2, 1 + Math.floor(playerLevel / 4));
  const pool = MONSTERS.filter(
    (m) => m.rarity !== "secreto" && RARITY_ORDER.indexOf(m.rarity) <= maxTier && !exclude.includes(m.id),
  );
  const chosen: TeamSlot[] = [];
  const used = new Set<string>();
  while (chosen.length < TEAM_SIZE && pool.length > used.size) {
    const m = pick(pool);
    if (used.has(m.id)) continue;
    used.add(m.id);
    const lvl = Math.max(1, Math.round(teamLevel + (Math.random() * 2 - 1)));
    chosen.push({ monsterId: m.id, level: lvl });
  }
  return chosen;
}

const BOT_NAMES = [
  "Caçador Errante",
  "Guardião do Ateneu",
  "Aprendiz de Sombras",
  "Escriba de Pergaminhos",
  "Sentinela da Torre",
  "Domador Nômade",
];

export function makeBotOpponent(ctx: MatchContext, opts?: { exclude?: string[] }): Opponent {
  return {
    source: "bot",
    name: pick(BOT_NAMES),
    publicId: null,
    avatar: "art:arcanist",
    avatarMonsterId: null,
    level: Math.max(1, ctx.myLevel + Math.round(Math.random() * 2 - 1)),
    trophies: ctx.myTrophies,
    team: botTeam(ctx.myTeamLevel, ctx.myLevel, opts?.exclude ?? []),
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
  const bot = makeBotOpponent(ctx, { exclude: ownedIds });
  return {
    ...bot,
    name: `IA ${behavior ?? bot.behavior}`,
    behavior: behavior ?? bot.behavior,
  };
}
