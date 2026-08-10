import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useGame } from "@/hooks/use-game";
import { MONSTERS, MONSTERS_BY_ID } from "@/lib/game/monsters";
import { HABITATS, RARITIES, RARITY_ORDER, type HabitatId, type RarityId } from "@/lib/game/config";
import { PageHeader } from "@/components/game/Primitives";
import { MonsterCard } from "@/components/game/MonsterCard";
import { MonsterArt, RarityBadge } from "@/components/game/MonsterArt";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { money, num } from "@/lib/format";
import { monsterProgress, setActiveMonster } from "@/lib/game/state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/monsterdex")({
  head: () => ({
    meta: [
      { title: "MonsterDex — Monster Study" },
      {
        name: "description",
        content:
          "Sua coleção completa de criaturas: raridades, habitats e monstros ainda não descobertos.",
      },
      { property: "og:title", content: "MonsterDex — Monster Study" },
      {
        property: "og:description",
        content: "Descubra e catalogue todas as criaturas do Monster Study.",
      },
    ],
  }),
  component: MonsterDex,
});

function MonsterDex() {
  const state = useGame();
  const [rarity, setRarity] = useState<RarityId | "all">("all");
  const [habitat, setHabitat] = useState<HabitatId | "all">("all");
  const [selected, setSelected] = useState<string | null>(null);

  const pool = useMemo(() => visibleMonsters(state), [state]);
  const list = useMemo(
    () =>
      pool
        .filter(
          (m) =>
            (rarity === "all" || m.rarity === rarity) &&
            (habitat === "all" || m.habitat === habitat),
        )
        .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)),
    [pool, rarity, habitat],
  );

  const discovered = Object.keys(state.monsters).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="MonsterDex"
        icon="🐾"
        subtitle={`${discovered} / ${pool.length} descobertos`}
      />

      <div className="panel space-y-3 p-4">
        <Filters
          label="Raridade"
          options={[
            { id: "all", name: "Todos" },
            ...visibleRarities(state).map((r) => ({ id: r, name: RARITIES[r].name })),
          ]}
          value={rarity}
          onChange={(v) => setRarity(v as RarityId | "all")}
        />
        <Filters
          label="Habitat"
          options={[
            { id: "all", name: "Todos" },
            ...Object.values(HABITATS).map((h) => ({ id: h.id, name: `${h.icon} ${h.name}` })),
          ]}
          value={habitat}
          onChange={(v) => setHabitat(v as HabitatId | "all")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((m) => (
          <MonsterCard
            key={m.id}
            monsterId={m.id}
            owned={state.monsters[m.id]}
            onClick={() => setSelected(m.id)}
          />
        ))}
      </div>

      <MonsterDialog id={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Filters({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ id: string; name: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs transition-colors",
              value === o.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/70 text-muted-foreground hover:text-foreground",
            )}
          >
            {o.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MonsterDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const state = useGame();
  const def = id ? MONSTERS_BY_ID[id] : null;
  const prog = id ? monsterProgress(id, state) : null;

  return (
    <Dialog open={Boolean(def)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        {def && (
          <div className="space-y-4 text-center">
            <MonsterArt
              art={def.art}
              rarity={def.rarity}
              size="lg"
              silhouette={!prog}
              className="mx-auto"
            />
            <div>
              <h2 className="font-display text-2xl font-bold">{prog ? def.name : "???"}</h2>
              <div className="mt-2 flex items-center justify-center gap-2">
                <RarityBadge rarity={def.rarity} />
                <span className="text-xs text-muted-foreground">
                  {HABITATS[def.habitat].icon} {HABITATS[def.habitat].name}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {prog ? def.description : "Continue estudando para descobrir esta criatura."}
            </p>

            {prog && (
              <>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <Cell label="Nível" value={String(prog.level)} />
                  <Cell label="Cópias" value={`x${prog.copies}`} />
                  <Cell
                    label="Dinheiro/s"
                    value={`${money(RARITIES[def.rarity].moneyPerSec * prog.copies)}`}
                  />
                </div>
                <div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
                      style={{ width: `${prog.pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    XP: {num(prog.xp)} / {num(prog.need)}
                  </p>
                </div>
                <Button
                  className="w-full"
                  variant={state.activeMonsterId === def.id ? "secondary" : "default"}
                  onClick={() => setActiveMonster(def.id)}
                >
                  {state.activeMonsterId === def.id ? "Em treino" : "Selecionar para treinar"}
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}
