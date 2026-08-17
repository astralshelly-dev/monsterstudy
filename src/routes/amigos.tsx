import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { useCloudSync } from "@/hooks/use-auth";
import {
  listFriends,
  removeFriend,
  respondFriendRequest,
  sendFriendRequest,
} from "@/lib/friends.functions";
import { mapProfile, periodTotals, type PeriodKey, type PublicProfile } from "@/lib/game/cloud";
import { EmptyState, PageHeader } from "@/components/game/Primitives";
import { ProfileAvatar } from "@/components/game/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COSMETICS_BY_ID, titleNameClass } from "@/lib/game/cosmetics";
import { leagueOf } from "@/lib/game/battle/config";
import { duration, num } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/amigos")({
  head: () => ({
    meta: [
      { title: "Amigos — Monster Study" },
      {
        name: "description",
        content:
          "Adicione amigos pelo ID, acompanhe quem estudou mais hoje, na semana e no mês, e compare perfis em detalhe.",
      },
      { property: "og:title", content: "Amigos — Monster Study" },
      {
        property: "og:description",
        content: "Ranking de amigos e comparação de perfis por período no Monster Study.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FriendsPage,
});

type Edge = {
  id: string;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing";
  createdAt: string;
  profile: PublicProfile | null;
};

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "today", label: "Hoje" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "all", label: "Total" },
];

function FriendsPage() {
  const { user, publicId } = useCloudSync();
  const fetchFriends = useServerFn(listFriends);
  const send = useServerFn(sendFriendRequest);
  const respond = useServerFn(respondFriendRequest);
  const drop = useServerFn(removeFriend);

  const [friends, setFriends] = useState<Edge[]>([]);
  const [incoming, setIncoming] = useState<Edge[]>([]);
  const [outgoing, setOutgoing] = useState<Edge[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>("today");

  const conv = (list: Array<{ profile: unknown } & Omit<Edge, "profile">>): Edge[] =>
    list.map((e) => ({
      ...e,
      profile: e.profile ? mapProfile(e.profile as Record<string, unknown>) : null,
    }));

  const reload = useCallback(async () => {
    const res = await fetchFriends({});
    setFriends(conv(res.friends as never));
    setIncoming(conv(res.incoming as never));
    setOutgoing(conv(res.outgoing as never));
  }, [fetchFriends]);

  useEffect(() => {
    if (!user) return;
    void reload();
  }, [user, reload]);

  async function add() {
    if (!query.trim()) return;
    setBusy(true);
    try {
      const r = await send({ data: { publicId: query } });
      if (r.ok) {
        toast.success(r.message);
        setQuery("");
        await reload();
      } else toast.error(r.message);
    } finally {
      setBusy(false);
    }
  }

  async function answer(id: string, accept: boolean) {
    const r = await respond({ data: { id, accept } });
    if (r.ok) toast.success(r.message);
    await reload();
  }

  async function unfriend(id: string) {
    const r = await drop({ data: { id } });
    if (r.ok) toast.success(r.message);
    await reload();
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title="Amigos" icon="🤝" />
        <EmptyState
          icon="🔐"
          title="Entre na sua conta"
          description="Amigos e comparações precisam de conta — é ela que gera seu ID de jogador."
          action={
            <Button asChild>
              <Link to="/entrar">Entrar ou criar conta</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const ranking = [...friends]
    .filter((f) => f.profile)
    .map((f) => ({ edge: f, totals: periodTotals(f.profile!, period) }))
    .sort((a, b) => b.totals.totalSec - a.totals.totalSec);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Amigos"
        icon="🤝"
        subtitle="Adicione pelo ID, veja quem focou mais e compare perfis."
      />

      <div className="panel space-y-3 p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Seu ID de jogador</p>
        <p className="font-display text-2xl font-bold tracking-[0.2em] text-primary">
          {publicId ?? "—"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            placeholder="ID do amigo"
            className="max-w-[220px] font-mono tracking-widest"
          />
          <Button onClick={() => void add()} disabled={busy}>
            <UserPlus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </div>

      {incoming.length > 0 && (
        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-lg font-bold">Pedidos recebidos</h2>
          {incoming.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
              <FriendIdentity profile={e.profile} />
              <div className="ml-auto flex gap-2">
                <Button size="sm" onClick={() => void answer(e.id, true)}>
                  Aceitar
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void answer(e.id, false)}>
                  Recusar
                </Button>
              </div>
            </div>
          ))}
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-lg font-bold">Pedidos enviados</h2>
          {outgoing.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
              <FriendIdentity profile={e.profile} />
              <Button
                size="sm"
                variant="secondary"
                className="ml-auto"
                onClick={() => void unfriend(e.id)}
              >
                Cancelar
              </Button>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Users className="h-4 w-4 text-primary" />
            Ranking dos amigos
          </h2>
          <div className="flex gap-1 rounded-xl bg-secondary/60 p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  period === p.key
                    ? "bg-primary/25 text-foreground ring-1 ring-primary/40"
                    : "text-muted-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {ranking.length === 0 ? (
          <EmptyState
            icon="🫂"
            title="Sem amigos ainda"
            description="Peça o ID de jogador de alguém e envie um pedido acima para começar a comparar progresso."
          />
        ) : (
          <div className="space-y-2">
            {ranking.map(({ edge, totals }, i) => {
              const p = edge.profile!;
              return (
                <div key={edge.id} className="panel flex flex-wrap items-center gap-3 p-3">
                  <span className="w-6 text-center font-display text-lg font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <FriendIdentity profile={p} />
                  <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] tabular-nums text-muted-foreground">
                    <span>⏱ {duration(totals.totalSec)}</span>
                    <span>📖 {num(totals.pages)} pág.</span>
                    <span>⭐ {num(totals.xp)} XP</span>
                    <span>🐲 {num(totals.monsters)}</span>
                    <span>🏆 {num(p.stats.trophies ?? 0)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="secondary">
                      <Link to="/comparar/$publicId" params={{ publicId: p.publicId }}>
                        Comparar
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void unfriend(edge.id)}>
                      Remover
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export function FriendIdentity({ profile }: { profile: PublicProfile | null }) {
  if (!profile) return <span className="text-sm text-muted-foreground">Jogador removido</span>;
  const title = profile.stats.title ? COSMETICS_BY_ID[profile.stats.title] : undefined;
  const league = leagueOf(profile.stats.trophies ?? 0);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProfileAvatar
        avatar={profile.avatar}
        monsterId={profile.avatarMonsterId}
        size="sm"
      />
      <div className="min-w-0">
        <p className={cn("truncate font-display text-sm font-bold", titleNameClass(title?.id))}>
          {profile.displayName}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {profile.publicId} · Nv {profile.level} · {league.icon} {league.name}
        </p>
      </div>
    </div>
  );
}
