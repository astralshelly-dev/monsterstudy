// ============================================================
// Monster Study — Temporadas competitivas (ciclos de 60 dias)
// ============================================================
import { LEAGUES, leagueOf, type League } from "./battle/config";

/** início da Temporada 1 */
export const SEASON_EPOCH = Date.UTC(2026, 7, 1); // 1 de agosto de 2026
export const SEASON_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

/** nomes gerados para as temporadas (ciclo grande, sem repetição próxima) */
export const SEASON_NAMES = [
  "Ascensão dos Monstros",
  "Eclipse Arcano",
  "Chamado das Profundezas",
  "Coroa de Cinzas",
  "Aurora Congelada",
  "Tempestade Eterna",
  "Jardim Sussurrante",
  "Véu das Sombras",
  "Alvorada Dourada",
  "Marés do Infinito",
  "Trono Vulcânico",
  "Constelação Perdida",
];

export type Season = {
  number: number;
  name: string;
  startsAt: number;
  endsAt: number;
  /** dias restantes */
  daysLeft: number;
  pct: number;
};

export function seasonAt(time = Date.now()): Season {
  const elapsed = Math.max(0, time - SEASON_EPOCH);
  const index = Math.floor(elapsed / (SEASON_DAYS * DAY_MS));
  const startsAt = SEASON_EPOCH + index * SEASON_DAYS * DAY_MS;
  const endsAt = startsAt + SEASON_DAYS * DAY_MS;
  const number = index + 1;
  return {
    number,
    name: SEASON_NAMES[index % SEASON_NAMES.length]!,
    startsAt,
    endsAt,
    daysLeft: Math.max(0, Math.ceil((endsAt - time) / DAY_MS)),
    pct: Math.min(100, ((time - startsAt) / (endsAt - startsAt)) * 100),
  };
}

export function currentSeason(): Season {
  return seasonAt();
}

export type SeasonReward = {
  money: number;
  shards: number;
  items: number;
  title?: string | undefined;
  cosmetic?: string | undefined;
};

/** recompensa por posição final no ranking da temporada */
export const RANK_REWARDS: Array<{ max: number; label: string; icon: string; reward: SeasonReward }> = [
  { max: 1, label: "Top 1", icon: "🥇", reward: { money: 250000, shards: 400, items: 5, title: "title_campeao", cosmetic: "frame_champion" } },
  { max: 2, label: "Top 2", icon: "🥈", reward: { money: 180000, shards: 300, items: 4, title: "title_veterano", cosmetic: "frame_champion" } },
  { max: 3, label: "Top 3", icon: "🥉", reward: { money: 130000, shards: 220, items: 3, title: "title_veterano", cosmetic: "frame_gold" } },
  { max: 10, label: "Top 4-10", icon: "🏆", reward: { money: 80000, shards: 150, items: 2, cosmetic: "frame_gold" } },
  { max: 50, label: "Top 11-50", icon: "🎖️", reward: { money: 40000, shards: 80, items: 1 } },
  { max: 100, label: "Top 51-100", icon: "🏅", reward: { money: 20000, shards: 40, items: 1, title: "title_top100" } },
];

/** recompensa garantida por liga alcançada */
export function leagueReward(trophies: number): SeasonReward {
  const league = leagueOf(trophies);
  const tier = LEAGUES.findIndex((l) => l.id === league.id);
  return {
    money: 5000 * (tier + 1) * (tier + 1),
    shards: 15 * (tier + 1),
    items: tier >= 5 ? 2 : tier >= 3 ? 1 : 0,
    ...(tier >= 6 ? { cosmetic: "badge_pro" } : {}),
  };
}

export function rankReward(position: number | null): { label: string; icon: string; reward: SeasonReward } | null {
  if (!position) return null;
  const found = RANK_REWARDS.find((r) => position <= r.max);
  return found ? { label: found.label, icon: found.icon, reward: found.reward } : null;
}

export type SeasonRecord = {
  number: number;
  name: string;
  endedAt: string;
  bestLeague: string;
  maxTrophies: number;
  finalTrophies: number;
  position: number | null;
  wins: number;
  losses: number;
  rewards: SeasonReward;
};

export function leagueById(id: string): League {
  return LEAGUES.find((l) => l.id === id) ?? LEAGUES[0]!;
}

/** troféus mantidos ao virar a temporada (reset suave) */
export const SEASON_TROPHY_KEEP = 0.3;
