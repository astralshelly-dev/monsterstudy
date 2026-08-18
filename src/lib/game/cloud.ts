import { supabase } from "@/integrations/supabase/client";
import { MONSTERS_BY_ID } from "./monsters";
import { RARITY_ORDER } from "./config";
import { leagueOf } from "./battle/config";
import { getSnapshot, replaceState, subjectList, totals } from "./state";
import { COSMETICS_BY_ID } from "./cosmetics";
import { currentSeason } from "./seasons";
import type { DayActivity, GameState } from "./types";

export type PublicProfile = {
  publicId: string;
  displayName: string;
  avatar: string;
  avatarMonsterId: string | null;
  level: number;
  xp: number;
  money: number;
  shards: number;
  streakCurrent: number;
  streakBest: number;
  monsters: Record<string, { copies: number; level: number }>;
  stats: {
    studySec?: number;
    readSec?: number;
    pages?: number;
    sessions?: number;
    booksDone?: number;
    discovered?: number;
    createdAt?: string;
    byRarity?: Record<string, number>;
    /** batalhas */
    trophies?: number;
    bestTrophies?: number;
    wins?: number;
    losses?: number;
    battles?: number;
    league?: string;
    /** níveis por matéria (top 8) */
    subjects?: Array<{ key: string; name: string; icon: string; level: number; totalXp: number; minutes: number }>;
    /** cosméticos equipados (nome/ícone prontos para exibir) */
    title?: string | null;
    frame?: string | null;
    badge?: string | null;
    /** ids dos cosméticos equipados, para renderizar o perfil completo */
    cosmetics?: {
      frame?: string | null;
      title?: string | null;
      background?: string | null;
      badge?: string | null;
      effect?: string | null;
    };
    /** total de cosméticos desbloqueados */
    cosmeticsOwned?: number;
    /** conquistas desbloqueadas */
    achievements?: number;
    /** itens no inventário */
    items?: number;
    /** equipe de batalha salva */
    team?: string[];
    /** livros na estante e minutos por página médio */
    books?: number;
    avgMinPerPage?: number;
    /** monstro favorito (mais alto nível/raridade) */
    topMonsterId?: string | null;
    /** temporada atual e melhor desempenho */
    season?: number;
    seasonMaxTrophies?: number;
    seasonsPlayed?: number;
  };

  /** resumo diário dos últimos 60 dias (para comparar períodos) */
  activity: Record<string, DayActivity>;
  /** troféus no fim de cada dia */
  trophyLog: Record<string, number>;

  updatedAt: string;
};

export type PeriodKey = "today" | "week" | "month" | "all";

export type PeriodTotals = {
  studySec: number;
  readSec: number;
  totalSec: number;
  pages: number;
  sessions: number;
  xp: number;
  monsters: number;
  quests: number;
  wins: number;
  losses: number;
  trophiesDelta: number;
  streakCurrent: number;
  streakBest: number;
};

