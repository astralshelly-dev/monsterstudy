// ============================================================
// Monster Study — Missões diárias
// Geradas por dia (semente determinística) e alimentadas por
// contadores reais das atividades do jogador.
// ============================================================

/** métricas reais rastreadas pelo jogo */
export type QuestMetric =
  | "study_minutes"
  | "read_pages"
  | "read_minutes"
  | "study_sessions"
  | "battles_won"
  | "monsters_found"
  | "money_earned"
  | "trophies_gained"
  | "streak_kept";

export type QuestReward = {
  xp?: number;
  money?: number;
  shards?: number;
  item?: boolean;
};

export type QuestTemplate = {
  id: string;
  icon: string;
  title: string;
  metric: QuestMetric;
  target: number;
  reward: QuestReward;
};

export const QUEST_TEMPLATES: QuestTemplate[] = [
  { id: "study_30", icon: "📚", title: "Estude 30 minutos", metric: "study_minutes", target: 30, reward: { xp: 250, money: 1200 } },
  { id: "study_60", icon: "📚", title: "Estude 60 minutos", metric: "study_minutes", target: 60, reward: { xp: 600, money: 3000, shards: 5 } },
  { id: "study_120", icon: "🎓", title: "Estude 2 horas", metric: "study_minutes", target: 120, reward: { xp: 1400, money: 7000, shards: 10 } },
  { id: "sessions_3", icon: "🧠", title: "Complete 3 sessões de estudo", metric: "study_sessions", target: 3, reward: { xp: 500, money: 2500 } },
  { id: "sessions_1", icon: "🧠", title: "Complete 1 sessão de estudo", metric: "study_sessions", target: 1, reward: { xp: 150, money: 800 } },
  { id: "pages_20", icon: "📖", title: "Leia 20 páginas", metric: "read_pages", target: 20, reward: { xp: 300, money: 1500 } },
  { id: "pages_50", icon: "📖", title: "Leia 50 páginas", metric: "read_pages", target: 50, reward: { xp: 800, money: 4000, shards: 8 } },
  { id: "read_30", icon: "🕯️", title: "Leia por 30 minutos", metric: "read_minutes", target: 30, reward: { xp: 320, money: 1600 } },
  { id: "battles_2", icon: "⚔️", title: "Vença 2 batalhas", metric: "battles_won", target: 2, reward: { xp: 400, money: 2200, shards: 6 } },
  { id: "battles_4", icon: "⚔️", title: "Vença 4 batalhas", metric: "battles_won", target: 4, reward: { xp: 900, money: 5000, shards: 12 } },
  { id: "trophies_40", icon: "🏆", title: "Ganhe 40 troféus", metric: "trophies_gained", target: 40, reward: { xp: 700, money: 3500, item: true } },
  { id: "monster_1", icon: "🐉", title: "Encontre um monstro", metric: "monsters_found", target: 1, reward: { xp: 250, money: 1500 } },
  { id: "monster_2", icon: "🐉", title: "Encontre 2 monstros", metric: "monsters_found", target: 2, reward: { xp: 600, money: 3200, shards: 8 } },
  { id: "money_5000", icon: "💰", title: "Ganhe 5.000 moedas", metric: "money_earned", target: 5000, reward: { xp: 350, shards: 6 } },
  { id: "money_20000", icon: "💰", title: "Ganhe 20.000 moedas", metric: "money_earned", target: 20000, reward: { xp: 900, shards: 14 } },
  { id: "streak", icon: "🔥", title: "Mantenha sua sequência hoje", metric: "streak_kept", target: 1, reward: { xp: 400, money: 2000, item: true } },
];

export const QUESTS_BY_ID: Record<string, QuestTemplate> = Object.fromEntries(
  QUEST_TEMPLATES.map((q) => [q.id, q]),
);

export type DailyQuest = {
  templateId: string;
  progress: number;
  claimed: boolean;
};

export type DailyQuests = {
  day: string;
  list: DailyQuest[];
};

/** quantas missões por dia */
export const QUESTS_PER_DAY = 5;

function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Sorteio estável por dia: sempre as mesmas missões no mesmo dia,
 * mesmo que o jogador atualize a página ou troque de dispositivo.
 */
export function generateDailyQuests(day: string, salt = ""): DailyQuests {
  const rand = rng(seedFrom(`${day}|${salt}`));
  const pool = [...QUEST_TEMPLATES];
  const list: DailyQuest[] = [];
  // sempre inclui a missão de sequência
  list.push({ templateId: "streak", progress: 0, claimed: false });
  const rest = pool.filter((q) => q.id !== "streak");
  while (list.length < QUESTS_PER_DAY && rest.length > 0) {
    const i = Math.floor(rand() * rest.length);
    const [picked] = rest.splice(i, 1);
    if (picked) list.push({ templateId: picked.id, progress: 0, claimed: false });
  }
  return { day, list };
}

export function questDone(q: DailyQuest): boolean {
  const t = QUESTS_BY_ID[q.templateId];
  if (!t) return false;
  return q.progress >= t.target;
}

export function rewardLabel(r: QuestReward): string {
  const parts: string[] = [];
  if (r.xp) parts.push(`+${r.xp} XP`);
  if (r.money) parts.push(`+${r.money.toLocaleString("pt-BR")} moedas`);
  if (r.shards) parts.push(`+${r.shards} fragmentos`);
  if (r.item) parts.push("+1 item aleatório");
  return parts.join(" · ");
}
