/**
 * Funções administrativas (RPC). Cada handler:
 * 1. valida a permissão do administrador no SERVIDOR (não confia no frontend);
 * 2. aplica a alteração no banco;
 * 3. relê os dados salvos;
 * 4. registra auditoria (sucesso ou falha).
 *
 * A lógica vive em `admin.server.ts` e é carregada dentro do handler.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_EMAIL } from "./admin";

type Claims = Record<string, unknown>;
/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = Record<string, any>;

const srv = () => import("./admin.server");

const email = (claims: Claims) => String(claims['email'] ?? "").toLowerCase();
const n = (v: unknown, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);
const idOf = (v: unknown) => String(v ?? "").trim().toUpperCase();

// ------------------------------------------------------------
// Acesso
// ------------------------------------------------------------
export const adminWhoAmI = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({
    isAdmin: email(context.claims as Claims) === ADMIN_EMAIL,
    email: email(context.claims as Claims),
  }));

// ------------------------------------------------------------
// Visão geral / analytics
// ------------------------------------------------------------
export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.overview();
  });

export const adminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.analytics();
  });

export const adminMonsterStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.monsterStats();
  });

export const adminRankings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.rankings();
  });

// ------------------------------------------------------------
// Busca e ficha
// ------------------------------------------------------------
export const adminSearchPlayers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query?: string; sort?: string; league?: string; minLevel?: number }) => ({
    query: String(input?.query ?? "").trim(),
    sort: String(input?.sort ?? "updated"),
    league: String(input?.league ?? ""),
    minLevel: n(input?.minLevel),
  }))
  .handler(async ({ data, context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.searchPlayers(data);
  });

export const adminGetPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string }) => ({ publicId: idOf(input?.publicId) }))
  .handler(async ({ data, context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.playerDetail(data.publicId);
  });

// ------------------------------------------------------------
// Recursos (moedas, fragmentos, xp, troféus, streak, nível)
// ------------------------------------------------------------
export const adminSetResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      publicId: string;
      key: "money" | "shards" | "bloodCoins" | "xp" | "trophies" | "streak" | "level";
      amount: number;
      mode: "add" | "remove" | "set";
    }) => ({
      publicId: idOf(input?.publicId),
      key: input.key,
      amount: n(input?.amount),
      mode: input?.mode ?? "add",
    }),
  )
  .handler(async ({ data, context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.runResource({ ...data, claims: context.claims as Claims, adminUserId: context.userId });
  });

export const adminSetLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string; leagueId: string }) => ({
    publicId: idOf(input?.publicId),
    leagueId: String(input?.leagueId ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.runLeague({ ...data, claims: context.claims as Claims, adminUserId: context.userId });
  });

export const adminRenamePlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string; name: string }) => ({
    publicId: idOf(input?.publicId),
    name: String(input?.name ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.runRename({ ...data, claims: context.claims as Claims, adminUserId: context.userId });
  });

// ------------------------------------------------------------
// Monstros do jogador
// ------------------------------------------------------------
export const adminMonsterAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      publicId: string;
      monsterId: string;
      op: "give" | "remove" | "level";
      level?: number;
      copies?: number;
    }) => ({
      publicId: idOf(input?.publicId),
      monsterId: String(input?.monsterId ?? "").trim().toLowerCase(),
      op: input?.op ?? "give",
      level: n(input?.level, 1),
      copies: n(input?.copies, 1),
    }),
  )
  .handler(async ({ data, context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.runMonster({ ...data, claims: context.claims as Claims, adminUserId: context.userId });
  });

// ------------------------------------------------------------
// Conquistas
// ------------------------------------------------------------
export const adminSetAchievement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string; achievementId: string; granted: boolean }) => ({
    publicId: idOf(input?.publicId),
    achievementId: String(input?.achievementId ?? "").trim(),
    granted: !!input?.granted,
  }))
  .handler(async ({ data, context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.runAchievement({ ...data, claims: context.claims as Claims, adminUserId: context.userId });
  });

// ------------------------------------------------------------
// Itens, cosméticos, missões e temporadas (expansão)
// ------------------------------------------------------------
export const adminGiveItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string; itemId: string; qty: number }) => ({
    publicId: idOf(input?.publicId),
    itemId: String(input?.itemId ?? "").trim(),
    qty: Math.trunc(Number(input?.qty) || 0),
  }))
  .handler(async ({ data, context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.runItem({ ...data, claims: context.claims as Claims, adminUserId: context.userId });
  });

export const adminSetCosmetic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string; cosmeticId: string; granted: boolean }) => ({
    publicId: idOf(input?.publicId),
    cosmeticId: String(input?.cosmeticId ?? "").trim(),
    granted: !!input?.granted,
  }))
  .handler(async ({ data, context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.runCosmetic({ ...data, claims: context.claims as Claims, adminUserId: context.userId });
  });

export const adminProgressOp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string; op: "completeQuests" | "resetSeason" }) => ({
    publicId: idOf(input?.publicId),
    op: input?.op === "resetSeason" ? ("resetSeason" as const) : ("completeQuests" as const),
  }))
  .handler(async ({ data, context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.runProgressOp({ ...data, claims: context.claims as Claims, adminUserId: context.userId });
  });

// ------------------------------------------------------------
// Moderação
// ------------------------------------------------------------
export const adminModerate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      publicId: string;
      op: "ban" | "unban" | "reset" | "clearCodes" | "delete";
      hours?: number;
      reason?: string;
    }) => ({
      publicId: idOf(input?.publicId),
      op: input?.op ?? "ban",
      hours: Math.max(0, n(input?.hours)),
      reason: String(input?.reason ?? "").slice(0, 240),
    }),
  )
  .handler(async ({ data, context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.runModeration({ ...data, claims: context.claims as Claims, adminUserId: context.userId });
  });

export const adminBulkGrant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { money?: number; shards?: number }) => ({
    money: n(input?.money),
    shards: n(input?.shards),
  }))
  .handler(async ({ data, context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.runBulkGrant({ ...data, claims: context.claims as Claims, adminUserId: context.userId });
  });

// ------------------------------------------------------------
// Códigos promocionais
// ------------------------------------------------------------
export const adminListCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.listCodes();
  });

export const adminSaveCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Json) => input)
  .handler(async ({ data, context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.saveCode({ input: data, claims: context.claims as Claims, adminUserId: context.userId });
  });

export const adminDeleteCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => ({ code: String(input?.code ?? "").trim().toUpperCase() }))
  .handler(async ({ data, context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.deleteCode({ ...data, claims: context.claims as Claims, adminUserId: context.userId });
  });

// ------------------------------------------------------------
// Anúncios
// ------------------------------------------------------------
export const adminListAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.listAnnouncements();
  });

export const adminSaveAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Json) => input)
  .handler(async ({ data, context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.saveAnnouncement({ input: data, claims: context.claims as Claims, adminUserId: context.userId });
  });

export const adminDeleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data, context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.deleteAnnouncement({ ...data, claims: context.claims as Claims, adminUserId: context.userId });
  });

// ------------------------------------------------------------
// Configurações globais
// ------------------------------------------------------------
export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.getSettings();
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Json) => input)
  .handler(async ({ data, context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.saveSettings({ input: data, claims: context.claims as Claims, adminUserId: context.userId });
  });

// ------------------------------------------------------------
// Auditoria
// ------------------------------------------------------------
export const adminLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId?: string; action?: string; days?: number; limit?: number }) => ({
    publicId: idOf(input?.publicId),
    action: String(input?.action ?? ""),
    days: n(input?.days, 30),
    limit: Math.min(300, Math.max(10, n(input?.limit, 100))),
  }))
  .handler(async ({ data, context }) => {
    const A = await srv();
    A.assertAdmin(context.claims as Claims);
    return A.listLogs(data);
  });
