import {
  BASE_INCOME_SLOTS,
  DEFAULT_UNLOCKED_TIMERS,
  FREE_XP_MILESTONES,
  FREE_XP_REPEAT,
  GIFT_CODES,
  ITEM_SHOP_PRICES,

  OFFLINE_INCOME_BASE,
  OFFLINE_INCOME_MAX_HOURS,
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
  MONSTER_MAX_LEVEL,
  upgradePrice,
  userXpForLevel,
  type RarityId,
  type UpgradeId,
  type TimerConfig,
} from "./config";
import { MONSTERS, MONSTERS_BY_ID, MONSTERS_BY_RARITY } from "./monsters";
import { ACHIEVEMENTS, registerRarityTiers } from "./achievements";
import { LEAGUES, TEAM_SIZE, TROPHY_LOSS, TROPHY_WIN, leagueOf } from "./battle/config";
import type { BattleRecord, DayActivity, PendingBattle } from "./types";
import { generateDailyQuests, QUESTS_BY_ID, questDone, type DailyQuest, type QuestMetric } from "./quests";
import { ITEMS_BY_ID, ITEM_DROP_SECONDS, rollItem, type ItemDef } from "./items";
import { subjectKey, subjectLevelFromXp, subjectIcon, SUBJECT_XP_PER_MINUTE, type SubjectProgress } from "./subjects";
import { COSMETICS, COSMETICS_BY_ID, type CosmeticKind } from "./cosmetics";
import { sanitizeName } from "./names";

import {
  currentSeason,
  leagueReward,
  rankReward,
  SEASON_TROPHY_KEEP,
  type SeasonRecord,
  type SeasonReward,
} from "./seasons";
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
    lastModifiedAt: Date.now(),
    profile: {
      name: "Caçador",
      avatar: "art:arcanist",
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
      dream_crystal: 0,
      shard_magnet: 0,
      item_hunter: 0,
      monster_trainer: 0,
      quest_master: 0,
    },


    unlockedTimers: [...DEFAULT_UNLOCKED_TIMERS],
    achievements: {},
    streak: { current: 0, best: 0, lastDay: null, claimed: [] },
    activity: {},
    settings: { sounds: true, animations: true, notifications: false, compact: false },
    timer: null,
    pendingReward: null,
    redeemedCodes: [],
    battle: { trophies: 0, bestTrophies: 0, wins: 0, losses: 0, team: [], history: [] },
    subjects: {},
    inventory: {},
    itemProgressSec: 0,
    itemLog: [],
    quests: generateDailyQuests(todayKey()),
    seasons: { current: currentSeason().number, maxTrophies: 0, wins: 0, losses: 0, history: [] },
    cosmetics: {
      owned: COSMETICS.filter((c) => c.unlock.type === "free").map((c) => c.id),
      frame: null,
      title: null,
      background: null,
      badge: null,
      effect: null,
    },
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
  state = { ...((next ?? draft) as GameState), lastModifiedAt: Date.now() };
  rolloverDaily();
  refreshCosmetics();
  checkAchievements();
  persist();
  emit();
}

/** Substitui o save durante a hidratação da conta sem fingir uma alteração local. */
export function replaceState(next: GameState) {
  state = {
    ...defaultState(),
    ...next,
    profile: { ...defaultState().profile, ...next.profile },
    upgrades: { ...defaultState().upgrades, ...next.upgrades },
    battle: { ...defaultState().battle, ...(next.battle ?? {}) },
    lastModifiedAt: next.lastModifiedAt ?? next.lastSeen,
  };
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
      state = {
        ...defaultState(),
        ...parsed,
        profile: { ...defaultState().profile, ...parsed.profile },
        upgrades: { ...defaultState().upgrades, ...parsed.upgrades },
        battle: { ...defaultState().battle, ...(parsed.battle ?? {}) },
        lastModifiedAt: parsed.lastModifiedAt ?? parsed.lastSeen,
      };
    }
  } catch {
    /* ignore */
  }
  if (!state.profile.publicId) state.profile.publicId = newPublicId();
  // migração: preencher os slots de renda para quem já tinha coleção
  if (!Array.isArray(state.incomeMonsterIds)) state.incomeMonsterIds = [];
  state.incomeMonsterIds = state.incomeMonsterIds.filter((id) => state.monsters[id]);
  if (state.incomeMonsterIds.length === 0) {
    state.incomeMonsterIds = bestMonsterIds(state, incomeSlots(state));
  }
  // rendimento offline (fração da renda normal, ampliada pelo Cristal dos Sonhos)
  const elapsed = Math.max(0, Math.floor((Date.now() - state.lastSeen) / 1000));
  const rate = moneyPerSecond(state) * offlineIncomeFactor(state);
  if (elapsed >= 60 && rate > 0) {
    const capped = Math.min(elapsed, 60 * 60 * OFFLINE_INCOME_MAX_HOURS);
    offlineEarnings = { amount: rate * capped, seconds: capped };
    state.money += rate * capped;
    state.lastModifiedAt = Date.now();
  }
  state.lastSeen = Date.now();
  refreshStreak();
  rolloverDaily();
  refreshCosmetics();
  persist();
  emit();
}

