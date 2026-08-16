/**
 * Lógica administrativa — executa SOMENTE no servidor.
 *
 * Regras desta camada:
 * 1. A fonte da verdade de um jogador é `saves.state` (JSON). `profiles` é a
 *    projeção pública desse save.
 * 2. Toda alteração: lê o estado atual do banco → aplica → grava save + perfil
 *    → incrementa `saves.rev` → registra auditoria → RELÊ do banco e devolve
 *    os valores realmente salvos.
 * 3. Incrementar `rev` faz o app do jogador baixar a alteração antes de enviar
 *    o próprio save, então nada é sobrescrito.
 */
import { supabaseAdmin as db } from "@/integrations/supabase/client.server";
import { ADMIN_EMAIL } from "./admin";
import { MONSTERS_BY_ID } from "./game/monsters";
import { RARITY_ORDER } from "./game/config";
import { LEAGUES, leagueOf } from "./game/battle/config";

export type Claims = Record<string, unknown>;
/* eslint-disable @typescript-eslint/no-explicit-any */
// `any` aqui é intencional: o save é JSON livre e precisa cruzar a fronteira RPC.
type Json = Record<string, any>;

export function emailOf(claims: Claims): string {
  return String(claims['email'] ?? "").toLowerCase();
}

export function assertAdmin(claims: Claims) {
  if (emailOf(claims) !== ADMIN_EMAIL) throw new Error("Forbidden: conta sem permissão administrativa.");
}

