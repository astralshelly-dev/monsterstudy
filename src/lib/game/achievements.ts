import type { GameState } from "./types";
import { RARITY_ORDER } from "./config";
import { subjectKey } from "./subjects";

export type AchievementCategory =
  | "estudo"
  | "leitura"
  | "batalhas"
  | "monstros"
  | "competitivo"
  | "sequencia"
  | "economia"
  | "conhecimento"
  | "social"
  | "especial";

export type AchievementRarity = "comum" | "raro" | "epico" | "lendario";

export type Achievement = {
  id: string;
  name: string;
  icon: string;
  description: string;
  reward: number;
  category: AchievementCategory;
  rarity: AchievementRarity;
  check: (s: GameState) => boolean;
  progress?: (s: GameState) => { current: number; target: number };
};

export const ACHIEVEMENT_CATEGORIES: Array<{ id: AchievementCategory; name: string; icon: string }> = [
  { id: "estudo", name: "Estudo", icon: "📚" },
  { id: "leitura", name: "Leitura", icon: "📖" },
  { id: "batalhas", name: "Batalhas", icon: "⚔️" },
  { id: "monstros", name: "Monstros", icon: "🐉" },
  { id: "competitivo", name: "Competitivo", icon: "🏆" },
  { id: "sequencia", name: "Sequência", icon: "🔥" },
  { id: "economia", name: "Economia", icon: "💰" },
  { id: "conhecimento", name: "Conhecimento", icon: "🧠" },
  { id: "social", name: "Social", icon: "👥" },
  { id: "especial", name: "Especial", icon: "🎯" },
];

const studySessions = (s: GameState) => s.sessions.filter((x) => x.kind === "study");
const readSessions = (s: GameState) => s.sessions.filter((x) => x.kind === "read");
const pagesRead = (s: GameState) =>
  readSessions(s).reduce((a, x) => a + (x.kind === "read" ? x.pagesRead : 0), 0);
const studySec = (s: GameState) =>
  s.sessions.filter((x) => x.kind !== "read").reduce((a, x) => a + x.durationSec, 0);
const readSec = (s: GameState) =>
  s.sessions.filter((x) => x.kind === "read").reduce((a, x) => a + x.durationSec, 0);
const monsterCount = (s: GameState) => Object.keys(s.monsters).length;
const copiesTotal = (s: GameState) =>
  Object.values(s.monsters).reduce((a, m) => a + m.copies, 0);
const wins = (s: GameState) => s.battle?.wins ?? 0;
const trophies = (s: GameState) => s.battle?.bestTrophies ?? 0;
const inventoryTotal = (s: GameState) =>
  Object.values(s.inventory ?? {}).reduce((a, n) => a + n, 0);
const subjectHours = (s: GameState, name: string) =>
  (s.subjects?.[subjectKey(name)]?.totalSec ?? 0) / 3600;
const maxSubjectLevelXp = (s: GameState) =>
  Math.max(0, ...Object.values(s.subjects ?? {}).map((x) => x.xp));
const nightSession = (s: GameState) =>
  s.sessions.some((x) => {
    const h = new Date(x.startedAt).getHours();
    return h >= 0 && h < 6;
  });
const highestTier = (s: GameState) =>
  Math.max(-1, ...Object.keys(s.monsters).map((id) => tierOf(s, id)));
const countByTier = (s: GameState, tier: number) =>
  Object.keys(s.monsters).filter((id) => tierOf(s, id) === tier).length;

function tierOf(s: GameState, id: string) {
  const m = s.monsters[id];
  if (!m) return -1;
  return rarityTierCache[id] ?? -1;
}

/** preenchido em runtime por registerRarityTiers */
const rarityTierCache: Record<string, number> = {};
export function registerRarityTiers(entries: Array<{ id: string; rarity: string }>) {
  for (const e of entries) rarityTierCache[e.id] = RARITY_ORDER.indexOf(e.rarity as never);
}