/** fração da renda passiva que rende com o app fechado */
export function offlineIncomeFactor(s: GameState = state): number {
  const lvl = s.upgrades.dream_crystal ?? 0;
  return Math.min(1, OFFLINE_INCOME_BASE + lvl * UPGRADES.dream_crystal.effectPerLevel);
}

/** ID público de 8 caracteres para busca de perfil */
export function newPublicId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
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
  const maxed = owned.level >= MONSTER_MAX_LEVEL;
  const need = maxed ? 0 : monsterXpForLevel(owned.level, tier);
  return {
    ...owned,
    need,
    maxed,
    pct: maxed ? 100 : Math.min(100, (owned.xp / need) * 100),
    def,
  };
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
  bumpActivity(s, { xp: reward.xp, monsters: id ? 1 : 0 });
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
  const trainerMult =
    1 + (state.upgrades.monster_trainer ?? 0) * UPGRADES.monster_trainer.effectPerLevel;
  const boosted = Math.round(amount * trainerMult);
  setState((s) => {
    const owned = s.monsters[monsterId];
    if (!owned) return;
    const def = MONSTERS_BY_ID[monsterId];
    if (!def) return;
    const tier = RARITY_ORDER.indexOf(def.rarity);
    let xp = owned.xp + boosted;
    let level = owned.level;

    while (level < MONSTER_MAX_LEVEL && xp >= monsterXpForLevel(level, tier)) {
      xp -= monsterXpForLevel(level, tier);
      level += 1;
      levelsGained += 1;
    }
    if (level >= MONSTER_MAX_LEVEL) xp = 0;
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
    shards: granted.duplicate
      ? Math.round(10 * (RARITY_ORDER.indexOf(rarity) + 1) * shardMultiplier())
      : 0,

  };
}

// ------------------------------------------------------------
// Streak / atividade
// ------------------------------------------------------------
/** acumula métricas no dia atual (base das comparações entre amigos) */
export function bumpActivity(s: GameState, patch: Partial<DayActivity>) {
  const key = todayKey();
  const cur: DayActivity = s.activity[key] ?? { studySec: 0, readSec: 0, pages: 0, sessions: 0 };
  s.activity = {
    ...s.activity,
    [key]: {
      studySec: cur.studySec + (patch.studySec ?? 0),
      readSec: cur.readSec + (patch.readSec ?? 0),
      pages: cur.pages + (patch.pages ?? 0),
      sessions: cur.sessions + (patch.sessions ?? 0),
      xp: (cur.xp ?? 0) + (patch.xp ?? 0),
      monsters: (cur.monsters ?? 0) + (patch.monsters ?? 0),
      quests: (cur.quests ?? 0) + (patch.quests ?? 0),
      wins: (cur.wins ?? 0) + (patch.wins ?? 0),
      losses: (cur.losses ?? 0) + (patch.losses ?? 0),
    },
  };
}

