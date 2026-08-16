import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Único e-mail com acesso ao painel administrativo. */
export const ADMIN_EMAIL = "yoshrokmohamedd@gmail.com";

type Claims = Record<string, unknown>;

function emailOf(claims: Claims): string {
  return String(claims['email'] ?? "").toLowerCase();
}

function assertAdmin(claims: Claims) {
  if (emailOf(claims) !== ADMIN_EMAIL) throw new Error("Forbidden");
}

type AdminDb = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<AdminDb> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function normId(v: unknown): string {
  return String(v ?? "").trim().toUpperCase();
}

async function findProfile(db: AdminDb, publicId: string) {
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("public_id", publicId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Jogador não encontrado para esse ID.");
  return data;
}

/** aplica uma alteração no save (JSON) do jogador, marcando como recém-modificado */
async function patchSave(
  db: AdminDb,
  userId: string,
  patch: (state: Record<string, unknown>) => Record<string, unknown>,
) {
  const { data } = await db.from("saves").select("state").eq("user_id", userId).maybeSingle();
  const state = (data?.state ?? null) as Record<string, unknown> | null;
  if (!state || typeof state !== "object") return false;
  const next = { ...patch(state), lastModifiedAt: Date.now() };
  const { error } = await db.from("saves").update({ state: next }).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return true;
}

const num = (v: unknown, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

// ------------------------------------------------------------
// Acesso
// ------------------------------------------------------------
export const adminWhoAmI = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({
    isAdmin: emailOf(context.claims as Claims) === ADMIN_EMAIL,
    email: emailOf(context.claims as Claims),
  }));

// ------------------------------------------------------------
// Visão geral
// ------------------------------------------------------------
export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.claims as Claims);
    const db = await admin();
    const { data: profiles } = await db
      .from("profiles")
      .select("public_id, display_name, level, money, shards, stats, updated_at, created_at")
      .order("updated_at", { ascending: false })
      .limit(500);
    const list = profiles ?? [];
    const trophies = (p: (typeof list)[number]) =>
      num((p.stats as Record<string, unknown> | null)?.['trophies']);
    const dayAgo = Date.now() - 86_400_000;
    return {
      players: list.length,
      activeToday: list.filter((p) => new Date(p.updated_at).getTime() > dayAgo).length,
      totalMoney: list.reduce((a, p) => a + num(p.money), 0),
      totalShards: list.reduce((a, p) => a + num(p.shards), 0),
      topLevel: [...list].sort((a, z) => num(z.level) - num(a.level)).slice(0, 10).map((p) => ({
        publicId: p.public_id,
        name: p.display_name,
        level: num(p.level),
      })),
      topTrophies: [...list].sort((a, z) => trophies(z) - trophies(a)).slice(0, 10).map((p) => ({
        publicId: p.public_id,
        name: p.display_name,
        trophies: trophies(p),
      })),
      recent: list.slice(0, 20).map((p) => ({
        publicId: p.public_id,
        name: p.display_name,
        level: num(p.level),
        money: num(p.money),
        shards: num(p.shards),
        trophies: trophies(p),
        updatedAt: p.updated_at,
      })),
    };
  });