export const num = (v: unknown, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
export const normId = (v: unknown) => String(v ?? "").trim().toUpperCase();

function clampInt(v: unknown, min: number, max: number, fallback = min) {
  return Math.max(min, Math.min(max, Math.round(num(v, fallback))));
}

// ------------------------------------------------------------
// Auditoria
// ------------------------------------------------------------
export type LogInput = {
  claims: Claims;
  adminUserId?: string | undefined;
  action: string;
  category?: string;
  target?: { userId?: string | null; publicId?: string | null; name?: string | null } | undefined;
  before?: unknown;
  after?: unknown;
  details?: Json;
  success?: boolean;
  error?: string | undefined;
};

export async function writeLog(input: LogInput): Promise<void> {
  const { error } = await db.from("admin_logs").insert({
    admin_user_id: input.adminUserId ?? null,
    admin_email: emailOf(input.claims),
    target_user_id: input.target?.userId ?? null,
    target_public_id: input.target?.publicId ?? null,
    target_name: input.target?.name ?? null,
    action: input.action,
    category: input.category ?? "player",
    before_value: (input.before ?? null) as never,
    after_value: (input.after ?? null) as never,
    details: (input.details ?? {}) as never,
    success: input.success ?? true,
    error_message: input.error ?? null,
  });
  if (error) console.error("[admin] falha ao registrar auditoria", error.message);
}

/** roda uma ação e registra sucesso OU falha na auditoria (nunca finge sucesso) */
export async function audited<T>(
  meta: Omit<LogInput, "before" | "after" | "success" | "error">,
  run: () => Promise<{ before?: unknown; after?: unknown; details?: Json; result: T }>,
): Promise<T> {
  try {
    const out = await run();
    await writeLog({
      ...meta,
      before: out.before,
      after: out.after,
      details: { ...(meta.details ?? {}), ...(out.details ?? {}) },
      success: true,
    });
    return out.result;
  } catch (e) {
    const message = e instanceof Error ? e.message : "erro desconhecido";
    await writeLog({ ...meta, success: false, error: message });
    throw e;
  }
}

// ------------------------------------------------------------
// Jogadores
// ------------------------------------------------------------
export type ProfileRow = {
  user_id: string;
  public_id: string;
  display_name: string;
  avatar: string;
  avatar_monster_id: string | null;
  level: number;
  xp: number;
  money: number;
  shards: number;
  streak_current: number;
  streak_best: number;
  monsters: Json | null;
  stats: Json | null;
  created_at: string;
  updated_at: string;
};

export async function loadProfile(publicId: string): Promise<ProfileRow> {
  const id = normId(publicId);
  if (!id) throw new Error("Informe o ID público do jogador.");
  const { data, error } = await db.from("profiles").select("*").eq("public_id", id).maybeSingle();
  if (error) throw new Error(`Banco: ${error.message}`);
  if (!data) throw new Error(`Jogador ${id} não encontrado.`);
  return data as unknown as ProfileRow;
}

type SaveRow = { state: Json; rev: number; updated_at: string } | null;

async function loadSave(userId: string): Promise<SaveRow> {
  const { data, error } = await db
    .from("saves")
    .select("state, rev, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Banco: ${error.message}`);
  if (!data?.state) return null;
  return { state: data.state as Json, rev: num((data as { rev?: number }).rev), updated_at: data.updated_at };
}

const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** projeção pública derivada do save — mantém `profiles` sempre coerente */
function projectProfile(state: Json) {
  const profile = obj(state['profile']);
  const battle = obj(state['battle']);
  const streak = obj(state['streak']);
  const monsters = obj(state['monsters']);
  const sessions = arr<Json>(state['sessions']);
  const books = arr<Json>(state['books']);

  const byRarity: Record<string, number> = {};
  for (const r of RARITY_ORDER) byRarity[r] = 0;
  const monsterMap: Record<string, { copies: number; level: number }> = {};
  for (const raw of Object.values(monsters)) {
    const m = obj(raw);
    const id = String(m['id'] ?? "");
    const def = MONSTERS_BY_ID[id];
    if (!def) continue;
    monsterMap[id] = { copies: num(m['copies'], 1), level: num(m['level'], 1) };
    byRarity[def.rarity] = (byRarity[def.rarity] ?? 0) + 1;
  }

  let studySec = 0;
  let readSec = 0;
  let pages = 0;
  for (const raw of sessions) {
    const s = obj(raw);
    const dur = num(s['durationSec']);
    const kind = String(s['kind']);
    const mode = String(s['mode'] ?? "");
    if (kind === "read" || (kind === "free" && mode === "read")) readSec += dur;
    else studySec += dur;
    pages += num(s['pagesRead']);
  }

  const trophies = num(battle['trophies']);
  return {
    display_name: String(profile['name'] ?? "Caçador"),
    avatar: String(profile['avatar'] ?? "art:arcanist"),
    avatar_monster_id: (profile['avatarMonsterId'] as string | null) ?? null,
    level: Math.max(1, num(profile['level'], 1)),
    xp: Math.max(0, num(profile['xp'])),
    money: Math.max(0, Math.round(num(state['money']))),
    shards: Math.max(0, Math.round(num(state['shards']))),
    streak_current: Math.max(0, num(streak['current'])),
    streak_best: Math.max(0, num(streak['best'])),
    monsters: monsterMap as unknown as Json,
    stats: {
      studySec,
      readSec,
      pages,
      sessions: sessions.length,
      booksDone: books.filter((b) => String(obj(b)['shelf']) === "concluido").length,
      discovered: Object.keys(monsterMap).length,
      createdAt: String(profile['createdAt'] ?? new Date().toISOString()),
      byRarity,
      trophies,
      bestTrophies: Math.max(num(battle['bestTrophies']), trophies),
      wins: num(battle['wins']),
      losses: num(battle['losses']),
      battles: num(battle['wins']) + num(battle['losses']),
      league: leagueOf(trophies).id,
    } as unknown as Json,
  };
}

export type MutationResult = {
  publicId: string;
  rev: number;
  before: Json;
  after: Json;
};

/**
 * Aplica uma alteração no save do jogador de forma consistente:
 * lê → aplica → grava save e perfil → incrementa rev → relê do banco.
 */
export async function mutatePlayer(
  publicId: string,
  mutate: (state: Json) => Json,
): Promise<MutationResult> {
  const p = await loadProfile(publicId);
  const save = await loadSave(p.user_id);
  if (!save) {
    throw new Error(
      `O jogador ${p.public_id} ainda não sincronizou o save na nuvem. Peça para abrir o app logado uma vez e tente de novo.`,
    );
  }

  const before = summarizeState(save.state);
  const next = { ...mutate({ ...save.state }), lastModifiedAt: Date.now() };
  const projection = projectProfile(next);

  const { error: saveError } = await db
    .from("saves")
    .update({ state: next as never, rev: save.rev + 1 })
    .eq("user_id", p.user_id);
  if (saveError) throw new Error(`Falha ao salvar o save: ${saveError.message}`);

  const { error: profileError } = await db
    .from("profiles")
    .update(projection as never)
    .eq("user_id", p.user_id);
  if (profileError) throw new Error(`Falha ao salvar o perfil: ${profileError.message}`);

  // releitura obrigatória: só devolvemos o que o banco realmente guardou
  const fresh = await loadSave(p.user_id);
  if (!fresh) throw new Error("Alteração não persistiu no banco.");
  return {
    publicId: p.public_id,
    rev: fresh.rev,
    before,
    after: summarizeState(fresh.state),
  };
}

/** resumo curto usado em auditoria e retorno de valores */
export function summarizeState(state: Json): Json {
  const profile = obj(state['profile']);
  const battle = obj(state['battle']);
  const streak = obj(state['streak']);
  const trophies = num(battle['trophies']);
  return {
    name: String(profile['name'] ?? ""),
    level: num(profile['level'], 1),
    xp: num(profile['xp']),
    money: Math.round(num(state['money'])),
    shards: Math.round(num(state['shards'])),
    trophies,
    league: leagueOf(trophies).id,
    streak: num(streak['current']),
    monsters: Object.keys(obj(state['monsters'])).length,
    achievements: Object.keys(obj(state['achievements'])).length,
  };
}

// ------------------------------------------------------------
// Operações numéricas
// ------------------------------------------------------------
export type ResourceKey = "money" | "shards" | "xp" | "trophies" | "streak" | "level";
export type ResourceMode = "add" | "remove" | "set";

const LIMITS: Record<ResourceKey, number> = {
  money: 1_000_000_000,
  shards: 1_000_000,
  xp: 1_000_000_000,
  trophies: 100_000,
  streak: 10_000,
  level: 999,
};

export function applyValue(current: number, amount: number, mode: ResourceMode, key: ResourceKey) {
  const raw = mode === "set" ? amount : mode === "remove" ? current - Math.abs(amount) : current + amount;
  const min = key === "level" ? 1 : 0;
  return Math.max(min, Math.min(LIMITS[key], Math.round(raw)));
}

export function setResourceInState(state: Json, key: ResourceKey, amount: number, mode: ResourceMode): Json {
  const s = { ...state };
  const profile = { ...obj(s['profile']) };
  const battle = { ...obj(s['battle']) };
  const streak = { ...obj(s['streak']) };

  if (key === "money") s['money'] = applyValue(num(s['money']), amount, mode, key);
  if (key === "shards") s['shards'] = applyValue(num(s['shards']), amount, mode, key);
  if (key === "xp") {
    profile['xp'] = applyValue(num(profile['xp']), amount, mode, key);
    s['profile'] = profile;
  }
  if (key === "level") {
    profile['level'] = applyValue(num(profile['level'], 1), amount, mode, key);
    s['profile'] = profile;
  }
  if (key === "trophies") {
    const t = applyValue(num(battle['trophies']), amount, mode, key);
    battle['trophies'] = t;
    battle['bestTrophies'] = Math.max(num(battle['bestTrophies']), t);
    s['battle'] = battle;
  }
  if (key === "streak") {
    const c = applyValue(num(streak['current']), amount, mode, key);
    streak['current'] = c;
    streak['best'] = Math.max(num(streak['best']), c);
    s['streak'] = streak;
  }
  return s;
}

export function setLeagueInState(state: Json, leagueId: string): Json {
  const league = LEAGUES.find((l) => l.id === leagueId);
  if (!league) throw new Error(`Liga inválida: ${leagueId}`);
  return setResourceInState(state, "trophies", league.min, "set");
}

export function renameInState(state: Json, name: string): Json {
  const clean = name.trim().slice(0, 24);
  if (!clean) throw new Error("Nome inválido.");
  return { ...state, profile: { ...obj(state['profile']), name: clean } };
}

export function giveMonsterInState(state: Json, monsterId: string, level: number, copies: number): Json {
  const def = MONSTERS_BY_ID[monsterId];
  if (!def) throw new Error(`Monstro inexistente: ${monsterId}`);
  const monsters = { ...obj(state['monsters']) };
  const prev = obj(monsters[monsterId]);
  monsters[monsterId] = {
    id: monsterId,
    copies: Math.max(1, num(prev['copies']) + clampInt(copies, 1, 99, 1)),
    level: Math.max(clampInt(level, 1, 10, 1), num(prev['level'], 1)),
    xp: num(prev['xp']),
    discoveredAt: String(prev['discoveredAt'] ?? new Date().toISOString()),
  };
  return { ...state, monsters };
}

export function setMonsterLevelInState(state: Json, monsterId: string, level: number): Json {
  const monsters = { ...obj(state['monsters']) };
  const prev = obj(monsters[monsterId]);
  if (!prev['id']) throw new Error("O jogador não possui esse monstro.");
  monsters[monsterId] = { ...prev, level: clampInt(level, 1, 10, 1), xp: 0 };
  return { ...state, monsters };
}

export function removeMonsterInState(state: Json, monsterId: string): Json {
  const monsters = { ...obj(state['monsters']) };
  if (!monsters[monsterId]) throw new Error("O jogador não possui esse monstro.");
  delete monsters[monsterId];
  const income = arr<string>(state['incomeMonsterIds']).filter((id) => id !== monsterId);
  const team = arr<Json>(obj(state['battle'])['team']);
  return {
    ...state,
    monsters,
    incomeMonsterIds: income,
    activeMonsterId: state['activeMonsterId'] === monsterId ? null : state['activeMonsterId'],
    battle: { ...obj(state['battle']), team: team.filter((t) => String(obj(t)['monsterId'] ?? t) !== monsterId) },
  };
}

export function grantAchievementInState(state: Json, id: string, granted: boolean): Json {
  const achievements = { ...obj(state['achievements']) };
  if (granted) achievements[id] = new Date().toISOString();
  else delete achievements[id];
  return { ...state, achievements };
}

export function clearCodesInState(state: Json): Json {
  return { ...state, redeemedCodes: [] };
}

const asObject = obj;
const asArray = arr;
export { asObject, asArray, clampInt };

// ============================================================
// Camada de serviço usada pelas funções RPC
// ============================================================
type Ctx = { claims: Claims; adminUserId: string };

const DAY = 86_400_000;

function trophiesOf(stats: Json | null) {
  return num(asObject(stats)['trophies']);
}

async function allProfiles(limit = 2000) {
  const { data, error } = await db
    .from("profiles")
    .select("user_id, public_id, display_name, level, xp, money, shards, stats, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Banco: ${error.message}`);
  return (data ?? []) as unknown as ProfileRow[];
}

export async function overview() {
  const list = await allProfiles();
  const now = Date.now();
  const stat = (p: ProfileRow) => asObject(p.stats);
  const sum = (fn: (p: ProfileRow) => number) => list.reduce((a, p) => a + fn(p), 0);
  const wins = sum((p) => num(stat(p)['wins']));
  const losses = sum((p) => num(stat(p)['losses']));
  const battles = wins + losses;
  const studySec = sum((p) => num(stat(p)['studySec']));
  const readSec = sum((p) => num(stat(p)['readSec']));

  return {
    players: list.length,
    onlineNow: list.filter((p) => now - Date.parse(p.updated_at) < 3 * 60_000).length,
    activeToday: list.filter((p) => now - Date.parse(p.updated_at) < DAY).length,
    newToday: list.filter((p) => now - Date.parse(p.created_at) < DAY).length,
    newWeek: list.filter((p) => now - Date.parse(p.created_at) < 7 * DAY).length,
    studySec,
    readSec,
    sessions: sum((p) => num(stat(p)['sessions'])),
    pages: sum((p) => num(stat(p)['pages'])),
    monsters: sum((p) => num(stat(p)['discovered'])),
    totalMoney: sum((p) => num(p.money)),
    totalShards: sum((p) => num(p.shards)),
    totalTrophies: sum((p) => trophiesOf(p.stats)),
    battles,
    wins,
    losses,
    winRate: battles ? Math.round((wins / battles) * 100) : 0,
    bestStreak: Math.max(0, ...list.map((p) => num(stat(p)['streakBest']))),
    avgStudySec: list.length ? Math.round(studySec / list.length) : 0,
    avgSessions: list.length ? Math.round(sum((p) => num(stat(p)['sessions'])) / list.length) : 0,
    booksDone: sum((p) => num(stat(p)['booksDone'])),
  };
}

export async function analytics() {
  const list = await allProfiles();
  const now = new Date();
  const days: Array<{ day: string; signups: number; active: number }> = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * DAY);
    const key = d.toISOString().slice(0, 10);
    days.push({
      day: key,
      signups: list.filter((p) => p.created_at.slice(0, 10) === key).length,
      active: list.filter((p) => p.updated_at.slice(0, 10) === key).length,
    });
  }
  const levelBuckets = ["1-4", "5-9", "10-19", "20-49", "50+"];
  const levels = levelBuckets.map((label) => ({ label, count: 0 }));
  for (const p of list) {
    const l = num(p.level, 1);
    const i = l < 5 ? 0 : l < 10 ? 1 : l < 20 ? 2 : l < 50 ? 3 : 4;
    levels[i]!.count += 1;
  }
  const leagues = LEAGUES.map((l) => ({
    id: l.id,
    name: l.name,
    icon: l.icon,
    count: list.filter((p) => leagueOf(trophiesOf(p.stats)).id === l.id).length,
  }));
  const rarities = RARITY_ORDER.map((r) => ({
    rarity: r,
    count: list.reduce((a, p) => a + num(asObject(asObject(p.stats)['byRarity'])[r]), 0),
  }));
  return { days, levels, leagues, rarities, players: list.length };
}

export async function monsterStats() {
  const { data, error } = await db.from("profiles").select("monsters").limit(2000);
  if (error) throw new Error(`Banco: ${error.message}`);
  const owners: Record<string, { owners: number; copies: number; levelSum: number }> = {};
  for (const row of data ?? []) {
    const monsters = asObject((row as { monsters?: Json }).monsters);
    for (const [id, raw] of Object.entries(monsters)) {
      const m = asObject(raw);
      const slot = (owners[id] ??= { owners: 0, copies: 0, levelSum: 0 });
      slot.owners += 1;
      slot.copies += num(m['copies'], 1);
      slot.levelSum += num(m['level'], 1);
    }
  }
  const players = (data ?? []).length;
  return Object.entries(MONSTERS_BY_ID).map(([id, def]) => {
    const s = owners[id];
    return {
      id,
      name: def.name,
      rarity: def.rarity,
      owners: s?.owners ?? 0,
      copies: s?.copies ?? 0,
      avgLevel: s?.owners ? Math.round(((s.levelSum / s.owners) + Number.EPSILON) * 10) / 10 : 0,
      ownedPct: players ? Math.round(((s?.owners ?? 0) / players) * 100) : 0,
    };
  });
}

export async function rankings() {
  const list = await allProfiles();
  const stat = (p: ProfileRow) => asObject(p.stats);
  const row = (p: ProfileRow) => ({
    publicId: p.public_id,
    name: p.display_name,
    level: num(p.level, 1),
    money: num(p.money),
    shards: num(p.shards),
    trophies: trophiesOf(p.stats),
    league: leagueOf(trophiesOf(p.stats)).name,
    studySec: num(stat(p)['studySec']),
    monsters: num(stat(p)['discovered']),
    booksDone: num(stat(p)['booksDone']),
    wins: num(stat(p)['wins']),
    streak: num(stat(p)['streakBest']),
  });
  const top = (key: keyof ReturnType<typeof row>) =>
    [...list].map(row).sort((a, z) => num(z[key]) - num(a[key])).slice(0, 15);
  return {
    level: top("level"),
    trophies: top("trophies"),
    study: top("studySec"),
    monsters: top("monsters"),
    books: top("booksDone"),
    wins: top("wins"),
    money: top("money"),
  };
}

export async function searchPlayers(input: { query: string; sort: string; league: string; minLevel: number }) {
  let q = db
    .from("profiles")
    .select("user_id, public_id, display_name, level, xp, money, shards, stats, created_at, updated_at")
    .limit(200);
  if (input.query) q = q.or(`public_id.ilike.%${input.query}%,display_name.ilike.%${input.query}%`);
  if (input.minLevel > 0) q = q.gte("level", input.minLevel);
  const { data, error } = await q.order("updated_at", { ascending: false });
  if (error) throw new Error(`Banco: ${error.message}`);
  const now = Date.now();
  let rows = (data ?? []).map((raw) => {
    const p = raw as unknown as ProfileRow;
    const stat = asObject(p.stats);
    const trophies = trophiesOf(p.stats);
    return {
      publicId: p.public_id,
      name: p.display_name,
      level: num(p.level, 1),
      xp: num(p.xp),
      money: num(p.money),
      shards: num(p.shards),
      trophies,
      league: leagueOf(trophies).id,
      leagueName: leagueOf(trophies).name,
      studySec: num(stat['studySec']),
      monsters: num(stat['discovered']),
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      online: now - Date.parse(p.updated_at) < 3 * 60_000,
    };
  });
  if (input.league) rows = rows.filter((r) => r.league === input.league);
  const sorters: Record<string, (a: typeof rows[number], z: typeof rows[number]) => number> = {
    updated: (a, z) => Date.parse(z.updatedAt) - Date.parse(a.updatedAt),
    created: (a, z) => Date.parse(z.createdAt) - Date.parse(a.createdAt),
    level: (a, z) => z.level - a.level,
    trophies: (a, z) => z.trophies - a.trophies,
    money: (a, z) => z.money - a.money,
    study: (a, z) => z.studySec - a.studySec,
    name: (a, z) => a.name.localeCompare(z.name),
  };
  return rows.sort(sorters[input.sort] ?? sorters['updated']!).slice(0, 100);
}

export async function playerDetail(publicId: string) {
  const p = await loadProfile(publicId);
  const { data: saveRow } = await db
    .from("saves")
    .select("state, rev, updated_at")
    .eq("user_id", p.user_id)
    .maybeSingle();
  const state = asObject((saveRow as { state?: Json } | null)?.state);
  const { data: authUser } = await db.auth.admin.getUserById(p.user_id);
  const battle = asObject(state['battle']);
  const monsters = asObject(state['monsters']);
  const sessions = asArray<Json>(state['sessions']);
  const books = asArray<Json>(state['books']);
  const achievements = asObject(state['achievements']);
  const trophies = num(battle['trophies']);
  const { data: logs } = await db
    .from("admin_logs")
    .select("action, before_value, after_value, admin_email, created_at, success")
    .eq("target_public_id", p.public_id)
    .order("created_at", { ascending: false })
    .limit(25);
  const { data: codeUses } = await db
    .from("gift_code_uses")
    .select("code, created_at")
    .eq("user_id", p.user_id);

  return {
    publicId: p.public_id,
    name: p.display_name,
    avatar: p.avatar,
    avatarMonsterId: p.avatar_monster_id,
    email: authUser?.user?.email ?? null,
    bannedUntil: (authUser?.user as { banned_until?: string | null } | undefined)?.banned_until ?? null,
    lastSignIn: authUser?.user?.last_sign_in_at ?? null,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    hasSave: !!saveRow,
    rev: num((saveRow as { rev?: number } | null)?.rev),
    saveUpdatedAt: (saveRow as { updated_at?: string } | null)?.updated_at ?? null,
    level: num(p.level, 1),
    xp: num(p.xp),
    money: num(p.money),
    shards: num(p.shards),
    trophies,
    bestTrophies: num(battle['bestTrophies']),
    league: leagueOf(trophies).id,
    leagueName: leagueOf(trophies).name,
    wins: num(battle['wins']),
    losses: num(battle['losses']),
    streak: { current: num(p.streak_current), best: num(p.streak_best) },
    stats: asObject(p.stats),
    monsters: Object.entries(monsters).map(([id, raw]) => {
      const m = asObject(raw);
      return {
        id,
        name: MONSTERS_BY_ID[id]?.name ?? id,
        rarity: MONSTERS_BY_ID[id]?.rarity ?? "comum",
        level: num(m['level'], 1),
        copies: num(m['copies'], 1),
      };
    }),
    books: books.slice(0, 60).map((raw) => {
      const b = asObject(raw);
      return {
        title: String(b['title'] ?? ""),
        author: String(b['author'] ?? ""),
        shelf: String(b['shelf'] ?? ""),
        currentPage: num(b['currentPage']),
        totalPages: num(b['totalPages']),
      };
    }),
    achievements: Object.entries(achievements).map(([id, at]) => ({ id, at: String(at) })),
    sessionCount: sessions.length,
    recentSessions: sessions.slice(-15).reverse().map((raw) => {
      const s = asObject(raw);
      return {
        kind: String(s['kind'] ?? ""),
        at: String(s['endedAt'] ?? s['startedAt'] ?? ""),
        durationSec: num(s['durationSec']),
        subject: String(s['subject'] ?? ""),
        rarity: String(asObject(s['reward'])['rarity'] ?? ""),
      };
    }),
    battles: asArray<Json>(battle['history']).slice(0, 20).map((raw) => {
      const b = asObject(raw);
      return {
        id: String(b['id'] ?? ""),
        at: String(b['at'] ?? ""),
        mode: String(b['mode'] ?? ""),
        result: String(b['result'] ?? ""),
        opponent: String(b['opponentName'] ?? ""),
        delta: num(b['trophiesDelta']),
        before: num(b['trophiesBefore']),
        after: num(b['trophiesAfter']),
        turns: num(b['turns']),
        team: asArray<string>(b['team']),
        opponentTeam: asArray<string>(b['opponentTeam']),
      };
    }),
    redeemedCodes: asArray<string>(state['redeemedCodes']),
    codeUses: (codeUses ?? []).map((c) => ({ code: String((c as { code: string }).code), at: String((c as { created_at: string }).created_at) })),
    adminHistory: (logs ?? []).map((l) => {
      const r = l as unknown as Json;
      return {
        action: String(r['action']),
        admin: String(r['admin_email']),
        at: String(r['created_at']),
        success: !!r['success'],
        before: asObject(r['before_value']),
        after: asObject(r['after_value']),
      };
    }),
  };
}

// ------------------------------------------------------------
// Ações que gravam
// ------------------------------------------------------------
const LABELS: Record<ResourceKey, string> = {
  money: "moedas",
  shards: "fragmentos",
  xp: "XP",
  trophies: "troféus",
  streak: "streak",
  level: "nível",
};

export async function runResource(
  input: Ctx & { publicId: string; key: ResourceKey; amount: number; mode: ResourceMode },
) {
  const p = await loadProfile(input.publicId);
  if (!Number.isFinite(input.amount)) throw new Error("Quantidade inválida.");
  if (input.mode !== "set" && input.amount === 0) throw new Error("Informe uma quantidade diferente de zero.");
  return audited(
    {
      claims: input.claims,
      adminUserId: input.adminUserId,
      action: `${input.mode === "set" ? "Definir" : input.mode === "remove" ? "Remover" : "Adicionar"} ${LABELS[input.key]}`,
      category: "economy",
      target: { userId: p.user_id, publicId: p.public_id, name: p.display_name },
      details: { key: input.key, amount: input.amount, mode: input.mode },
    },
    async () => {
      const out = await mutatePlayer(p.public_id, (s) => setResourceInState(s, input.key, input.amount, input.mode));
      return { before: out.before, after: out.after, result: out };
    },
  );
}

export async function runLeague(input: Ctx & { publicId: string; leagueId: string }) {
  const p = await loadProfile(input.publicId);
  return audited(
    {
      claims: input.claims,
      adminUserId: input.adminUserId,
      action: "Alterar liga",
      category: "league",
      target: { userId: p.user_id, publicId: p.public_id, name: p.display_name },
      details: { league: input.leagueId },
    },
    async () => {
      const out = await mutatePlayer(p.public_id, (s) => setLeagueInState(s, input.leagueId));
      return { before: out.before, after: out.after, result: out };
    },
  );
}

export async function runRename(input: Ctx & { publicId: string; name: string }) {
  const p = await loadProfile(input.publicId);
  return audited(
    {
      claims: input.claims,
      adminUserId: input.adminUserId,
      action: "Alterar nome",
      target: { userId: p.user_id, publicId: p.public_id, name: p.display_name },
      details: { name: input.name },
    },
    async () => {
      const out = await mutatePlayer(p.public_id, (s) => renameInState(s, input.name));
      return { before: out.before, after: out.after, result: out };
    },
  );
}

export async function runMonster(
  input: Ctx & { publicId: string; monsterId: string; op: "give" | "remove" | "level"; level: number; copies: number },
) {
  const p = await loadProfile(input.publicId);
  const actions = { give: "Dar monstro", remove: "Remover monstro", level: "Alterar nível do monstro" };
  return audited(
    {
      claims: input.claims,
      adminUserId: input.adminUserId,
      action: actions[input.op],
      category: "monster",
      target: { userId: p.user_id, publicId: p.public_id, name: p.display_name },
      details: { monsterId: input.monsterId, level: input.level, copies: input.copies },
    },
    async () => {
      const out = await mutatePlayer(p.public_id, (s) =>
        input.op === "give"
          ? giveMonsterInState(s, input.monsterId, input.level, input.copies)
          : input.op === "level"
            ? setMonsterLevelInState(s, input.monsterId, input.level)
            : removeMonsterInState(s, input.monsterId),
      );
      return { before: out.before, after: out.after, result: out };
    },
  );
}

export async function runAchievement(input: Ctx & { publicId: string; achievementId: string; granted: boolean }) {
  const p = await loadProfile(input.publicId);
  if (!input.achievementId) throw new Error("Informe a conquista.");
  return audited(
    {
      claims: input.claims,
      adminUserId: input.adminUserId,
      action: input.granted ? "Liberar conquista" : "Remover conquista",
      category: "achievement",
      target: { userId: p.user_id, publicId: p.public_id, name: p.display_name },
      details: { achievementId: input.achievementId },
    },
    async () => {
      const out = await mutatePlayer(p.public_id, (s) =>
        grantAchievementInState(s, input.achievementId, input.granted),
      );
      return { before: out.before, after: out.after, result: out };
    },
  );
}

export async function runModeration(
  input: Ctx & { publicId: string; op: "ban" | "unban" | "reset" | "clearCodes" | "delete"; hours: number; reason: string },
) {
  const p = await loadProfile(input.publicId);
  const actions = {
    ban: "Suspender conta",
    unban: "Reativar conta",
    reset: "Zerar progresso",
    clearCodes: "Liberar códigos",
    delete: "Apagar conta",
  };
  return audited<{ ok: boolean; duration?: string }>(
    {
      claims: input.claims,
      adminUserId: input.adminUserId,
      action: actions[input.op],
      category: "moderation",
      target: { userId: p.user_id, publicId: p.public_id, name: p.display_name },
      details: { hours: input.hours, reason: input.reason },
    },
    async () => {
      if (input.op === "clearCodes") {
        const out = await mutatePlayer(p.public_id, clearCodesInState);
        await db.from("gift_code_uses").delete().eq("user_id", p.user_id);
        return { before: out.before, after: out.after, result: { ok: true } };
      }
      if (input.op === "ban" || input.op === "unban") {
        if (input.op === "ban" && p.user_id === input.adminUserId) {
          throw new Error("Você não pode suspender a própria conta.");
        }
        const duration = input.op === "unban" ? "none" : input.hours > 0 ? `${input.hours}h` : "876000h";
        const { error } = await db.auth.admin.updateUserById(p.user_id, { ban_duration: duration });
        if (error) throw new Error(error.message);
        return { details: { duration }, result: { ok: true, duration } };
      }
      if (input.op === "reset") {
        const before = summarizeState(asObject((await db.from("saves").select("state").eq("user_id", p.user_id).maybeSingle()).data?.state as Json));
        const { error: delError } = await db.from("saves").delete().eq("user_id", p.user_id);
        if (delError) throw new Error(delError.message);
        const { error: upError } = await db
          .from("profiles")
          .update({ level: 1, xp: 0, money: 0, shards: 0, monsters: {}, stats: {}, streak_current: 0 })
          .eq("user_id", p.user_id);
        if (upError) throw new Error(upError.message);
        return { before, after: {}, result: { ok: true } };
      }
      if (p.user_id === input.adminUserId) throw new Error("Use as configurações para apagar a própria conta.");
      await db.from("saves").delete().eq("user_id", p.user_id);
      await db.from("profiles").delete().eq("user_id", p.user_id);
      const { error } = await db.auth.admin.deleteUser(p.user_id);
      if (error) throw new Error(error.message);
      return { result: { ok: true } };
    },
  );
}

export async function runBulkGrant(input: Ctx & { money: number; shards: number }) {
  if (input.money === 0 && input.shards === 0) throw new Error("Informe algum valor.");
  return audited(
    {
      claims: input.claims,
      adminUserId: input.adminUserId,
      action: "Presente em massa",
      category: "economy",
      details: { money: input.money, shards: input.shards },
    },
    async () => {
      const { data } = await db.from("profiles").select("public_id").limit(1000);
      let updated = 0;
      const failed: string[] = [];
      for (const row of data ?? []) {
        const id = String((row as { public_id: string }).public_id);
        try {
          await mutatePlayer(id, (s) => {
            const withMoney = setResourceInState(s, "money", input.money, input.money < 0 ? "add" : "add");
            return setResourceInState(withMoney, "shards", input.shards, "add");
          });
          updated += 1;
        } catch {
          failed.push(id);
        }
      }
      return { after: { updated, skipped: failed.length }, result: { ok: true, updated, skipped: failed.length } };
    },
  );
}

// ------------------------------------------------------------
// Códigos
// ------------------------------------------------------------
export async function listCodes() {
  const { data, error } = await db.from("gift_codes").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`Banco: ${error.message}`);
  const { data: uses } = await db.from("gift_code_uses").select("code, public_id, created_at").limit(500);
  return {
    codes: (data ?? []) as unknown as Json[],
    uses: (uses ?? []) as unknown as Json[],
  };
}

