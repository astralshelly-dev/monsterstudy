import {
  availableBeams,
  beamBonusLabel,
  beamElementLabel,
  resolveBeam,
  type BeamDef,
} from "@/lib/game/battle/beams";
import { ELEMENTS_BY_ID } from "@/lib/game/elements";
import { cn } from "@/lib/utils";

/**
 * ⚡ Feixe Elemental — sinergia da equipe.
 * Só UM feixe fica ativo por batalha: quando a composição libera vários,
 * o jogador escolhe qual usar aqui.
 */
export function BeamPicker({
  team,
  chosen,
  onChoose,
}: {
  team: string[];
  chosen: string | null;
  onChoose: (beamId: string | null) => void;
}) {
  const options = availableBeams(team);
  const active = resolveBeam(team, chosen);

  if (options.length === 0) {
    return (
      <div className="panel space-y-1 p-4">
        <p className="font-display text-sm font-semibold">⚡ Feixe Elemental</p>
        <p className="text-xs text-muted-foreground">
          Nenhum feixe ativo. Combine elementos diferentes na equipe para liberar uma sinergia
          (ex.: 🔥 + 🌊 + 🪨 + 🌪️ ativa o Feixe Primordial).
        </p>
      </div>
    );
  }

  return (
    <div className="panel space-y-3 p-4">
      <div>
        <p className="font-display text-sm font-semibold">⚡ Feixe Elemental</p>
        <p className="text-xs text-muted-foreground">
          Apenas 1 feixe fica ativo por batalha — os bônus nunca se somam.
        </p>
      </div>
      {active && <BeamSummary beam={active} />}
      {options.length > 1 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((b) => {
            const on = active?.id === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onChoose(b.id)}
                className={cn(
                  "panel p-3 text-left transition-all",
                  on ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border",
                )}
              >
                <p className={cn("font-display text-sm font-bold", b.text)}>
                  {b.icon} {b.name}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{beamElementLabel(b)}</p>
                <p className="mt-1 text-[11px] font-semibold">{beamBonusLabel(b)}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function BeamSummary({ beam }: { beam: BeamDef }) {
  return (
    <div className={cn("rounded-xl bg-secondary/50 p-3 ring-1", beam.ring)}>
      <p className={cn("font-display text-sm font-bold uppercase tracking-wide", beam.text)}>
        {beam.icon} {beam.name} ativado
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {beam.elements.map((e) => `${ELEMENTS_BY_ID[e].icon} ${ELEMENTS_BY_ID[e].name}`).join(" + ")}
      </p>
      <p className="mt-1 text-xs font-semibold">{beamBonusLabel(beam)}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{beam.description}</p>
    </div>
  );
}
