import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  getServerSnapshot,
  getSnapshot,
  hydrate,
  isHydrated,
  subscribe,
  ensureDailyQuests,
  takeAchievementQueue,
  takeCosmeticQueue,
  takeItemQueue,
  takeOfflineEarnings,
  tickMoney,
  type OfflineEarnings,
} from "@/lib/game/state";
import { ACHIEVEMENTS } from "@/lib/game/achievements";
import { ITEM_RARITY_BY_ID } from "@/lib/game/items";
import { COSMETICS_BY_ID } from "@/lib/game/cosmetics";
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
    ensureDailyQuests();
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
  useEffect(() => {
    for (const item of takeItemQueue()) {
      toast.success(`${item.icon} Item encontrado: ${item.name}`, {
        description: `${ITEM_RARITY_BY_ID[item.rarity].name} · veja no Inventário`,
      });
    }
    for (const id of takeCosmeticQueue()) {
      const c = COSMETICS_BY_ID[id];
      if (c) {
        toast.success(`${c.icon} Cosmético desbloqueado: ${c.name}`, {
          description: "Equipe no seu Perfil",
        });
      }
    }
  }, [state]);
  return { hydrated: isHydrated(), offline, dismissOffline: () => setOffline(null) };
}

