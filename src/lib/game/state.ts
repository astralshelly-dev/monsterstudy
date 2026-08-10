import {
  BASE_INCOME_SLOTS,
  DEFAULT_UNLOCKED_TIMERS,
  FREE_XP_MILESTONES,
  FREE_XP_REPEAT,
  GIFT_CODES,
  EARLY_END_PENALTY,
  RARITIES,
  RARITY_ORDER,
  SECRET_CHANCE,
  SECRET_MONSTER_ID,
  SECRET_RARITY,
  SECRET_TIMER_MINUTES,
  STREAK_MILESTONES,
  TIMERS,
  UPGRADES,
  XP,
  monsterXpForLevel,
  upgradePrice,
  userXpForLevel,
  type RarityId,
  type UpgradeId,
  type TimerConfig,
} from "./config";
import { MONSTERS, MONSTERS_BY_ID, MONSTERS_BY_RARITY } from "./monsters";
import { ACHIEVEMENTS, registerRarityTiers } from "./achievements";
import type {
  ActiveTimer,
  Book,
  FreeSession,
  GameState,
  ReadingSession,
  Reward,
  Session,
  StudySession,
} from "./types";

registerRarityTiers(MONSTERS.map((m) => ({ id: m.id, rarity: m.rarity })));

const STORAGE_KEY = "monster-study:v1";

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function defaultState(): GameState {
  return {
    version: 1,
    profile: {
      name: "Caçador",
      avatar: "🧙",
      createdAt: new Date().toISOString(),
      xp: 0,
      level: 1,
    },
    money: 0,
    shards: 0,
    lastSeen: Date.now(),
    monsters: {},
    activeMonsterId: null,
    incomeMonsterIds: [],
    books: [],
    sessions: [],
    upgrades: {
      lucky_charm: 0,
      golden_wallet: 0,
      knowledge_boost: 0,
      streak_booster: 0,
      monster_den: 0,
    },
    unlockedTimers: [...DEFAULT_UNLOCKED_TIMERS],
    achievements: {},
    streak: { current: 0, best: 0, lastDay: null, claimed: [] },
    activity: {},
    settings: { sounds: true, animations: true, notifications: false, compact: false },
    timer: null,
    pendingReward: null,
    redeemedCodes: [],
  };
}

// ------------------------------------------------------------
// Store
// ------------------------------------------------------------
let state: GameState = defaultState();
let hydrated = false;
const listeners = new Set<() => void>();
const serverSnapshot = defaultState();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function setState(updater: (s: GameState) => GameState | void) {
  const draft: GameState = { ...state };
  const next = updater(draft);
  state = (next ?? draft) as GameState;
  checkAchievements();
  persist();
  emit();
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getSnapshot() {
  return state;
}
export function getServerSnapshot() {
  return serverSnapshot;
}
export function isHydrated() {
  return hydrated;
}

export type OfflineEarnings = { amount: number; seconds: number } | null;
let offlineEarnings: OfflineEarnings = null;
export function takeOfflineEarnings(): OfflineEarnings {
  const v = offlineEarnings;
  offlineEarnings = null;
  return v;
}

export function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState;
      state = { ...defaultState(), ...parsed, profile: { ...defaultState().profile, ...parsed.profile } };
    }
  } catch {
    /* ignore */
  }
  // migração: preencher os slots de renda para quem já tinha coleção
  if (!Array.isArray(state.incomeMonsterIds)) state.incomeMonsterIds = [];
  state.incomeMonsterIds = state.incomeMonsterIds.filter((id) => state.monsters[id]);
  if (state.incomeMonsterIds.length === 0) {
    state.incomeMonsterIds = bestMonsterIds(state, incomeSlots(state));
  }
  // rendimento offline
  const elapsed = Math.max(0, Math.floor((Date.now() - state.lastSeen) / 1000));
  const rate = moneyPerSecond(state);
  if (elapsed > 60 && rate > 0) {
    const capped = Math.min(elapsed, 60 * 60 * 12);
    offlineEarnings = { amount: rate * capped, seconds: capped };
    state.money += rate * capped;
  }
  state.lastSeen = Date.now();
  refreshStreak();
  persist();
  emit();
}

