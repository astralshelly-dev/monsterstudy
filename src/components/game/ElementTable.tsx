import { useState } from "react";
import {
  ELEMENT_CYCLE,
  ELEMENTS,
  ELEMENTS_BY_ID,
  TYPE_BONUS,
  elementMatchups,
  type ElementId,
} from "@/lib/game/elements";
import { cn } from "@/lib/utils";

const bonusLabel = `${Math.round(TYPE_BONUS * 100)}%`;

/**
 * Tabela de vantagens elementais: roda de counters + lista completa
 * de "forte contra" / "fraco contra" para cada tipo.
 */
export function ElementTable({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("panel p-4", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider">Tabela de elementos</p>
          <p className="text-[11px] text-muted-foreground">
            Vantagem = +{bonusLabel} de dano · desvantagem = -{bonusLabel}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">{open ? "ocultar ▲" : "ver ▼"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Roda de counters (cada tipo vence os 2 seguintes)
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
              {ELEMENT_CYCLE.map((id, i) => {
                const e = ELEMENTS_BY_ID[id];
                return (
                  <span key={id} className="flex items-center gap-1">
                    <span className={cn("rounded-full bg-secondary/70 px-2 py-0.5 font-semibold", e.text)}>
                      {e.icon} {e.name}
                    </span>
                    {i < ELEMENT_CYCLE.length - 1 && (
                      <span className="text-muted-foreground">›</span>
                    )}
                  </span>
                );
              })}
              <span className="text-muted-foreground">› volta ao início</span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {ELEMENTS.map((e) => (
              <Row key={e.id} id={e.id} />
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground">
            ✨ Luz e 🌑 Sombrio só se counteram entre si. 🌌 Deus é neutro: não ganha nem perde
            vantagem contra nenhum tipo.
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ id }: { id: ElementId }) {
  const e = ELEMENTS_BY_ID[id];
  const m = elementMatchups(id);
  const names = (ids: ElementId[]) =>
    ids.length ? ids.map((x) => `${ELEMENTS_BY_ID[x].icon} ${ELEMENTS_BY_ID[x].name}`).join(" · ") : "—";
  return (
    <div className="rounded-xl bg-secondary/40 px-3 py-2">
      <p className={cn("text-sm font-semibold", e.text)}>
        {e.icon} {e.name}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Forte: <span className="text-foreground">{names(m.strong)}</span>
      </p>
      <p className="text-[11px] text-muted-foreground">
        Fraco: <span className="text-foreground">{names(m.weak)}</span>
      </p>
    </div>
  );
}
