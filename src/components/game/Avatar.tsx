import { illustratedAvatar } from "@/lib/game/avatars";
import { MONSTERS_BY_ID } from "@/lib/game/monsters";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-10 w-10 text-lg",
  md: "h-16 w-16 text-3xl",
  lg: "h-20 w-20 text-4xl",
} as const;

/**
 * Foto de perfil: monstro escolhido tem prioridade, depois avatar ilustrado,
 * por último o emoji.
 */
export function ProfileAvatar({
  avatar,
  monsterId,
  size = "md",
  className,
}: {
  avatar: string;
  monsterId?: string | null | undefined;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const monster = monsterId ? MONSTERS_BY_ID[monsterId] : undefined;
  const art = illustratedAvatar(avatar);
  const src = monster?.art ?? art?.src;

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary/70 ring-1 ring-primary/40",
        SIZES[size],
        className,
      )}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{avatar}</span>
      )}
    </span>
  );
}
