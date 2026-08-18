import { roleOf, ROLES_BY_ID, type RoleId } from "@/lib/game/battle/roles";
import { cn } from "@/lib/utils";

/** ⚔️/🛡️/💚/🔮 — função estratégica do monstro (apenas identidade, sem bônus) */
export function RoleBadge({
  monsterId,
  role,
  className,
  compact = false,
}: {
  monsterId?: string | undefined;
  role?: RoleId | undefined;
  className?: string;
  compact?: boolean;
}) {
  const def = role ? ROLES_BY_ID[role] : monsterId ? roleOf(monsterId) : null;
  if (!def) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-secondary/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1",
        def.text,
        def.ring,
        className,
      )}
      title={`${def.name}: ${def.description}`}
    >
      <span aria-hidden>{def.icon}</span>
      {!compact && def.name}
    </span>
  );
}
