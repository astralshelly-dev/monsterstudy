import { Link } from "@tanstack/react-router";
import { MONSTERS_BY_ID } from "@/lib/game/monsters";
import { RARITIES } from "@/lib/game/config";
import { money, num } from "@/lib/format";
import { MonsterArt, RarityBadge } from "./MonsterArt";
import { ElementBadge } from "./ElementBadge";
import { equippedSkinFor } from "@/lib/game/state";
import { cn } from "@/lib/utils";
import type { OwnedMonster } from "@/lib/game/types";

export function MonsterCard({
  monsterId,
  owned,
  onClick,
  className,
}: {
  monsterId: string;
  owned?: OwnedMonster | undefined;
  onClick?: () => void;
  className?: string;
}) {
  const def = MONSTERS_BY_ID[monsterId];
  if (!def) return null;
  const discovered = Boolean(owned);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("press panel panel-hover group p-4 text-left", className)}
    >
      <div className="flex flex-col items-center gap-3">
        <MonsterArt
          art={def.art}
          rarity={def.rarity}
          silhouette={!discovered}
          animate={discovered}
          skinId={discovered ? equippedSkinFor(monsterId) : null}
        />
        <div className="w-full text-center">
          <p className="truncate font-display text-sm font-semibold">
            {discovered ? def.name : "???"}
          </p>
          {discovered ? (
            <div className="mt-1.5 flex flex-col items-center gap-1.5">
              <div className="flex flex-wrap items-center justify-center gap-1">
                <RarityBadge rarity={def.rarity} />
                <ElementBadge monsterId={def.id} compact />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Nv. {owned!.level} · x{owned!.copies} ·{" "}
                {money(RARITIES[def.rarity].moneyPerSec * owned!.copies)}/s
              </p>
            </div>
          ) : (
            <p className="mt-1.5 text-[11px] text-muted-foreground">Não descoberto</p>
          )}
        </div>
      </div>
    </button>
  );
}

export function ActiveMonsterCard({ monsterId, owned }: { monsterId: string; owned: OwnedMonster }) {
  const def = MONSTERS_BY_ID[monsterId];
  if (!def) return null;
  return (
    <Link to="/monstros" className="press panel panel-hover flex items-center gap-4 p-4">
      <MonsterArt art={def.art} rarity={def.rarity} size="sm" skinId={equippedSkinFor(monsterId)} />
      <div className="min-w-0">
        <p className="truncate font-display font-semibold">{def.name}</p>
        <p className="text-xs text-muted-foreground">
          Nível {owned.level} · {num(owned.xp)} XP
        </p>
        <div className="mt-1 flex items-center gap-1">
          <RarityBadge rarity={def.rarity} />
          <ElementBadge monsterId={def.id} compact />
        </div>
      </div>
    </Link>
  );
}
