// ============================================================
// Monster Study — Itens e inventário
// Itens caem por sorteio a cada 30 minutos REAIS de estudo/leitura.
// ============================================================
import type { RarityId } from "./config";

export type ItemRarityId = "comum" | "raro" | "super_raro" | "epico" | "lendario";

export const ITEM_RARITIES: Array<{
  id: ItemRarityId;
  name: string;
  /** peso relativo no sorteio */
  weight: number;
  text: string;
  surface: string;
}> = [
  { id: "comum", name: "Comum", weight: 46, text: "text-rarity-comum", surface: "rarity-comum" },
  { id: "raro", name: "Raro", weight: 28, text: "text-rarity-raro", surface: "rarity-raro" },
  { id: "super_raro", name: "Super Raro", weight: 15, text: "text-rarity-super", surface: "rarity-super" },
  { id: "epico", name: "Épico", weight: 8, text: "text-rarity-epico", surface: "rarity-epico" },
  { id: "lendario", name: "Lendário", weight: 3, text: "text-rarity-lendario", surface: "rarity-lendario" },
];

export const ITEM_RARITY_BY_ID = Object.fromEntries(ITEM_RARITIES.map((r) => [r.id, r])) as Record<
  ItemRarityId,
  (typeof ITEM_RARITIES)[number]
>;

export type ItemEffect =
  | { type: "user_xp"; amount: number }
  | { type: "monster_xp"; amount: number }
  | { type: "money"; amount: number }
  | { type: "shards"; amount: number }
  | { type: "monster"; rarity: RarityId };

export type ItemDef = {
  id: string;
  name: string;
  icon: string;
  rarity: ItemRarityId;
  description: string;
  /** peso dentro da própria raridade */
  weight: number;
  effect: ItemEffect;
};

/** intervalo de estudo/leitura acumulado que gera uma chance de item */
export const ITEM_DROP_SECONDS = 30 * 60;

export const ITEMS: ItemDef[] = [
  {
    id: "xp_potion",
    name: "Poção de XP",
    icon: "🧪",
    rarity: "comum",
    description: "Concede 250 XP de jogador.",
    weight: 1,
    effect: { type: "user_xp", amount: 250 },
  },
  {
    id: "monster_ration",
    name: "Ração de XP",
    icon: "🍖",
    rarity: "comum",
    description: "Concede 300 XP ao monstro em treino.",
    weight: 1,
    effect: { type: "monster_xp", amount: 300 },
  },
  {
    id: "coin_pouch",
    name: "Bolsa de Moedas",
    icon: "👛",
    rarity: "comum",
    description: "Concede 1.500 moedas.",
    weight: 1,
    effect: { type: "money", amount: 1500 },
  },
  {
    id: "rare_shard",
    name: "Fragmento Raro",
    icon: "💎",
    rarity: "raro",
    description: "Concede 25 fragmentos.",
    weight: 1,
    effect: { type: "shards", amount: 25 },
  },
  {
    id: "greater_potion",
    name: "Poção de XP Maior",
    icon: "⚗️",
    rarity: "raro",
    description: "Concede 1.200 XP de jogador.",
    weight: 1,
    effect: { type: "user_xp", amount: 1200 },
  },
  {
    id: "focus_tonic",
    name: "Tônico do Foco",
    icon: "🫗",
    rarity: "raro",
    description: "Concede 8.000 moedas.",
    weight: 1,
    effect: { type: "money", amount: 8000 },
  },
  {
    id: "monster_feast",
    name: "Banquete Monstruoso",
    icon: "🍗",
    rarity: "super_raro",
    description: "Concede 1.500 XP ao monstro em treino.",
    weight: 1,
    effect: { type: "monster_xp", amount: 1500 },
  },
  {
    id: "lucky_clover",
    name: "Trevo da Sorte",
    icon: "🍀",
    rarity: "super_raro",
    description: "Invoca um monstro Raro aleatório.",
    weight: 1,
    effect: { type: "monster", rarity: "raro" },
  },
  {
    id: "shard_cluster",
    name: "Aglomerado de Fragmentos",
    icon: "🔷",
    rarity: "epico",
    description: "Concede 120 fragmentos.",
    weight: 1,
    effect: { type: "shards", amount: 120 },
  },
  {
    id: "soul_stone",
    name: "Pedra de Alma",
    icon: "🔮",
    rarity: "epico",
    description: "Invoca um monstro Épico aleatório.",
    weight: 1,
    effect: { type: "monster", rarity: "epico" },
  },
  {
    id: "treasure_chest",
    name: "Baú do Caçador",
    icon: "🧰",
    rarity: "epico",
    description: "Concede 25.000 moedas.",
    weight: 1,
    effect: { type: "money", amount: 25000 },
  },
  {
    id: "dragon_egg",
    name: "Ovo de Dragão",
    icon: "🥚",
    rarity: "lendario",
    description: "Invoca um monstro Lendário aleatório.",
    weight: 1,
    effect: { type: "monster", rarity: "lendario" },
  },
  {
    id: "grimoire",
    name: "Grimório Antigo",
    icon: "📓",
    rarity: "lendario",
    description: "Concede 6.000 XP de jogador.",
    weight: 1,
    effect: { type: "user_xp", amount: 6000 },
  },
];

export const ITEMS_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

/** sorteia um item respeitando as chances de raridade */
export function rollItem(): ItemDef {
  const totalRarity = ITEM_RARITIES.reduce((a, r) => a + r.weight, 0);
  let roll = Math.random() * totalRarity;
  let rarity: ItemRarityId = "comum";
  for (const r of ITEM_RARITIES) {
    roll -= r.weight;
    if (roll <= 0) {
      rarity = r.id;
      break;
    }
  }
  const pool = ITEMS.filter((i) => i.rarity === rarity);
  const sum = pool.reduce((a, i) => a + i.weight, 0);
  let pick = Math.random() * sum;
  for (const i of pool) {
    pick -= i.weight;
    if (pick <= 0) return i;
  }
  return pool[0] ?? ITEMS[0]!;
}

/** chance de cada raridade em % (para mostrar na interface) */
export function itemRarityChances() {
  const total = ITEM_RARITIES.reduce((a, r) => a + r.weight, 0);
  return ITEM_RARITIES.map((r) => ({ ...r, pct: (r.weight / total) * 100 }));
}
