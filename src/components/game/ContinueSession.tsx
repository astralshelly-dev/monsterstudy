import { useState } from "react";
import { toast } from "sonner";
import { useGame } from "@/hooks/use-game";
import { continuableSession, continueSession } from "@/lib/game/state";
import { TimerPicker } from "@/components/game/TimerPicker";
import { Button } from "@/components/ui/button";
import { duration } from "@/lib/format";

/**
 * Painel de "continuar sessão": emenda um novo cronômetro na última sessão,
 * que aparece no histórico como uma única sessão maior.
 */
export function ContinueSessionPanel({ kind }: { kind: "study" | "read" }) {
  const state = useGame();
  const prev = continuableSession(state);
  const [minutes, setMinutes] = useState<number | null>(30);
  const [open, setOpen] = useState(false);

  if (!prev || prev.kind !== kind || state.timer) return null;

  const book = prev.kind === "read" ? state.books.find((b) => b.id === prev.bookId) : null;

  return (
    <div className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold">Continuar sessão</p>
          <p className="text-sm text-muted-foreground">
            {prev.kind === "study" ? prev.subject : (book?.title ?? "Leitura")} ·{" "}
            {duration(prev.durationSec)} até agora
            {prev.segments > 1 ? ` (${prev.segments} blocos)` : ""}
          </p>
        </div>
        <Button variant={open ? "secondary" : "default"} onClick={() => setOpen(!open)}>
          {open ? "Cancelar" : "Continuar sessão"}
        </Button>
      </div>

      {open && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Escolha quanto tempo quer adicionar. O tempo será somado à sessão anterior.
          </p>
          <TimerPicker value={minutes} onChange={setMinutes} />
          <Button
            size="lg"
            className="w-full"
            disabled={!minutes}
            onClick={() => {
              if (!minutes) return;
              if (continueSession(minutes)) {
                toast.success("Sessão retomada! O tempo será somado à anterior.");
              } else {
                toast.error("Não foi possível continuar essa sessão.");
              }
            }}
          >
            Retomar por {minutes} min
          </Button>
        </div>
      )}
    </div>
  );
}