function dayKeys(period: PeriodKey): string[] | null {
  if (period === "all") return null;
  const days = period === "today" ? 1 : period === "week" ? 7 : 30;
  const out: string[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  return out.reverse();
}

/** soma as métricas de um perfil público dentro do período escolhido */
export function periodTotals(p: PublicProfile, period: PeriodKey): PeriodTotals {
  const keys = dayKeys(period);
  const activity = p.activity ?? {};
  const entries = keys
    ? keys.map((k) => [k, activity[k]] as const).filter(([, v]) => Boolean(v))
    : Object.entries(activity);

  const acc: PeriodTotals = {
    studySec: 0,
    readSec: 0,
    totalSec: 0,
    pages: 0,
    sessions: 0,
    xp: 0,
    monsters: 0,
    quests: 0,
    wins: 0,
    losses: 0,
    trophiesDelta: 0,
    streakCurrent: p.streakCurrent,
    streakBest: p.streakBest,
  };

  for (const [, v] of entries) {
    if (!v) continue;
    acc.studySec += v.studySec ?? 0;
    acc.readSec += v.readSec ?? 0;
    acc.pages += v.pages ?? 0;
    acc.sessions += v.sessions ?? 0;
    acc.xp += v.xp ?? 0;
    acc.monsters += v.monsters ?? 0;
    acc.quests += v.quests ?? 0;
    acc.wins += v.wins ?? 0;
    acc.losses += v.losses ?? 0;
  }
  acc.totalSec = acc.studySec + acc.readSec;

  // variação de troféus: último registro do período menos o anterior a ele
  const log = p.trophyLog ?? {};
  const logDays = Object.keys(log).sort();
  if (period === "all") {
    acc.trophiesDelta = p.stats.trophies ?? 0;
  } else if (keys && logDays.length > 0) {
    const first = keys[0]!;
    const before = logDays.filter((d) => d < first).pop();
    const insideLast = logDays.filter((d) => keys.includes(d)).pop();
    if (insideLast) acc.trophiesDelta = (log[insideLast] ?? 0) - (before ? log[before] ?? 0 : 0);
  }
  if (period !== "all" && acc.studySec === 0 && acc.readSec === 0 && acc.sessions === 0) {
    // sem atividade no período: mantém zeros (não herda totais)
  }
  return acc;
}

/** série diária de minutos (estudo + leitura) dos últimos N dias */
export function dailySeries(p: PublicProfile, days = 30): Array<{ day: string; minutes: number }> {
  const keys = dayKeys(days <= 1 ? "today" : days <= 7 ? "week" : "month") ?? [];
  const list = keys.length >= days ? keys.slice(-days) : keys;
  return list.map((day) => {
    const v = p.activity?.[day];
    return { day, minutes: Math.round(((v?.studySec ?? 0) + (v?.readSec ?? 0)) / 60) };
  });
}

/** monstro de maior raridade (desempate por nível) do jogador */
function topMonsterOf(s: GameState): string | null {
  let best: { id: string; tier: number; level: number } | null = null;
  for (const owned of Object.values(s.monsters ?? {})) {
    const def = MONSTERS_BY_ID[owned.id];
    if (!def) continue;
    const tier = RARITY_ORDER.indexOf(def.rarity);
    if (!best || tier > best.tier || (tier === best.tier && owned.level > best.level)) {
      best = { id: owned.id, tier, level: owned.level };
    }
  }
  return best?.id ?? null;
}

/** recorte dos últimos 60 dias do diário de atividade (o resto fica só no save) */
function recentActivity(s: GameState): Record<string, DayActivity> {
  const limit = new Date();
  limit.setDate(limit.getDate() - 60);
  const min = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, "0")}-${String(limit.getDate()).padStart(2, "0")}`;
  const out: Record<string, DayActivity> = {};
  for (const [day, v] of Object.entries(s.activity ?? {})) {
    if (day >= min && v) out[day] = v;
  }
  return out;
}

function recentTrophyLog(s: GameState): Record<string, number> {
  const limit = new Date();
  limit.setDate(limit.getDate() - 60);
  const min = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, "0")}-${String(limit.getDate()).padStart(2, "0")}`;
  const out: Record<string, number> = {};
  for (const [day, v] of Object.entries(s.trophyLog ?? {})) {
    if (day >= min && typeof v === "number") out[day] = v;
  }
  return out;
}

