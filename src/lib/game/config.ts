// ============================================================
// Monster Study — Configuração central de balanceamento
// Altere valores aqui para rebalancear o jogo inteiro.
// ============================================================

export type RarityId =
  | "comum"
  | "incomum"
  | "raro"
  | "super_raro"
  | "epico"
  | "lendario"
  | "mitico"
  | "divino"
  | "secreto";

export type Rarity = {
  id: RarityId;
  name: string;
  tier: number;
  /** dinheiro por segundo por cópia */
  moneyPerSec: number;
  /** multiplicador de XP da sessão */
  xpMultiplier: number;
  /** classe de gradiente (definida no design system) */
  gradient: string;
  ring: string;
  text: string;
  /** intensidade da animação de revelação: 0..7 */
  drama: number;
};

export const RARITIES: Record<RarityId, Rarity> = {
  comum: {
    id: "comum",
    name: "Comum",
    tier: 0,
    moneyPerSec: 0.01,
    xpMultiplier: 1,
    gradient: "rarity-comum",
    ring: "ring-rarity-comum",
    text: "text-rarity-comum",
    drama: 0,
  },
  incomum: {
    id: "incomum",
    name: "Incomum",
    tier: 1,
    moneyPerSec: 0.03,
    xpMultiplier: 1.15,
    gradient: "rarity-incomum",
    ring: "ring-rarity-incomum",
    text: "text-rarity-incomum",
    drama: 1,
  },
  raro: {
    id: "raro",
    name: "Raro",
    tier: 2,
    moneyPerSec: 0.08,
    xpMultiplier: 1.35,
    gradient: "rarity-raro",
    ring: "ring-rarity-raro",
    text: "text-rarity-raro",
    drama: 2,
  },
  super_raro: {
    id: "super_raro",
    name: "Super Raro",
    tier: 3,
    moneyPerSec: 0.2,
    xpMultiplier: 1.6,
    gradient: "rarity-super",
    ring: "ring-rarity-super",
    text: "text-rarity-super",
    drama: 3,
  },
  epico: {
    id: "epico",
    name: "Épico",
    tier: 4,
    moneyPerSec: 0.5,
    xpMultiplier: 2,
    gradient: "rarity-epico",
    ring: "ring-rarity-epico",
    text: "text-rarity-epico",
    drama: 4,
  },
  lendario: {
    id: "lendario",
    name: "Lendário",
    tier: 5,
    moneyPerSec: 1,
    xpMultiplier: 2.5,
    gradient: "rarity-lendario",
    ring: "ring-rarity-lendario",
    text: "text-rarity-lendario",
    drama: 5,
  },
  mitico: {
    id: "mitico",
    name: "Mítico",
    tier: 6,
    moneyPerSec: 3,
    xpMultiplier: 3.2,
    gradient: "rarity-mitico",
    ring: "ring-rarity-mitico",
    text: "text-rarity-mitico",
    drama: 6,
  },
  divino: {
    id: "divino",
    name: "Divino",
    tier: 7,
    moneyPerSec: 10,
    xpMultiplier: 5,
    gradient: "rarity-divino",
    ring: "ring-rarity-divino",
    text: "text-rarity-divino",
    drama: 7,
  },
  secreto: {
    id: "secreto",
    name: "Secreto",
    tier: 8,
    moneyPerSec: 30,
    xpMultiplier: 8,
    gradient: "rarity-secreto",
    ring: "ring-rarity-secreto",
    text: "text-rarity-secreto",
    drama: 8,
  },
};

export const RARITY_ORDER: RarityId[] = [
  "comum",
  "incomum",
  "raro",
  "super_raro",
  "epico",
  "lendario",
  "mitico",
  "divino",
  "secreto",
];

/** Raridade oculta: não aparece em listas/porcentagens até ser desbloqueada */
export const SECRET_RARITY: RarityId = "secreto";
export const SECRET_MONSTER_ID = "aetheryon";
/** só o cronômetro de 5 horas pode revelar o secreto */
export const SECRET_TIMER_MINUTES = 300;
export const SECRET_CHANCE = 0.005;

export type HabitatId =
  | "floresta"
  | "oceano"
  | "vulcao"
  | "tundra"
  | "deserto"
  | "selva"
  | "espaco"
  | "mistico";

