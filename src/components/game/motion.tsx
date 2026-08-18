import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/** Transição suave ao trocar de página/seção. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div key={pathname} className="anim-page">
      {children}
    </div>
  );
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Contador que interpola suavemente até o novo valor.
 * Não altera nenhuma lógica: só a forma de exibir o número.
 */
export function AnimatedNumber({
  value,
  format,
  duration = 500,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const next = from + (value - from) * easeOut(t);
      setShown(next);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else {
        fromRef.current = value;
        setShown(value);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = value;
    };
  }, [value, duration]);

  const rounded = Math.round(shown);
  return (
    <span className={cn("tabular-nums", className)}>
      {format ? format(rounded) : rounded.toLocaleString("pt-BR")}
    </span>
  );
}

/** Dá um "bump" no conteúdo sempre que o valor muda (moedas, diamantes, troféus…). */
export function BumpOnChange({
  dep,
  children,
  className,
}: {
  dep: string | number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span key={String(dep)} className={cn("anim-bump inline-flex", className)}>
      {children}
    </span>
  );
}

/** Barra de progresso com preenchimento animado. */
export function SmoothBar({
  pct,
  className,
  barClassName,
}: {
  pct: number;
  className?: string;
  barClassName?: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full bg-primary transition-[width] duration-700 ease-out", barClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/** Entrada escalonada e suave para itens de lista/grade. */
export function Stagger({
  index,
  children,
  className,
  step = 35,
  max = 12,
}: {
  index: number;
  children: ReactNode;
  className?: string;
  step?: number;
  max?: number;
}) {
  return (
    <div
      className={cn("stagger-item", className)}
      style={{ animationDelay: `${Math.min(index, max) * step}ms` }}
    >
      {children}
    </div>
  );
}

/** Placeholder com shimmer para estados de carregamento. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} />;
}
