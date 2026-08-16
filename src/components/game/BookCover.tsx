import type { Book } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function BookCover({ book, className }: { book: Book; className?: string }) {
  if (book.cover) {
    return (
      <img
        src={book.cover}
        alt={`Capa de ${book.title}`}
        loading="lazy"
        className={cn("shrink-0 rounded-lg object-cover ring-1 ring-border/60", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-lg bg-secondary p-2 text-center ring-1 ring-border/60",
        className,
      )}
    >
      <span className="line-clamp-3 font-display text-[10px] font-semibold leading-tight">
        {book.title}
      </span>
    </div>
  );
}
