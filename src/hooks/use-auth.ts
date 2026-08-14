import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
type CloudSyncValue = {
  publicId: string | null;
  ready: boolean;
  user: ReturnType<typeof useAuth>["user"];
  saveNow: () => Promise<boolean>;
};

const CloudSyncContext = createContext<CloudSyncValue | null>(null);

function useCloudSyncController(): CloudSyncValue {
  const { user, loading } = useAuth();
  useGame();
  const [publicId, setPublicId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const saving = useRef<Promise<void> | null>(null);
  const saveAgain = useRef(false);

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (!user || !ready) return false;
    if (saving.current) {
      saveAgain.current = true;
      await saving.current;
      return true;
    }
    do {
      saveAgain.current = false;
      const request = pushToCloud(user.id);
      saving.current = request;
      try {
        await request;
      } catch (error) {
        console.error("Falha ao salvar progresso", error);
        return false;
      } finally {
        saving.current = null;
      }
    } while (saveAgain.current);
    return true;
  }, [ready, user]);

  useEffect(() => {
    if (loading) return;

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
    void (async () => {
      try {
        const previousOwner = owner();
        // save de outra conta no dispositivo: descarta antes de carregar esta
        if (previousOwner && previousOwner !== user.id) resetProgress();
        const result = await pullFromCloud(user.id, {
          force: previousOwner !== user.id,
          preferNewest: previousOwner === user.id,
        });
        if (result === "local-newer" || result === "missing") await pushToCloud(user.id);
        const id = await myPublicId(user.id);
        if (cancelled) return;
        window.localStorage.setItem(OWNER_KEY, user.id);
        setPublicId(id);
        setReady(true);
      } catch (error) {
        console.error("Falha ao sincronizar progresso", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  useEffect(() => {
    if (!user || !ready) return;
    const id = window.setInterval(() => void saveNow(), 3000);
    const flush = () => {
      if (document.visibilityState === "hidden") void saveNow();
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    void saveNow();
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
      void saveNow();
    };
  }, [user, ready, saveNow]);

  return { publicId, ready, user, saveNow };
}

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const value = useCloudSyncController();
  return createElement(CloudSyncContext.Provider, { value }, children);
}

export function useCloudSync(): CloudSyncValue {
  const value = useContext(CloudSyncContext);
  if (!value) throw new Error("useCloudSync precisa estar dentro de CloudSyncProvider");
  return value;
}
