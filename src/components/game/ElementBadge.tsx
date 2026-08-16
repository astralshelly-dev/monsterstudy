import { elementOf, ELEMENTS_BY_ID, type ElementId } from "@/lib/game/elements";
import { cn } from "@/lib/utils";

export function ElementBadge({
  element,
  monsterId,
  className,
  compact = false,
}: {
  element?: ElementId | undefined;
  monsterId?: string | undefined;
  className?: string;
  compact?: boolean;
}) {
  const def = element ? ELEMENTS_BY_ID[element] : monsterId ? elementOf(monsterId) : null;
  if (!def) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-secondary/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1",
        def.text,
        def.ring,
        className,
      )}
      title={`Tipo ${def.name}`}
    >
      <span aria-hidden>{def.icon}</span>
      {!compact && def.name}
    </span>
  );
}