// ------------------------------------------------------------
// Derivados
// ------------------------------------------------------------
/** quantos monstros podem gerar renda ao mesmo tempo */
export function incomeSlots(s: GameState = state): number {
  return BASE_INCOME_SLOTS + (s.upgrades.monster_den ?? 0);
}

/** ids dos monstros efetivamente gerando renda (respeita o limite de slots) */
export function incomeMonsterIds(s: GameState = state): string[] {
  return (s.incomeMonsterIds ?? []).filter((id) => s.monsters[id]).slice(0, incomeSlots(s));
}

function bestMonsterIds(s: GameState, count: number): string[] {
  return Object.values(s.monsters)
    .map((m) => ({ m, def: MONSTERS_BY_ID[m.id] }))
    .filter((x) => x.def)
    .sort(
      (a, b) =>
        RARITIES[b.def!.rarity].moneyPerSec * b.m.copies -
        RARITIES[a.def!.rarity].moneyPerSec * a.m.copies,
    )
    .slice(0, count)
    .map((x) => x.m.id);
}

export function monsterIncome(monsterId: string, s: GameState = state): number {
  const owned = s.monsters[monsterId];
  const def = MONSTERS_BY_ID[monsterId];
  if (!owned || !def) return 0;
  const walletMult = 1 + s.upgrades.golden_wallet * UPGRADES.golden_wallet.effectPerLevel;
  return (
    RARITIES[def.rarity].moneyPerSec * owned.copies * (1 + (owned.level - 1) * 0.1) * walletMult
  );
}

export function moneyPerSecond(s: GameState = state): number {
  let total = 0;
  for (const id of incomeMonsterIds(s)) total += monsterIncome(id, s);
  return total;
}

/** liga/desliga um monstro da renda passiva */
export function toggleIncomeMonster(id: string): { ok: boolean; message: string } {
  const list = incomeMonsterIds();
  if (list.includes(id)) {
    setState((s) => {
      s.incomeMonsterIds = list.filter((x) => x !== id);
    });
    return { ok: true, message: "Monstro removido da renda passiva." };
  }
  const slots = incomeSlots();
  if (list.length >= slots) {
    return {
      ok: false,
      message: `Você só pode ter ${slots} monstros gerando renda. Melhore o Covil de Monstros na Loja.`,
    };
  }
  setState((s) => {
    s.incomeMonsterIds = [...list, id];
  });
  return { ok: true, message: "Monstro agora gera renda passiva." };
}

export function userProgress(s: GameState = state) {
  const need = userXpForLevel(s.profile.level);
  return { xp: s.profile.xp, need, pct: Math.min(100, (s.profile.xp / need) * 100) };
}

export function monsterProgress(monsterId: string, s: GameState = state) {
  const owned = s.monsters[monsterId];
  const def = MONSTERS_BY_ID[monsterId];
  if (!owned || !def) return null;
  const tier = RARITY_ORDER.indexOf(def.rarity);
  const need = monsterXpForLevel(owned.level, tier);
  return { ...owned, need, pct: Math.min(100, (owned.xp / need) * 100), def };
}

/** o monstro secreto fica invisível (dex, contagens, filtros) até ser conquistado */
export function isSecretHidden(monsterId: string, s: GameState = state): boolean {
  const def = MONSTERS_BY_ID[monsterId];
  return Boolean(def && def.rarity === SECRET_RARITY && !s.monsters[monsterId]);
}

export function visibleMonsters(s: GameState = state) {
  return MONSTERS.filter((m) => !isSecretHidden(m.id, s));
}

export function visibleRarities(s: GameState = state): RarityId[] {
  return RARITY_ORDER.filter((r) => r !== SECRET_RARITY || Boolean(s.monsters[SECRET_MONSTER_ID]));
}

export function totals(s: GameState = state) {
  let studySec = 0;
  let readSec = 0;
  let pages = 0;
  for (const x of s.sessions) {
    if (x.kind === "read") {
      readSec += x.durationSec;
      pages += x.pagesRead;
    } else studySec += x.durationSec;
  }
  return {
    studySec,
    readSec,
    pages,
    sessions: s.sessions.length,
    booksDone: s.books.filter((b) => b.shelf === "concluido").length,
    discovered: Object.keys(s.monsters).length,
    totalMonsters: visibleMonsters(s).length,
  };
}