function summarize(s: GameState) {
  const t = totals(s);
  const byRarity: Record<string, number> = {};
  for (const r of RARITY_ORDER) byRarity[r] = 0;
  const monsters: Record<string, { copies: number; level: number }> = {};
  for (const owned of Object.values(s.monsters)) {
    const def = MONSTERS_BY_ID[owned.id];
    if (!def) continue;
    monsters[owned.id] = { copies: owned.copies, level: owned.level };
    byRarity[def.rarity] = (byRarity[def.rarity] ?? 0) + 1;
  }
  return {
    monsters,
    stats: {
      studySec: t.studySec,
      readSec: t.readSec,
      pages: t.pages,
      sessions: t.sessions,
      booksDone: t.booksDone,
      discovered: t.discovered,
      createdAt: s.profile.createdAt,
      byRarity,
      trophies: s.battle?.trophies ?? 0,
      bestTrophies: s.battle?.bestTrophies ?? 0,
      wins: s.battle?.wins ?? 0,
      losses: s.battle?.losses ?? 0,
      battles: (s.battle?.wins ?? 0) + (s.battle?.losses ?? 0),
      league: leagueOf(s.battle?.trophies ?? 0).id,
      subjects: subjectList(s)
        .slice(0, 8)
        .map((x) => ({
          key: x.key,
          name: x.name,
          icon: x.icon,
          level: x.level,
          totalXp: x.totalXp,
          minutes: Math.round(x.totalSec / 60),
        })),
      title: s.cosmetics?.title ? COSMETICS_BY_ID[s.cosmetics.title]?.name ?? null : null,
      frame: s.cosmetics?.frame ?? null,
      badge: s.cosmetics?.badge ? COSMETICS_BY_ID[s.cosmetics.badge]?.icon ?? null : null,
      cosmetics: {
        frame: s.cosmetics?.frame ?? null,
        title: s.cosmetics?.title ?? null,
        background: s.cosmetics?.background ?? null,
        badge: s.cosmetics?.badge ?? null,
        effect: s.cosmetics?.effect ?? null,
      },
      cosmeticsOwned: s.cosmetics?.owned?.length ?? 0,
      achievements: Object.keys(s.achievements ?? {}).length,
      items: Object.values(s.inventory ?? {}).reduce((a, b) => a + (b ?? 0), 0),
      team: (s.battle?.team ?? []).slice(0, 3),
      books: s.books?.length ?? 0,
      avgMinPerPage: t.pages > 0 ? Math.round((t.readSec / 60 / t.pages) * 100) / 100 : 0,
      topMonsterId: topMonsterOf(s),
      season: currentSeason().number,
      seasonMaxTrophies: s.seasons?.maxTrophies ?? 0,
      seasonsPlayed: s.seasons?.history?.length ?? 0,
    },
  };
}


/**
 * Revisão do save conhecida por este dispositivo.
 * O servidor é a autoridade: toda alteração administrativa incrementa `saves.rev`.
 * Se a revisão remota for maior do que a conhecida aqui, o app baixa a nuvem
 * antes de enviar qualquer coisa — assim uma ação do ADM nunca é sobrescrita.
 */
let syncedRev = 0;

export function knownRev(): number {
  return syncedRev;
}

/** envia o save completo + o perfil público para a nuvem */
export async function pushToCloud(userId: string): Promise<"pushed" | "refreshed"> {
  // 1. a nuvem mudou por fora (painel ADM ou outro dispositivo)? ela manda.
  const { data: head, error: headError } = await supabase
    .from("saves")
    .select("rev")
    .eq("user_id", userId)
    .maybeSingle();
  if (headError) throw headError;
  if (head && Number(head.rev ?? 0) > syncedRev) {
    await pullFromCloud(userId, { force: true });
    return "refreshed";
  }

  const s = getSnapshot();
  const summary = summarize(s);
  const { error: saveError } = await supabase.from("saves").upsert(
    { user_id: userId, state: JSON.parse(JSON.stringify(s)) },
    { onConflict: "user_id" },
  );
  if (saveError) throw saveError;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: s.profile.name,
      avatar: s.profile.avatar,
      avatar_monster_id: s.profile.avatarMonsterId ?? null,
      level: s.profile.level,
      xp: s.profile.xp,
      money: Math.round(s.money),
      shards: s.shards,
      streak_current: s.streak.current,
      streak_best: s.streak.best,
      activity: recentActivity(s),
      trophy_log: recentTrophyLog(s),
      monsters: summary.monsters,
      stats: summary.stats,
    })
    .eq("user_id", userId);
  if (profileError) throw profileError;
  return "pushed";
}

/**
 * Baixa o save da nuvem. Com `force`, o save da conta sempre substitui o local
 * (usado ao entrar na conta); sem `force`, só substitui se for mais avançado.
 */
