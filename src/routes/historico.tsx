import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useGame } from "@/hooks/use-game";
import { allSessions } from "@/lib/game/state";
import { MONSTERS_BY_ID } from "@/lib/game/monsters";
import { EmptyState, PageHeader } from "@/components/game/Primitives";
import { MonsterArt, RarityBadge } from "@/components/game/MonsterArt";
import { dateTime, duration, money, num } from "@/lib/format";
import { cn } from "@/lib/utils";

type Filter = "all" | "study" | "read" | "free";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "Tudo" },
  { id: "study", label: "📚 Estudo" },
  { id: "read", label: "📕 Leitura" },
  { id: "free", label: "🎯 Livre" },
];

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — Monster Study" },
      {
        name: "description",
        content: "Todas as suas sessões de estudo, leitura e treino livre com recompensas obtidas.",
      },
      { property: "og:title", content: "Histórico — Monster Study" },
      { property: "og:description", content: "Registro completo das suas sessões e recompensas." },
    ],
  }),
  component: History,
});

function History() {
  const state = useGame();
  const [filter, setFilter] = useState<Filter>("all");
  const sessions = useMemo(() => {
    void state;
    const all = allSessions();
    return filter === "all" ? all : all.filter((s) => s.kind === filter);
  }, [state, filter]);

  return (
    <div className="space-y-6">
      <PageHeader title="Histórico" icon="🕰️" subtitle={`${sessions.length} sessões registradas`} />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm transition-colors",
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/70 text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon="🕰️"
          title="Nenhuma sessão ainda"
          description="Suas sessões concluídas aparecerão aqui com todos os detalhes e recompensas."
        />
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => {
            const reward = s.kind === "free" ? null : s.reward;
            const earlyEnd = s.kind === "free" ? false : s.earlyEnd;
            const def = reward?.monsterId ? MONSTERS_BY_ID[reward.monsterId] : null;
            const book = s.kind === "read" ? state.books.find((b) => b.id === s.bookId) : null;
            return (
              <li key={s.id} className="panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display font-semibold">
                    {s.kind === "study" ? "📚 " : s.kind === "read" ? "📕 " : "🎯 "}
                    {s.kind === "study"
                      ? s.subject
                      : s.kind === "read"
                        ? (book?.title ?? "Livro removido")
                        : "Estudo livre"}
                  </p>
                  <p className="text-xs text-muted-foreground">{dateTime(s.endedAt)}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {duration(s.durationSec)}
                  {s.kind === "read" && ` · ${s.pagesRead} páginas · ${num(s.pagesPerMin, 2)} pág/min`}
                  {s.kind === "study" && s.topic ? ` · ${s.topic}` : ""}
                  {earlyEnd ? " · encerrada antes do fim" : ""}
                </p>
                {"notes" in s && s.notes ? (
                  <p className="mt-1 text-sm italic text-muted-foreground">"{s.notes}"</p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  {def && (
                    <span className="flex items-center gap-2">
                      <MonsterArt art={def.art} rarity={def.rarity} size="sm" animate={false} />
                      <span className="font-medium">{def.name}</span>
                      <RarityBadge rarity={def.rarity} />
                    </span>
                  )}
                  {reward && (
                    <>
                      <span className="text-xs text-muted-foreground">+{num(reward.xp)} XP</span>
                      <span className="text-xs text-gold">+{money(reward.money)}</span>
                    </>
                  )}
                </div>

              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