// ------------------------------------------------------------
// Timer
// ------------------------------------------------------------
export function timerElapsedSec(t: ActiveTimer, now = Date.now()): number {
  const pausedExtra = t.pausedAt ? now - t.pausedAt : 0;
  return Math.max(0, Math.floor((now - t.startedAt - t.pausedMs - pausedExtra) / 1000));
}

export function timerRemainingSec(t: ActiveTimer, now = Date.now()): number {
  if (t.durationSec == null) return 0;
  return Math.max(0, t.durationSec - timerElapsedSec(t, now));
}

export function startTimer(t: Omit<ActiveTimer, "startedAt" | "pausedAt" | "pausedMs">) {
  setState((s) => {
    s.timer = { ...t, startedAt: Date.now(), pausedAt: null, pausedMs: 0 };
  });
}

export function pauseTimer() {
  setState((s) => {
    if (s.timer && !s.timer.pausedAt) s.timer = { ...s.timer, pausedAt: Date.now() };
  });
}

export function resumeTimer() {
  setState((s) => {
    if (s.timer?.pausedAt) {
      s.timer = {
        ...s.timer,
        pausedMs: s.timer.pausedMs + (Date.now() - s.timer.pausedAt),
        pausedAt: null,
      };
    }
  });
}

/** Encerra antes do tempo: o cronômetro passa a estar "completo" com penalidade */
export function endTimerEarly() {
  setState((s) => {
    if (!s.timer) return;
    const elapsed = timerElapsedSec(s.timer);
    const planned = s.timer.durationSec ?? elapsed;
    s.timer = {
      ...s.timer,
      pausedAt: null,
      pausedMs: s.timer.pausedMs + (s.timer.pausedAt ? Date.now() - s.timer.pausedAt : 0),
      durationSec: Math.max(1, elapsed),
      meta: {
        ...s.timer.meta,
        earlyEnd: true,
        completion: planned > 0 ? Math.min(1, elapsed / planned) : 1,
      },
    };
  });
}

export function cancelTimer() {
  setState((s) => {
    s.timer = null;
  });
}

// ------------------------------------------------------------
// Recompensas
// ------------------------------------------------------------
export function timerConfig(minutes: number): TimerConfig {
  return TIMERS.find((t) => t.minutes === minutes) ?? TIMERS[0]!;
}

export function rarityChances(minutes: number, luckyLevel = state.upgrades.lucky_charm) {
  const cfg = timerConfig(minutes);
  const boost = 1 + luckyLevel * UPGRADES.lucky_charm.effectPerLevel;
  const entries = Object.entries(cfg.weights) as Array<[RarityId, number]>;
  const weighted = entries.map(([r, w]) => {
    const tier = RARITY_ORDER.indexOf(r);
    const factor = tier >= 2 ? boost : 1;
    return [r, w * factor] as [RarityId, number];
  });
  const sum = weighted.reduce((a, [, w]) => a + w, 0);
  return weighted.map(([r, w]) => ({ rarity: r, pct: (w / sum) * 100 }));
}

/** fração mínima do tempo planejado para ganhar monstro */
export const MIN_COMPLETION_FOR_MONSTER = 0.5;

/** 0.5 → penalidade máxima, 1 → sem penalidade */
function rarePenaltyFactor(completion: number): number {
  const t = Math.max(0, Math.min(1, (completion - MIN_COMPLETION_FOR_MONSTER) / (1 - MIN_COMPLETION_FOR_MONSTER)));
  return EARLY_END_PENALTY.rareWeightFactor + (1 - EARLY_END_PENALTY.rareWeightFactor) * t;
}

