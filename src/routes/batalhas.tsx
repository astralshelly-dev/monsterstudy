import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { applyOpponentTrophies } from "@/lib/battle.functions";
import { createFileRoute } from "@tanstack/react-router";
import { Swords } from "lucide-react";
import { toast } from "sonner";
import { useGame } from "@/hooks/use-game";
import { useCloudSync } from "@/hooks/use-auth";
import {
  battleData,
  battleTeamIds,
  recordBattle,
  setBattleTeam,
  type BattleOutcome,
} from "@/lib/game/state";
import { LEAGUES, TEAM_SIZE, leagueOf, leagueProgress } from "@/lib/game/battle/config";
import { createBattle, type Battle, type SideId } from "@/lib/game/battle/engine";
import {
  findOpponent,
  trainingOpponent,
  type Opponent,
} from "@/lib/game/battle/matchmaking";
import { BattleArena } from "@/components/game/battle/BattleArena";
import { TeamPicker } from "@/components/game/battle/TeamPicker";
import { PageHeader, StatCard } from "@/components/game/Primitives";
import { ProfileAvatar } from "@/components/game/Avatar";
import { MonsterArt } from "@/components/game/MonsterArt";
import { Button } from "@/components/ui/button";
import { MONSTERS_BY_ID } from "@/lib/game/monsters";
import { num, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AiBehavior } from "@/lib/game/battle/engine";