export async function saveCode(input: { input: Json; claims: Claims; adminUserId: string }) {
  const c = input.input;
  const code = String(c['code'] ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{3,24}$/.test(code)) throw new Error("Código inválido (use 3-24 letras/números).");
  const payload = {
    code,
    label: String(c['label'] ?? "").slice(0, 60),
    money: clampInt(c['money'], 0, 100_000_000, 0),
    shards: clampInt(c['shards'], 0, 1_000_000, 0),
    xp: clampInt(c['xp'], 0, 100_000_000, 0),
    monster_id: c['monsterId'] ? String(c['monsterId']) : null,
    monster_rarity: c['monsterRarity'] ? String(c['monsterRarity']) : null,
    max_uses: c['maxUses'] === null || c['maxUses'] === undefined || c['maxUses'] === "" ? null : clampInt(c['maxUses'], 1, 1_000_000, 1),
    once_per_player: c['oncePerPlayer'] === undefined ? true : !!c['oncePerPlayer'],
    active: c['active'] === undefined ? true : !!c['active'],
    expires_at: c['expiresAt'] ? new Date(String(c['expiresAt'])).toISOString() : null,
    created_by: emailOf(input.claims),
  };
  return audited(
    { claims: input.claims, adminUserId: input.adminUserId, action: "Salvar código", category: "code", details: { code } },
    async () => {
      const { error } = await db.from("gift_codes").upsert(payload as never, { onConflict: "code" });
      if (error) throw new Error(error.message);
      const { data } = await db.from("gift_codes").select("*").eq("code", code).maybeSingle();
      return { after: (data ?? {}) as Json, result: { ok: true, code } };
    },
  );
}