function rollRarity(minutes: number, earlyEnd: boolean, completion = 1): RarityId {
  // chance oculta do monstro secreto: apenas no cronômetro de 5 horas completo
  if (minutes >= SECRET_TIMER_MINUTES && !earlyEnd && Math.random() < SECRET_CHANCE) {
    return SECRET_RARITY;
  }
  const cfg = timerConfig(minutes);
  const boost = 1 + state.upgrades.lucky_charm * UPGRADES.lucky_charm.effectPerLevel;
  const penalty = earlyEnd ? rarePenaltyFactor(completion) : 1;
  const entries = Object.entries(cfg.weights) as Array<[RarityId, number]>;
  const weighted = entries.map(([r, w]) => {
    const tier = RARITY_ORDER.indexOf(r);
    let weight = w;
    if (tier >= 2) weight *= boost;
    if (tier >= 1) weight *= penalty;
    return [r, weight] as [RarityId, number];
  });
  const sum = weighted.reduce((a, [, w]) => a + w, 0);
  let roll = Math.random() * sum;
  for (const [r, w] of weighted) {
    roll -= w;
    if (roll <= 0) return r;
  }
  return weighted[0]![0];
}

function grantMonster(rarity: RarityId): { monsterId: string; duplicate: boolean } {
  const pool = MONSTERS_BY_RARITY[rarity] ?? MONSTERS_BY_RARITY["comum"]!;
  const pick = pool[Math.floor(Math.random() * pool.length)]!;
  const duplicate = Boolean(state.monsters[pick.id]);
  return { monsterId: pick.id, duplicate };
}

function applyReward(s: GameState, reward: Reward) {
  const id = reward.monsterId;
  if (id) {
    const existing = s.monsters[id];
    if (existing) {
      s.monsters = {
        ...s.monsters,
        [id]: { ...existing, copies: existing.copies + 1 },
      };
    } else {
      s.monsters = {
        ...s.monsters,
        [id]: {
          id,
          copies: 1,
          level: 1,
          xp: 0,
          discoveredAt: new Date().toISOString(),
        },
      };
      if (!s.activeMonsterId) s.activeMonsterId = id;
      const list = (s.incomeMonsterIds ?? []).filter((x) => s.monsters[x]);
      if (list.length < incomeSlots(s)) s.incomeMonsterIds = [...list, id];
      else s.incomeMonsterIds = list;
    }
  }

  s.money += reward.money;
  s.shards += reward.shards;
  addUserXp(s, reward.xp);
}

function addUserXp(s: GameState, amount: number) {
  let xp = s.profile.xp + amount;
  let level = s.profile.level;
  while (xp >= userXpForLevel(level)) {
    xp -= userXpForLevel(level);
    level += 1;
  }
  s.profile = { ...s.profile, xp, level };
}

export function addMonsterXp(monsterId: string, amount: number): { levelsGained: number } {
  let levelsGained = 0;
  setState((s) => {
    const owned = s.monsters[monsterId];
    if (!owned) return;
    const def = MONSTERS_BY_ID[monsterId];
    if (!def) return;
    const tier = RARITY_ORDER.indexOf(def.rarity);
    let xp = owned.xp + amount;
    let level = owned.level;
    while (xp >= monsterXpForLevel(level, tier)) {
      xp -= monsterXpForLevel(level, tier);
      level += 1;
      levelsGained += 1;
    }
    s.monsters = { ...s.monsters, [monsterId]: { ...owned, xp, level } };
  });
  return { levelsGained };
}

function sessionXp(minutes: number, rarity: RarityId, earlyEnd: boolean, extra = 0) {
  const boost = 1 + state.upgrades.knowledge_boost * UPGRADES.knowledge_boost.effectPerLevel;
  let xp = (minutes * XP.perMinute + XP.completionBonus + extra) * RARITIES[rarity].xpMultiplier * boost;
  if (earlyEnd) xp *= EARLY_END_PENALTY.xpFactor;
  return Math.round(xp);
}

function buildReward(minutes: number, earlyEnd: boolean, extraXp = 0, completion = 1): Reward {
  const rarity = rollRarity(minutes, earlyEnd, completion);
  const eligible = !earlyEnd || completion >= MIN_COMPLETION_FOR_MONSTER;
  const granted = eligible ? grantMonster(rarity) : { monsterId: null, duplicate: false };
  const xp = sessionXp(minutes, rarity, earlyEnd, extraXp);
  const money = Math.round(RARITIES[rarity].moneyPerSec * minutes * 60 * 0.15 * 100) / 100;
  return {
    monsterId: granted.monsterId,
    rarity,
    duplicate: granted.duplicate,
    xp,
    money,
    shards: granted.duplicate ? 10 * (RARITY_ORDER.indexOf(rarity) + 1) : 0,
  };
}

