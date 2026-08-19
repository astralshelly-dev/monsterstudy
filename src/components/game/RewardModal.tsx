import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

export function RewardModal({
  reward,
  title,
  onClose,
}: {
  reward: Reward;
  title: string;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const def = reward.monsterId ? MONSTERS_BY_ID[reward.monsterId] : undefined;
  const rarity = RARITIES[reward.rarity];

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("suspense"), 1000);
    const t2 = setTimeout(() => {
      setPhase("reveal");
      if (def) playRewardSfx(def.rarity);
      else playNoRewardSfx();
    }, 1000 + 1200 + (rarity?.drama || 0) * 200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [rarity?.drama, def]);

  const sparkles = 6 + (rarity?.drama || 0) * 4;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-100 grid place-items-center overflow-y-auto bg-background/95 px-4 py-8 backdrop-blur-md animate-in fade-in duration-500">
      <div className="pointer-events-none absolute inset-0" aria-hidden />

      {/* fundo dramático conforme raridade */}
      {rarity && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 opacity-70 blur-3xl",
            rarityHalo(reward.rarity),
            rarity.drama >= 4 && "animate-pulse-glow",
          )}
        />
      )}
      
      {def && rarity && rarity.drama >= 2 && (
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

      <div className="relative w-full max-w-lg text-center">
        {phase === "intro" && (
          <div className="animate-in fade-in zoom-in duration-700">
             <p className="font-display text-4xl font-black tracking-tighter text-glow uppercase">
              {title}
            </p>
          </div>
        )}

        {phase === "suspense" && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-6">
            <p className="font-display text-2xl font-black tracking-[0.2em] text-muted-foreground uppercase">
              VOCÊ RECEBEU...
            </p>
            <div className="mx-auto h-40 w-40 animate-pulse-glow rounded-full bg-primary/20 blur-2xl" />
          </div>
        )}

        {phase === "reveal" && (
          <div className="animate-in fade-in zoom-in slide-in-from-bottom-12 duration-700 panel space-y-6 p-8 relative overflow-hidden">
            {def && (
               <>
                <div className="space-y-2">
                   {reward.duplicate ? (
                      <p className="font-display text-[10px] font-black uppercase tracking-[0.25em] text-gold animate-pulse">
                        MONSTRO DUPLICADO!
                      </p>
                    ) : (
                      <p className="font-display text-[10px] font-black uppercase tracking-[0.25em] text-primary">
                        NOVO MONSTRO DESBLOQUEADO!
                      </p>
                    )}
                    
                    {rarity.drama >= 6 && (
                      <p className={cn("font-display text-[10px] font-black uppercase tracking-[0.35em]", rarityText(reward.rarity))}>
                        {rarity.drama === 7 ? "✦ APARIÇÃO DIVINA ✦" : "✦ ENCONTRO MÍTICO ✦"}
                      </p>
                    )}
                </div>

                <div className="relative group">
                  <div className={cn("absolute inset-0 blur-2xl opacity-20 transition-opacity group-hover:opacity-40", rarityHalo(reward.rarity))} />
                  <MonsterArt art={def.art} rarity={def.rarity} size="xl" animate className="mx-auto relative z-10 drop-shadow-2xl" />
                </div>

                <div className="space-y-1">
                  <h2 className="font-display text-4xl font-black uppercase tracking-tighter leading-none italic">{def.name}</h2>
                  <div className="flex items-center justify-center gap-3">
                    <RarityBadge rarity={def.rarity} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {HABITATS[def.habitat].icon} {HABITATS[def.habitat].name}
                    </span>
                  </div>
                </div>
               </>
            )}

            {!def && (
               <div className="space-y-4 py-4">
                  <div className="text-6xl animate-bounce">🎁</div>
                  <h2 className="font-display text-3xl font-black uppercase tracking-tighter italic">RECOMPENSAS</h2>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Seus ganhos da sessão</p>
               </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
              <StatItem label="XP" value={`+${num(reward.xp)}`} />
              <StatItem label="MOEDAS" value={`+${num(reward.money)}`} />
              {reward.shards > 0 && <StatItem label="SHARDS" value={`+${num(reward.shards)}`} />}
              {def && <StatItem label="RENDA" value={`+${money(RARITIES[def.rarity].moneyPerSec)}/s`} />}
            </div>

            <Button className="w-full h-14 font-black tracking-widest text-xs rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all" size="lg" onClick={onClose}>
              COLETAR E CONTINUAR
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary/40 border border-white/5 p-3 space-y-0.5">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none">{label}</p>
      <p className="font-display text-sm font-black italic tracking-tight">{value}</p>
    </div>
  );
}