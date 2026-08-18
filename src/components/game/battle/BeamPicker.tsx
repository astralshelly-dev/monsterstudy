import {
  availableBeams,
  beamBonusLabel,
  beamElementLabel,
  resolveBeam,
  teamElements,
  BEAMS,
  type BeamDef,
} from "@/lib/game/battle/beams";
import { ELEMENTS_BY_ID } from "@/lib/game/elements";
import { cn } from "@/lib/utils";

/**
 * ⚡ Feixe Elemental — sinergia da equipe.
 * Todos os feixes aparecem; os que a equipe não desbloqueou ficam cinza
 * e não podem ser selecionados. Só UM feixe fica ativo por batalha.
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
  const unlocked = new Set(options.map((b) => b.id));
  const active = resolveBeam(team, chosen);
  const els = teamElements(team);

  return (
    <div className="panel space-y-3 p-4">
      <div>
        <p className="font-display text-sm font-semibold">⚡ Feixe Elemental</p>
        <p className="text-xs text-muted-foreground">
          Apenas 1 feixe fica ativo por batalha — os bônus nunca se somam. Feixes em cinza pedem
          elementos que sua equipe ainda não reúne.
        </p>
      </div>
      {active ? (
        <BeamSummary beam={active} />
      ) : (
        <p className="text-xs text-muted-foreground">
          Nenhum feixe ativo. Combine elementos diferentes na equipe (ex.: 🔥 + 🌊 + 🪨 + 🌪️ ativa o
          Feixe Primordial).
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {BEAMS.map((b) => {
          const on = active?.id === b.id;
          const open = unlocked.has(b.id);
          const missing = b.elements.filter((e) => !els.includes(e));
          return (
            <button
              key={b.id}
              type="button"
              disabled={!open}
              onClick={() => open && onChoose(b.id)}
              className={cn(
                "panel p-3 text-left transition-all",
                open
                  ? on
                    ? "ring-2 ring-primary"
                    : "hover:ring-1 hover:ring-border"
                  : "cursor-not-allowed opacity-45 grayscale",
              )}
            >
              <p
                className={cn(
                  "font-display text-sm font-bold",
                  open ? b.text : "text-muted-foreground",
                )}
              >
                {open ? b.icon : "🔒"} {b.name}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{beamElementLabel(b)}</p>
              <p className="mt-1 text-[11px] font-semibold">{beamBonusLabel(b)}</p>
              {!open && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Falta: {missing.map((e) => `${ELEMENTS_BY_ID[e].icon} ${ELEMENTS_BY_ID[e].name}`).join(", ")}
                </p>
              )}
            </button>
          );
        })}
      </div>
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