// ------------------------------------------------------------
// Streak / atividade
// ------------------------------------------------------------
function markActivity(s: GameState, kind: "study" | "read", seconds: number, pages = 0) {
  const key = todayKey();
  const cur = s.activity[key] ?? { studySec: 0, readSec: 0, pages: 0, sessions: 0 };
  s.activity = {
    ...s.activity,
    [key]: {
      studySec: cur.studySec + (kind === "study" ? seconds : 0),
      readSec: cur.readSec + (kind === "read" ? seconds : 0),
      pages: cur.pages + pages,
      sessions: cur.sessions + 1,
    },
  };
  // streak
  const today = key;
  if (s.streak.lastDay !== today) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = todayKey(y);
    const current = s.streak.lastDay === yesterday ? s.streak.current + 1 : 1;
    s.streak = {
      ...s.streak,
      current,
      best: Math.max(s.streak.best, current),
      lastDay: today,
    };
    const milestone = STREAK_MILESTONES.find(
      (m) => m.days === current && !s.streak.claimed.includes(m.days),
    );
    if (milestone) {
      const mult = 1 + s.upgrades.streak_booster * UPGRADES.streak_booster.effectPerLevel;
      s.money += milestone.reward * mult;
      s.streak = { ...s.streak, claimed: [...s.streak.claimed, milestone.days] };
    }
  }
}

export function refreshStreak() {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = todayKey(y);
  if (state.streak.lastDay && state.streak.lastDay !== todayKey() && state.streak.lastDay !== yesterday) {
    state.streak = { ...state.streak, current: 0 };
  }
}

// ------------------------------------------------------------
// Salvar sessões
// ------------------------------------------------------------
export function saveStudySession(input: {
  timer: ActiveTimer;
  durationSec: number;
  earlyEnd: boolean;
  learned?: string;
  notes?: string;
}): Reward {
  const minutes = Math.max(1, Math.round((input.timer.durationSec ?? input.durationSec) / 60));
  const reward = buildReward(minutes, input.earlyEnd, 0, input.timer.meta.completion ?? 1);
  const session: StudySession = {
    id: uid(),
    kind: "study",
    startedAt: new Date(input.timer.startedAt).toISOString(),
    endedAt: new Date().toISOString(),
    durationSec: input.durationSec,
    plannedSec: input.timer.durationSec ?? input.durationSec,
    earlyEnd: input.earlyEnd,
    subject: input.timer.meta.subject ?? "Estudo",
    topic: input.timer.meta.topic,
    goal: input.timer.meta.goal,
    bookId: input.timer.meta.bookId,
    learned: input.learned,
    notes: input.notes,
    reward,
  };
  setState((s) => {
    s.sessions = [session, ...s.sessions];
    markActivity(s, "study", input.durationSec);
    applyReward(s, reward);
    s.timer = null;
    s.pendingReward = reward;
  });
  return reward;
}

export function saveReadingSession(input: {
  timer: ActiveTimer;
  durationSec: number;
  earlyEnd: boolean;
  endPage: number;
  notes?: string;
}): Reward {
  const minutes = Math.max(1, Math.round((input.timer.durationSec ?? input.durationSec) / 60));
  const startPage = input.timer.meta.startPage ?? 0;
  const pagesRead = Math.max(0, input.endPage - startPage);
  const reward = buildReward(
    minutes,
    input.earlyEnd,
    pagesRead * XP.perPage,
    input.timer.meta.completion ?? 1,
  );
  const bookId = input.timer.meta.bookId!;
  const session: ReadingSession = {
    id: uid(),
    kind: "read",
    startedAt: new Date(input.timer.startedAt).toISOString(),
    endedAt: new Date().toISOString(),
    durationSec: input.durationSec,
    plannedSec: input.timer.durationSec ?? input.durationSec,
    earlyEnd: input.earlyEnd,
    bookId,
    startPage,
    endPage: input.endPage,
    pagesRead,
    pagesPerMin: Math.round((pagesRead / Math.max(1, input.durationSec / 60)) * 100) / 100,
    notes: input.notes,
    reward,
  };
  setState((s) => {
    s.sessions = [session, ...s.sessions];
    s.books = s.books.map((b) =>
      b.id === bookId
        ? {
            ...b,
            currentPage: Math.max(b.currentPage, input.endPage),
            shelf: input.endPage >= b.totalPages ? "concluido" : b.shelf === "quero" ? "lendo" : b.shelf,
            finishedAt: input.endPage >= b.totalPages ? new Date().toISOString() : b.finishedAt,
          }
        : b,
    );
    markActivity(s, "read", input.durationSec, pagesRead);
    applyReward(s, reward);
    s.timer = null;
    s.pendingReward = reward;
  });
  return reward;
}

