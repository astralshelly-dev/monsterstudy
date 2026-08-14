import { supabase } from "@/integrations/supabase/client";
import { MONSTERS_BY_ID } from "./monsters";
import { RARITY_ORDER } from "./config";
import { leagueOf } from "./battle/config";
import { getSnapshot, replaceState, totals } from "./state";
import type { GameState } from "./types";

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
  };

  updatedAt: string;
};

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
    },
  };
}


/** envia o save completo + o perfil público para a nuvem */
export async function pushToCloud(userId: string): Promise<void> {
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
      monsters: summary.monsters,
      stats: summary.stats,
    })
    .eq("user_id", userId);
  if (profileError) throw profileError;
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
    .select("state, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.state) return "missing";
  const remote = data.state as unknown as GameState;
  const local = getSnapshot();
  if (opts?.preferNewest && !opts.force) {
    const localModified = local.lastModifiedAt ?? local.lastSeen ?? 0;
    const remoteUpdatedAt = Date.parse(data.updated_at);
    const remoteModified = remote.lastModifiedAt ?? (Number.isFinite(remoteUpdatedAt) ? remoteUpdatedAt : 0);
    if (localModified > remoteModified) return "local-newer";
  }
  if (!opts?.force) {
    const remoteScore = (remote.sessions?.length ?? 0) + (remote.profile?.xp ?? 0);
    const localScore = local.sessions.length + local.profile.xp;
    if (!opts?.preferNewest && remoteScore < localScore) return "local-newer";
  }
  replaceState({ ...remote, timer: local.timer, pendingReward: null });
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

function mapProfile(row: Record<string, unknown>): PublicProfile {
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
    updatedAt: String(row['updated_at']),
  };
}

/** procura o perfil de outro jogador pelo ID público */
export async function findProfile(publicId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("public_id", publicId.trim().toUpperCase())
    .maybeSingle();
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
