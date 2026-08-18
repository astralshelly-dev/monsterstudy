import { elementDefsOf, ELEMENTS_BY_ID, type ElementDef, type ElementId } from "@/lib/game/elements";
import { cn } from "@/lib/utils";

export function ElementBadge({
  element,
  elements,
  monsterId,
  className,
  compact = false,
  showIcon = false,
}: {
  element?: ElementId | undefined;
  elements?: ElementId[] | undefined;
  monsterId?: string | undefined;
  className?: string;
  compact?: boolean;
  showIcon?: boolean;
}) {
  const defs: ElementDef[] = elements?.length
    ? elements.map((e) => ELEMENTS_BY_ID[e]!)
    : element
      ? [ELEMENTS_BY_ID[element]!]
      : monsterId
        ? elementDefsOf(monsterId)
        : [];
  if (defs.length === 0) return null;
  if (defs.length > 1) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        {defs.map((d) => (
          <Pill key={d.id} def={d} className={className} compact={compact} showIcon={showIcon} />
        ))}
      </span>
    );
  }
  return <Pill def={defs[0]!} className={className} compact={compact} showIcon={showIcon} />;
}

function Pill({
  def,
  className,
  compact,
  showIcon,
}: {
  def: ElementDef;
  className?: string | undefined;
  compact: boolean;
  showIcon?: boolean;
}) {

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
      {(!compact || showIcon) && def.name}
    </span>
  );
}