export function saveFreeSession(input: {
  timer: ActiveTimer;
  durationSec: number;
  notes?: string;
  mode?: "study" | "read";
  bookId?: string;
  endPage?: number;
}): {
  monsterXp: number;
  levelsGained: number;
  monsterId: string | null;
  pagesRead: number;
} {
  const minutes = input.durationSec / 60;
  const boost = 1 + state.upgrades.knowledge_boost * UPGRADES.knowledge_boost.effectPerLevel;
  const mode = input.mode ?? "study";
  const bookId = input.bookId ?? input.timer.meta.bookId;
  const startPage = input.timer.meta.startPage ?? 0;
  const endPage = input.endPage ?? startPage;
  const pagesRead = mode === "read" ? Math.max(0, endPage - startPage) : 0;
  const monsterXp = Math.round(
    (minutes * XP.freeStudyPerMinute + pagesRead * XP.perPage) * boost,
  );
  const monsterId = state.activeMonsterId;
  const session: FreeSession = {
    id: uid(),
    kind: "free",
    mode,
    startedAt: new Date(input.timer.startedAt).toISOString(),
    endedAt: new Date().toISOString(),
    durationSec: input.durationSec,
    subject: input.timer.meta.subject,
    notes: input.notes,
    bookId: mode === "read" ? bookId : undefined,
    startPage: mode === "read" ? startPage : undefined,
    endPage: mode === "read" ? endPage : undefined,
    pagesRead: mode === "read" ? pagesRead : undefined,
    monsterId: monsterId ?? undefined,
    monsterXp,
  };
  setState((s) => {
    s.sessions = [session, ...s.sessions];
    markActivity(s, mode, input.durationSec, pagesRead);
    addUserXp(s, Math.round((minutes * XP.perMinute + pagesRead * XP.perPage) * boost));
    if (mode === "read" && bookId) {
      s.books = s.books.map((b) =>
        b.id === bookId ? { ...b, currentPage: Math.min(b.totalPages, endPage) } : b,
      );
    }
    s.timer = null;
  });
  let levelsGained = 0;
  if (monsterId) levelsGained = addMonsterXp(monsterId, monsterXp).levelsGained;
  return { monsterXp, levelsGained, monsterId, pagesRead };
}

// ------------------------------------------------------------
// Códigos promocionais
// ------------------------------------------------------------
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function redeemCode(input: string): { ok: boolean; message: string } {
  const code = input.trim().toUpperCase();
  if (!code) return { ok: false, message: "Digite um código." };
  const found = GIFT_CODES.find((c) => c.code === code);
  if (!found) return { ok: false, message: "Código inválido." };
  if (state.redeemedCodes.includes(found.code)) {
    return { ok: false, message: "Você já resgatou este código." };
  }
  const gainedMoney = randInt(found.moneyRange[0], found.moneyRange[1]);
  const gainedShards = randInt(found.shardRange[0], found.shardRange[1]);

  setState((s) => {
    s.redeemedCodes = [...s.redeemedCodes, found.code];
    s.money += gainedMoney;
    s.shards += gainedShards;
  });

  let monsterName: string | null = null;
  if (found.randomRarity) {
    const pool = MONSTERS_BY_RARITY[found.randomRarity] ?? [];
    const def = pool[Math.floor(Math.random() * pool.length)];
    if (def) {
      monsterName = def.name;
      setState((s) => {
        const owned = s.monsters[def.id];
        s.monsters = {
          ...s.monsters,
          [def.id]: owned
            ? { ...owned, copies: owned.copies + 1 }
            : { id: def.id, copies: 1, level: 1, xp: 0, discoveredAt: new Date().toISOString() },
        };
        if (!s.activeMonsterId) s.activeMonsterId = def.id;
      });
    }
  }

  const parts = [`+${gainedMoney} moedas`, `+${gainedShards} fragmentos`];
  if (monsterName) parts.push(`monstro raro ${monsterName}`);
  return { ok: true, message: `${found.label}: ${parts.join(" · ")}` };
}