export const HABITATS: Record<HabitatId, { id: HabitatId; name: string; icon: string }> = {
  floresta: { id: "floresta", name: "Floresta", icon: "🌲" },
  oceano: { id: "oceano", name: "Oceano", icon: "🌊" },
  vulcao: { id: "vulcao", name: "Vulcão", icon: "🌋" },
  tundra: { id: "tundra", name: "Tundra", icon: "❄️" },
  deserto: { id: "deserto", name: "Deserto", icon: "🏜️" },
  selva: { id: "selva", name: "Selva", icon: "🌿" },
  espaco: { id: "espaco", name: "Espaço", icon: "🌌" },
  mistico: { id: "mistico", name: "Dimensão Mística", icon: "✨" },
};

// ------------------------------------------------------------
// Cronômetros
// ------------------------------------------------------------
export type TimerConfig = {
  minutes: number;
  label: string;
  /** 0 = já desbloqueado */
  price: number;
  /** pesos de sorteio por raridade */
  weights: Partial<Record<RarityId, number>>;
};

export const TIMERS: TimerConfig[] = [
  { minutes: 10, label: "10 min", price: 0, weights: { comum: 80, incomum: 20 } },
  { minutes: 20, label: "20 min", price: 0, weights: { comum: 55, incomum: 33, raro: 12 } },
  { minutes: 30, label: "30 min", price: 0, weights: { incomum: 60, raro: 40 } },
  {
    minutes: 60,
    label: "1 hora",
    price: 2500,
    weights: { incomum: 40, raro: 42, super_raro: 18 },
  },
  {
    minutes: 90,
    label: "1h30",
    price: 8000,
    weights: { raro: 52, super_raro: 36, epico: 12 },
  },
  {
    minutes: 120,
    label: "2 horas",
    price: 20000,
    weights: { raro: 34, super_raro: 44, epico: 20, lendario: 2 },
  },
  {
    minutes: 150,
    label: "2h30",
    price: 45000,
    weights: { super_raro: 48, epico: 40, lendario: 11, mitico: 1 },
  },
  {
    minutes: 180,
    label: "3 horas",
    price: 90000,
    weights: { super_raro: 32, epico: 48, lendario: 18, mitico: 2 },
  },
  {
    minutes: 210,
    label: "3h30",
    price: 160000,
    weights: { epico: 52, lendario: 40, mitico: 7.5, divino: 0.5 },
  },
  {
    minutes: 240,
    label: "4 horas",
    price: 280000,
    weights: { epico: 40, lendario: 48, mitico: 11, divino: 1 },
  },
  {
    minutes: 270,
    label: "4h30",
    price: 450000,
    weights: { epico: 26, lendario: 54, mitico: 18, divino: 2 },
  },
  {
    minutes: 300,
    label: "5 horas",
    price: 750000,
    weights: { lendario: 58, mitico: 38, divino: 4 },
  },
];

export const DEFAULT_UNLOCKED_TIMERS = TIMERS.filter((t) => t.price === 0).map((t) => t.minutes);

/** Penalidade aplicada quando o usuário encerra antes do tempo */
export const EARLY_END_PENALTY = {
  /** peso das raridades altas é multiplicado por isto */
  rareWeightFactor: 0.08,
  xpFactor: 0.5,
};

// ------------------------------------------------------------
// XP / Níveis
// ------------------------------------------------------------
export const XP = {
  /** XP base por minuto de sessão */
  perMinute: 4,
  /** bônus fixo por concluir sessão */
  completionBonus: 20,
  /** XP por página lida */
  perPage: 2,
  /** XP por minuto no Estudo Livre (vai para o monstro ativo) */
  freeStudyPerMinute: 6,
};

export function userXpForLevel(level: number): number {
  return Math.floor(120 * Math.pow(level, 1.45));
}

export function monsterXpForLevel(level: number, rarityTier: number): number {
  return Math.floor(500 * Math.pow(level, 1.35) * (1 + rarityTier * 0.25));
}

// ------------------------------------------------------------
// Upgrades da loja
// ------------------------------------------------------------
export type UpgradeId = "lucky_charm" | "golden_wallet" | "knowledge_boost" | "streak_booster";

export type UpgradeConfig = {
  id: UpgradeId;
  name: string;
  icon: string;
  description: string;
  maxLevel: number;
  basePrice: number;
  priceGrowth: number;
  /** efeito por nível, exibido como texto */
  effectPerLevel: number;
  effectLabel: (level: number) => string;
};

