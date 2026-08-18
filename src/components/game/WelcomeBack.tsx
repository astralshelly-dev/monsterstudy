import { money as fmtMoney, duration } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { collectOfflineEarnings, type OfflineEarnings } from "@/lib/game/state";

/** Tela de "bem-vindo de volta" com o que os monstros renderam offline. */
export function WelcomeBack({
  offline,
  onClose,
}: {
  offline: NonNullable<OfflineEarnings>;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Bem-vindo de volta!</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-primary/15 text-4xl ring-1 ring-primary/40">
            🐲
          </div>
          <p className="text-sm text-muted-foreground">
            Seus monstros trabalharam por{" "}
            <span className="font-semibold text-foreground">{duration(offline.seconds)}</span>{" "}
            enquanto você estava fora.
          </p>
          <div className="panel px-4 py-5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Renda offline
            </p>
            <p className="font-display text-4xl font-bold text-gold">
              +{fmtMoney(offline.amount)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            A renda offline acumula por até 24 horas. Bora estudar?
          </p>
          <Button size="lg" className="w-full" onClick={onClose}>
            Coletar e continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
