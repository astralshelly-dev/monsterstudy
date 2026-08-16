import { MonsterArt, RarityBadge } from "@/components/game/MonsterArt";
import { MONSTERS_BY_ID } from "@/lib/game/monsters";
import { battleStats, abilityFor, TEAM_SIZE } from "@/lib/game/battle/config";
import { cn } from "@/lib/utils";
import type { GameState } from "@/lib/game/types";
import { EmptyState } from "@/components/game/Primitives";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export function TeamPicker({
  state,
  selected,
  onToggle,
}: {
  state: GameState;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const owned = Object.values(state.monsters)
    .map((m) => ({ owned: m, def: MONSTERS_BY_ID[m.id] }))
    .filter((x) => x.def);

  if (owned.length === 0) {
    return (
      <EmptyState
        icon="🥚"
        title="Você ainda não tem monstros"
        description="Complete uma sessão de estudo ou leitura para capturar sua primeira criatura e então partir para as batalhas."
        action={
          <Button asChild>
            <Link to="/estudar">Estudar agora</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Escolha até {TEAM_SIZE} monstros ({selected.length}/{TEAM_SIZE} selecionados). Só é possível
        usar criaturas que você já capturou.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {owned.map(({ owned: m, def }) => {
          const s = battleStats(def!.rarity, m.level, m.id);
          const ab = abilityFor(m.id);
          const on = selected.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onToggle(m.id)}
              className={cn(
                "panel flex gap-3 p-3 text-left transition-all",
                on ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border",
              )}
            >
              <MonsterArt art={def!.art} rarity={def!.rarity} size="sm" animate={false} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-display text-sm font-bold">{def!.name}</p>
                  {on && <span className="text-xs text-primary">✓</span>}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <RarityBadge rarity={def!.rarity} />
                  <span className="text-[11px] text-muted-foreground">Nv {m.level}</span>
                </div>
                <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                  ❤️ {s.maxHp} · ⚔️ {s.atk} · 🛡️ {s.def}
                </p>
                <p className="mt-1 text-[11px] text-foreground/80">
                  {ab.icon} <span className="font-semibold">{ab.name}</span>{" "}
                  <span className="text-muted-foreground">(cada {ab.cooldown} turnos)</span>
                </p>
                <p className="text-[11px] text-muted-foreground">{ab.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
