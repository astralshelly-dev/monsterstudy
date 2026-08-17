/**
 * Sistema de amigos (RPC). Todas as operações validam o usuário no servidor
 * pelo bearer token e usam RLS (`context.supabase`), nunca o cliente admin.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const idOf = (v: unknown) => String(v ?? "").trim().toUpperCase();

const PROFILE_COLS =
  "user_id, public_id, display_name, avatar, avatar_monster_id, level, xp, money, shards, streak_current, streak_best, monsters, stats, activity, trophy_log, updated_at";

export type FriendEdge = {
  id: string;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing";
  createdAt: string;
  profile: Record<string, unknown> | null;
};

/** lista amigos aceitos + pedidos recebidos/enviados, já com o perfil público */
export const listFriends = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status, created_at")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const list = rows ?? [];
    const otherIds = Array.from(
      new Set(list.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id))),
    );
    let profiles: Record<string, Record<string, unknown>> = {};
    if (otherIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select(PROFILE_COLS).in("user_id", otherIds);
      profiles = Object.fromEntries(
        (profs ?? []).map((p) => [String((p as Record<string, unknown>)['user_id']), p as Record<string, unknown>]),
      );
    }

    const edges: FriendEdge[] = list.map((r) => {
      const otherId = r.requester_id === userId ? r.addressee_id : r.requester_id;
      return {
        id: r.id,
        status: r.status === "accepted" ? "accepted" : "pending",
        direction: r.requester_id === userId ? "outgoing" : "incoming",
        createdAt: r.created_at,
        profile: profiles[otherId] ?? null,
      };
    });

    return {
      friends: edges.filter((e) => e.status === "accepted"),
      incoming: edges.filter((e) => e.status === "pending" && e.direction === "incoming"),
      outgoing: edges.filter((e) => e.status === "pending" && e.direction === "outgoing"),
    };
  });

/** envia pedido de amizade pelo ID público */
export const sendFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string }) => ({ publicId: idOf(input?.publicId) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.publicId) return { ok: false, message: "Informe um ID de jogador." };

    const { data: target } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .eq("public_id", data.publicId)
      .maybeSingle();
    if (!target) return { ok: false, message: "Jogador não encontrado." };
    if (target.user_id === userId) return { ok: false, message: "Esse é o seu próprio ID." };

    const { data: existing } = await supabase
      .from("friendships")
      .select("id, status, requester_id, addressee_id")
      .or(
        `and(requester_id.eq.${userId},addressee_id.eq.${target.user_id}),and(requester_id.eq.${target.user_id},addressee_id.eq.${userId})`,
      )
      .maybeSingle();

    if (existing) {
      if (existing.status === "accepted") return { ok: false, message: "Vocês já são amigos." };
      if (existing.requester_id === userId) return { ok: false, message: "Pedido já enviado." };
      // já existe pedido dele para mim: aceitar direto
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
      return { ok: true, message: `Vocês agora são amigos de ${target.display_name}!` };
    }

    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: userId, addressee_id: target.user_id, status: "pending" });
    if (error) throw error;
    return { ok: true, message: `Pedido enviado para ${target.display_name}.` };
  });

/** aceita ou recusa um pedido recebido */
export const respondFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; accept: boolean }) => ({
    id: String(input?.id ?? ""),
    accept: Boolean(input?.accept),
  }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (!data.id) return { ok: false, message: "Pedido inválido." };
    if (data.accept) {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", data.id);
      if (error) throw error;
      return { ok: true, message: "Pedido aceito." };
    }
    const { error } = await supabase.from("friendships").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true, message: "Pedido recusado." };
  });

/** remove uma amizade (ou cancela um pedido enviado) */
export const removeFriend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data, context }) => {
    if (!data.id) return { ok: false, message: "Amizade inválida." };
    const { error } = await context.supabase.from("friendships").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true, message: "Removido." };
  });

/** perfil público completo (meu ou de outro jogador) para a comparação */
export const compareProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string }) => ({ publicId: idOf(input?.publicId) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [mine, theirs] = await Promise.all([
      supabase.from("profiles").select(PROFILE_COLS).eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select(PROFILE_COLS).eq("public_id", data.publicId).maybeSingle(),
    ]);
    return {
      me: (mine.data as Record<string, unknown> | null) ?? null,
      other: (theirs.data as Record<string, unknown> | null) ?? null,
    };
  });
