import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pause, Play, Square, X } from "lucide-react";
import { useGame } from "@/hooks/use-game";
import {
  cancelTimer,
  clearPendingReward,
  endTimerEarly,
  pauseTimer,
  resumeTimer,
  saveReadingSession,
  startTimer,
  timerElapsedSec,
  timerRemainingSec,
} from "@/lib/game/state";
import { EmptyState, PageHeader } from "@/components/game/Primitives";
import { TimerDial } from "@/components/game/TimerDial";
import { TimerPicker, useTick } from "@/components/game/TimerPicker";
import { RewardReveal } from "@/components/game/RewardReveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { duration, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BookCover } from "@/components/game/BookCover";

export const Route = createFileRoute("/ler")({
  head: () => ({
    meta: [
      { title: "Ler — Monster Study" },
      {
        name: "description",
        content:
          "Escolha um livro da sua biblioteca, cronometre a leitura e registre páginas, velocidade e recompensas.",
      },
      { property: "og:title", content: "Ler — Monster Study" },
      {
        property: "og:description",
        content: "Leitura cronometrada com estatísticas de páginas e monstros de recompensa.",
      },
    ],
  }),
  component: ReadPage,
});

function ReadPage() {
  const state = useGame();
  const timer = state.timer?.kind === "read" ? state.timer : null;
  useTick(Boolean(timer));

  if (state.pendingReward) {
    return (
      <RewardReveal reward={state.pendingReward} kind="read" onClose={() => clearPendingReward()} />
    );
  }
  if (timer) {
    return timerRemainingSec(timer) <= 0 ? <ReadCompletion /> : <ReadRunning />;
  }
  return <ReadSetup />;
}