export async function deleteCode(input: Ctx & { code: string }) {
  return audited(
    { claims: input.claims, adminUserId: input.adminUserId, action: "Excluir código", category: "code", details: { code: input.code } },
    async () => {
      const { error } = await db.from("gift_codes").delete().eq("code", input.code);
      if (error) throw new Error(error.message);
      return { result: { ok: true } };
    },
  );
}

// ------------------------------------------------------------
// Anúncios
// ------------------------------------------------------------
export async function listAnnouncements() {
  const { data, error } = await db.from("announcements").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(`Banco: ${error.message}`);
  return (data ?? []) as unknown as Json[];
}

export async function saveAnnouncement(input: { input: Json; claims: Claims; adminUserId: string }) {
  const a = input.input;
  const title = String(a['title'] ?? "").trim().slice(0, 80);
  if (!title) throw new Error("Informe o título do anúncio.");
  let targetUserId: string | null = null;
  const audience = String(a['audience'] ?? "all");
  const audienceValue = a['audienceValue'] ? String(a['audienceValue']) : null;
  if (audience === "player") {
    if (!audienceValue) throw new Error("Informe o ID do jogador.");
    targetUserId = (await loadProfile(audienceValue)).user_id;
  }
  const payload = {
    ...(a['id'] ? { id: String(a['id']) } : {}),
    title,
    body: String(a['body'] ?? "").slice(0, 2000),
    kind: String(a['kind'] ?? "info"),
    audience,
    audience_value: audienceValue,
    target_user_id: targetUserId,
    active: a['active'] === undefined ? true : !!a['active'],
    ends_at: a['endsAt'] ? new Date(String(a['endsAt'])).toISOString() : null,
    created_by: emailOf(input.claims),
  };
  return audited(
    { claims: input.claims, adminUserId: input.adminUserId, action: "Salvar anúncio", category: "announcement", details: { title } },
    async () => {
      const { data, error } = await db.from("announcements").upsert(payload as never).select().maybeSingle();
      if (error) throw new Error(error.message);
      return { after: (data ?? {}) as Json, result: { ok: true } };
    },
  );
}