// ------------------------------------------------------------
// Busca e detalhes
// ------------------------------------------------------------
export const adminSearchPlayers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query?: string }) => ({ query: String(input?.query ?? "").trim() }))
  .handler(async ({ data, context }) => {
    assertAdmin(context.claims as Claims);
    const db = await admin();
    let q = db
      .from("profiles")
      .select("public_id, display_name, level, money, shards, stats, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (data.query) {
      q = q.or(`public_id.ilike.%${data.query}%,display_name.ilike.%${data.query}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((p) => ({
      publicId: p.public_id,
      name: p.display_name,
      level: num(p.level),
      money: num(p.money),
      shards: num(p.shards),
      trophies: num((p.stats as Record<string, unknown> | null)?.['trophies']),
      updatedAt: p.updated_at,
    }));
  });

export const adminGetPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string }) => ({ publicId: normId(input?.publicId) }))
  .handler(async ({ data, context }) => {
    assertAdmin(context.claims as Claims);
    const db = await admin();
    const p = await findProfile(db, data.publicId);
    const { data: save } = await db.from("saves").select("state, updated_at").eq("user_id", p.user_id).maybeSingle();
    const { data: authUser } = await db.auth.admin.getUserById(p.user_id);
    const state = (save?.state ?? null) as Record<string, unknown> | null;
    const monsters = (state?.['monsters'] ?? {}) as Record<string, { level?: number; copies?: number }>;
    const battle = (state?.['battle'] ?? {}) as Record<string, unknown>;
    return {
      publicId: p.public_id,
      name: p.display_name,
      avatar: p.avatar,
      level: num(p.level),
      xp: num(p.xp),
      money: num(p.money),
      shards: num(p.shards),
      streak: { current: num(p.streak_current), best: num(p.streak_best) },
      stats: (JSON.parse(JSON.stringify(p.stats ?? {})) as Record<string, number | string>),
      trophies: num(battle['trophies'] ?? (p.stats as Record<string, unknown> | null)?.['trophies']),
      wins: num(battle['wins']),
      losses: num(battle['losses']),
      email: authUser?.user?.email ?? null,
      bannedUntil: (authUser?.user as { banned_until?: string | null } | undefined)?.banned_until ?? null,
      lastSignIn: authUser?.user?.last_sign_in_at ?? null,
      createdAt: p.created_at,
      hasSave: !!state,
      saveUpdatedAt: save?.updated_at ?? null,
      monsterCount: Object.keys(monsters).length,
      monsters: Object.entries(monsters).map(([id, m]) => ({
        id,
        level: num(m?.level, 1),
        copies: num(m?.copies, 1),
      })),
      sessions: Array.isArray(state?.['sessions']) ? (state!['sessions'] as unknown[]).length : 0,
      books: Array.isArray(state?.['books']) ? (state!['books'] as unknown[]).length : 0,
      redeemedCodes: Array.isArray(state?.['redeemedCodes']) ? (state!['redeemedCodes'] as string[]) : [],
    };
  });

// ------------------------------------------------------------
// Recursos (moedas, fragmentos, xp, troféus)
// ------------------------------------------------------------
export const adminGrantResources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      publicId: string;
      money?: number;
      shards?: number;
      xp?: number;
      trophies?: number;
      mode?: "add" | "set";
    }) => ({
      publicId: normId(input?.publicId),
      money: num(input?.money),
      shards: num(input?.shards),
      xp: num(input?.xp),
      trophies: num(input?.trophies),
      mode: input?.mode === "set" ? ("set" as const) : ("add" as const),
    }),
  )
  .handler(async ({ data, context }) => {
    assertAdmin(context.claims as Claims);
    const db = await admin();
    const p = await findProfile(db, data.publicId);
    const apply = (current: number, delta: number) =>
      data.mode === "set" ? Math.max(0, delta) : Math.max(0, current + delta);

    const money = apply(num(p.money), data.money);
    const shards = apply(num(p.shards), data.shards);
    const xp = apply(num(p.xp), data.xp);
    const stats = (p.stats ?? {}) as Record<string, unknown>;
    const trophies = apply(num(stats['trophies']), data.trophies);

    await db
      .from("profiles")
      .update({
        money,
        shards,
        xp,
        stats: { ...stats, trophies, bestTrophies: Math.max(num(stats['bestTrophies']), trophies) },
      })
      .eq("user_id", p.user_id);

    await patchSave(db, p.user_id, (s) => {
      const profile = (s['profile'] ?? {}) as Record<string, unknown>;
      const battle = (s['battle'] ?? {}) as Record<string, unknown>;
      return {
        ...s,
        money: apply(num(s['money']), data.money),
        shards: apply(num(s['shards']), data.shards),
        profile: { ...profile, xp: apply(num(profile['xp']), data.xp) },
        battle: {
          ...battle,
          trophies: apply(num(battle['trophies']), data.trophies),
          bestTrophies: Math.max(num(battle['bestTrophies']), apply(num(battle['trophies']), data.trophies)),
        },
      };
    });
    return { ok: true, money, shards, xp, trophies };
  });

export const adminSetLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string; level: number }) => ({
    publicId: normId(input?.publicId),
    level: Math.max(1, Math.min(999, Math.round(num(input?.level, 1)))),
  }))
  .handler(async ({ data, context }) => {
    assertAdmin(context.claims as Claims);
    const db = await admin();
    const p = await findProfile(db, data.publicId);
    await db.from("profiles").update({ level: data.level }).eq("user_id", p.user_id);
    await patchSave(db, p.user_id, (s) => ({
      ...s,
      profile: { ...((s['profile'] ?? {}) as Record<string, unknown>), level: data.level },
    }));
    return { ok: true, level: data.level };
  });

export const adminRenamePlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string; name: string }) => ({
    publicId: normId(input?.publicId),
    name: String(input?.name ?? "").trim().slice(0, 24),
  }))
  .handler(async ({ data, context }) => {
    assertAdmin(context.claims as Claims);
    if (!data.name) throw new Error("Nome inválido.");
    const db = await admin();
    const p = await findProfile(db, data.publicId);
    await db.from("profiles").update({ display_name: data.name }).eq("user_id", p.user_id);
    await patchSave(db, p.user_id, (s) => ({
      ...s,
      profile: { ...((s['profile'] ?? {}) as Record<string, unknown>), name: data.name },
    }));
    return { ok: true, name: data.name };
  });

// ------------------------------------------------------------
// Monstros
// ------------------------------------------------------------
export const adminGiveMonster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string; monsterId: string; level?: number; copies?: number }) => ({
    publicId: normId(input?.publicId),
    monsterId: String(input?.monsterId ?? "").trim().toLowerCase(),
    level: Math.max(1, Math.min(10, Math.round(num(input?.level, 1)))),
    copies: Math.max(1, Math.min(99, Math.round(num(input?.copies, 1)))),
  }))
  .handler(async ({ data, context }) => {
    assertAdmin(context.claims as Claims);
    if (!data.monsterId) throw new Error("Informe o id do monstro.");
    const db = await admin();
    const p = await findProfile(db, data.publicId);
    const ok = await patchSave(db, p.user_id, (s) => {
      const monsters = { ...((s['monsters'] ?? {}) as Record<string, Record<string, unknown>>) };
      const prev = monsters[data.monsterId];
      monsters[data.monsterId] = {
        id: data.monsterId,
        copies: num(prev?.['copies']) + data.copies,
        level: Math.max(data.level, num(prev?.['level'], 1)),
        xp: num(prev?.['xp']),
        discoveredAt: String(prev?.['discoveredAt'] ?? new Date().toISOString()),
      };
      return { ...s, monsters };
    });
    if (!ok) throw new Error("Esse jogador ainda não tem save na nuvem.");
    return { ok: true };
  });

export const adminRemoveMonster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string; monsterId: string }) => ({
    publicId: normId(input?.publicId),
    monsterId: String(input?.monsterId ?? "").trim().toLowerCase(),
  }))
  .handler(async ({ data, context }) => {
    assertAdmin(context.claims as Claims);
    const db = await admin();
    const p = await findProfile(db, data.publicId);
    await patchSave(db, p.user_id, (s) => {
      const monsters = { ...((s['monsters'] ?? {}) as Record<string, unknown>) };
      delete monsters[data.monsterId];
      const income = (Array.isArray(s['incomeMonsterIds']) ? s['incomeMonsterIds'] : []) as string[];
      return {
        ...s,
        monsters,
        incomeMonsterIds: income.filter((id) => id !== data.monsterId),
        activeMonsterId: s['activeMonsterId'] === data.monsterId ? null : s['activeMonsterId'],
      };
    });
    return { ok: true };
  });

// ------------------------------------------------------------
// Moderação
// ------------------------------------------------------------
export const adminBanPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string; hours?: number }) => ({
    publicId: normId(input?.publicId),
    hours: Math.max(0, Math.round(num(input?.hours, 0))),
  }))
  .handler(async ({ data, context }) => {
    assertAdmin(context.claims as Claims);
    const db = await admin();
    const p = await findProfile(db, data.publicId);
    if (p.user_id === context.userId) throw new Error("Você não pode banir a própria conta.");
    const duration = data.hours > 0 ? `${data.hours}h` : "876000h";
    const { error } = await db.auth.admin.updateUserById(p.user_id, { ban_duration: duration });
    if (error) throw new Error(error.message);
    return { ok: true, duration };
  });

export const adminUnbanPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string }) => ({ publicId: normId(input?.publicId) }))
  .handler(async ({ data, context }) => {
    assertAdmin(context.claims as Claims);
    const db = await admin();
    const p = await findProfile(db, data.publicId);
    const { error } = await db.auth.admin.updateUserById(p.user_id, { ban_duration: "none" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminResetPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string }) => ({ publicId: normId(input?.publicId) }))
  .handler(async ({ data, context }) => {
    assertAdmin(context.claims as Claims);
    const db = await admin();
    const p = await findProfile(db, data.publicId);
    await db.from("saves").delete().eq("user_id", p.user_id);
    await db
      .from("profiles")
      .update({ level: 1, xp: 0, money: 0, shards: 0, monsters: {}, stats: {}, streak_current: 0 })
      .eq("user_id", p.user_id);
    return { ok: true };
  });

export const adminClearCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string }) => ({ publicId: normId(input?.publicId) }))
  .handler(async ({ data, context }) => {
    assertAdmin(context.claims as Claims);
    const db = await admin();
    const p = await findProfile(db, data.publicId);
    await patchSave(db, p.user_id, (s) => ({ ...s, redeemedCodes: [] }));
    return { ok: true };
  });

export const adminDeleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string }) => ({ publicId: normId(input?.publicId) }))
  .handler(async ({ data, context }) => {
    assertAdmin(context.claims as Claims);
    const db = await admin();
    const p = await findProfile(db, data.publicId);
    if (p.user_id === context.userId) throw new Error("Use as configurações para apagar a própria conta.");
    await db.from("saves").delete().eq("user_id", p.user_id);
    await db.from("profiles").delete().eq("user_id", p.user_id);
    const { error } = await db.auth.admin.deleteUser(p.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------------------------------------------------------
// Ações em massa
// ------------------------------------------------------------
export const adminBulkGrant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { money?: number; shards?: number }) => ({
    money: num(input?.money),
    shards: num(input?.shards),
  }))
  .handler(async ({ data, context }) => {
    assertAdmin(context.claims as Claims);
    if (data.money === 0 && data.shards === 0) throw new Error("Informe algum valor.");
    const db = await admin();
    const { data: rows } = await db.from("profiles").select("user_id, money, shards").limit(1000);
    let updated = 0;
    for (const r of rows ?? []) {
      await db
        .from("profiles")
        .update({
          money: Math.max(0, num(r.money) + data.money),
          shards: Math.max(0, num(r.shards) + data.shards),
        })
        .eq("user_id", r.user_id);
      await patchSave(db, r.user_id, (s) => ({
        ...s,
        money: Math.max(0, num(s['money']) + data.money),
        shards: Math.max(0, num(s['shards']) + data.shards),
      }));
      updated += 1;
    }
    return { ok: true, updated };
  });
