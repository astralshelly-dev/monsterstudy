import { useEffect, useState } from "react";
import { RARITIES } from "@/lib/game/config";
import { MONSTERS_BY_ID } from "@/lib/game/monsters";
import { HABITATS } from "@/lib/game/config";
import type { Reward } from "@/lib/game/types";
import { money, num } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { MonsterArt, RarityBadge, rarityHalo, rarityText } from "./MonsterArt";
import { playNoRewardSfx, playRewardSfx } from "@/lib/game/sfx";
import { cn } from "@/lib/utils";

type Phase = "intro" | "suspense" | "reveal";

export function RewardReveal({
  reward,
  kind,
  onClose,
}: {
  reward: Reward;
  kind: "study" | "read";
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const def = reward.monsterId ? MONSTERS_BY_ID[reward.monsterId] : undefined;
  const rarity = RARITIES[reward.rarity];

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("suspense"), 1300);
    const t2 = setTimeout(() => {
      setPhase("reveal");
      if (def) playRewardSfx(def.rarity);
      else playNoRewardSfx();
    }, 1300 + 900 + rarity.drama * 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [rarity.drama, def]);

  const sparkles = 6 + rarity.drama * 4;

  return (
    <div className="fixed inset-0 z-100 grid place-items-center overflow-hidden bg-background/95 px-4 backdrop-blur-md">
      {/* fundo dramático conforme raridade */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-70 blur-3xl",
          rarityHalo(reward.rarity),
          rarity.drama >= 4 && "animate-pulse-glow",
        )}
      />
      {def && rarity.drama >= 2 && (
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: sparkles }).map((_, i) => (
            <span
              key={i}
              className={cn("absolute h-1.5 w-1.5 rounded-full bg-foreground animate-sparkle")}
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${(i * 53) % 100}%`,
                animationDelay: `${(i % 7) * 0.18}s`,
              }}
            />
          ))}
        </div>
      )}
      {def && rarity.drama >= 5 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            className={cn(
              "h-[720px] w-[720px] rounded-full opacity-40 animate-spin-slow",
              rarityHalo(reward.rarity),
            )}
            style={{
              maskImage:
                "conic-gradient(from 0deg, transparent 0deg, black 30deg, transparent 60deg, black 120deg, transparent 160deg, black 240deg, transparent 300deg)",
            }}
          />
        </div>
      )}

      <div className="relative w-full max-w-lg text-center">
        {phase === "intro" && (
          <p className="animate-rise font-display text-3xl font-bold tracking-wide text-glow">
            {kind === "study" ? "SEU ESTUDO TERMINOU!" : "SUA LEITURA TERMINOU!"}
          </p>
        )}

        {phase === "suspense" && (
          <div className="animate-rise space-y-6">
            <p className="font-display text-2xl tracking-[0.2em] text-muted-foreground">
              VOCÊ ENCONTROU...
            </p>
            <div className="mx-auto h-40 w-40 animate-pulse-glow rounded-full bg-primary/40 blur-2xl" />
          </div>
        )}

        {phase === "reveal" && !def && (
          <div className="animate-reveal panel space-y-5 p-8">
            <p className="text-5xl">🍃</p>
            <h2 className="font-display text-2xl font-bold">Nenhum monstro apareceu</h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              Você encerrou a sessão com menos de 50% do tempo planejado. Complete pelo menos metade do
              cronômetro para encontrar criaturas.
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label="XP" value={`+${num(reward.xp)}`} />
              <Stat label="Dinheiro" value={`+${money(reward.money)}`} />
            </div>
            <Button className="w-full" size="lg" onClick={onClose}>
              Continuar
            </Button>
          </div>
        )}

        {phase === "reveal" && def && (
          <div className="animate-reveal panel space-y-5 p-8">
            {reward.duplicate && (
              <p className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-gold">
                Monstro duplicado!
              </p>
            )}
            {rarity.drama >= 6 && (
              <p className={cn("font-display text-xs uppercase tracking-[0.35em]", rarityText(reward.rarity))}>
                {rarity.drama === 7 ? "✦ Encontro divino ✦" : "✦ Aparição mítica ✦"}
              </p>
            )}
            <MonsterArt art={def.art} rarity={def.rarity} size="xl" className="mx-auto" />
            <div>
              <h2 className="font-display text-3xl font-bold">{def.name}</h2>
              <div className="mt-2 flex items-center justify-center gap-2">
                <RarityBadge rarity={def.rarity} />
                <span className="text-xs text-muted-foreground">
                  {HABITATS[def.habitat].icon} {HABITATS[def.habitat].name}
                </span>
              </div>
              <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">{def.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm">
              <Stat label="XP" value={`+${num(reward.xp)}`} />
              <Stat label="Dinheiro" value={`+${money(reward.money)}`} />
              <Stat label="Por segundo" value={`${money(RARITIES[def.rarity].moneyPerSec)}/s`} />
            </div>
            {reward.shards > 0 && (
              <p className="text-xs text-muted-foreground">
                +{reward.shards} fragmentos por duplicata (use no treino de monstros)
              </p>
            )}

            <Button className="w-full" size="lg" onClick={onClose}>
              Continuar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}