export const Route = createFileRoute("/batalhas")({
  head: () => ({
    meta: [
      { title: "Batalhas — Monster Study" },
      {
        name: "description",
        content:
          "Enfrente outros caçadores na ranqueada, suba de liga acumulando troféus e teste suas equipes na batalha virtual contra a IA.",
      },
      { property: "og:title", content: "Batalhas — Monster Study" },
      {
        property: "og:description",
        content: "PvP assíncrono por turnos, ligas de Bronze a PRO e treino contra a IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BattlesPage,
});

type Phase = "home" | "team" | "searching" | "preview" | "battle" | "result";
type Mode = "ranked" | "training";

function BattlesPage() {
  const state = useGame();
  const { user, publicId } = useCloudSync();
  const bd = battleData(state);
  const prog = leagueProgress(bd.trophies);
  const applyOpponentElo = useServerFn(applyOpponentTrophies);


  const [phase, setPhase] = useState<Phase>("home");
  const [mode, setMode] = useState<Mode>("ranked");
  const [team, setTeam] = useState<string[]>(() => battleTeamIds(state));
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [battle, setBattle] = useState<Battle | null>(null);
  const [outcome, setOutcome] = useState<(BattleOutcome & { result: "win" | "loss" }) | null>(null);
  const [behavior, setBehavior] = useState<AiBehavior>("equilibrado");

  const ownedIds = useMemo(() => Object.keys(state.monsters), [state.monsters]);
  const teamLevel = useMemo(() => {
    const lv = team.map((id) => state.monsters[id]?.level ?? 1);
    return lv.length ? Math.round(lv.reduce((a, b) => a + b, 0) / lv.length) : 1;
  }, [team, state.monsters]);

  const ctx = {
    myPublicId: publicId ?? state.profile.publicId ?? null,
    myLevel: state.profile.level,
    myTrophies: bd.trophies,
    myTeamLevel: teamLevel,
    authenticated: !!user,
  };

  function toggle(id: string) {
    setTeam((t) => {
      if (t.includes(id)) return t.filter((x) => x !== id);
      if (t.length >= TEAM_SIZE) {
        toast.error(`Sua equipe já tem ${TEAM_SIZE} monstros.`);
        return t;
      }
      return [...t, id];
    });
  }

  function startFlow(m: Mode) {
    if (ownedIds.length === 0) {
      toast.error("Capture um monstro antes de batalhar.");
      return;
    }
    setMode(m);
    setTeam((t) => (t.length > 0 ? t : battleTeamIds(state)));
    setPhase("team");
  }

  async function confirmTeam() {
    if (team.length === 0) {
      toast.error("Selecione pelo menos 1 monstro.");
      return;
    }
    setBattleTeam(team);
    if (mode === "ranked") {
      setPhase("searching");
      const found = await new Promise<Opponent>((resolve) => {
        window.setTimeout(() => void findOpponent(ctx).then(resolve), 1800);
      });
      setOpponent(found);
      setPhase("preview");
    } else {
      setOpponent(trainingOpponent(ctx, ownedIds, behavior));
      setPhase("preview");
    }
  }

  function beginBattle() {
    if (!opponent) return;
    setBattle(
      createBattle({
        mode,
        playerName: state.profile.name,
        playerTeam: team.map((id) => ({ monsterId: id, level: state.monsters[id]?.level ?? 1 })),
        foeName: opponent.name,
        foeTeam: opponent.team,
        foeBehavior: opponent.behavior,
      }),
    );
    setPhase("battle");
  }

  function finish(winner: SideId, turns: number) {
    if (!opponent) return;
    const result = winner === "player" ? "win" : "loss";
    const out = recordBattle({
      mode,
      result,
      opponentName: opponent.name,
      opponentId: opponent.publicId,
      opponentSource: opponent.source,
      turns,
      team,
      opponentTeam: opponent.team.map((t) => t.monsterId),
    });
    setOutcome({ ...out, result });
    setPhase("result");
    // batalha assíncrona: o oponente real recebe 70% do efeito invertido
    if (mode === "ranked" && opponent.source === "player" && opponent.publicId && out.delta !== 0) {
      void applyOpponentElo({
        data: { publicId: opponent.publicId, playerDelta: out.delta },
      }).catch(() => undefined);
    }
  }

  // ---------------- fases ----------------
  if (phase === "team") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={mode === "ranked" ? "Montar equipe · Ranqueada" : "Montar equipe · Batalha virtual"}
          icon="🧩"
          subtitle="Sua equipe é salva e reutilizada nas próximas batalhas."
          action={
            <Button variant="outline" onClick={() => setPhase("home")}>
              Voltar
            </Button>
          }
        />
        {mode === "training" && (
          <div className="panel space-y-2 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Comportamento da IA
            </p>
            <div className="flex flex-wrap gap-2">
              {(["ofensivo", "defensivo", "equilibrado"] as AiBehavior[]).map((b) => (
                <Button
                  key={b}
                  size="sm"
                  variant={behavior === b ? "default" : "secondary"}
                  onClick={() => setBehavior(b)}
                >
                  {b}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              A IA usa monstros diferentes dos seus e acompanha seu progresso. Nenhum troféu é
              ganho ou perdido no treino.
            </p>
          </div>
        )}
        <TeamPicker state={state} selected={team} onToggle={toggle} />
        <Button size="lg" onClick={() => void confirmTeam()} disabled={team.length === 0}>
          {mode === "ranked" ? "⚔️ Encontrar oponente" : "🤖 Chamar a IA"}
        </Button>
      </div>
    );
  }

  if (phase === "searching") {
    return (
      <div className="space-y-6">
        <PageHeader title="Procurando oponente" icon="🛰️" />
        <div className="panel aurora grid place-items-center gap-4 px-6 py-16 text-center">
          <span className="animate-pulse-glow grid h-24 w-24 place-items-center rounded-full bg-primary/20 text-5xl ring-1 ring-primary/40">
            ⚔️
          </span>
          <p className="font-display text-xl font-bold">Sorteando um caçador…</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            O confronto é assíncrono: encontramos o deck de outro jogador e ele batalha por conta
            própria, esteja online ou não.
          </p>
          <div className="h-1.5 w-56 overflow-hidden rounded-full bg-muted">
            <div className="animate-shimmer h-full w-1/2 rounded-full bg-gradient-to-r from-accent to-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (phase === "preview" && opponent) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Oponente encontrado"
          icon="🎯"
          subtitle={
            opponent.source === "player"
              ? "Deck real de outro caçador (PvP assíncrono)."
              : "Adversário controlado pela IA."
          }
          action={
            <Button variant="outline" onClick={() => setPhase("home")}>
              Cancelar
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FighterPreview
            title="Você"
            name={state.profile.name}
            avatar={state.profile.avatar}
            monsterId={state.profile.avatarMonsterId ?? null}
            level={state.profile.level}
            trophies={bd.trophies}
            team={team.map((id) => ({ monsterId: id, level: state.monsters[id]?.level ?? 1 }))}
          />
          <FighterPreview
            title={opponent.source === "player" ? `ID ${opponent.publicId ?? "—"}` : "IA"}
            name={opponent.name}
            avatar={opponent.avatar}
            monsterId={opponent.avatarMonsterId}
            level={opponent.level}
            trophies={opponent.trophies}
            team={opponent.team}
          />
        </div>
        <Button size="lg" onClick={beginBattle}>
          ⚔️ Começar batalha
        </Button>
      </div>
    );
  }

  if (phase === "battle" && battle) {
    return (
      <div className="space-y-5">
        <PageHeader
          title={mode === "ranked" ? "Batalha ranqueada" : "Batalha virtual"}
          icon="⚔️"
          subtitle={mode === "ranked" ? `Liga ${prog.league.name} · ${num(bd.trophies)} 🏆` : "Treino livre"}
        />
        <BattleArena battle={battle} setBattle={setBattle} onFinish={finish} />
      </div>
    );
  }

  if (phase === "result" && outcome) {
    const after = leagueProgress(outcome.trophiesAfter);
    const win = outcome.result === "win";
    return (
      <div className="space-y-6">
        <div
          className={cn(
            "panel aurora grid place-items-center gap-2 px-6 py-14 text-center",
            win ? "ring-1 ring-gold/50" : "ring-1 ring-ember/40",
          )}
        >
          <span className="text-6xl">{win ? "🏆" : "💀"}</span>
          <p className="font-display text-4xl font-bold">{win ? "VITÓRIA" : "DERROTA"}</p>
          <p className="text-sm text-muted-foreground">
            {mode === "ranked" ? "Partida ranqueada" : "Batalha virtual (sem troféus)"} contra{" "}
            {outcome.record.opponentName}
          </p>
          {mode === "ranked" && (
            <div className="mt-4 w-full max-w-md space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <StatCard label="Antes" value={`${num(outcome.trophiesBefore)} 🏆`} />
                <StatCard
                  label={win ? "Ganhos" : "Perdidos"}
                  value={
                    <span className={win ? "text-emerald-400" : "text-ember"}>
                      {outcome.delta >= 0 ? "+" : ""}
                      {outcome.delta}
                    </span>
                  }
                />
                <StatCard label="Depois" value={`${num(outcome.trophiesAfter)} 🏆`} />
              </div>
              <div className="panel p-4 text-left">
                <p className="font-display text-sm font-semibold">
                  {after.league.icon} Liga {after.league.name}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
                    style={{ width: `${after.pct}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {after.next
                    ? `Faltam ${num(after.missing)} troféus para ${after.next.name}`
                    : "Você chegou à liga mais alta!"}
                </p>
              </div>
            </div>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => {
                setOutcome(null);
                setBattle(null);
                setOpponent(null);
                setPhase("team");
              }}
            >
              Jogar novamente
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setOutcome(null);
                setBattle(null);
                setOpponent(null);
                setPhase("home");
              }}
            >
              Voltar às batalhas
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- home ----------------
  return (
    <div className="space-y-6">
      <PageHeader
        title="Batalhas"
        icon="⚔️"
        subtitle="Coloque sua coleção à prova: ranqueada assíncrona contra outros caçadores ou treino contra a IA."
      />

      <div className="panel aurora p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-3xl ring-1 ring-primary/40">
            {prog.league.icon}
          </span>
          <div className="min-w-48 flex-1">
            <p className="font-display text-xl font-bold">Liga {prog.league.name}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent via-primary to-arcane"
                style={{ width: `${prog.pct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {prog.next
                ? `Faltam ${num(prog.missing)} troféus para ${prog.next.icon} ${prog.next.name}`
                : "Você domina a liga PRO."}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl font-bold text-gold">{num(bd.trophies)} 🏆</p>
            <p className="text-xs text-muted-foreground">Recorde: {num(bd.bestTrophies)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="panel flex flex-col gap-3 p-5">
          <h2 className="font-display text-lg font-semibold">🏅 Ranqueada</h2>
          <p className="text-sm text-muted-foreground">
            PvP assíncrono contra o deck de um jogador sorteado aleatoriamente. Vitória: +20 a 35
            troféus. Derrota: −17 a 25 troféus.
          </p>
          <Button className="mt-auto" onClick={() => startFlow("ranked")}>
            <Swords className="h-4 w-4" /> Encontrar oponente
          </Button>
        </section>
        <section className="panel flex flex-col gap-3 p-5">
          <h2 className="font-display text-lg font-semibold">🤖 Batalha virtual</h2>
          <p className="text-sm text-muted-foreground">
            Treine contra a IA com monstros próprios e comportamentos diferentes (ofensivo,
            defensivo, equilibrado). Nenhum troféu em jogo.
          </p>
          <Button variant="secondary" className="mt-auto" onClick={() => startFlow("training")}>
            Treinar agora
          </Button>
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Vitórias" value={num(bd.wins)} />
        <StatCard label="Derrotas" value={num(bd.losses)} />
        <StatCard label="Total de batalhas" value={num(bd.wins + bd.losses)} />
        <StatCard label="Maior troféus" value={num(bd.bestTrophies)} />
      </div>

      <section className="panel p-5">
        <h2 className="font-display text-lg font-semibold">Ligas</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {LEAGUES.map((l) => (
            <div
              key={l.id}
              className={cn(
                "rounded-xl px-3 py-2 text-sm ring-1",
                l.id === prog.league.id ? "ring-primary" : "ring-border/60",
                l.surface,
              )}
            >
              <p className={cn("font-display font-bold", l.text)}>
                {l.icon} {l.name}
              </p>
              <p className="text-[11px] text-muted-foreground">{num(l.min)}+ troféus</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="font-display text-lg font-semibold">Histórico de batalhas</h2>
        {bd.history.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhuma batalha ainda. Encontre um oponente para começar.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {bd.history.slice(0, 30).map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2"
              >
                <span className="text-xl">{h.result === "win" ? "🏆" : "💀"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {h.result === "win" ? "Vitória" : "Derrota"} vs {h.opponentName}
                    {h.mode === "training" && (
                      <span className="ml-2 text-[11px] uppercase text-muted-foreground">treino</span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {shortDate(h.at.slice(0, 10))} · {leagueOf(h.trophiesAfter).name} · {h.turns} turnos
                  </p>
                </div>
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    h.mode === "training"
                      ? "text-muted-foreground"
                      : h.trophiesDelta >= 0
                        ? "text-emerald-400"
                        : "text-ember",
                  )}
                >
                  {h.mode === "training"
                    ? "±0 🏆"
                    : `${h.trophiesDelta >= 0 ? "+" : ""}${h.trophiesDelta} 🏆`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FighterPreview({
  title,
  name,
  avatar,
  monsterId,
  level,
  trophies,
  team,
}: {
  title: string;
  name: string;
  avatar: string;
  monsterId: string | null;
  level: number;
  trophies: number;
  team: { monsterId: string; level: number }[];
}) {
  return (
    <div className="panel space-y-3 p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="flex items-center gap-3">
        <ProfileAvatar avatar={avatar} monsterId={monsterId} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-display text-base font-bold">{name}</p>
          <p className="text-xs text-muted-foreground">
            Nível {level} · {num(trophies)} 🏆
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {team.map((t, i) => {
          const def = MONSTERS_BY_ID[t.monsterId];
          if (!def) return null;
          return (
            <div key={`${t.monsterId}-${i}`} className="flex flex-col items-center gap-1 text-center">
              <MonsterArt art={def.art} rarity={def.rarity} size="sm" animate={false} />
              <p className="max-w-16 truncate text-[11px]">{def.name}</p>
              <p className="text-[10px] text-muted-foreground">Nv {t.level}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
