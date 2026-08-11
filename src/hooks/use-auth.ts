import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { myPublicId, pullFromCloud, pushToCloud } from "@/lib/game/cloud";
import { resetProgress } from "@/lib/game/state";
import { useGame } from "@/hooks/use-game";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    void supabase.auth.getSession().then(({ data: d }) => {
      setSession(d.session);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

/** qual conta é dona do save local */
const OWNER_KEY = "monster-study:owner";

function owner(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(OWNER_KEY);
}

/**
 * Vincula o save local à conta logada:
 * - ao entrar, baixa o perfil daquela conta (ou adota o save atual, se a conta é nova);
 * - ao sair, limpa todas as informações locais;
 * - ao entrar de novo, tudo volta da nuvem.
 */
export function useCloudSync() {
  const { user, loading } = useAuth();
  const state = useGame();
  const [publicId, setPublicId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    if (loading || busy.current) return;

    if (!user) {
      // saiu da conta (ou sessão expirou): nada da conta fica no dispositivo
      if (owner()) {
        window.localStorage.removeItem(OWNER_KEY);
        resetProgress();
      }
      setReady(false);
      setPublicId(null);
      return;
    }

    let cancelled = false;
    busy.current = true;
    void (async () => {
      try {
        const previousOwner = owner();
        // save de outra conta no dispositivo: descarta antes de carregar esta
        if (previousOwner && previousOwner !== user.id) resetProgress();
        await pullFromCloud(user.id, { force: true });
        const id = await myPublicId(user.id);
        if (cancelled) return;
        window.localStorage.setItem(OWNER_KEY, user.id);
        setPublicId(id);
        setReady(true);
      } finally {
        busy.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  useEffect(() => {
    if (!user || !ready) return;
    const id = setTimeout(() => void pushToCloud(user.id), 2500);
    return () => clearTimeout(id);
  }, [user, ready, state]);

  return { publicId, ready, user };
}