/** cria uma família de conquistas progressivas */
function tiered(input: {
  base: string;
  names: string[];
  icon: string;
  category: AchievementCategory;
  targets: number[];
  rewards: number[];
  rarities: AchievementRarity[];
  describe: (target: number) => string;
  value: (s: GameState) => number;
}): Achievement[] {
  return input.targets.map((target, i) => ({
    id: `${input.base}_${target}`,
    name: input.names[i] ?? `${input.names[0]} ${i + 1}`,
    icon: input.icon,
    description: input.describe(target),
    reward: input.rewards[i] ?? 1000,
    category: input.category,
    rarity: input.rarities[i] ?? "comum",
    check: (s) => input.value(s) >= target,
    progress: (s) => ({ current: Math.min(input.value(s), target), target }),
  }));
}

export const ACHIEVEMENTS: Achievement[] = [
  // ---------------- originais (mantidos) ----------------
  {
    id: "first_study",
    name: "Primeiro Estudo",
    icon: "🏆",
    description: "Complete sua primeira sessão de estudo.",
    reward: 200,
    category: "estudo",
    rarity: "comum",
    check: (s) => studySessions(s).length >= 1,
    progress: (s) => ({ current: Math.min(studySessions(s).length, 1), target: 1 }),
  },
  {
    id: "first_read",
    name: "Primeira Leitura",
    icon: "📖",
    description: "Complete sua primeira sessão de leitura.",
    reward: 200,
    category: "leitura",
    rarity: "comum",
    check: (s) => readSessions(s).length >= 1,
    progress: (s) => ({ current: Math.min(readSessions(s).length, 1), target: 1 }),
  },
  {
    id: "first_book",
    name: "Primeiro Livro",
    icon: "📕",
    description: "Conclua seu primeiro livro.",
    reward: 800,
    category: "leitura",
    rarity: "comum",
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
    category: "sequencia",
    rarity: "raro",
    check: (s) => s.streak.best >= 7,
    progress: (s) => ({ current: Math.min(s.streak.best, 7), target: 7 }),
  },
  {
    id: "lucky",
    name: "Sortudo",
    icon: "💎",
    description: "Encontre um monstro Super Raro.",
    reward: 1200,
    category: "monstros",
    rarity: "raro",
    check: (s) => highestTier(s) >= 3,
  },
  {
    id: "legend",
    name: "Lenda",
    icon: "👑",
    description: "Encontre um monstro Lendário.",
    reward: 6000,
    category: "monstros",
    rarity: "epico",
    check: (s) => highestTier(s) >= 5,
  },
  {
    id: "beyond",
    name: "Além dos Limites",
    icon: "🌌",
    description: "Encontre um monstro Divino.",
    reward: 50000,
    category: "monstros",
    rarity: "lendario",
    check: (s) => highestTier(s) >= 7,
  },
  {
    id: "marathon",
    name: "Maratonista",
    icon: "⏰",
    description: "Complete uma sessão de 5 horas.",
    reward: 20000,
    category: "estudo",
    rarity: "epico",
    check: (s) => s.sessions.some((x) => x.durationSec >= 5 * 3600 - 60),
  },
  {
    id: "devourer",
    name: "Devorador de Livros",
    icon: "📚",
    description: "Leia 1.000 páginas.",
    reward: 9000,
    category: "leitura",
    rarity: "epico",
    check: (s) => pagesRead(s) >= 1000,
    progress: (s) => ({ current: Math.min(pagesRead(s), 1000), target: 1000 }),
  },
  {
    id: "collector_10",
    name: "Colecionador",
    icon: "🐾",
    description: "Descubra 10 monstros diferentes.",
    reward: 1000,
    category: "monstros",
    rarity: "comum",
    check: (s) => monsterCount(s) >= 10,
    progress: (s) => ({ current: Math.min(monsterCount(s), 10), target: 10 }),
  },
  {
    id: "scholar_10h",
    name: "Erudito",
    icon: "🎓",
    description: "Acumule 10 horas estudando.",
    reward: 4000,
    category: "estudo",
    rarity: "raro",
    check: (s) => studySec(s) >= 36000,
    progress: (s) => ({ current: Math.min(Math.round(studySec(s) / 3600), 10), target: 10 }),
  },
  {
    id: "trainer",
    name: "Treinador",
    icon: "🧠",
    description: "Leve um monstro ao nível 5.",
    reward: 2500,
    category: "monstros",
    rarity: "raro",
    check: (s) => Object.values(s.monsters).some((m) => m.level >= 5),
  },

  // ---------------- estudo progressivo ----------------
  ...tiered({
    base: "study_hours",
    names: ["Aprendiz", "Dedicado", "Estudioso Sério", "Mente Afiada", "Sábio"],
    icon: "⏳",
    category: "estudo",
    targets: [10, 50, 100, 250, 500],
    rewards: [3000, 12000, 30000, 90000, 250000],
    rarities: ["comum", "raro", "raro", "epico", "lendario"],
    describe: (t) => `Acumule ${t} horas de estudo.`,
    value: (s) => Math.floor(studySec(s) / 3600),
  }),
  ...tiered({
    base: "study_sessions",
    names: ["Rotina", "Constante", "Metódico", "Inabalável"],
    icon: "🗓️",
    category: "estudo",
    targets: [10, 50, 200, 500],
    rewards: [1500, 6000, 25000, 80000],
    rarities: ["comum", "raro", "epico", "lendario"],
    describe: (t) => `Complete ${t} sessões de estudo.`,
    value: (s) => studySessions(s).length,
  }),

  // ---------------- leitura ----------------
  ...tiered({
    base: "pages",
    names: ["Leitor", "Leitor Ávido", "Bibliotecário", "Devorador Supremo"],
    icon: "📄",
    category: "leitura",
    targets: [100, 500, 2000, 5000],
    rewards: [1200, 6000, 30000, 120000],
    rarities: ["comum", "raro", "epico", "lendario"],
    describe: (t) => `Leia ${t.toLocaleString("pt-BR")} páginas.`,
    value: (s) => pagesRead(s),
  }),
  ...tiered({
    base: "books",
    names: ["Colecionador de Histórias", "Estante Cheia", "Biblioteca Pessoal"],
    icon: "📚",
    category: "leitura",
    targets: [3, 10, 30],
    rewards: [2500, 12000, 60000],
    rarities: ["comum", "raro", "epico"],
    describe: (t) => `Conclua ${t} livros.`,
    value: (s) => s.books.filter((b) => b.shelf === "concluido").length,
  }),
  ...tiered({
    base: "read_hours",
    names: ["Horas de Leitura", "Leitura Profunda", "Vida entre Páginas"],
    icon: "🕯️",
    category: "leitura",
    targets: [10, 50, 150],
    rewards: [3000, 14000, 70000],
    rarities: ["comum", "raro", "epico"],
    describe: (t) => `Acumule ${t} horas de leitura.`,
    value: (s) => Math.floor(readSec(s) / 3600),
  }),

  // ---------------- batalhas ----------------
  ...tiered({
    base: "wins",
    names: ["Estreante da Arena", "Duelista", "Veterano", "Gladiador Lendário"],
    icon: "⚔️",
    category: "batalhas",
    targets: [10, 50, 100, 500],
    rewards: [2000, 10000, 30000, 150000],
    rarities: ["comum", "raro", "epico", "lendario"],
    describe: (t) => `Vença ${t} batalhas ranqueadas.`,
    value: (s) => wins(s),
  }),
  {
    id: "first_win",
    name: "Primeira Vitória",
    icon: "🥊",
    description: "Vença sua primeira batalha ranqueada.",
    reward: 800,
    category: "batalhas",
    rarity: "comum",
    check: (s) => wins(s) >= 1,
    progress: (s) => ({ current: Math.min(wins(s), 1), target: 1 }),
  },
  {
    id: "flawless",
    name: "Sem Arranhões",
    icon: "🛡️",
    description: "Vença uma batalha em 6 turnos ou menos.",
    reward: 5000,
    category: "batalhas",
    rarity: "raro",
    check: (s) =>
      (s.battle?.history ?? []).some((h) => h.result === "win" && h.turns > 0 && h.turns <= 6),
  },

  // ---------------- competitivo ----------------
  ...tiered({
    base: "trophies",
    names: ["Prata na Mão", "Ouro Merecido", "Diamante Bruto", "Mestre da Arena", "PRO"],
    icon: "🏆",
    category: "competitivo",
    targets: [400, 900, 1500, 4000, 5200],
    rewards: [3000, 8000, 20000, 70000, 200000],
    rarities: ["comum", "raro", "raro", "epico", "lendario"],
    describe: (t) => `Alcance ${t.toLocaleString("pt-BR")} troféus.`,
    value: (s) => trophies(s),
  }),
  {
    id: "season_veteran",
    name: "Veterano de Temporadas",
    icon: "🗿",
    description: "Conclua 2 temporadas competitivas.",
    reward: 25000,
    category: "competitivo",
    rarity: "epico",
    check: (s) => (s.seasons?.history?.length ?? 0) >= 2,
    progress: (s) => ({ current: Math.min(s.seasons?.history?.length ?? 0, 2), target: 2 }),
  },

  // ---------------- monstros ----------------
  ...tiered({
    base: "collection",
    names: ["Explorador", "Colecionador Dedicado", "Mestre Colecionador", "Dex Completa"],
    icon: "🐉",
    category: "monstros",
    targets: [20, 30, 40, 50],
    rewards: [4000, 12000, 40000, 150000],
    rarities: ["comum", "raro", "epico", "lendario"],
    describe: (t) => `Capture ${t} monstros diferentes.`,
    value: (s) => monsterCount(s),
  }),
  {
    id: "duplicates_100",
    name: "Fábrica de Duplicatas",
    icon: "♻️",
    description: "Acumule 100 cópias de monstros.",
    reward: 15000,
    category: "monstros",
    rarity: "raro",
    check: (s) => copiesTotal(s) >= 100,
    progress: (s) => ({ current: Math.min(copiesTotal(s), 100), target: 100 }),
  },
  {
    id: "max_level_monster",
    name: "Poder Máximo",
    icon: "🌟",
    description: "Leve um monstro ao nível 10.",
    reward: 20000,
    category: "monstros",
    rarity: "epico",
    check: (s) => Object.values(s.monsters).some((m) => m.level >= 10),
  },
  {
    id: "rarity_hunter",
    name: "Colecionador de Raridades",
    icon: "💠",
    description: "Tenha 3 monstros Épicos ou melhores.",
    reward: 18000,
    category: "monstros",
    rarity: "epico",
    check: (s) =>
      Object.keys(s.monsters).filter((id) => tierOf(s, id) >= 4).length >= 3,
    progress: (s) => ({
      current: Math.min(Object.keys(s.monsters).filter((id) => tierOf(s, id) >= 4).length, 3),
      target: 3,
    }),
  },
  {
    id: "mythic_owner",
    name: "Toque Mítico",
    icon: "🔮",
    description: "Capture um monstro Mítico.",
    reward: 25000,
    category: "monstros",
    rarity: "epico",
    check: (s) => highestTier(s) >= 6,
  },
  {
    id: "secret_finder",
    name: "O Segredo",
    icon: "🌠",
    description: "Encontre o monstro secreto.",
    reward: 120000,
    category: "especial",
    rarity: "lendario",
    check: (s) => highestTier(s) >= 8,
  },
  {
    id: "commons_all",
    name: "Do Começo",
    icon: "🥚",
    description: "Capture 8 monstros Comuns.",
    reward: 2000,
    category: "monstros",
    rarity: "comum",
    check: (s) => countByTier(s, 0) >= 8,
    progress: (s) => ({ current: Math.min(countByTier(s, 0), 8), target: 8 }),
  },

  // ---------------- sequência ----------------
  ...tiered({
    base: "streak",
    names: ["Ritmo", "Disciplina", "Imparável", "Lenda da Constância"],
    icon: "🔥",
    category: "sequencia",
    targets: [14, 21, 30, 100],
    rewards: [4000, 8000, 25000, 200000],
    rarities: ["comum", "raro", "epico", "lendario"],
    describe: (t) => `Mantenha uma sequência de ${t} dias.`,
    value: (s) => s.streak.best,
  }),

  // ---------------- economia ----------------
  ...tiered({
    base: "money",
    names: ["Poupador", "Investidor", "Magnata", "Tesouro Vivo"],
    icon: "💰",
    category: "economia",
    targets: [50000, 250000, 1000000, 5000000],
    rewards: [3000, 15000, 60000, 250000],
    rarities: ["comum", "raro", "epico", "lendario"],
    describe: (t) => `Tenha ${t.toLocaleString("pt-BR")} moedas ao mesmo tempo.`,
    value: (s) => Math.floor(s.money),
  }),
  {
    id: "shards_500",
    name: "Refinador",
    icon: "💎",
    description: "Acumule 500 fragmentos.",
    reward: 12000,
    category: "economia",
    rarity: "raro",
    check: (s) => s.shards >= 500,
    progress: (s) => ({ current: Math.min(s.shards, 500), target: 500 }),
  },
  {
    id: "upgrades_all",
    name: "Mecânico do Covil",
    icon: "🔧",
    description: "Compre 10 níveis de melhorias na loja.",
    reward: 15000,
    category: "economia",
    rarity: "raro",
    check: (s) => Object.values(s.upgrades ?? {}).reduce((a, n) => a + (n ?? 0), 0) >= 10,
    progress: (s) => ({
      current: Math.min(Object.values(s.upgrades ?? {}).reduce((a, n) => a + (n ?? 0), 0), 10),
      target: 10,
    }),
  },
  ...tiered({
    base: "items",
    names: ["Catador", "Caçador de Tesouros", "Arqueólogo"],
    icon: "🎁",
    category: "economia",
    targets: [5, 25, 100],
    rewards: [2500, 12000, 60000],
    rarities: ["comum", "raro", "epico"],
    describe: (t) => `Encontre ${t} itens durante os estudos.`,
    value: (s) => (s.itemLog?.length ?? 0) + Math.max(0, inventoryTotal(s) - (s.itemLog?.length ?? 0)),
  }),

  // ---------------- conhecimento (matérias) ----------------
  {
    id: "subject_first",
    name: "Especialista Nascente",
    icon: "🧠",
    description: "Alcance o nível 5 em qualquer matéria.",
    reward: 3000,
    category: "conhecimento",
    rarity: "comum",
    check: (s) => Object.values(s.subjects ?? {}).some((x) => x.totalSec >= 5 * 3600),
  },
  {
    id: "subject_master",
    name: "Mestre de Matéria",
    icon: "🎓",
    description: "Estude 50 horas de uma única matéria.",
    reward: 40000,
    category: "conhecimento",
    rarity: "epico",
    check: (s) => Object.values(s.subjects ?? {}).some((x) => x.totalSec >= 50 * 3600),
    progress: (s) => ({
      current: Math.min(
        Math.floor(Math.max(0, ...Object.values(s.subjects ?? {}).map((x) => x.totalSec)) / 3600),
        50,
      ),
      target: 50,
    }),
  },
  {
    id: "mathematician",
    name: "Matemático",
    icon: "🧮",
    description: "Estude Matemática por 50 horas.",
    reward: 45000,
    category: "conhecimento",
    rarity: "epico",
    check: (s) => subjectHours(s, "Matemática") >= 50,
    progress: (s) => ({ current: Math.min(Math.floor(subjectHours(s, "Matemática")), 50), target: 50 }),
  },
  {
    id: "polymath",
    name: "Polímata",
    icon: "🗂️",
    description: "Estude 6 matérias diferentes.",
    reward: 12000,
    category: "conhecimento",
    rarity: "raro",
    check: (s) => Object.keys(s.subjects ?? {}).length >= 6,
    progress: (s) => ({ current: Math.min(Object.keys(s.subjects ?? {}).length, 6), target: 6 }),
  },
  {
    id: "subject_xp_hoarder",
    name: "Sede de Saber",
    icon: "📈",
    description: "Acumule 20.000 XP em uma matéria.",
    reward: 20000,
    category: "conhecimento",
    rarity: "raro",
    check: (s) => maxSubjectLevelXp(s) >= 20000,
    progress: (s) => ({ current: Math.min(Math.floor(maxSubjectLevelXp(s)), 20000), target: 20000 }),
  },

  // ---------------- social ----------------
  {
    id: "has_account",
    name: "Caçador Registrado",
    icon: "👥",
    description: "Crie sua conta e sincronize seu progresso.",
    reward: 1500,
    category: "social",
    rarity: "comum",
    check: (s) => Boolean(s.profile.publicId) && (s.redeemedCodes ?? []).includes("SIGNUP-BONUS"),
  },
  {
    id: "friendly_battle",
    name: "Amistoso",
    icon: "🤝",
    description: "Dispute uma batalha de treino.",
    reward: 1200,
    category: "social",
    rarity: "comum",
    check: (s) => (s.battle?.history ?? []).some((h) => h.mode === "training"),
  },
  {
    id: "custom_look",
    name: "Estilo Próprio",
    icon: "🎨",
    description: "Equipe um cosmético.",
    reward: 2000,
    category: "social",
    rarity: "comum",
    check: (s) =>
      Boolean(s.cosmetics?.title || s.cosmetics?.badge || (s.cosmetics?.frame && s.cosmetics.frame !== "frame_none")),
  },

  // ---------------- especial ----------------
  {
    id: "owl",
    name: "Coruja",
    icon: "🌙",
    description: "Estude entre 00:00 e 05:59.",
    reward: 5000,
    category: "especial",
    rarity: "raro",
    check: (s) => nightSession(s),
  },
  {
    id: "quest_master",
    name: "Missionário",
    icon: "🎯",
    description: "Complete todas as missões diárias de um dia.",
    reward: 8000,
    category: "especial",
    rarity: "raro",
    check: (s) =>
      (s.quests?.list?.length ?? 0) > 0 && (s.quests?.list ?? []).every((q) => q.claimed),
  },
  {
    id: "codes_all",
    name: "Caçador de Códigos",
    icon: "🎟️",
    description: "Resgate 4 códigos promocionais.",
    reward: 6000,
    category: "especial",
    rarity: "raro",
    check: (s) => (s.redeemedCodes ?? []).filter((c) => c !== "SIGNUP-BONUS").length >= 4,
    progress: (s) => ({
      current: Math.min((s.redeemedCodes ?? []).filter((c) => c !== "SIGNUP-BONUS").length, 4),
      target: 4,
    }),
  },
  {
    id: "night_and_day",
    name: "Sem Descanso",
    icon: "🌗",
    description: "Estude de madrugada e mantenha 7 dias de sequência.",
    reward: 20000,
    category: "especial",
    rarity: "epico",
    check: (s) => nightSession(s) && s.streak.best >= 7,
  },
];

export const ACHIEVEMENT_RARITY_STYLE: Record<AchievementRarity, string> = {
  comum: "text-rarity-comum",
  raro: "text-rarity-raro",
  epico: "text-rarity-epico",
  lendario: "text-rarity-lendario",
};
