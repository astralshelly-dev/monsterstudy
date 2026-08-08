import { useEffect, useSyncExternalStore } from "react";
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
} from "@/lib/game/state";
import { ACHIEVEMENTS } from "@/lib/game/achievements";
import { money as fmtMoney, duration } from "@/lib/format";

export function useGame() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useHydrated() {
  const state = useGame();
  useEffect(() => {
    hydrate();
    const offline = takeOfflineEarnings();
    if (offline) {
      toast.success("Seus monstros trabalharam enquanto você esteve fora", {
        description: `+${fmtMoney(offline.amount)} em ${duration(offline.seconds)}`,
      });
    }
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
  return isHydrated();
}
