import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useGame } from "@/hooks/use-game";
import { continuableSession, continueSession } from "@/lib/game/state";
import { TimerPicker } from "@/components/game/TimerPicker";
import { Button } from "@/components/ui/button";
import { duration, minSec } from "@/lib/format";

/** janela para emendar a sessão anterior */
const WINDOW_SEC = 180;

/**
 * Painel de "continuar sessão": emenda um novo cronômetro na última sessão,
 * que aparece no histórico como uma única sessão maior.
 * A opção só fica disponível nos primeiros 3 minutos após o fim da sessão.
 */
export function ContinueSessionPanel({ kind }: { kind: "study" | "read" }) {
  const state = useGame();
  const prev = continuableSession(state);
  const [minutes, setMinutes] = useState<number | null>(30);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  if (!prev || prev.kind !== kind || state.timer) return null;

  const left = Math.max(
    0,
    Math.ceil((new Date(prev.endedAt).getTime() + WINDOW_SEC * 1000 - now) / 1000),
  );
  const expired = left <= 0;

  const book = prev.kind === "read" ? state.books.find((b) => b.id === prev.bookId) : null;

  return (
    <div className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold">Continuar sessão</p>
          <p className="text-sm text-muted-foreground">
            {prev.kind === "study" ? prev.subject : (book?.title ?? "Leitura")} ·{" "}
            {duration(prev.durationSec)} até agora
            {(prev.segments ?? 1) > 1 ? ` (${prev.segments} blocos)` : ""}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {expired
              ? "O tempo para emendar essa sessão acabou."
              : `Disponível por ${minSec(left)}`}
          </p>
        </div>
        <Button
          variant={expired ? "secondary" : open ? "secondary" : "default"}
          disabled={expired}
          onClick={() => setOpen(!open)}
        >
          {expired ? "Tempo esgotado" : open ? "Cancelar" : `Continuar sessão (${minSec(left)})`}
        </Button>
      </div>

      {open && !expired && (
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