function markActivity(
  s: GameState,
  kind: "study" | "read",
  seconds: number,
  pages = 0,
  subject?: string | undefined,
) {
  const key = todayKey();
  bumpActivity(s, {
    studySec: kind === "study" ? seconds : 0,
    readSec: kind === "read" ? seconds : 0,
    pages,
    sessions: 1,
  });
  // ---- expansão: matérias, itens e missões acompanham o tempo real ----
  if (kind === "study") {
    addSubjectProgress(s, subject, seconds);
    bumpQuest(s, "study_minutes", Math.round(seconds / 60));
  } else {
    bumpQuest(s, "read_minutes", Math.round(seconds / 60));
    bumpQuest(s, "read_pages", pages);
  }
  accumulateItemProgress(s, seconds);

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
  bumpQuest(s, "streak_kept", 1);
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
  const continueId = input.timer.meta.continueSessionId;
  const previous = continueId
    ? (state.sessions.find((s) => s.id === continueId && s.kind === "study") as
        | StudySession
        | undefined)
    : undefined;
  const session: StudySession = {
    id: previous?.id ?? uid(),
    kind: "study",
    startedAt: previous?.startedAt ?? new Date(input.timer.startedAt).toISOString(),
    endedAt: new Date().toISOString(),
    durationSec: (previous?.durationSec ?? 0) + input.durationSec,
    plannedSec: (previous?.plannedSec ?? 0) + (input.timer.durationSec ?? input.durationSec),
    earlyEnd: input.earlyEnd,
    segments: (previous?.segments ?? (previous ? 1 : 0)) + 1,
    subject: previous?.subject ?? input.timer.meta.subject ?? "Estudo",
    topic: input.timer.meta.topic ?? previous?.topic,
    goal: input.timer.meta.goal ?? previous?.goal,
    bookId: input.timer.meta.bookId ?? previous?.bookId,
    learned: [previous?.learned, input.learned].filter(Boolean).join(" · ") || undefined,
    notes: [previous?.notes, input.notes].filter(Boolean).join(" · ") || undefined,
    reward,
  };
  setState((s) => {
    s.sessions = previous
      ? [session, ...s.sessions.filter((x) => x.id !== previous.id)]
      : [session, ...s.sessions];
    markActivity(s, "study", input.durationSec, 0, session.subject);
    bumpQuest(s, "study_sessions", 1);
    bumpQuest(s, "money_earned", Math.round(reward.money));
    if (reward.monsterId) bumpQuest(s, "monsters_found", 1);
    applyReward(s, reward);
    s.timer = null;
    s.pendingReward = reward;
    s.lastSessionId = session.id;
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
  const continueId = input.timer.meta.continueSessionId;
  const previous = continueId
    ? (state.sessions.find((s) => s.id === continueId && s.kind === "read" && s.bookId === bookId) as
        | ReadingSession
        | undefined)
    : undefined;
  const totalDuration = (previous?.durationSec ?? 0) + input.durationSec;
  const totalPages = (previous?.pagesRead ?? 0) + pagesRead;
  const session: ReadingSession = {
    id: previous?.id ?? uid(),
    kind: "read",
    startedAt: previous?.startedAt ?? new Date(input.timer.startedAt).toISOString(),
    endedAt: new Date().toISOString(),
    durationSec: totalDuration,
    plannedSec: (previous?.plannedSec ?? 0) + (input.timer.durationSec ?? input.durationSec),
    earlyEnd: input.earlyEnd,
    segments: (previous?.segments ?? (previous ? 1 : 0)) + 1,
    bookId,
    startPage: previous?.startPage ?? startPage,
    endPage: input.endPage,
    pagesRead: totalPages,
    minPerPage: totalPages > 0 ? Math.round((totalDuration / 60 / totalPages) * 100) / 100 : 0,
    notes: [previous?.notes, input.notes].filter(Boolean).join(" · ") || undefined,
    reward,
  };
  setState((s) => {
    s.sessions = previous
      ? [session, ...s.sessions.filter((x) => x.id !== previous.id)]
      : [session, ...s.sessions];
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
    bumpQuest(s, "money_earned", Math.round(reward.money));
    if (reward.monsterId) bumpQuest(s, "monsters_found", 1);
    applyReward(s, reward);
    s.timer = null;
    s.pendingReward = reward;
    s.lastSessionId = session.id;
  });
  return reward;
}

/**
 * Continua a última sessão: inicia um novo cronômetro que será emendado
 * na sessão anterior (aparece como uma única sessão maior no histórico).
 */
export function continueSession(minutes: number, extra?: { startPage?: number }) {
  const id = state.lastSessionId;
  const prev = id ? state.sessions.find((s) => s.id === id) : undefined;
  if (!prev || prev.kind === "free") return false;
  startTimer({
    kind: prev.kind,
    durationSec: minutes * 60,
    meta:
      prev.kind === "read"
        ? {
            bookId: prev.bookId,
            startPage: extra?.startPage ?? prev.endPage,
            continueSessionId: prev.id,
          }
        : {
            subject: prev.subject,
            topic: prev.topic,
            goal: prev.goal,
            bookId: prev.bookId,
            continueSessionId: prev.id,
          },
  });
  return true;
}

/** a última sessão salva pode receber continuação? */
export function continuableSession(s: GameState = state): StudySession | ReadingSession | null {
  const id = s.lastSessionId;
  if (!id) return null;
  const found = s.sessions.find((x) => x.id === id);
  if (!found || found.kind === "free") return null;
  return found;
}


/**
 * XP extra por metas de tempo no Treino Livre.
 * Cada marco alcançado soma sua explosão de XP; após 5h, +500 a cada 50 min.
 */
export function freeMilestoneXp(durationSec: number): {
  total: number;
  reached: Array<{ minutes: number; xp: number }>;
} {
  const minutes = durationSec / 60;
  const reached = FREE_XP_MILESTONES.filter((m) => minutes >= m.minutes).map((m) => ({ ...m }));
  let total = reached.reduce((a, m) => a + m.xp, 0);
  if (minutes >= FREE_XP_REPEAT.afterMinutes) {
    const extra = Math.floor(
      (minutes - FREE_XP_REPEAT.afterMinutes) / FREE_XP_REPEAT.everyMinutes,
    );
    for (let i = 1; i <= extra; i++) {
      const mark = FREE_XP_REPEAT.afterMinutes + i * FREE_XP_REPEAT.everyMinutes;
      reached.push({ minutes: mark, xp: FREE_XP_REPEAT.xp });
      total += FREE_XP_REPEAT.xp;
    }
  }
  return { total, reached };
}

/** próxima meta de XP do treino livre (para mostrar o progresso ao vivo) */
export function nextFreeMilestone(durationSec: number): { minutes: number; xp: number } {
  const minutes = durationSec / 60;
  const next = FREE_XP_MILESTONES.find((m) => minutes < m.minutes);
  if (next) return { ...next };
  const passed = Math.floor(
    (minutes - FREE_XP_REPEAT.afterMinutes) / FREE_XP_REPEAT.everyMinutes,
  );
  return {
    minutes: FREE_XP_REPEAT.afterMinutes + (passed + 1) * FREE_XP_REPEAT.everyMinutes,
    xp: FREE_XP_REPEAT.xp,
  };
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
  milestoneXp: number;
  milestones: Array<{ minutes: number; xp: number }>;
} {
  const minutes = input.durationSec / 60;
  const boost = 1 + state.upgrades.knowledge_boost * UPGRADES.knowledge_boost.effectPerLevel;
  const mode = input.mode ?? "study";
  const bookId = input.bookId ?? input.timer.meta.bookId;
  const startPage = input.timer.meta.startPage ?? 0;
  const endPage = input.endPage ?? startPage;
  const pagesRead = mode === "read" ? Math.max(0, endPage - startPage) : 0;
  const milestone = freeMilestoneXp(input.durationSec);
  const milestoneXp = Math.round(milestone.total * boost);
  const monsterXp =
    Math.round((minutes * XP.freeStudyPerMinute + pagesRead * XP.perPage) * boost) + milestoneXp;
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
    milestoneXp,
  };
  setState((s) => {
    s.sessions = [session, ...s.sessions];
    markActivity(s, mode, input.durationSec, pagesRead, input.timer.meta.subject);
    if (mode === "study") bumpQuest(s, "study_sessions", 1);
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
  return {
    monsterXp,
    levelsGained,
    monsterId,
    pagesRead,
    milestoneXp,
    milestones: milestone.reached,
  };
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

// ------------------------------------------------------------
// Recompensa de boas-vindas por criar a conta (uma vez por conta)
// ------------------------------------------------------------
export const SIGNUP_REWARD = { money: 10000, shards: 60, rarity: "raro" as RarityId };
const SIGNUP_FLAG = "SIGNUP-BONUS";

export function hasSignupReward(s: GameState = state): boolean {
  return s.redeemedCodes.includes(SIGNUP_FLAG);
}

/** entrega 10.000 moedas, 60 fragmentos e 1 monstro raro na criação da conta */
export function claimSignupReward(): { ok: boolean; monsterName: string | null } {
  if (hasSignupReward()) return { ok: false, monsterName: null };
  const pool = MONSTERS_BY_RARITY[SIGNUP_REWARD.rarity] ?? [];
  const def = pool[Math.floor(Math.random() * pool.length)] ?? null;
  setState((s) => {
    if (s.redeemedCodes.includes(SIGNUP_FLAG)) return;
    s.redeemedCodes = [...s.redeemedCodes, SIGNUP_FLAG];
    applyReward(s, {
      monsterId: def?.id ?? null,
      rarity: SIGNUP_REWARD.rarity,
      duplicate: false,
      xp: 0,
      money: SIGNUP_REWARD.money,
      shards: SIGNUP_REWARD.shards,
    });
  });
  return { ok: true, monsterName: def?.name ?? null };
}




export function clearPendingReward() {
  setState((s) => {
    s.pendingReward = null;
  });
}

// ------------------------------------------------------------
// Economia / loja
// ------------------------------------------------------------
let passiveAcc = 0;

export function tickMoney(seconds: number) {
  const rate = moneyPerSecond();
  if (rate <= 0) {
    state = { ...state, lastSeen: Date.now(), lastModifiedAt: Date.now() };
    persist();
    emit();
    return;
  }
  // novo objeto: o useSyncExternalStore precisa de nova referência para
  // atualizar a tela a cada segundo
  const next: GameState = {
    ...state,
    money: state.money + rate * seconds,
    lastSeen: Date.now(),
    lastModifiedAt: Date.now(),
  };
  passiveAcc += rate * seconds;
  if (passiveAcc >= 1) {
    const whole = Math.floor(passiveAcc);
    passiveAcc -= whole;
    bumpQuest(next, "money_earned", whole);
  }
  state = next;
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
    /** minutos por página (menor = mais rápido) */
    avgMinPerPage: pages > 0 ? Math.round((totalSec / 60 / pages) * 100) / 100 : 0,
  };
}


// ------------------------------------------------------------
// Perfil / configurações
// ------------------------------------------------------------
export function updateProfile(patch: Partial<GameState["profile"]>) {
  setState((s) => {
    const next = { ...s.profile, ...patch };
    if (patch.name !== undefined) next.name = sanitizeName(patch.name) || "Caçador";
    s.profile = next;
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


// ------------------------------------------------------------
// Batalhas
// ------------------------------------------------------------
export function battleData(s: GameState = state) {
  return s.battle ?? defaultState().battle;
}

/** equipe salva do jogador, filtrada pelos monstros realmente possuídos */
export function battleTeamIds(s: GameState = state): string[] {
  return battleData(s)
    .team.filter((id) => s.monsters[id] && MONSTERS_BY_ID[id])
    .slice(0, TEAM_SIZE);
}

export function setBattleTeam(ids: string[]) {
  setState((s) => {
    s.battle = { ...battleData(s), team: ids.slice(0, TEAM_SIZE) };
  });
}

// ---------- batalha definitiva (abandono = derrota) ----------

/** batalha ranqueada em andamento, se houver */
export function pendingBattle(s: GameState = state): PendingBattle | null {
  return battleData(s).pending ?? null;
}

/** registra a batalha assim que o oponente é encontrado — não há como cancelar */
export function startPendingBattle(p: Omit<PendingBattle, "startedAt">) {
  setState((s) => {
    s.battle = { ...battleData(s), pending: { ...p, startedAt: Date.now() } };
  });
}

export function clearPendingBattle() {
  setState((s) => {
    s.battle = { ...battleData(s), pending: null };
  });
}

/** resolve a batalha pendente como derrota (abandono) */
export function forfeitPendingBattle(): (BattleOutcome & { pending: PendingBattle }) | null {
  const p = pendingBattle();
  if (!p) return null;
  clearPendingBattle();
  const out = recordBattle({
    mode: "ranked",
    result: "loss",
    opponentName: p.opponentName,
    opponentId: p.opponentId ?? null,
    opponentSource: p.opponentSource,
    turns: 0,
    team: p.team,
    opponentTeam: p.opponentTeam,
    forfeit: true,
  });
  return { ...out, pending: p };
}





/** troféus sorteados para uma partida ranqueada (nunca deixa ficar abaixo de 0) */
export function rollTrophyDelta(result: "win" | "loss", trophies: number): number {
  if (result === "win") return randInt(TROPHY_WIN.min, TROPHY_WIN.max);
  const loss = randInt(TROPHY_LOSS.min, TROPHY_LOSS.max);
  return -Math.min(loss, trophies);
}

export type BattleOutcome = {
  record: BattleRecord;
  trophiesBefore: number;
  trophiesAfter: number;
  delta: number;
};

/** grava o resultado da batalha e atualiza troféus/estatísticas do jogador */
export function recordBattle(input: {
  mode: "ranked" | "training";
  result: "win" | "loss";
  opponentName: string;
  opponentId?: string | null | undefined;
  opponentSource: "player" | "bot";
  turns: number;
  team: string[];
  opponentTeam: string[];
  /** derrota por abandono */
  forfeit?: boolean;
}): BattleOutcome {
  const before = battleData().trophies;
  const delta = input.mode === "ranked" ? rollTrophyDelta(input.result, before) : 0;
  const after = Math.max(0, before + delta);
  const record: BattleRecord = {
    id: uid(),
    at: new Date().toISOString(),
    mode: input.mode,
    result: input.result,
    opponentName: input.opponentName,
    opponentId: input.opponentId ?? null,
    opponentSource: input.opponentSource,
    trophiesDelta: delta,
    trophiesBefore: before,
    trophiesAfter: after,
    league: leagueOf(after).id,
    turns: input.turns,
    team: input.team,
    opponentTeam: input.opponentTeam,
    forfeit: input.forfeit ?? false,
  };
  setState((s) => {
    const b = battleData(s);
    s.battle = {
      ...b,
      trophies: after,
      bestTrophies: Math.max(b.bestTrophies, after),
      wins: b.wins + (input.mode === "ranked" && input.result === "win" ? 1 : 0),
      losses: b.losses + (input.mode === "ranked" && input.result === "loss" ? 1 : 0),
      history: [record, ...b.history].slice(0, 200),
    };
    if (input.mode === "ranked") {
      if (input.result === "win") bumpQuest(s, "battles_won", 1);
      if (delta > 0) bumpQuest(s, "trophies_gained", delta);
      const st = s.seasons ?? { current: currentSeason().number, maxTrophies: 0, wins: 0, losses: 0, history: [] };
      s.seasons = {
        ...st,
        maxTrophies: Math.max(st.maxTrophies, after),
        wins: st.wins + (input.result === "win" ? 1 : 0),
        losses: st.losses + (input.result === "loss" ? 1 : 0),
      };
    } else if (input.result === "win") {
      bumpQuest(s, "battles_won", 1);
    }
  });
  return { record, trophiesBefore: before, trophiesAfter: after, delta };
}

export const BATTLE_LEAGUES = LEAGUES;

// ============================================================
// EXPANSÃO — matérias, itens, missões, temporadas, cosméticos
// ============================================================

// ---------------- Matérias ----------------
function addSubjectProgress(s: GameState, subjectName: string | undefined, seconds: number) {
  const name = (subjectName ?? "").trim();
  if (!name || seconds <= 0) return;
  const key = subjectKey(name);
  const cur = s.subjects?.[key] ?? { name, xp: 0, totalSec: 0 };
  const gained = Math.round((seconds / 60) * SUBJECT_XP_PER_MINUTE);
  s.subjects = {
    ...(s.subjects ?? {}),
    [key]: { name: cur.name || name, xp: cur.xp + gained, totalSec: cur.totalSec + seconds },
  };
}

export function subjectList(s: GameState = state): SubjectProgress[] {
  return Object.entries(s.subjects ?? {})
    .map(([key, v]) => {
      const lvl = subjectLevelFromXp(v.xp);
      return {
        key,
        name: v.name,
        icon: subjectIcon(v.name),
        level: lvl.level,
        xp: lvl.xp,
        need: lvl.need,
        pct: Math.min(100, (lvl.xp / lvl.need) * 100),
        totalXp: v.xp,
        totalSec: v.totalSec,
      } satisfies SubjectProgress;
    })
    .sort((a, b) => b.totalXp - a.totalXp);
}

// ---------------- Itens ----------------
let itemQueue: ItemDef[] = [];
export function takeItemQueue(): ItemDef[] {
  const q = itemQueue;
  itemQueue = [];
  return q;
}

function grantItemTo(s: GameState, itemId: string, qty = 1) {
  const def = ITEMS_BY_ID[itemId];
  if (!def) return;
  s.inventory = { ...(s.inventory ?? {}), [itemId]: (s.inventory?.[itemId] ?? 0) + qty };
  s.itemLog = [{ itemId, at: new Date().toISOString() }, ...(s.itemLog ?? [])].slice(0, 100);
  for (let i = 0; i < qty; i += 1) itemQueue.push(def);
}

/** concede N itens aleatórios (recompensas de missão/temporada) */
function grantRandomItems(s: GameState, count: number) {
  for (let i = 0; i < count; i += 1) grantItemTo(s, rollItem().id, 1);
}

/**
 * Acumula tempo REAL de estudo/leitura. A cada 30 minutos acumulados o
 * jogador encontra um item sorteado — atualizar a página não gera nada,
 * pois só o tempo registrado em sessões entra aqui.
 */
function accumulateItemProgress(s: GameState, seconds: number) {
  if (seconds <= 0) return;
  const target = itemDropTarget(s);
  let acc = (s.itemProgressSec ?? 0) + seconds;
  while (acc >= target) {
    acc -= target;
    grantRandomItems(s, 1);
  }
  s.itemProgressSec = acc;
}

/** tempo necessário para o próximo item, reduzido pelo Caçador de Relíquias */
export function itemDropTarget(s: GameState = state): number {
  const lvl = s.upgrades?.item_hunter ?? 0;
  return Math.max(
    60,
    Math.round(ITEM_DROP_SECONDS * (1 - lvl * UPGRADES.item_hunter.effectPerLevel)),
  );
}

/** multiplicador de fragmentos do Ímã de Fragmentos */
export function shardMultiplier(s: GameState = state): number {
  return 1 + (s.upgrades?.shard_magnet ?? 0) * UPGRADES.shard_magnet.effectPerLevel;
}

export function itemDropProgress(s: GameState = state) {
  const cur = s.itemProgressSec ?? 0;
  const target = itemDropTarget(s);
  return { current: cur, target, pct: Math.min(100, (cur / target) * 100) };
}

/** compra um item no bazar da loja pagando com fragmentos */
export function buyItem(itemId: string): { ok: boolean; message: string } {
  const def = ITEMS_BY_ID[itemId];
  if (!def) return { ok: false, message: "Item desconhecido." };
  const price = ITEM_SHOP_PRICES[def.rarity] ?? 0;
  if (state.shards < price) return { ok: false, message: "Fragmentos insuficientes." };
  setState((s) => {
    s.shards -= price;
    grantItemTo(s, itemId, 1);
  });
  return { ok: true, message: `${def.icon} ${def.name} comprado por ${price} fragmentos.` };
}


export function inventoryEntries(s: GameState = state) {
  return Object.entries(s.inventory ?? {})
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ def: ITEMS_BY_ID[id], qty }))
    .filter((x): x is { def: ItemDef; qty: number } => Boolean(x.def));
}

/** usa um item do inventário aplicando o efeito real */
export function useItem(itemId: string): { ok: boolean; message: string } {
  const def = ITEMS_BY_ID[itemId];
  if (!def) return { ok: false, message: "Item desconhecido." };
  if ((state.inventory?.[itemId] ?? 0) <= 0) return { ok: false, message: "Você não possui este item." };
  const e = def.effect;
  if (e.type === "monster_xp" && !state.activeMonsterId) {
    return { ok: false, message: "Escolha um monstro em treino antes de usar este item." };
  }
  let message = "";
  let monsterXp = 0;
  setState((s) => {
    s.inventory = { ...(s.inventory ?? {}), [itemId]: (s.inventory?.[itemId] ?? 0) - 1 };
    switch (e.type) {
      case "user_xp":
        addUserXp(s, e.amount);
        message = `+${e.amount} XP de jogador`;
        break;
      case "money":
        s.money += e.amount;
        bumpQuest(s, "money_earned", e.amount);
        message = `+${e.amount.toLocaleString("pt-BR")} moedas`;
        break;
      case "shards":
        s.shards += e.amount;
        message = `+${e.amount} fragmentos`;
        break;
      case "monster_xp":
        monsterXp = e.amount;
        message = `+${e.amount} XP para o monstro em treino`;
        break;
      case "monster": {
        const pool = MONSTERS_BY_RARITY[e.rarity] ?? [];
        const picked = pool[Math.floor(Math.random() * pool.length)];
        if (picked) {
          applyReward(s, {
            monsterId: picked.id,
            rarity: e.rarity,
            duplicate: Boolean(s.monsters[picked.id]),
            xp: 0,
            money: 0,
            shards: 0,
          });
          bumpQuest(s, "monsters_found", 1);
          message = `${picked.name} apareceu!`;
        }
        break;
      }
    }
  });
  if (monsterXp > 0 && state.activeMonsterId) addMonsterXp(state.activeMonsterId, monsterXp);
  return { ok: true, message: `${def.icon} ${def.name}: ${message}` };
}

// ---------------- Missões diárias ----------------
/** troca as missões quando o dia virou (mantém o histórico do dia atual) */
function rolloverDaily() {
  const day = todayKey();
  if (!state.quests || state.quests.day !== day) {
    state.quests = generateDailyQuests(day, state.profile.publicId ?? "");
  }
}

export function ensureDailyQuests() {
  const day = todayKey();
  if (!state.quests || state.quests.day !== day) {
    setState((s) => {
      s.quests = generateDailyQuests(day, s.profile.publicId ?? "");
    });
  }
}

function bumpQuest(s: GameState, metric: QuestMetric, amount: number) {
  if (amount <= 0) return;
  const day = todayKey();
  const quests = s.quests && s.quests.day === day ? s.quests : generateDailyQuests(day, s.profile.publicId ?? "");
  s.quests = {
    day,
    list: quests.list.map((q) => {
      const t = QUESTS_BY_ID[q.templateId];
      if (!t || t.metric !== metric || q.claimed) return q;
      return { ...q, progress: Math.min(t.target, q.progress + amount) };
    }),
  };
}

export function dailyQuests(s: GameState = state): Array<DailyQuest & { done: boolean }> {
  const day = todayKey();
  const quests = s.quests && s.quests.day === day ? s.quests : generateDailyQuests(day, s.profile.publicId ?? "");
  return quests.list.map((q) => ({ ...q, done: questDone(q) }));
}

/** coleta a recompensa real de uma missão concluída */
export function claimQuest(templateId: string): { ok: boolean; message: string } {
  const t = QUESTS_BY_ID[templateId];
  if (!t) return { ok: false, message: "Missão desconhecida." };
  const q = dailyQuests().find((x) => x.templateId === templateId);
  if (!q) return { ok: false, message: "Missão não está ativa hoje." };
  if (q.claimed) return { ok: false, message: "Recompensa já coletada." };
  if (!q.done) return { ok: false, message: "Missão ainda não concluída." };
  const parts: string[] = [];
  setState((s) => {
    s.quests = {
      day: todayKey(),
      list: (s.quests?.list ?? []).map((x) =>
        x.templateId === templateId ? { ...x, claimed: true } : x,
      ),
    };
    const questMult =
      1 + (s.upgrades?.quest_master ?? 0) * UPGRADES.quest_master.effectPerLevel;
    if (t.reward.xp) {
      const xp = Math.round(t.reward.xp * questMult);
      addUserXp(s, xp);
      parts.push(`+${xp} XP`);
    }
    if (t.reward.money) {
      const money = Math.round(t.reward.money * questMult);
      s.money += money;
      parts.push(`+${money.toLocaleString("pt-BR")} moedas`);
    }
    if (t.reward.shards) {
      const shards = Math.round(t.reward.shards * questMult * shardMultiplier(s));
      s.shards += shards;
      parts.push(`+${shards} fragmentos`);
    }

    if (t.reward.item) {
      grantRandomItems(s, 1);
      parts.push("+1 item");
    }
  });
  return { ok: true, message: `${t.icon} ${t.title}: ${parts.join(" · ")}` };
}

// ---------------- Cosméticos ----------------
export function cosmeticUnlocked(id: string, s: GameState = state): boolean {
  const def = COSMETICS_BY_ID[id];
  if (!def) return false;
  if ((s.cosmetics?.owned ?? []).includes(id)) return true;
  const u = def.unlock;
  const t = totals(s);
  switch (u.type) {
    case "free":
      return true;
    case "level":
      return s.profile.level >= u.n;
    case "achievements":
      return Object.keys(s.achievements ?? {}).length >= u.n;
    case "monsters":
      return Object.keys(s.monsters).length >= u.n;
    case "studyHours":
      return t.studySec / 3600 >= u.n;
    case "pages":
      return t.pages >= u.n;
    case "streak":
      return s.streak.best >= u.n;
    case "trophies":
      return (s.battle?.bestTrophies ?? 0) >= u.n;
    case "wins":
      return (s.battle?.wins ?? 0) >= u.n;
    case "season":
      return false;
  }
}

let cosmeticQueue: string[] = [];
export function takeCosmeticQueue(): string[] {
  const q = cosmeticQueue;
  cosmeticQueue = [];
  return q;
}

/** registra permanentemente os cosméticos cujas condições foram cumpridas */
function refreshCosmetics() {
  const owned = new Set(state.cosmetics?.owned ?? []);
  let changed = false;
  for (const c of COSMETICS) {
    if (owned.has(c.id)) continue;
    if (c.unlock.type === "season") continue;
    if (cosmeticUnlocked(c.id, state)) {
      owned.add(c.id);
      cosmeticQueue.push(c.id);
      changed = true;
    }
  }
  if (changed) {
    state.cosmetics = {
      ...(state.cosmetics ?? { frame: null, title: null, background: null, badge: null, effect: null, owned: [] }),
      owned: [...owned],
    };
  }
}

export function ownedCosmetics(s: GameState = state): string[] {
  return s.cosmetics?.owned ?? [];
}

export function setCosmetic(kind: CosmeticKind, id: string | null): boolean {
  if (id && !ownedCosmetics().includes(id)) return false;
  setState((s) => {
    s.cosmetics = { ...s.cosmetics, [kind]: id };
  });
  return true;
}

export function equippedCosmetic(kind: CosmeticKind, s: GameState = state) {
  const id = s.cosmetics?.[kind];
  return id ? COSMETICS_BY_ID[id] ?? null : null;
}

// ---------------- Temporadas ----------------
export function seasonState(s: GameState = state) {
  const season = currentSeason();
  const st = s.seasons ?? { current: season.number, maxTrophies: 0, wins: 0, losses: 0, history: [] };
  return { season, ...st };
}

function applySeasonReward(s: GameState, reward: SeasonReward) {
  s.money += reward.money;
  s.shards += reward.shards;
  if (reward.items > 0) grantRandomItems(s, reward.items);
  const extra = [reward.title, reward.cosmetic].filter(Boolean) as string[];
  if (extra.length) {
    const owned = new Set(s.cosmetics?.owned ?? []);
    for (const id of extra) if (COSMETICS_BY_ID[id]) owned.add(id);
    s.cosmetics = { ...s.cosmetics, owned: [...owned] };
  }
}

/**
 * Encerra a temporada anterior quando o ciclo de 60 dias virou:
 * arquiva o desempenho, distribui recompensas reais, apaga o histórico
 * de batalhas antigo e faz o reset suave dos troféus.
 */
export function finishSeasonIfNeeded(position: number | null = null): SeasonRecord | null {
  const season = currentSeason();
  const st = state.seasons;
  if (!st || st.current === season.number) return null;
  const b = battleData();
  const maxTrophies = Math.max(st.maxTrophies, b.trophies);
  const rank = rankReward(position);
  const league = leagueReward(maxTrophies);
  const rewards: SeasonReward = {
    money: league.money + (rank?.reward.money ?? 0),
    shards: league.shards + (rank?.reward.shards ?? 0),
    items: league.items + (rank?.reward.items ?? 0),
    ...(rank?.reward.title ? { title: rank.reward.title } : {}),
    ...(rank?.reward.cosmetic ?? league.cosmetic
      ? { cosmetic: rank?.reward.cosmetic ?? league.cosmetic }
      : {}),
  };
  const record: SeasonRecord = {
    number: st.current,
    name: currentSeason().name,
    endedAt: new Date().toISOString(),
    bestLeague: leagueOf(maxTrophies).id,
    maxTrophies,
    finalTrophies: b.trophies,
    position,
    wins: st.wins,
    losses: st.losses,
    rewards,
  };
  setState((s) => {
    const bd = battleData(s);
    s.battle = {
      ...bd,
      trophies: Math.floor(bd.trophies * SEASON_TROPHY_KEEP),
      // temporada nova começa com histórico limpo
      history: [],
      pending: null,
    };
    s.seasons = {
      current: season.number,
      maxTrophies: Math.floor(bd.trophies * SEASON_TROPHY_KEEP),
      wins: 0,
      losses: 0,
      history: [record, ...(s.seasons?.history ?? [])].slice(0, 24),
    };
    applySeasonReward(s, rewards);
  });
  return record;
}
