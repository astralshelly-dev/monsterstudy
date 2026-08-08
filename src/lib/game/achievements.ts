import type { GameState } from "./types";
import { RARITY_ORDER } from "./config";

export type Achievement = {
  id: string;
  name: string;
  icon: string;
  description: string;
  reward: number;
  check: (s: GameState) => boolean;
  progress?: (s: GameState) => { current: number; target: number };
};

const studySessions = (s: GameState) => s.sessions.filter((x) => x.kind === "study");
const readSessions = (s: GameState) => s.sessions.filter((x) => x.kind === "read");
const pagesRead = (s: GameState) =>
  readSessions(s).reduce((a, x) => a + (x.kind === "read" ? x.pagesRead : 0), 0);
const highestTier = (s: GameState) =>
  Math.max(-1, ...Object.keys(s.monsters).map((id) => tierOf(s, id)));

function tierOf(s: GameState, id: string) {
  const m = s.monsters[id];
  if (!m) return -1;
  // resolvido no runtime via MONSTERS_BY_ID para evitar import circular
  return rarityTierCache[id] ?? -1;
}

/** preenchido em runtime por registerRarityTiers */
const rarityTierCache: Record<string, number> = {};
export function registerRarityTiers(entries: Array<{ id: string; rarity: string }>) {
  for (const e of entries) rarityTierCache[e.id] = RARITY_ORDER.indexOf(e.rarity as never);
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_study",
    name: "Primeiro Estudo",
    icon: "🏆",
    description: "Complete sua primeira sessão de estudo.",
    reward: 200,
    check: (s) => studySessions(s).length >= 1,
    progress: (s) => ({ current: Math.min(studySessions(s).length, 1), target: 1 }),
  },
  {
    id: "first_read",
    name: "Primeira Leitura",
    icon: "📖",
    description: "Complete sua primeira sessão de leitura.",
    reward: 200,
    check: (s) => readSessions(s).length >= 1,
    progress: (s) => ({ current: Math.min(readSessions(s).length, 1), target: 1 }),
  },
  {
    id: "first_book",
    name: "Primeiro Livro",
    icon: "📕",
    description: "Conclua seu primeiro livro.",
    reward: 800,
    check: (s) => s.books.some((b) => b.shelf === "concluido"),
    progress: (s) => ({
      current: Math.min(s.books.filter((b) => b.shelf === "concluido").length, 1),
      target: 1,
    }),
  },
  {
    id: "streak_7",
    name: "Incansável",
    icon: "🔥",
    description: "Estude ou leia por 7 dias consecutivos.",
    reward: 1500,
    check: (s) => s.streak.best >= 7,
    progress: (s) => ({ current: Math.min(s.streak.best, 7), target: 7 }),
  },
  {
    id: "lucky",
    name: "Sortudo",
    icon: "💎",
    description: "Encontre um monstro Super Raro.",
    reward: 1200,
    check: (s) => highestTier(s) >= 3,
  },
  {
    id: "legend",
    name: "Lenda",
    icon: "👑",
    description: "Encontre um monstro Lendário.",
    reward: 6000,
    check: (s) => highestTier(s) >= 5,
  },
  {
    id: "beyond",
    name: "Além dos Limites",
    icon: "🌌",
    description: "Encontre um monstro Divino.",
    reward: 50000,
    check: (s) => highestTier(s) >= 7,
  },
  {
    id: "marathon",
    name: "Maratonista",
    icon: "⏰",
    description: "Complete uma sessão de 5 horas.",
    reward: 20000,
    check: (s) => s.sessions.some((x) => x.durationSec >= 5 * 3600 - 60),
  },
  {
    id: "devourer",
    name: "Devorador de Livros",
    icon: "📚",
    description: "Leia 1.000 páginas.",
    reward: 9000,
    check: (s) => pagesRead(s) >= 1000,
    progress: (s) => ({ current: Math.min(pagesRead(s), 1000), target: 1000 }),
  },
  {
    id: "collector_10",
    name: "Colecionador",
    icon: "🐾",
    description: "Descubra 10 monstros diferentes.",
    reward: 1000,
    check: (s) => Object.keys(s.monsters).length >= 10,
    progress: (s) => ({ current: Math.min(Object.keys(s.monsters).length, 10), target: 10 }),
  },
  {
    id: "scholar_10h",
    name: "Erudito",
    icon: "🎓",
    description: "Acumule 10 horas estudando.",
    reward: 4000,
    check: (s) =>
      s.sessions
        .filter((x) => x.kind !== "read")
        .reduce((a, x) => a + x.durationSec, 0) >= 36000,
    progress: (s) => ({
      current: Math.min(
        Math.round(s.sessions.filter((x) => x.kind !== "read").reduce((a, x) => a + x.durationSec, 0) / 3600),
        10,
      ),
      target: 10,
    }),
  },
  {
    id: "trainer",
    name: "Treinador",
    icon: "🧠",
    description: "Leve um monstro ao nível 5.",
    reward: 2500,
    check: (s) => Object.values(s.monsters).some((m) => m.level >= 5),
  },
];
