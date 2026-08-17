import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { useCloudSync } from "@/hooks/use-auth";
import { compareProfiles } from "@/lib/friends.functions";
import {
  dailySeries,
  mapProfile,
  periodTotals,
  type PeriodKey,
  type PublicProfile,
} from "@/lib/game/cloud";
import { EmptyState, PageHeader } from "@/components/game/Primitives";
import { FriendIdentity } from "@/routes/amigos";
import { Button } from "@/components/ui/button";
import { duration, num } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/comparar/$publicId")({
  head: () => ({
    meta: [
      { title: "Comparar perfis — Monster Study" },
      {
        name: "description",
        content:
          "Compare seu progresso com o de um amigo: tempo de foco, páginas lidas, XP, monstros e troféus por período.",
      },
      { property: "og:title", content: "Comparar perfis — Monster Study" },
      {
        property: "og:description",
        content: "Você vs. seu amigo: hoje, semana, mês e total.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ComparePage,
});

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "today", label: "Hoje" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "all", label: "Total" },
];

function ComparePage() {
  const { publicId } = Route.useParams();
  const { user } = useCloudSync();
  const fetchCompare = useServerFn(compareProfiles);
  const [me, setMe] = useState<PublicProfile | null>(null);
  const [other, setOther] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("today");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    void fetchCompare({ data: { publicId } })
      .then((r) => {
        setMe(r.me ? mapProfile(r.me as Record<string, unknown>) : null);
        setOther(r.other ? mapProfile(r.other as Record<string, unknown>) : null);
      })
      .finally(() => setLoading(false));
  }, [user, publicId, fetchCompare]);

  if (!user) {
    return (
      <EmptyState
        icon="🔐"
        title="Entre na sua conta"
        description="A comparação usa os dados online do seu perfil."
        action={
          <Button asChild>
            <Link to="/entrar">Entrar ou criar conta</Link>
          </Button>
        }
      />
    );
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando comparação…</p>;
  }

  if (!me || !other) {
    return (
      <EmptyState
        icon="🔎"
        title="Perfil não encontrado"
        description="Esse ID não existe ou o perfil ainda não sincronizou."
        action={
          <Button asChild>
            <Link to="/amigos">Voltar aos amigos</Link>
          </Button>
        }
      />
    );
  }

  const a = periodTotals(me, period);
  const b = periodTotals(other, period);
  const rows: Array<{ label: string; a: number; b: number; fmt: (v: number) => string }> = [
    { label: "Tempo total", a: a.totalSec, b: b.totalSec, fmt: duration },
    { label: "Estudo", a: a.studySec, b: b.studySec, fmt: duration },
    { label: "Leitura", a: a.readSec, b: b.readSec, fmt: duration },
    { label: "Páginas", a: a.pages, b: b.pages, fmt: num },
    { label: "Sessões", a: a.sessions, b: b.sessions, fmt: num },
    { label: "XP ganho", a: a.xp, b: b.xp, fmt: num },
    { label: "Monstros capturados", a: a.monsters, b: b.monsters, fmt: num },
    { label: "Missões concluídas", a: a.quests, b: b.quests, fmt: num },
    { label: "Vitórias", a: a.wins, b: b.wins, fmt: num },
    { label: "Derrotas", a: a.losses, b: b.losses, fmt: num, },
    {
      label: period === "all" ? "Troféus" : "Troféus no período",
      a: a.trophiesDelta,
      b: b.trophiesDelta,
      fmt: num,
    },
    { label: "Sequência atual", a: a.streakCurrent, b: b.streakCurrent, fmt: (v) => `${v}d` },
    { label: "Sequência recorde", a: a.streakBest, b: b.streakBest, fmt: (v) => `${v}d` },
    {
      label: "Monstros na coleção",
      a: Object.keys(me.monsters ?? {}).length,
      b: Object.keys(other.monsters ?? {}).length,
      fmt: num,
    },
    { label: "Nível", a: me.level, b: other.level, fmt: num },
  ];

  const seriesA = dailySeries(me, 30);
  const seriesB = dailySeries(other, 30);
  const maxMin = Math.max(1, ...seriesA.map((d) => d.minutes), ...seriesB.map((d) => d.minutes));

  return (
    <div className="space-y-6">
      <PageHeader title="Comparar perfis" icon="⚖️" subtitle="Você vs. seu amigo." />

      <Button asChild variant="secondary" size="sm">
        <Link to="/amigos">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar aos amigos
        </Link>
      </Button>

      <div className="panel grid gap-3 p-5 sm:grid-cols-2">
        <FriendIdentity profile={me} />
        <FriendIdentity profile={other} />
      </div>

      <div className="flex gap-1 rounded-xl bg-secondary/60 p-1">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              period === p.key
                ? "bg-primary/25 text-foreground ring-1 ring-primary/40"
                : "text-muted-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="panel divide-y divide-border/50 p-0">
        {rows.map((r) => {
          const total = Math.max(1, r.a + r.b);
          return (
            <div key={r.label} className="space-y-1.5 p-4">
              <div className="flex items-baseline justify-between gap-3 text-sm tabular-nums">
                <span
                  className={cn(
                    "font-display font-bold",
                    r.a > r.b ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {r.fmt(r.a)}
                </span>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {r.label}
                </span>
                <span
                  className={cn(
                    "font-display font-bold",
                    r.b > r.a ? "text-ember" : "text-muted-foreground",
                  )}
                >
                  {r.fmt(r.b)}
                </span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                <div className="bg-primary" style={{ width: `${(r.a / total) * 100}%` }} />
                <div className="ml-auto bg-ember" style={{ width: `${(r.b / total) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-lg font-bold">Últimos 30 dias (minutos por dia)</h2>
        <div className="flex h-32 items-end gap-[3px]">
          {seriesA.map((d, i) => (
            <div key={d.day} className="flex h-full flex-1 items-end gap-[1px]">
              <div
                className="w-full rounded-t bg-primary/80"
                style={{ height: `${(d.minutes / maxMin) * 100}%` }}
                title={`${me.displayName}: ${d.minutes} min (${d.day})`}
              />
              <div
                className="w-full rounded-t bg-ember/80"
                style={{ height: `${((seriesB[i]?.minutes ?? 0) / maxMin) * 100}%` }}
                title={`${other.displayName}: ${seriesB[i]?.minutes ?? 0} min (${d.day})`}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {me.displayName}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-ember" />
            {other.displayName}
          </span>
        </div>
      </section>
    </div>
  );
}
