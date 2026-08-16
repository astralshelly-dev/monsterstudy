import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useGame } from "@/hooks/use-game";
import { bookStats, deleteBook, updateBook } from "@/lib/game/state";
import { BOOK_SHELVES, type ShelfId } from "@/lib/game/config";
import { PageHeader, StatCard } from "@/components/game/Primitives";
import { BookCover } from "@/components/game/BookCover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dateTime, duration, num, minSec } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MONSTERS_BY_ID } from "@/lib/game/monsters";
import { RarityBadge } from "@/components/game/MonsterArt";

export const Route = createFileRoute("/biblioteca/$bookId")({
  head: () => ({
    meta: [
      { title: "Livro — Monster Study" },
      {
        name: "description",
        content:
          "Detalhes do livro: progresso, tempo de leitura, velocidade média e histórico de sessões.",
      },
      { property: "og:title", content: "Livro — Monster Study" },
      { property: "og:description", content: "Estatísticas e histórico de leitura deste livro." },
    ],
  }),
  component: BookDetail,
});

function BookDetail() {
  const { bookId } = Route.useParams();
  const state = useGame();
  const navigate = useNavigate();
  const book = state.books.find((b) => b.id === bookId);
  const stats = bookStats(bookId, state);

  if (!book) {
    return (
      <div className="panel p-8 text-center">
        <p className="font-display text-lg">Livro não encontrado</p>
        <Button asChild className="mt-4">
          <Link to="/biblioteca">Voltar para a Biblioteca</Link>
        </Button>
      </div>
    );
  }

  const pct = (book.currentPage / book.totalPages) * 100;

  return (
    <div className="space-y-6">
      <PageHeader
        title={book.title}
        icon="📕"
        subtitle={book.author}
        action={
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/ler">Começar leitura</Link>
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                deleteBook(book.id);
                toast.success("Livro removido");
                navigate({ to: "/biblioteca" });
              }}
            >
              Remover
            </Button>
          </div>
        }
      />

      <div className="panel flex flex-wrap gap-6 p-6">
        <BookCover book={book} className="h-56 w-40" />
        <div className="min-w-64 flex-1 space-y-3">
          {book.subtitle && (
            <p className="font-display text-lg text-muted-foreground">{book.subtitle}</p>
          )}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-secondary/70 px-3 py-1">{book.genre}</span>
            <span className="rounded-full bg-secondary/70 px-3 py-1">
              {BOOK_SHELVES.find((s) => s.id === book.shelf)?.name}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{book.synopsis || "Sem sinopse cadastrada."}</p>
          <div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1 text-sm">
              Página {book.currentPage} de {book.totalPages} · {num(pct, 1)}% concluído
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Página atual</Label>
              <Input
                type="number"
                value={book.currentPage}
                onChange={(e) =>
                  updateBook(book.id, {
                    currentPage: Math.min(book.totalPages, Math.max(0, Number(e.target.value))),
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estante</Label>
              <Select
                value={book.shelf}
                onValueChange={(v) => updateBook(book.id, { shelf: v as ShelfId })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOK_SHELVES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.icon} {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tempo lendo" value={duration(stats.totalSec)} />
        <StatCard label="Páginas lidas" value={num(stats.pages)} />
        <StatCard label="Ritmo médio" value={`${minSec(stats.avgMinPerPage)} min/pág`} />
        <StatCard label="Sessões" value={num(stats.sessions.length)} />
      </div>

      <section className="panel p-5">
        <h2 className="font-display text-lg font-semibold">Histórico deste livro</h2>
        {stats.sessions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma sessão registrada ainda.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {stats.sessions.map((s) => {
              const def = s.reward?.monsterId ? MONSTERS_BY_ID[s.reward.monsterId] : null;
              return (
                <li key={s.id} className="rounded-xl bg-secondary/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{dateTime(s.endedAt)}</p>
                    <p className="text-xs text-muted-foreground">{duration(s.durationSec)}</p>
                  </div>
                  <p className="mt-1 text-sm">
                    Página {s.startPage} → {s.endPage} · {s.pagesRead} páginas ·{" "}
                    {minSec(s.minPerPage)} min/pág
                  </p>
                  {s.notes && <p className="mt-1 text-sm italic text-muted-foreground">"{s.notes}"</p>}
                  {def && s.reward && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className="text-lg">{def.art}</span>
                      <span className="font-medium">{def.name}</span>
                      <RarityBadge rarity={def.rarity} />
                      <span className="text-xs text-muted-foreground">+{num(s.reward.xp)} XP</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