export async function deleteAnnouncement(input: Ctx & { id: string }) {
  return audited(
    { claims: input.claims, adminUserId: input.adminUserId, action: "Excluir anúncio", category: "announcement", details: { id: input.id } },
    async () => {
      const { error } = await db.from("announcements").delete().eq("id", input.id);
      if (error) throw new Error(error.message);
      return { result: { ok: true } };
    },
  );
}

// ------------------------------------------------------------
// Configurações globais
// ------------------------------------------------------------
export const SETTINGS_KEY = "global";
export const DEFAULT_SETTINGS: Json = {
  battlesEnabled: true,
  rankedEnabled: true,
  trainingEnabled: true,
  shopEnabled: true,
  codesEnabled: true,
  signupEnabled: true,
  maintenance: false,
  maintenanceMessage: "",
  version: "1.0.0",
};

export async function getSettings() {
  const { data, error } = await db.from("game_settings").select("value, updated_at, updated_by").eq("key", SETTINGS_KEY).maybeSingle();
  if (error) throw new Error(`Banco: ${error.message}`);
  return {
    value: { ...DEFAULT_SETTINGS, ...asObject((data as { value?: Json } | null)?.value) },
    updatedAt: (data as { updated_at?: string } | null)?.updated_at ?? null,
    updatedBy: (data as { updated_by?: string } | null)?.updated_by ?? null,
  };
}

