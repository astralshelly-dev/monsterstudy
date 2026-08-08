import { useEffect, useState } from "react";
import { TIMERS, RARITIES } from "@/lib/game/config";
import { rarityChances } from "@/lib/game/state";
import { useGame } from "@/hooks/use-game";
import { cn } from "@/lib/utils";
import { rarityText } from "./MonsterArt";

/** força re-render a cada segundo */
export function useTick(active = true) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setN((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [active]);
}

export function TimerPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (minutes: number) => void;
}) {
  const state = useGame();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {TIMERS.map((t) => {
        const unlocked = state.unlockedTimers.includes(t.minutes);
        const chances = rarityChances(t.minutes, state.upgrades.lucky_charm);
        if (!unlocked) return null;
        return (
          <button
            key={t.minutes}
            type="button"
            onClick={() => onChange(t.minutes)}
            className={cn(
              "panel panel-hover p-4 text-left",
              value === t.minutes && "ring-2 ring-primary",
            )}
          >
            <p className="font-display text-xl font-bold">{t.label}</p>
            <div className="mt-2 space-y-1">
              {chances.map((c) => (
                <div key={c.rarity} className="flex items-center justify-between text-[11px]">
                  <span className={rarityText(c.rarity)}>{RARITIES[c.rarity].name}</span>
                  <span className="text-muted-foreground tabular-nums">{c.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </button>
        );
      })}
      <LockedHint />
    </div>
  );
}

function LockedHint() {
  const state = useGame();
  const locked = TIMERS.filter((t) => !state.unlockedTimers.includes(t.minutes));
  if (locked.length === 0) return null;
  return (
    <div className="panel grid place-items-center p-4 text-center text-xs text-muted-foreground">
      🔒 {locked.length} cronômetros maiores disponíveis na Loja
      <span className="mt-1 block">Sessões longas = raridades muito melhores</span>
    </div>
  );
}
