import { useEffect, useState } from "react";
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
import { RewardModal } from "@/components/game/RewardModal";
import { ContinueSessionPanel } from "@/components/game/ContinueSession";
import { playTimerEndSfx } from "@/lib/game/sfx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { duration, minSec } from "@/lib/format";

export const Route = createFileRoute("/ler")({
  head: () => ({
    meta: [
      { title: "Leitura — Monster Study" },
      {
        name: "description",
        content: "Mergulhe em seus livros e ganhe recompensas pelo tempo dedicado à leitura.",
      },
      { property: "og:title", content: "Leitura — Monster Study" },
      { property: "og:description", content: "Transforme sua leitura em progresso no jogo." },
    ],
  }),
  component: ReadingPage,
});

function ReadingPage() {
  const state = useGame();

  if (state.pendingReward) {
    return (
      <RewardModal
        reward={state.pendingReward}
        title="SUA LEITURA TERMINOU!"
        onClose={() => clearPendingReward()}
      />
    );
  }

  const active = state.timer && state.timer.kind === "read" ? state.timer : null;

  if (active) {
    return <ReadingRunning timer={active} />;
  }

  return <ReadingSetup />;
}

function ReadingSetup() {
  const state = useGame();
  const [bookId, setBookId] = useState("");
  const [startPage, setStartPage] = useState<number>(0);
  const [minutes, setMinutes] = useState(30);

  const selectedBook = state.books.find((b) => b.id === bookId);

  useEffect(() => {
    if (selectedBook) {
      setStartPage(selectedBook.currentPage);
    }
  }, [selectedBook]);

  function start() {
    if (!bookId) return;
    startTimer({
      kind: "read",
      durationSec: minutes * 60,
      meta: { bookId, startPage },
    });
  }

  const lendo = state.books.filter((b) => b.shelf === "lendo");

  return (
    <div className="space-y-6">
      <PageHeader title="Leitura" icon="📕" subtitle="Escolha um livro para começar a jornada." />

      {lendo.length === 0 ? (
        <EmptyState
          icon="📚"
          title="Nenhum livro sendo lido"
          description="Adicione livros à sua estante para começar a ganhar recompensas por leitura."
          action={
            <Link to="/biblioteca">
              <Button>Ir para Biblioteca</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="panel space-y-6 p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Livro que vai ler</Label>
                <select
                  value={bookId}
                  onChange={(e) => setBookId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Selecione um livro...</option>
                  {lendo.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.currentPage}/{b.totalPages})
                    </option>
                  ))}
                </select>
              </div>

              {selectedBook && (
                <div className="space-y-2">
                  <Label>Página atual (onde vai começar)</Label>
                  <Input
                    type="number"
                    value={startPage}
                    onChange={(e) => setStartPage(Number(e.target.value))}
                    min={0}
                    max={selectedBook.totalPages}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Quanto tempo pretende ler?</Label>
                <TimerPicker value={minutes} onChange={setMinutes} />
              </div>
            </div>

            <Button size="lg" className="w-full" disabled={!bookId} onClick={start}>
              <Play className="mr-2 h-4 w-4" /> Começar Leitura
            </Button>
          </div>

          <div className="hidden lg:block">
            {selectedBook ? (
              <div className="panel flex h-full flex-col items-center justify-center p-8 text-center">
                {selectedBook.cover ? (
                  <img
                    src={selectedBook.cover}
                    alt={selectedBook.title}
                    className="mb-4 h-64 w-44 rounded-lg object-cover shadow-2xl"
                  />
                ) : (
                  <div className="mb-4 grid h-64 w-44 place-items-center rounded-lg bg-secondary text-4xl">
                    📕
                  </div>
                )}
                <h3 className="font-display text-xl font-bold">{selectedBook.title}</h3>
                <p className="text-sm text-muted-foreground">{selectedBook.author}</p>
                <div className="mt-4 w-full max-w-xs space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Progresso</span>
                    <span>{Math.round((selectedBook.currentPage / selectedBook.totalPages) * 100)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${(selectedBook.currentPage / selectedBook.totalPages) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="panel flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <div className="mb-4 text-6xl">📖</div>
                <p>Selecione um livro para ver os detalhes aqui.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReadingRunning({ timer }: { timer: any }) {
  const state = useGame();
  const elapsed = useTick();
  const remaining = timerRemainingSec(timer);
  const isPaused = timer.pausedAt !== null;

  const book = state.books.find((b) => b.id === timer.meta.bookId);

  if (remaining <= 0 && !isPaused) {
    return <ReadingCompletion timer={timer} />;
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-8 py-10">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold">Lendo: {book?.title}</h2>
        <p className="text-muted-foreground">Mantenha o foco até o fim!</p>
      </div>

      <TimerDial
        remainingSec={remaining}
        totalSec={timer.durationSec ?? 0}
        isPaused={isPaused}
        kind="read"
      />

      <div className="flex gap-4">
        {isPaused ? (
          <Button size="lg" variant="outline" onClick={() => resumeTimer()}>
            <Play className="mr-2 h-4 w-4" /> Continuar
          </Button>
        ) : (
          <Button size="lg" variant="outline" onClick={() => pauseTimer()}>
            <Pause className="mr-2 h-4 w-4" /> Pausar
          </Button>
        )}

        <Button size="lg" variant="destructive" onClick={() => endTimerEarly()}>
          <Square className="mr-2 h-4 w-4" /> Encerrar
        </Button>
      </div>
    </div>
  );
}

function ReadingCompletion({ timer }: { timer: any }) {
  const state = useGame();
  const [endPage, setEndPage] = useState<number>(timer.meta.startPage ?? 0);
  const [notes, setNotes] = useState("");

  const book = state.books.find((b) => b.id === timer.meta.bookId);
  const durationSec = Math.min(timerElapsedSec(timer), timer.durationSec ?? 0);
  const earlyEnd = Boolean(timer.meta.earlyEnd);

  useEffect(() => {
    if (!earlyEnd) playTimerEndSfx();
  }, [earlyEnd]);

  function save() {
    saveReadingSession({
      timer,
      durationSec,
      earlyEnd,
      endPage,
      notes: notes || undefined,
    });
  }

  const pagesRead = Math.max(0, endPage - (timer.meta.startPage ?? 0));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leitura concluída!"
        icon="✅"
        subtitle="Registre seu progresso e o que aprendeu."
      />

      <div className="panel grid gap-3 p-6 sm:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">⏱️ Tempo lido</p>
          <p className="font-display text-xl font-bold italic">{duration(durationSec)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">📕 Livro</p>
          <p className="font-display text-xl font-bold italic truncate">{book?.title ?? "—"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">📄 Páginas lidas</p>
          <p className="font-display text-xl font-bold italic">{pagesRead}</p>
        </div>
      </div>

      {earlyEnd && (
        <div className="panel p-4 text-sm text-ember border-ember/20 bg-ember/5">
          Você encerrou antes do tempo — as recompensas foram calculadas proporcionalmente.
        </div>
      )}

      <div className="panel space-y-6 p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Em qual página você parou?</Label>
            <Input
              type="number"
              value={endPage}
              onChange={(e) => setEndPage(Number(e.target.value))}
              min={timer.meta.startPage ?? 0}
              max={book?.totalPages}
            />
            {book && (
              <p className="text-xs text-muted-foreground">
                Total do livro: {book.totalPages} páginas.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Anotações (opcional)</Label>
            <Textarea
              placeholder="O que aconteceu nesse capítulo? Alguma citação legal?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => cancelTimer()}>
            Descartar Sessão
          </Button>
          <Button className="flex-1" onClick={save}>
            Salvar e Coletar Recompensas
          </Button>
        </div>
      </div>

      <ContinueSessionPanel />
    </div>
  );
}
