import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  getServerSnapshot,
  getSnapshot,
  hydrate,
  isHydrated,
  subscribe,
  takeAchievementQueue,
  takeOfflineEarnings,
  tickMoney,
  type OfflineEarnings,
} from "@/lib/game/state";
import { ACHIEVEMENTS } from "@/lib/game/achievements";
import { money as fmtMoney } from "@/lib/format";

export function useGame() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useHydrated() {
  const state = useGame();
  const [offline, setOffline] = useState<OfflineEarnings>(null);
  useEffect(() => {
    hydrate();
    setOffline(takeOfflineEarnings());
  }, []);
  useEffect(() => {
    const id = setInterval(() => tickMoney(1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const q = takeAchievementQueue();
    for (const id of q) {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (a) {
        toast.success(`${a.icon} Conquista desbloqueada: ${a.name}`, {
          description: `${a.description} · +${fmtMoney(a.reward)}`,
        });
      }
    }
  }, [state]);
  return { hydrated: isHydrated(), offline, dismissOffline: () => setOffline(null) };
}

