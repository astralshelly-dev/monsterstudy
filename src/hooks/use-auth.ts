import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { myPublicId, pullFromCloud, pushToCloud } from "@/lib/game/cloud";
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

/** sincroniza o save local com a nuvem enquanto estiver logado */
export function useCloudSync() {
  const { user } = useAuth();
  const state = useGame();
  const [publicId, setPublicId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      setReady(false);
      setPublicId(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      await pullFromCloud(user.id);
      const id = await myPublicId(user.id);
      if (cancelled) return;
      setPublicId(id);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !ready) return;
    const id = setTimeout(() => void pushToCloud(user.id), 2500);
    return () => clearTimeout(id);
  }, [user, ready, state]);

  return { publicId, ready, user };
}