function ReadSetup() {
  const state = useGame();
  const [bookId, setBookId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState<number | null>(30);
  const readable = state.books.filter((b) => b.shelf !== "concluido");
  const book = state.books.find((b) => b.id === bookId);

  if (state.books.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Ler" icon="📖" />
        <EmptyState
          icon="📚"
          title="Sua biblioteca está vazia"
          description="Adicione um livro para começar a registrar suas leituras."
          action={
            <Button asChild>
              <Link to="/biblioteca">Ir para a Biblioteca</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ler"
        icon="📖"
        subtitle="Selecione um livro da sua biblioteca e escolha o cronômetro."
      />

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Escolha o livro</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {readable.map((b) => {
            const pct = Math.round((b.currentPage / b.totalPages) * 100);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setBookId(b.id)}
                className={cn(
                  "panel panel-hover flex gap-3 p-3 text-left",
                  bookId === b.id && "ring-2 ring-primary",
                )}
              >
                <BookCover book={b} className="h-20 w-14" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">📖 {b.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{b.author}</p>
                  <p className="mt-1 text-xs">
                    {b.currentPage} / {b.totalPages} páginas
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{pct}% concluído</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Escolha o cronômetro</h2>
        <TimerPicker value={minutes} onChange={setMinutes} />
      </div>

      {book && (
        <div className="panel p-4 text-sm">
          Página inicial: <span className="font-semibold">{book.currentPage}</span> — a página final
          será preenchida ao terminar.
        </div>
      )}

      <Button
        size="lg"
        className="w-full"
        disabled={!bookId || !minutes || state.timer !== null}
        onClick={() =>
          book &&
          minutes &&
          startTimer({
            kind: "read",
            durationSec: minutes * 60,
            meta: { bookId: book.id, startPage: book.currentPage },
          })
        }
      >
        Iniciar leitura
      </Button>
    </div>
  );
}

function ReadRunning() {
  const state = useGame();
  const timer = state.timer!;
  useTick();
  const book = state.books.find((b) => b.id === timer.meta.bookId);
  const remaining = timerRemainingSec(timer);
  const elapsed = timerElapsedSec(timer);
  const paused = Boolean(timer.pausedAt);
  const [livePage, setLivePage] = useState<number | "">("");
  const pages = typeof livePage === "number" ? Math.max(0, livePage - (timer.meta.startPage ?? 0)) : 0;
  const speed = elapsed > 0 ? pages / (elapsed / 60) : 0;

  return (
    <div className="space-y-8">
      <PageHeader title="Leitura em andamento" icon="📖" subtitle={book?.title} />
      <div className="panel aurora grid place-items-center gap-6 p-8">
        <TimerDial
          remaining={remaining}
          total={timer.durationSec ?? 0}
          label={`📖 ${book?.title ?? "Livro"}`}
          sublabel={`Página inicial: ${timer.meta.startPage}`}
        />

        <div className="w-full max-w-sm space-y-2">
          <Label>Em que página você está agora? (opcional)</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={livePage}
            onChange={(e) => setLivePage(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder={String(timer.meta.startPage)}
          />
          {pages > 0 && (
            <div className="grid grid-cols-2 gap-2 text-center text-sm">
              <div className="rounded-xl bg-secondary/60 px-3 py-2">
                <p className="text-[10px] uppercase text-muted-foreground">Páginas lidas</p>
                <p className="font-semibold tabular-nums">{pages}</p>
              </div>
              <div className="rounded-xl bg-secondary/60 px-3 py-2">
                <p className="text-[10px] uppercase text-muted-foreground">Velocidade</p>
                <p className="font-semibold tabular-nums">{num(speed, 2)} pág/min</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {paused ? (
            <Button onClick={resumeTimer} size="lg">
              <Play className="h-4 w-4" /> Retomar
            </Button>
          ) : (
            <Button onClick={pauseTimer} size="lg" variant="secondary">
              <Pause className="h-4 w-4" /> Pausar
            </Button>
          )}
          <Button onClick={endTimerEarly} size="lg" variant="outline">
            <Square className="h-4 w-4" /> Encerrar
          </Button>
          <Button onClick={cancelTimer} size="lg" variant="ghost">
            <X className="h-4 w-4" /> Cancelar sessão
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReadCompletion() {
  const state = useGame();
  const timer = state.timer!;
  const book = state.books.find((b) => b.id === timer.meta.bookId);
  const startPage = timer.meta.startPage ?? 0;
  const durationSec = Math.min(timerElapsedSec(timer), timer.durationSec ?? 0);
  const [endPage, setEndPage] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const pages = typeof endPage === "number" ? Math.max(0, endPage - startPage) : 0;
  const speed = pages / Math.max(1, durationSec / 60);
  const pct = book ? ((typeof endPage === "number" ? endPage : startPage) / book.totalPages) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Leitura concluída!" icon="📄" subtitle={book?.title} />

      <div className="panel grid gap-3 p-6 sm:grid-cols-3">
        <Info label="📖 Livro" value={book?.title ?? "—"} />
        <Info label="⏱️ Tempo" value={duration(durationSec)} />
        <Info label="Página inicial" value={String(startPage)} />
      </div>

      <div className="panel space-y-4 p-6">
        <div className="space-y-2">
          <Label>Em qual página você parou?</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={endPage}
            onChange={(e) => setEndPage(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder={String(startPage)}
          />
        </div>

        {pages >= 0 && typeof endPage === "number" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Info label="Páginas lidas" value={`${pages}`} />
            <Info label="Velocidade" value={`${num(speed, 2)} pág/min`} />
            <Info label="Tempo total" value={duration(durationSec)} />
            <Info label="Do livro" value={`${num(pct, 1)}%`} />
          </div>
        )}

        <div className="space-y-2">
          <Label>Anotações (opcional)</Label>
          <Textarea
            rows={3}
            placeholder="Ex: A história começou a ficar mais interessante nessa parte."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <Button
          size="lg"
          className="w-full"
          disabled={typeof endPage !== "number"}
          onClick={() =>
            typeof endPage === "number" &&
            saveReadingSession({
              timer,
              durationSec,
              earlyEnd: Boolean(timer.meta.earlyEnd),
              endPage,
              notes: notes || undefined,
            })
          }
        >
          Salvar leitura
        </Button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="truncate font-display text-lg font-semibold">{value}</p>
    </div>
  );
}
