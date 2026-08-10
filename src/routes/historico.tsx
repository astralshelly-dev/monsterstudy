import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useGame } from "@/hooks/use-game";
import { allSessions, visibleRarities } from "@/lib/game/state";
import { MONSTERS_BY_ID } from "@/lib/game/monsters";
import { HABITATS, RARITIES, TIMERS, type RarityId } from "@/lib/game/config";
import { EmptyState, PageHeader } from "@/components/game/Primitives";
import { MonsterArt, RarityBadge } from "@/components/game/MonsterArt";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dateTime, duration, money, num } from "@/lib/format";
import type { Session } from "@/lib/game/types";
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

/** minutos do cronômetro usado na sessão */
function sessionMinutes(s: Session): number {
  const sec = s.kind === "free" ? s.durationSec : s.plannedSec || s.durationSec;
  return Math.round(sec / 60);
}

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm transition-colors",
              value === o.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/70 text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function History() {
  const state = useGame();
  const [filter, setFilter] = useState<Filter>("all");
  const [rarity, setRarity] = useState<RarityId | "all" | "none">("all");
  const [minutes, setMinutes] = useState<string>("all");
  const [selected, setSelected] = useState<Session | null>(null);

  const all = useMemo(() => {
    void state;
    return allSessions();
  }, [state]);

  const timeOptions = useMemo(() => {
    const set = new Set<number>();
    for (const s of all) set.add(sessionMinutes(s));
    const known = TIMERS.map((t) => t.minutes).filter((m) => set.has(m));
    const extra = [...set].filter((m) => !known.includes(m)).sort((a, b) => a - b);
    return [...known, ...extra];
  }, [all]);

  const sessions = useMemo(
    () =>
      all.filter((s) => {
        if (filter !== "all" && s.kind !== filter) return false;
        if (minutes !== "all" && sessionMinutes(s) !== Number(minutes)) return false;
        if (rarity !== "all") {
          const r = s.kind === "free" ? null : (s.reward?.monsterId ? s.reward.rarity : null);
          if (rarity === "none" ? r !== null : r !== rarity) return false;
        }
        return true;
      }),
    [all, filter, minutes, rarity],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Histórico" icon="🕰️" subtitle={`${sessions.length} sessões encontradas`} />

      <div className="panel space-y-4 p-4">
        <Chips label="Tipo" options={FILTERS} value={filter} onChange={setFilter} />
        <Chips
          label="Raridade do monstro"
          options={[
            { id: "all", label: "Todas" },
            { id: "none", label: "Sem monstro" },
            ...visibleRarities(state).map((r) => ({ id: r, label: RARITIES[r].name })),
          ]}
          value={rarity}
          onChange={(v) => setRarity(v as RarityId | "all" | "none")}
        />
        <Chips
          label="Tempo da sessão"
          options={[
            { id: "all", label: "Qualquer" },
            ...timeOptions.map((m) => ({ id: String(m), label: `${m} min` })),
          ]}
          value={minutes}
          onChange={setMinutes}
        />
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon="🕰️"
          title="Nenhuma sessão encontrada"
          description="Ajuste os filtros ou conclua uma nova sessão para ver os detalhes aqui."
        />
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => {
            const reward = s.kind === "free" ? null : s.reward;
            const earlyEnd = s.kind === "free" ? false : s.earlyEnd;
            const def = reward?.monsterId ? MONSTERS_BY_ID[reward.monsterId] : null;
            const book = s.kind !== "study" && s.bookId ? state.books.find((b) => b.id === s.bookId) : null;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSelected(s)}
                  className="panel w-full p-4 text-left transition-colors hover:ring-1 hover:ring-primary/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-display font-semibold">
                      {s.kind === "study" ? "📚 " : s.kind === "read" ? "📕 " : "🎯 "}
                      {s.kind === "study"
                        ? s.subject
                        : s.kind === "read"
                          ? (book?.title ?? "Livro removido")
                          : s.mode === "read"
                            ? `Treino livre · ${book?.title ?? "leitura"}`
                            : "Treino livre"}
                    </p>
                    <p className="text-xs text-muted-foreground">{dateTime(s.endedAt)}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {duration(s.durationSec)}
                    {s.kind === "read" && ` · ${s.pagesRead} páginas · ${num(s.pagesPerMin, 2)} pág/min`}
                    {s.kind === "study" && s.topic ? ` · ${s.topic}` : ""}
                    {earlyEnd ? " · encerrada antes do fim" : ""}
                  </p>
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
                    <span className="ml-auto text-xs text-primary">Ver detalhes →</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {selected && <SessionDetails session={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function SessionDetails({ session: s }: { session: Session }) {
  const state = useGame();
  const reward = s.kind === "free" ? null : s.reward;
  const def = reward?.monsterId ? MONSTERS_BY_ID[reward.monsterId] : null;
  const bookId = s.kind === "study" ? s.bookId : s.kind === "read" ? s.bookId : s.bookId;
  const book = bookId ? state.books.find((b) => b.id === bookId) : null;

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="font-display text-xl">
          {s.kind === "study"
            ? `📚 ${s.subject}`
            : s.kind === "read"
              ? `📕 ${book?.title ?? "Livro removido"}`
              : `🎯 Treino livre ${s.mode === "read" ? "de leitura" : "de estudo"}`}
        </DialogTitle>
      </DialogHeader>

      {def && (
        <div className="panel flex items-center gap-3 p-3">
          <MonsterArt art={def.art} rarity={def.rarity} />
          <div className="min-w-0">
            <p className="font-display text-lg font-bold">{def.name}</p>
            <RarityBadge rarity={def.rarity} />
            <p className="mt-1 text-xs text-muted-foreground">
              {HABITATS[def.habitat]?.name ?? def.habitat}
              {reward?.duplicate ? " · duplicata" : " · nova descoberta"}
            </p>
          </div>
        </div>
      )}

      <div>
        <Row label="Início" value={dateTime(s.startedAt)} />
        <Row label="Fim" value={dateTime(s.endedAt)} />
        <Row label="Duração" value={duration(s.durationSec)} />
        {s.kind !== "free" && <Row label="Tempo planejado" value={duration(s.plannedSec)} />}
        {s.kind !== "free" && (
          <Row label="Encerrada antes do fim" value={s.earlyEnd ? "Sim" : "Não"} />
        )}
        {s.kind === "study" && s.topic ? <Row label="Assunto" value={s.topic} /> : null}
        {s.kind === "study" && s.goal ? <Row label="Meta" value={s.goal} /> : null}
        {s.kind === "study" && s.learned ? <Row label="Aprendi" value={s.learned} /> : null}
        {book ? <Row label="Livro" value={book.title} /> : null}
        {s.kind === "read" && (
          <>
            <Row label="Páginas" value={`${s.startPage} → ${s.endPage} (${s.pagesRead})`} />
            <Row label="Ritmo" value={`${num(s.pagesPerMin, 2)} pág/min`} />
          </>
        )}
        {s.kind === "free" && s.mode === "read" && s.pagesRead !== undefined && (
          <Row label="Páginas" value={`${s.startPage ?? 0} → ${s.endPage ?? 0} (${s.pagesRead})`} />
        )}
        {s.kind === "free" && (
          <>
            <Row label="XP do monstro" value={`+${num(s.monsterXp)} XP`} />
            {s.milestoneXp ? (
              <Row label="Bônus de metas" value={`+${num(s.milestoneXp)} XP`} />
            ) : null}
            {s.monsterId && MONSTERS_BY_ID[s.monsterId] ? (
              <Row label="Monstro treinado" value={MONSTERS_BY_ID[s.monsterId]!.name} />
            ) : null}
          </>
        )}
        {reward && (
          <>
            <Row label="XP ganho" value={`+${num(reward.xp)} XP`} />
            <Row label="Moedas" value={`+${money(reward.money)}`} />
            <Row label="Fragmentos" value={`+${num(reward.shards)}`} />
            {!reward.monsterId && (
              <Row label="Monstro" value="Nenhum (menos de 50% do tempo)" />
            )}
          </>
        )}
        {"notes" in s && s.notes ? <Row label="Anotações" value={s.notes} /> : null}
      </div>
    </div>
  );
}
