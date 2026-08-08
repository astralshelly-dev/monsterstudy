import { clock } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TimerDial({
  remaining,
  total,
  countUp = false,
  elapsed = 0,
  label,
  sublabel,
  className,
}: {
  remaining: number;
  total: number;
  countUp?: boolean;
  elapsed?: number;
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  const pct = countUp ? 1 : total > 0 ? 1 - remaining / total : 0;
  const size = 300;
  const r = 132;
  const c = 2 * Math.PI * r;

  return (
    <div className={cn("relative grid place-items-center", className)}>
      <div className="pointer-events-none absolute inset-0 scale-110 rounded-full bg-primary/20 blur-3xl animate-pulse-glow" />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={14}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#dialGrad)"
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
        <defs>
          <linearGradient id="dialGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="60%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--arcane)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <p className="font-display text-5xl font-bold tabular-nums text-glow">
          {clock(countUp ? elapsed : remaining)}
        </p>
        {label && <p className="mt-2 text-sm font-medium">{label}</p>}
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </div>
    </div>
  );
}