export async function saveSettings(input: { input: Json; claims: Claims; adminUserId: string }) {
  const current = await getSettings();
  const next = { ...current.value, ...input.input };
  return audited(
    { claims: input.claims, adminUserId: input.adminUserId, action: "Alterar configurações globais", category: "system" },
    async () => {
      const { error } = await db
        .from("game_settings")
        .upsert({ key: SETTINGS_KEY, value: next as never, updated_by: emailOf(input.claims) }, { onConflict: "key" });
      if (error) throw new Error(error.message);
      const fresh = await getSettings();
      return { before: current.value, after: fresh.value, result: fresh };
    },
  );
}

// ------------------------------------------------------------
// Auditoria (leitura)
// ------------------------------------------------------------
export async function listLogs(input: { publicId: string; action: string; days: number; limit: number }) {
  let q = db.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(input.limit);
  if (input.publicId) q = q.eq("target_public_id", input.publicId);
  if (input.action) q = q.ilike("action", `%${input.action}%`);
  if (input.days > 0) q = q.gte("created_at", new Date(Date.now() - input.days * DAY).toISOString());
  const { data, error } = await q;
  if (error) throw new Error(`Banco: ${error.message}`);
  return (data ?? []).map((raw) => {
    const l = raw as unknown as Json;
    return {
      id: String(l['id']),
      admin: String(l['admin_email']),
      target: String(l['target_public_id'] ?? "—"),
      targetName: String(l['target_name'] ?? ""),
      action: String(l['action']),
      category: String(l['category']),
      before: asObject(l['before_value']),
      after: asObject(l['after_value']),
      details: asObject(l['details']),
      success: !!l['success'],
      error: (l['error_message'] as string | null) ?? null,
      at: String(l['created_at']),
    };
  });
}
