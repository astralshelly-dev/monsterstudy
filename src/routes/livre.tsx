import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pause, Play, Square } from "lucide-react";
import { useGame } from "@/hooks/use-game";
import {
  cancelTimer,
  monsterProgress,
  pauseTimer,
  resumeTimer,
  saveFreeSession,
  startTimer,
  timerElapsedSec,
} from "@/lib/game/state";
import { EmptyState, PageHeader } from "@/components/game/Primitives";
import { TimerDial } from "@/components/game/TimerDial";
import { useTick } from "@/components/game/TimerPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonsterArt } from "@/components/game/MonsterArt";
import { BookCover } from "@/components/game/BookCover";
import { duration, num } from "@/lib/format";
import { XP } from "@/lib/game/config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/livre")({
  head: () => ({
    meta: [
      { title: "Treino Livre — Monster Study" },
      {
        name: "description",
        content:
          "Cronômetro livre para estudar ou ler sem limite de tempo, treinando e evoluindo o monstro ativo.",
      },
      { property: "og:title", content: "Treino Livre — Monster Study" },
      {
        property: "og:description",
        content: "Modo sem limite de tempo para estudo ou leitura, focado em XP para seus monstros.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FreePage,
});

type Mode = "study" | "read";

function FreePage() {
  const state = useGame();
  const timer = state.timer?.kind === "free" ? state.timer : null;
  useTick(Boolean(timer));
  const [result, setResult] = useState<{
    xp: number;
    levels: number;
    monsterId: string | null;
    pagesRead: number;
  } | null>(null);
  const [endPage, setEndPage] = useState<number | "">("");

  const activeId = state.activeMonsterId;
  const prog = activeId ? monsterProgress(activeId, state) : null;
  const timerBook = timer?.meta.bookId
    ? state.books.find((b) => b.id === timer.meta.bookId)
    : undefined;
  const isRead = Boolean(timer?.meta.bookId);

  if (result) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="panel animate-reveal max-w-md space-y-4 p-8 text-center">
          {result.levels > 0 && (
            <p className="font-display text-2xl font-bold text-gold text-glow">LEVEL UP!</p>
          )}
          {result.monsterId && prog && (
            <MonsterArt art={prog.def.art} rarity={prog.def.rarity} size="lg" className="mx-auto" />
          )}
          <p className="font-display text-xl font-semibold">
            +{num(result.xp)} XP {prog ? `para ${prog.def.name}` : ""}
          </p>
          {result.pagesRead > 0 && (
            <p className="text-sm text-muted-foreground">{result.pagesRead} páginas lidas nesta sessão.</p>
          )}
          {result.levels > 0 && prog && (
            <p className="text-sm text-muted-foreground">
              Subiu {result.levels} {result.levels === 1 ? "nível" : "níveis"} — agora está no nível{" "}
              {prog.level}.
            </p>
          )}
          <Button className="w-full" onClick={() => setResult(null)}>
            Continuar
          </Button>
        </div>
      </div>
    );
  }

  if (!activeId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Treino Livre" icon="🧠" />
        <EmptyState
          icon="🐾"
          title="Nenhum monstro ativo"
          description="O Treino Livre treina o monstro selecionado. Conclua uma sessão de estudo ou leitura para encontrar seu primeiro monstro."
          action={
            <Button asChild>
              <Link to="/estudar">Fazer uma sessão de estudo</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (timer) {
    const elapsed = timerElapsedSec(timer);
    const paused = Boolean(timer.pausedAt);
    const start = timer.meta.startPage ?? 0;
    const pages = isRead && typeof endPage === "number" ? Math.max(0, endPage - start) : 0;
    return (
      <div className="space-y-8">
        <PageHeader
          title="Treino Livre"
          icon={isRead ? "📖" : "🧠"}
          subtitle="Sem limite de tempo. Pare quando quiser."
        />
        <div className="panel aurora grid place-items-center gap-6 p-8">
          <TimerDial
            remaining={0}
            total={0}
            countUp
            elapsed={elapsed}
            label={
              isRead
                ? `📖 ${timerBook?.title ?? "Leitura livre"}`
                : timer.meta.subject
                  ? `📚 ${timer.meta.subject}`
                  : "🧠 Treino Livre"
            }
            sublabel={prog ? `Treinando ${prog.def.name} · Nv ${prog.level}` : undefined}
          />
          <p className="text-sm text-muted-foreground">
            XP acumulado:{" "}
            <span className="font-semibold">
              {num((elapsed / 60) * XP.freeStudyPerMinute + pages * XP.perPage)}
            </span>
          </p>
          {isRead && (
            <div className="w-full max-w-xs space-y-1.5">
              <Label>Página atual (começou na {start})</Label>
              <Input
                type="number"
                value={endPage}
                placeholder={String(start)}
                onChange={(e) => setEndPage(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            {paused ? (
              <Button size="lg" onClick={resumeTimer}>
                <Play className="h-4 w-4" /> Retomar
              </Button>
            ) : (
              <Button size="lg" variant="secondary" onClick={pauseTimer}>
                <Pause className="h-4 w-4" /> Pausar
              </Button>
            )}
            <Button
              size="lg"
              onClick={() => {
                const r = saveFreeSession({
                  timer,
                  durationSec: elapsed,
                  mode: isRead ? "read" : "study",
                  ...(isRead && typeof endPage === "number" ? { endPage } : {}),
                });
                setEndPage("");
                if (r.milestoneXp > 0) {
                  toast.success(
                    `💥 Explosão de XP! ${r.milestones.length} meta(s) de tempo alcançada(s)`,
                    { description: `+${r.milestoneXp} XP extra para o monstro em treino` },
                  );
                }
                setResult({
                  xp: r.monsterXp,
                  levels: r.levelsGained,
                  monsterId: r.monsterId,
                  pagesRead: r.pagesRead,
                });
              }}
            >
              <Square className="h-4 w-4" /> Encerrar e ganhar XP
            </Button>
            <Button size="lg" variant="ghost" onClick={cancelTimer}>
              Descartar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <FreeSetup />;
}

function FreeSetup() {
  const state = useGame();
  const [mode, setMode] = useState<Mode>("study");
  const [subject, setSubject] = useState("");
  const [bookId, setBookId] = useState<string | null>(null);
  const activeId = state.activeMonsterId!;
  const prog = monsterProgress(activeId, state);
  const books = state.books.filter((b) => b.shelf !== "concluido");
  const book = books.find((b) => b.id === bookId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treino Livre"
        icon="🧠"
        subtitle="Cronômetro crescente, sem limite. Estude ou leia — todo o tempo vira XP para o monstro ativo."
      />

      {prog && (
        <div className="panel flex items-center gap-5 p-6">
          <MonsterArt art={prog.def.art} rarity={prog.def.rarity} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl font-bold">{prog.def.name}</p>
            <p className="text-sm text-muted-foreground">Nível {prog.level}</p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
                style={{ width: `${prog.pct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {num(prog.xp)} / {num(prog.need)} XP
            </p>
            <Link to="/monstros" className="mt-2 inline-block text-xs text-primary hover:underline">
              Trocar monstro em treino
            </Link>
          </div>
        </div>
      )}

      <div className="panel space-y-4 p-6">
        <div className="flex gap-2">
          {(
            [
              { id: "study", label: "🧠 Estudo livre" },
              { id: "read", label: "📖 Leitura livre" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cn(
                "flex-1 rounded-xl px-4 py-2.5 text-sm transition-colors",
                mode === m.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/70 text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === "study" ? (
          <div className="space-y-2">
            <Label>O que você vai estudar? (opcional)</Label>
            <Input
              placeholder="Ex: Revisão geral de Física"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
        ) : books.length === 0 ? (
          <EmptyState
            icon="📚"
            title="Nenhum livro disponível"
            description="Cadastre um livro na Biblioteca para treinar com leitura livre."
            action={
              <Button asChild>
                <Link to="/biblioteca">Ir para a Biblioteca</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            <Label>Escolha o livro</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {books.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBookId(b.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl p-3 text-left ring-1 transition-colors",
                    bookId === b.id ? "bg-primary/15 ring-primary" : "bg-secondary/50 ring-border",
                  )}
                >
                  <BookCover book={b} className="h-16 w-11" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{b.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Página {b.currentPage} de {b.totalPages}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Ganho: {XP.freeStudyPerMinute} XP por minuto (+{XP.perPage} XP por página na leitura) para o
          monstro ativo. Sessões livres contam para seu streak, mas não geram novos monstros.
        </p>
        <Button
          size="lg"
          className="w-full"
          disabled={state.timer !== null || (mode === "read" && !book)}
          onClick={() =>
            startTimer({
              kind: "free",
              durationSec: null,
              meta:
                mode === "read"
                  ? { bookId: book!.id, startPage: book!.currentPage }
                  : { subject: subject || undefined },
            })
          }
        >
          Iniciar {mode === "read" ? "Leitura Livre" : "Estudo Livre"} ({duration(0)})
        </Button>
      </div>
    </div>
  );
}