export function clearPendingReward() {
  setState((s) => {
    s.pendingReward = null;
  });
}

// ------------------------------------------------------------
// Economia / loja
// ------------------------------------------------------------
export function tickMoney(seconds: number) {
  const rate = moneyPerSecond();
  if (rate <= 0) {
    state.lastSeen = Date.now();
    return;
  }
  state.money += rate * seconds;
  state.lastSeen = Date.now();
  persist();
  emit();
}

export function buyTimer(minutes: number): boolean {
  const cfg = timerConfig(minutes);
  if (state.unlockedTimers.includes(minutes) || state.money < cfg.price) return false;
  setState((s) => {
    s.money -= cfg.price;
    s.unlockedTimers = [...s.unlockedTimers, minutes].sort((a, b) => a - b);
  });
  return true;
}

export function buyUpgrade(id: UpgradeId): boolean {
  const level = state.upgrades[id] ?? 0;
  const price = upgradePrice(id, level);
  if (level >= UPGRADES[id].maxLevel || state.money < price) return false;
  setState((s) => {
    s.money -= price;
    s.upgrades = { ...s.upgrades, [id]: level + 1 };
  });
  return true;
}

/** Usa fragmentos de duplicatas para dar XP a um monstro */
export function spendShards(monsterId: string, shards: number): boolean {
  if (state.shards < shards) return false;
  setState((s) => {
    s.shards -= shards;
  });
  addMonsterXp(monsterId, shards * 25);
  return true;
}

export function setActiveMonster(id: string) {
  setState((s) => {
    s.activeMonsterId = id;
  });
}

// ------------------------------------------------------------
// Biblioteca
// ------------------------------------------------------------
export function addBook(book: Omit<Book, "id" | "addedAt">) {
  const id = uid();
  setState((s) => {
    s.books = [...s.books, { ...book, id, addedAt: new Date().toISOString() }];
  });
  return id;
}

export function updateBook(id: string, patch: Partial<Book>) {
  setState((s) => {
    s.books = s.books.map((b) => (b.id === id ? { ...b, ...patch } : b));
  });
}

export function deleteBook(id: string) {
  setState((s) => {
    s.books = s.books.filter((b) => b.id !== id);
  });
}

export function bookStats(bookId: string, s: GameState = state) {
  const sessions = s.sessions.filter(
    (x): x is ReadingSession => x.kind === "read" && x.bookId === bookId,
  );
  const totalSec = sessions.reduce((a, x) => a + x.durationSec, 0);
  const pages = sessions.reduce((a, x) => a + x.pagesRead, 0);
  return {
    sessions,
    totalSec,
    pages,
    avgSpeed: totalSec > 0 ? Math.round((pages / (totalSec / 60)) * 100) / 100 : 0,
  };
}

// ------------------------------------------------------------
// Perfil / configurações
// ------------------------------------------------------------
export function updateProfile(patch: Partial<GameState["profile"]>) {
  setState((s) => {
    s.profile = { ...s.profile, ...patch };
  });
}

export function updateSettings(patch: Partial<GameState["settings"]>) {
  setState((s) => {
    s.settings = { ...s.settings, ...patch };
  });
}

export function resetProgress() {
  state = defaultState();
  persist();
  emit();
}

// ------------------------------------------------------------
// Conquistas
// ------------------------------------------------------------
let achievementQueue: string[] = [];
export function takeAchievementQueue() {
  const q = achievementQueue;
  achievementQueue = [];
  return q;
}

function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements[a.id] && a.check(state)) {
      state.achievements = { ...state.achievements, [a.id]: new Date().toISOString() };
      state.money += a.reward;
      achievementQueue.push(a.id);
    }
  }
}

export function allSessions(): Session[] {
  return state.sessions;
}
