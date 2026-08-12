import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Aplica o efeito da batalha assíncrona no oponente real: ele ganha/perde
 * 70% dos troféus que o jogador ganhou/perdeu (invertido).
 */
export const applyOpponentTrophies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { publicId: string; playerDelta: number }) => {
    const publicId = String(input.publicId ?? "").trim().toUpperCase();
    const playerDelta = Number(input.playerDelta);
    if (!publicId || !Number.isFinite(playerDelta)) throw new Error("Invalid input");
    return { publicId, playerDelta };
  })
  .handler(async ({ data, context }) => {
    const opponentDelta = -Math.round(data.playerDelta * 0.7);
    if (opponentDelta === 0) return { ok: true, applied: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("profiles")
      .select("user_id, stats")
      .eq("public_id", data.publicId)
      .maybeSingle();
    if (!row || row.user_id === context.userId) return { ok: true, applied: 0 };

    const stats = (row.stats ?? {}) as Record<string, unknown>;
    const before = Number(stats['trophies'] ?? 0);
    const after = Math.max(0, before + opponentDelta);
    const nextStats = {
      ...stats,
      trophies: after,
      bestTrophies: Math.max(Number(stats['bestTrophies'] ?? 0), after),
      wins: Number(stats['wins'] ?? 0) + (opponentDelta > 0 ? 1 : 0),
      losses: Number(stats['losses'] ?? 0) + (opponentDelta < 0 ? 1 : 0),
      battles: Number(stats['battles'] ?? 0) + 1,
    };
    await supabaseAdmin
      .from("profiles")
      .update({ stats: nextStats })
      .eq("user_id", row.user_id);
    return { ok: true, applied: opponentDelta };
  });
