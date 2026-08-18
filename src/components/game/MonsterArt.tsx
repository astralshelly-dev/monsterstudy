import { RARITIES, type RarityId } from "@/lib/game/config";
import { cn } from "@/lib/utils";
import { BLOOD_MOON_SKINS_BY_ID, skinFxClass } from "@/lib/game/bloodmoon";
import { skinArt } from "@/lib/game/skin-art";

const RARITY_SURFACE: Record<RarityId, string> = {
  comum: "rarity-comum",
  incomum: "rarity-incomum",
  raro: "rarity-raro",
  super_raro: "rarity-super",
  epico: "rarity-epico",
  lendario: "rarity-lendario",
  mitico: "rarity-mitico",
  divino: "rarity-divino",
  secreto: "rarity-secreto",
};

const RARITY_HALO: Record<RarityId, string> = {
  comum: "halo-comum",
  incomum: "halo-incomum",
  raro: "halo-raro",
  super_raro: "halo-super",
  epico: "halo-epico",
  lendario: "halo-lendario",
  mitico: "halo-mitico",
  divino: "halo-divino",
  secreto: "halo-secreto",
};

const RARITY_TEXT: Record<RarityId, string> = {
  comum: "text-rarity-comum",
  incomum: "text-rarity-incomum",
  raro: "text-rarity-raro",
  super_raro: "text-rarity-super",
  epico: "text-rarity-epico",
  lendario: "text-rarity-lendario",
  mitico: "text-rarity-mitico",
  divino: "text-rarity-divino",
  secreto: "text-rarity-secreto",
};

export const raritySurface = (r: RarityId) => RARITY_SURFACE[r];
export const rarityHalo = (r: RarityId) => RARITY_HALO[r];
export const rarityText = (r: RarityId) => RARITY_TEXT[r];

export function RarityBadge({ rarity, className }: { rarity: RarityId; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        raritySurface(rarity),
        rarityText(rarity),
        className,
      )}
    >
      {RARITIES[rarity].name}
    </span>
  );
}

export function MonsterArt({
  art,
  rarity,
  size = "md",
  silhouette = false,
  animate = true,
  className,
  skinId,
}: {
  art: string;
  rarity: RarityId;
  size?: "sm" | "md" | "lg" | "xl";
  silhouette?: boolean;
  animate?: boolean;
  className?: string;
  /** skin cosmética equipada (Lua de Sangue) — só muda o visual */
  skinId?: string | null | undefined;
}) {
  const skin = skinId ? BLOOD_MOON_SKINS_BY_ID[skinId] : undefined;
  const skinImg = skinArt(skinId);
  const shownArt = !silhouette && skinImg ? skinImg : art;
  const sizes = {
    sm: "h-14 w-14 text-2xl",
    md: "h-20 w-20 text-4xl",
    lg: "h-32 w-32 text-6xl",
    xl: "h-48 w-48 text-8xl",
  } as const;

  return (
    <div className={cn("relative grid place-items-center", className)}>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 scale-150 rounded-full opacity-70 blur-xl",
          rarityHalo(rarity),
          animate && "animate-pulse-glow",
          silhouette && "opacity-10",
        )}
      />
      <div
        className={cn(
          "relative grid place-items-center rounded-2xl",
          sizes[size],
          raritySurface(rarity),
          silhouette && "opacity-40",
          skin && !silhouette && skinFxClass(skin.fx),
        )}
      >
        {shownArt.startsWith("/") ? (
          <img
            src={shownArt}
            alt=""
            loading="lazy"
            className={cn(
              "h-[88%] w-[88%] object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]",
              animate && "animate-float",
              silhouette && "brightness-0 opacity-60",
            )}
          />
        ) : (
          <span
            className={cn("leading-none", animate && "animate-float", silhouette && "brightness-0 opacity-60")}
            aria-hidden
          >
            {shownArt}
          </span>
        )}
        {skin && !silhouette && !skinImg && (
          <span className="bm-accessory" aria-hidden>
            {skin.accessory}
          </span>
        )}
      </div>
    </div>
  );
}