export async function pullFromCloud(
  userId: string,
  opts?: { force?: boolean; preferNewest?: boolean },
): Promise<"pulled" | "local-newer" | "missing"> {
  const { data, error } = await supabase
    .from("saves")
    .select("state, updated_at, rev")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.state) return "missing";
  const remote = data.state as unknown as GameState;
  const local = getSnapshot();
  const remoteRev = Number(data.rev ?? 0);
  // uma alteração administrativa (rev maior) sempre vence o save local
  const adminAhead = remoteRev > syncedRev;
  if (opts?.preferNewest && !opts.force && !adminAhead) {
    const localModified = local.lastModifiedAt ?? local.lastSeen ?? 0;
    const remoteUpdatedAt = Date.parse(data.updated_at);
    const remoteModified = remote.lastModifiedAt ?? (Number.isFinite(remoteUpdatedAt) ? remoteUpdatedAt : 0);
    if (localModified > remoteModified) {
      syncedRev = remoteRev;
      return "local-newer";
    }
  }
  if (!opts?.force && !adminAhead) {
    const remoteScore = (remote.sessions?.length ?? 0) + (remote.profile?.xp ?? 0);
    const localScore = local.sessions.length + local.profile.xp;
    if (!opts?.preferNewest && remoteScore < localScore) {
      syncedRev = remoteRev;
      return "local-newer";
    }
  }
  syncedRev = remoteRev;
  // preserva o cronômetro em andamento para não perder a sessão do jogador
  replaceState({ ...remote, timer: local.timer ?? remote.timer ?? null, pendingReward: local.pendingReward ?? null });
  return "pulled";
}

/** meu ID público (criado automaticamente no cadastro) */
export async function myPublicId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("public_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.public_id ?? null;
}

export function mapProfile(row: Record<string, unknown>): PublicProfile {
  return {
    publicId: String(row['public_id']),
    displayName: String(row['display_name']),
    avatar: String(row['avatar']),
    avatarMonsterId: (row['avatar_monster_id'] as string | null) ?? null,
    level: Number(row['level']),
    xp: Number(row['xp']),
    money: Number(row['money']),
    shards: Number(row['shards']),
    streakCurrent: Number(row['streak_current']),
    streakBest: Number(row['streak_best']),
    monsters: (row['monsters'] as PublicProfile["monsters"]) ?? {},
    stats: (row['stats'] as PublicProfile["stats"]) ?? {},
    activity: (row['activity'] as PublicProfile["activity"]) ?? {},
    trophyLog: (row['trophy_log'] as PublicProfile["trophyLog"]) ?? {},
    updatedAt: String(row['updated_at']),
  };
}

/** procura o perfil de outro jogador pelo ID público */
export async function findProfile(publicId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`public_id.eq.${publicId.trim().toUpperCase()},display_name.ilike.${publicId.trim()}`)
    .limit(1)
  if (error || !data) return null;
  return mapProfile(data as unknown as Record<string, unknown>);
}

/** ranking simples: jogadores com maior nível (para descobrir amigos) */
export async function topProfiles(limit = 10): Promise<PublicProfile[]> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("level", { ascending: false })
    .order("xp", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => mapProfile(r as unknown as Record<string, unknown>));
}

/**
 * Lista perfis para o matchmaking aleatório.
 * A seleção aleatória final é feita em memória (ver battle/matchmaking.ts).
 */
export async function randomProfiles(limit = 100): Promise<PublicProfile[]> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => mapProfile(r as unknown as Record<string, unknown>));
}

/**
 * Ranking da temporada por troféus.
 * O PostgREST ordena JSON como texto, então a ordenação final é feita aqui.
 */
export async function trophyLeaderboard(limit = 100): Promise<PublicProfile[]> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(500);
  return (data ?? [])
    .map((r) => mapProfile(r as unknown as Record<string, unknown>))
    .sort((a, b) => (b.stats.trophies ?? 0) - (a.stats.trophies ?? 0))
    .slice(0, limit);
}
