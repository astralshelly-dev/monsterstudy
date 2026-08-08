import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useGame } from "@/hooks/use-game";
import { RARITIES, TIMERS, UPGRADES, upgradePrice, type UpgradeId } from "@/lib/game/config";
import { buyTimer, buyUpgrade, rarityChances } from "@/lib/game/state";
import { PageHeader } from "@/components/game/Primitives";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import { rarityText } from "@/components/game/MonsterArt";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/loja")({
  head: () => ({
    meta: [
      { title: "Loja — Monster Study" },
      {
        name: "description",
        content: "Desbloqueie cronômetros maiores e compre upgrades de sorte, dinheiro, XP e streak.",
      },
      { property: "og:title", content: "Loja — Monster Study" },
      {
        property: "og:description",
        content: "Invista o dinheiro gerado pelos seus monstros em cronômetros e upgrades.",
      },
    ],
  }),
  component: Shop,
});

function Shop() {
  const state = useGame();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Loja"
        icon="🛍️"
        subtitle={`Você tem ${money(state.money)} para investir na sua jornada.`}
      />

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">⏰ Cronômetros</h2>
        <p className="text-sm text-muted-foreground">
          Sessões mais longas desbloqueiam raridades muito superiores.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TIMERS.filter((t) => t.price > 0).map((t) => {
            const unlocked = state.unlockedTimers.includes(t.minutes);
            const chances = rarityChances(t.minutes, state.upgrades.lucky_charm);
            return (
              <div
                key={t.minutes}
                className={cn("panel flex flex-col p-4", unlocked && "ring-1 ring-primary/50")}
              >
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-xl font-bold">{t.label}</p>
                  {unlocked ? (
                    <span className="text-xs font-semibold text-rarity-incomum">Desbloqueado</span>
                  ) : (
                    <span className="text-sm text-gold">{money(t.price)}</span>
                  )}
                </div>
                <div className="mt-3 flex-1 space-y-1">
                  {chances.map((c) => (
                    <div key={c.rarity} className="flex items-center justify-between text-[11px]">
                      <span className={rarityText(c.rarity)}>{RARITIES[c.rarity].name}</span>
                      <span className="tabular-nums text-muted-foreground">{c.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
                {!unlocked && (
                  <Button
                    className="mt-4"
                    disabled={state.money < t.price}
                    onClick={() => {
                      if (buyTimer(t.minutes)) toast.success(`Cronômetro de ${t.label} desbloqueado!`);
                    }}
                  >
                    Desbloquear
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">✨ Upgrades</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(UPGRADES) as UpgradeId[]).map((id) => {
            const u = UPGRADES[id];
            const level = state.upgrades[id] ?? 0;
            const price = upgradePrice(id, level);
            const maxed = level >= u.maxLevel;
            return (
              <div key={id} className="panel flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary/70 text-2xl">
                    {u.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-display text-lg font-semibold">{u.name}</p>
                      <span className="text-xs text-muted-foreground">
                        Nv {level}/{u.maxLevel}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{u.description}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs">
                  <p>
                    Efeito atual:{" "}
                    <span className="font-semibold text-foreground">
                      {level === 0 ? "nenhum" : u.effectLabel(level)}
                    </span>
                  </p>
                  {!maxed && (
                    <p className="text-muted-foreground">
                      Próximo nível: <span className="text-rarity-incomum">{u.effectLabel(level + 1)}</span>
                    </p>
                  )}
                </div>
                <Button
                  className="mt-4"
                  disabled={maxed || state.money < price}
                  onClick={() => {
                    if (buyUpgrade(id)) toast.success(`${u.name} melhorado para o nível ${level + 1}!`);
                  }}
                >
                  {maxed ? "Nível máximo" : `Melhorar — ${money(price)}`}
                </Button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