export const UPGRADES: Record<UpgradeId, UpgradeConfig> = {
  lucky_charm: {
    id: "lucky_charm",
    name: "Lucky Charm",
    icon: "🍀",
    description: "Aumenta a chance de encontrar monstros raros.",
    maxLevel: 20,
    basePrice: 500,
    priceGrowth: 1.7,
    effectPerLevel: 0.06,
    effectLabel: (l) => `+${Math.round(l * 6)}% peso em raridades altas`,
  },
  golden_wallet: {
    id: "golden_wallet",
    name: "Golden Wallet",
    icon: "💰",
    description: "Seus monstros geram mais dinheiro por segundo.",
    maxLevel: 25,
    basePrice: 750,
    priceGrowth: 1.65,
    effectPerLevel: 0.08,
    effectLabel: (l) => `+${Math.round(l * 8)}% dinheiro/s`,
  },
  knowledge_boost: {
    id: "knowledge_boost",
    name: "Knowledge Boost",
    icon: "📚",
    description: "Ganhe mais XP em todas as sessões.",
    maxLevel: 25,
    basePrice: 600,
    priceGrowth: 1.6,
    effectPerLevel: 0.1,
    effectLabel: (l) => `+${Math.round(l * 10)}% XP`,
  },
  streak_booster: {
    id: "streak_booster",
    name: "Streak Booster",
    icon: "🔥",
    description: "Melhora as recompensas de sequência diária.",
    maxLevel: 15,
    basePrice: 1200,
    priceGrowth: 1.8,
    effectPerLevel: 0.15,
    effectLabel: (l) => `+${Math.round(l * 15)}% recompensa de streak`,
  },
};

export function upgradePrice(id: UpgradeId, currentLevel: number): number {
  const u = UPGRADES[id];
  return Math.floor(u.basePrice * Math.pow(u.priceGrowth, currentLevel));
}

// ------------------------------------------------------------
// Streak
// ------------------------------------------------------------
export const STREAK_MILESTONES = [
  { days: 3, reward: 250 },
  { days: 7, reward: 900 },
  { days: 14, reward: 2500 },
  { days: 30, reward: 8000 },
  { days: 60, reward: 25000 },
  { days: 100, reward: 90000 },
];

// ------------------------------------------------------------
// Gêneros de livro
// ------------------------------------------------------------
export const BOOK_GENRES = [
  "Fantasia",
  "Romance",
  "Ficção",
  "Terror",
  "Mistério",
  "Suspense",
  "Ficção científica",
  "História",
  "Biografia",
  "Desenvolvimento pessoal",
  "Outros",
] as const;

export const BOOK_SHELVES = [
  { id: "lendo", name: "Lendo agora", icon: "📖" },
  { id: "quero", name: "Quero ler", icon: "📚" },
  { id: "concluido", name: "Concluídos", icon: "✅" },
] as const;

export type ShelfId = (typeof BOOK_SHELVES)[number]["id"];

// ------------------------------------------------------------
// Códigos promocionais (resgatáveis na aba Códigos)
// ------------------------------------------------------------
export type GiftCode = {
  code: string;
  label: string;
  /** faixa de moedas sorteada no resgate */
  moneyRange: [number, number];
  /** faixa de fragmentos sorteada no resgate */
  shardRange: [number, number];
  /** concede um monstro aleatório desta raridade */
  randomRarity?: RarityId;
};

export const CODE_MONEY_RANGE: [number, number] = [100, 400];
export const CODE_SHARD_RANGE: [number, number] = [5, 15];

export const GIFT_CODES: GiftCode[] = [
  {
    code: "BEMVINDO",
    label: "Kit de boas-vindas",
    moneyRange: CODE_MONEY_RANGE,
    shardRange: CODE_SHARD_RANGE,
  },
  {
    code: "MONSTERSTUDY",
    label: "Bônus de lançamento",
    moneyRange: CODE_MONEY_RANGE,
    shardRange: CODE_SHARD_RANGE,
  },
  {
    code: "FOCOTOTAL",
    label: "Pacote de foco",
    moneyRange: CODE_MONEY_RANGE,
    shardRange: CODE_SHARD_RANGE,
  },
  {
    code: "AMIGODOSMONSTROS",
    label: "Companheiro raro",
    moneyRange: CODE_MONEY_RANGE,
    shardRange: CODE_SHARD_RANGE,
    randomRarity: "raro",
  },
];

