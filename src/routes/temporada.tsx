import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/hooks/use-game";
import { battleData, finishSeasonIfNeeded, seasonState } from "@/lib/game/state";
import { RANK_REWARDS, SEASON_TROPHY_KEEP, leagueById, leagueReward } from "@/lib/game/seasons";
import { LEAGUES, leagueOf, leagueProgress } from "@/lib/game/battle/config";
import { trophyLeaderboard, myPublicId, type PublicProfile } from "@/lib/game/cloud";
import { useCloudSync } from "@/hooks/use-auth";
import { PageHeader, StatCard } from "@/components/game/Primitives";
import { ProfileAvatar } from "@/components/game/Avatar";
import { Button } from "@/components/ui/button";
import { money, num, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/temporada")({
  head: () => ({
    meta: [
      { title: "Temporada Competitiva — Monster Study" },
      {
        name: "description",
        content:
          "Ciclos de 60 dias com ranking de troféus, recompensas por liga e posição final na temporada.",
      },
      { property: "og:title", content: "Temporada Competitiva — Monster Study" },
      {
        property: "og:description",
        content: "Suba de liga, dispute o ranking e receba recompensas ao fim de cada temporada.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SeasonPage,
});

function SeasonPage() {
  const state = useGame();
  const { user } = useCloudSync();
  const ss = seasonState(state);
  const bd = battleData(state);
  const lp = leagueProgress(bd.trophies);
  const [board, setBoard] = useState<PublicProfile[] | null>(null);
  const [mine, setMine] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const rows = await trophyLeaderboard(100);
      if (!alive) return;
      setBoard(rows);
      const pid = user ? await myPublicId(user.id) : null;
      if (!alive) return;
      setMine(pid);
      const pos = pid ? rows.findIndex((r) => r.publicId === pid) : -1;
      finishSeasonIfNeeded(pos >= 0 ? pos + 1 : null);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  const myPos = mine && board ? board.findIndex((r) => r.publicId === mine) + 1 : 0;
  const reward = leagueReward(bd.trophies);
  const last = ss.history[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Temporada ${ss.season.number} — ${ss.season.name}`}
        icon="🗓️"
        subtitle={`Ciclo de 60 dias. Termina em ${shortDate(ss.season.endsAt.slice(0, 10))}.`}
        action={
          <Link to="/batalhas">
            <Button variant="outline">Ir para as batalhas</Button>
          </Link>
        }
      />

      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-lg font-semibold">
            {ss.season.icon} {ss.season.name}
          </p>
          <span className="text-sm text-muted-foreground">
            {ss.season.daysLeft} dia(s) restante(s) · dia {ss.season.dayIndex + 1}/60
          </span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent via-primary to-arcane"
            style={{ width: `${ss.season.pct}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Troféus" value={`${num(bd.trophies)} 🏆`} hint={lp.league.name} />
        <StatCard label="Pico na temporada" value={num(Math.max(ss.maxTrophies, bd.trophies))} />
        <StatCard label="Vitórias / derrotas" value={`${num(ss.wins)} / ${num(ss.losses)}`} />
        <StatCard
          label="Posição no ranking"
          value={myPos > 0 ? `#${myPos}` : "—"}
          hint={mine ? `Seu ID: ${mine}` : "Entre na conta para ranquear"}
        />
      </div>

      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">🎁 Recompensa da sua liga atual</h2>
        <p className="text-sm text-muted-foreground">
          Ao final da temporada você recebe pelo maior número de troféus alcançado. Os troféus são
          reduzidos para {Math.round(SEASON_TROPHY_KEEP * 100)}% no início do próximo ciclo.
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-secondary px-3 py-1">{money(reward.money)}</span>
          <span className="rounded-full bg-secondary px-3 py-1">{reward.shards} 💎</span>
          <span className="rounded-full bg-secondary px-3 py-1">{reward.items} item(ns)</span>
          {reward.cosmetic && (
            <span className="rounded-full bg-secondary px-3 py-1">Cosmético exclusivo</span>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {LEAGUES.map((l) => {
            const r = leagueReward(l.min);
            const active = l.id === lp.league.id;
            return (
              <div
                key={l.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl bg-secondary/40 p-3 text-sm",
                  active && "ring-1 ring-primary/60",
                )}
              >
                <span className="text-lg">{l.icon}</span>
                <span className="font-semibold">{l.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {money(r.money)} · {r.shards} 💎 · {r.items} itens
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">🏅 Bônus por posição final</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {RANK_REWARDS.map((r) => (
            <div key={r.label} className="flex items-center gap-3 rounded-xl bg-secondary/40 p-3 text-sm">
              <span className="text-lg">{r.icon}</span>
              <span className="font-semibold">{r.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {money(r.reward.money)} · {r.reward.shards} 💎 · {r.reward.items} itens
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">🏆 Ranking da temporada</h2>
        {board === null ? (
          <p className="text-sm text-muted-foreground">Carregando ranking…</p>
        ) : board.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum jogador ranqueado ainda.</p>
        ) : (
          <div className="space-y-1.5">
            {board.slice(0, 50).map((p, i) => (
              <div
                key={p.publicId}
                className={cn(
                  "flex items-center gap-3 rounded-xl bg-secondary/40 p-2.5",
                  p.publicId === mine && "ring-1 ring-primary/60",
                )}
              >
                <span className="w-8 text-center font-display font-bold tabular-nums">{i + 1}</span>
                <ProfileAvatar avatar={p.avatar} monsterId={p.avatarMonsterId} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {p.displayName}
                    {p.stats.title && (
                      <span className="ml-2 text-[11px] text-muted-foreground">{p.stats.title}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {leagueOf(p.stats.trophies ?? 0).icon} {leagueOf(p.stats.trophies ?? 0).name} · Nv.{" "}
                    {p.level}
                  </p>
                </div>
                <span className="ml-auto font-display font-bold tabular-nums text-gold">
                  {num(p.stats.trophies ?? 0)} 🏆
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {ss.history.length > 0 && (
        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">📜 Temporadas anteriores</h2>
          {last && (
            <p className="text-sm text-muted-foreground">
              Última encerrada: {last.name} · {num(last.maxTrophies)} troféus de pico ·{" "}
              {leagueById(last.bestLeague).name}
            </p>
          )}
          <div className="space-y-2">
            {ss.history.map((h) => (
              <div key={h.number} className="rounded-xl bg-secondary/40 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">
                    #{h.number} {h.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {leagueById(h.bestLeague).icon} {leagueById(h.bestLeague).name} ·{" "}
                    {num(h.maxTrophies)} troféus
                  </span>
                  {h.position && (
                    <span className="text-xs text-muted-foreground">Posição #{h.position}</span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {h.wins}V / {h.losses}D · encerrada em {shortDate(h.endedAt.slice(0, 10))}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Recompensas: {money(h.rewards.money)} · {h.rewards.shards} 💎 · {h.rewards.items}{" "}
                  item(ns)
                  {h.rewards.title ? " · título" : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
