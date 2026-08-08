import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useGame } from "@/hooks/use-game";
import { addBook } from "@/lib/game/state";
import { BOOK_GENRES, BOOK_SHELVES, type ShelfId } from "@/lib/game/config";
import { EmptyState, PageHeader } from "@/components/game/Primitives";
import { BookCover } from "@/components/game/BookCover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/biblioteca/")({
  head: () => ({
    meta: [
      { title: "Biblioteca — Monster Study" },
      {
        name: "description",
        content:
          "Sua biblioteca pessoal: livros lendo agora, quero ler e concluídos, com progresso de páginas.",
      },
      { property: "og:title", content: "Biblioteca — Monster Study" },
      {
        property: "og:description",
        content: "Organize seus livros e acompanhe o progresso de leitura.",
      },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const state = useGame();
  const [shelf, setShelf] = useState<ShelfId>("lendo");
  const books = state.books.filter((b) => b.shelf === shelf);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biblioteca"
        icon="📕"
        subtitle={`${state.books.length} livros cadastrados`}
        action={<AddBookDialog />}
      />

      <div className="flex flex-wrap gap-2">
        {BOOK_SHELVES.map((s) => {
          const count = state.books.filter((b) => b.shelf === s.id).length;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setShelf(s.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm transition-colors",
                shelf === s.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/70 text-muted-foreground hover:text-foreground",
              )}
            >
              {s.icon} {s.name} ({count})
            </button>
          );
        })}
      </div>

      {books.length === 0 ? (
        <EmptyState
          icon="📚"
          title="Nenhum livro nesta estante"
          description="Adicione um livro para começar a registrar suas leituras e ganhar monstros."
          action={<AddBookDialog />}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((b) => {
            const pct = Math.round((b.currentPage / b.totalPages) * 100);
            return (
              <Link
                key={b.id}
                to="/biblioteca/$bookId"
                params={{ bookId: b.id }}
                className="panel panel-hover flex gap-4 p-4"
              >
                <BookCover book={b} className="h-28 w-20" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-semibold">{b.title}</p>
                  {b.subtitle && (
                    <p className="truncate text-xs text-muted-foreground">{b.subtitle}</p>
                  )}
                  <p className="truncate text-xs text-muted-foreground">{b.author}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{b.genre}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-to-r from-accent to-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs">
                    {b.currentPage} / {b.totalPages} · {pct}%
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddBookDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalPages, setTotalPages] = useState<number | "">("");
  const [synopsis, setSynopsis] = useState("");
  const [genre, setGenre] = useState<string>("Fantasia");
  const [customGenre, setCustomGenre] = useState("");
  const [shelf, setShelf] = useState<ShelfId>("lendo");
  const [cover, setCover] = useState<string | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTitle("");
    setSubtitle("");
    setAuthor("");
    setCustomGenre("");
    setTotalPages("");
    setSynopsis("");
    setCover(undefined);
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 2_500_000) {
      toast.error("Imagem muito grande (máx. 2,5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCover(String(reader.result));
    reader.readAsDataURL(file);
  }

  function submit() {
    if (!title || typeof totalPages !== "number" || totalPages <= 0) {
      toast.error("Informe ao menos título e número de páginas.");
      return;
    }
    addBook({
      title,
      author: author || "Autor desconhecido",
      subtitle: subtitle || undefined,
      totalPages,
      currentPage: 0,
      synopsis,
      genre: genre === "Outros" ? customGenre.trim() || "Outros" : genre,
      shelf,
      cover,
    });
    toast.success(`"${title}" adicionado à biblioteca`);
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Adicionar livro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Adicionar livro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="grid h-32 w-24 shrink-0 place-items-center rounded-lg bg-secondary/60 text-center text-[11px] text-muted-foreground ring-1 ring-border"
            >
              {cover ? (
                <img src={cover} alt="Capa selecionada" className="h-full w-full rounded-lg object-cover" />
              ) : (
                <span>
                  📷
                  <br />
                  Capa
                </span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Subtítulo</Label>
                <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Autor</Label>
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Total de páginas</Label>
              <Input
                type="number"
                value={totalPages}
                onChange={(e) => setTotalPages(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Gênero</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOK_GENRES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {genre === "Outros" && (
                <Input
                  placeholder="Escreva o gênero"
                  value={customGenre}
                  onChange={(e) => setCustomGenre(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Estante</Label>
              <Select value={shelf} onValueChange={(v) => setShelf(v as ShelfId)}>
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

          <div className="space-y-1.5">
            <Label>Sinopse</Label>
            <Textarea rows={3} value={synopsis} onChange={(e) => setSynopsis(e.target.value)} />
          </div>

          <Button className="w-full" onClick={submit}>
            Adicionar à biblioteca
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
