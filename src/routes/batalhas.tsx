import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { applyOpponentTrophies } from "@/lib/battle.functions";
import { createFileRoute } from "@tanstack/react-router";
import { Swords } from "lucide-react";
import { toast } from "sonner";
import { useGame } from "@/hooks/use-game";
import { useCloudSync } from "@/hooks/use-auth";
import {
  battleData,
  battleBeamId,
  battleTeamIds,
  clearPendingBattle,
  forfeitPendingBattle,
  pendingBattle,
  recordBattle,
  setBattleBeam,
  setBattleTeam,
  startPendingBattle,
  type BattleOutcome,
} from "@/lib/game/state";
import { LEAGUES, TEAM_SIZE, leagueOf, leagueProgress } from "@/lib/game/battle/config";
import { createBattle, type Battle, type SideId } from "@/lib/game/battle/engine";
import {
  findOpponent,
  opponentFromProfile,
  trainingOpponent,
  type Opponent,
} from "@/lib/game/battle/matchmaking";
import { findProfile } from "@/lib/game/cloud";
import { RARITY_ORDER } from "@/lib/game/config";
import { BattleArena } from "@/components/game/battle/BattleArena";
import { TeamPicker } from "@/components/game/battle/TeamPicker";
import { BeamPicker, BeamSummary } from "@/components/game/battle/BeamPicker";
import { resolveBeam } from "@/lib/game/battle/beams";
import { PageHeader, StatCard } from "@/components/game/Primitives";
import { ElementTable } from "@/components/game/ElementTable";
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
  validateSearch: (search: Record<string, unknown>) => ({
    amistoso: typeof search['amistoso'] === "string" ? search['amistoso'] : "",
  }),
  component: BattlesPage,
});

type Phase = "home" | "team" | "searching" | "preview" | "battle" | "result";
type Mode = "ranked" | "training" | "friendly";

function BattlesPage() {
  const state = useGame();
  const { user, publicId } = useCloudSync();
  const { amistoso } = Route.useSearch();
  const bd = battleData(state);
  const prog = leagueProgress(bd.trophies);
  const applyOpponentElo = useServerFn(applyOpponentTrophies);


  const [phase, setPhase] = useState<Phase>("home");
  const [mode, setMode] = useState<Mode>("ranked");
  const [team, setTeam] = useState<string[]>(() => battleTeamIds(state));
  const [beam, setBeam] = useState<string | null>(() => battleBeamId(state));
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [battle, setBattle] = useState<Battle | null>(null);
  const [outcome, setOutcome] = useState<(BattleOutcome & { result: "win" | "loss" }) | null>(null);
  const [behavior, setBehavior] = useState<AiBehavior>("equilibrado");
  const [friendly, setFriendly] = useState<Opponent | null>(null);
  const [forfeited, setForfeited] = useState<(BattleOutcome & { opponentName: string }) | null>(
    null,
  );
  /** modo aceito pelo motor: só a ranqueada vale troféus */
  const engineMode: "ranked" | "training" = mode === "ranked" ? "ranked" : "training";

  /** aplica o efeito espelhado (70%) no oponente real */
  const mirrorToOpponent = useCallback(
    (oppPublicId: string | null | undefined, delta: number) => {
      if (!oppPublicId || delta === 0) return;
      void applyOpponentElo({ data: { publicId: oppPublicId, playerDelta: delta } }).catch(
        () => undefined,
      );
    },
    [applyOpponentElo],
  );

  /** derrota automática por abandono da batalha ranqueada */
  const forfeitNow = useCallback(() => {
    const done = forfeitPendingBattle();
    if (!done) return null;
    if (done.pending.opponentSource === "player") {
      mirrorToOpponent(done.pending.opponentId, done.delta);
    }
    return done;
  }, [mirrorToOpponent]);

  // batalha abandonada em outra visita (fechou/atualizou o app): resolve como derrota
  useEffect(() => {
    const done = forfeitNow();
    if (!done) return;
    setForfeited({ ...done, opponentName: done.pending.opponentName });
    setPhase("home");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // saiu da página com a ranqueada em andamento → derrota
  useEffect(() => {
    return () => {
      forfeitNow();
    };
  }, [forfeitNow]);

  // fechar/atualizar durante a ranqueada: avisa que a partida será perdida
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!pendingBattle()) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);


  const ownedIds = useMemo(() => Object.keys(state.monsters), [state.monsters]);
  const teamLevel = useMemo(() => {
    const lv = team.map((id) => state.monsters[id]?.level ?? 1);
    return lv.length ? Math.round(lv.reduce((a, b) => a + b, 0) / lv.length) : 1;
  }, [team, state.monsters]);

  const myTeamTier = useMemo(
    () =>
      Object.keys(state.monsters).reduce((best, id) => {
        const def = MONSTERS_BY_ID[id];
        return def ? Math.max(best, RARITY_ORDER.indexOf(def.rarity)) : best;
      }, 0),
    [state.monsters],
  );

  const ctx = {
    myPublicId: publicId ?? state.profile.publicId ?? null,
    myLevel: state.profile.level,
    myTrophies: bd.trophies,
    myTeamLevel: teamLevel,
    myTeamTier,
    authenticated: !!user,
  };

  // chegada pelo perfil de outro jogador: batalha amistosa (sem troféus)
  useEffect(() => {
    if (!amistoso) return;
    void findProfile(amistoso).then((p) => {
      if (!p) {
        toast.error("Não encontramos esse jogador para a amistosa.");
        return;
      }
      const opp = opponentFromProfile(p);
      if (opp.team.length === 0) {
        toast.error(`${p.displayName} ainda não tem monstros para batalhar.`);
        return;
      }
      setFriendly(opp);
      setMode("friendly");
      setTeam((t) => (t.length > 0 ? t : battleTeamIds(state)));
      setPhase("team");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amistoso]);

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
    setBattleBeam(beam);
    if (mode === "friendly") {
      if (!friendly) {
        toast.error("Adversário da amistosa indisponível.");
        setPhase("home");
        return;
      }
      setOpponent(friendly);
      setPhase("preview");
      return;
    }
    if (mode === "ranked") {
      setPhase("searching");
      const found = await new Promise<Opponent>((resolve) => {
        window.setTimeout(() => void findOpponent(ctx).then(resolve), 1800);
      });
      // batalha definitiva: a partir daqui não há como cancelar
      startPendingBattle({
        opponentName: found.name,
        opponentId: found.publicId,
        opponentSource: found.source,
        team,
        opponentTeam: found.team.map((t) => t.monsterId),
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
        mode: engineMode,
        playerName: state.profile.name,
        playerTeam: team.map((id) => ({ monsterId: id, level: state.monsters[id]?.level ?? 1 })),
        foeName: opponent.name,
        foeTeam: opponent.team,
        foeBehavior: opponent.behavior,
        playerBeamId: beam,
      }),
    );
    setPhase("battle");
  }

  function finish(winner: SideId, turns: number) {
    if (!opponent) return;
    const result = winner === "player" ? "win" : "loss";
    clearPendingBattle();
    const out = recordBattle({
      mode: engineMode,
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
    if (mode === "ranked" && opponent.source === "player") {
      mirrorToOpponent(opponent.publicId, out.delta);
    }
  }


  // ---------------- fases ----------------
  if (phase === "team") {
    return (
      <div className="space-y-6">
        <PageHeader
          title={
            mode === "ranked"
              ? "Montar equipe · Ranqueada"
              : mode === "friendly"
                ? `Montar equipe · Amistosa vs ${friendly?.name ?? "jogador"}`
                : "Montar equipe · Batalha virtual"
          }
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
        <BeamPicker
          team={team}
          chosen={beam}
          onChoose={(id) => {
            setBeam(id);
            setBattleBeam(id);
          }}
        />
        <TeamPicker state={state} selected={team} onToggle={toggle} />
        <Button size="lg" onClick={() => void confirmTeam()} disabled={team.length === 0}>
          {mode === "ranked"
            ? "⚔️ Encontrar oponente"
            : mode === "friendly"
              ? "🤝 Começar amistosa"
              : "🤖 Chamar a IA"}
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
            <div className="animate-shimmer h-full w-1/2 rounded-full bg-primary" />
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
            mode === "ranked" ? undefined : (
              <Button variant="outline" onClick={() => setPhase("home")}>
                Cancelar
              </Button>
            )
          }
        />
        {mode === "ranked" && (
          <div className="panel border border-ember/40 bg-ember/10 p-4">
            <p className="font-display text-sm font-semibold text-ember">
              ⚠️ Batalha definitiva — não é possível cancelar
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              A partida já está registrada. Se você sair da batalha, fechar ou atualizar o app sem
              jogar, ela será contada como derrota e você perderá troféus.
            </p>
          </div>
        )}
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
          title={
            mode === "ranked"
              ? "Batalha ranqueada"
              : mode === "friendly"
                ? "Batalha amistosa"
                : "Batalha virtual"
          }
          icon="⚔️"
          subtitle={
            mode === "ranked"
              ? `Liga ${prog.league.name} · ${num(bd.trophies)} 🏆 · sair agora conta como derrota`
              : mode === "friendly"
                ? "Nenhum troféu em jogo"
                : "Treino livre"
          }
        />
        <BattleArena battle={battle} setBattle={setBattle} onFinish={finish} />
      </div>
    );
  }

  if (phase === "result" && outcome) {
    const after = leagueProgress(outcome.trophiesAfter);
    const win = outcome.result === "win";
    
    // Calcula o MVP (monstro que causou mais dano ou mitigou mais)
    // Para simplificar, pegamos o primeiro do time que ainda tem mais HP relativo
    const bestFighter = win ? battle?.player.fighters.sort((a,b) => (b.hp/b.maxHp) - (a.hp/a.maxHp))[0] : null;
    const bestMonster = bestFighter ? MONSTERS_BY_ID[bestFighter.monsterId] : null;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div
          className={cn(
            "panel overflow-hidden relative grid place-items-center gap-6 px-6 py-16 text-center",
            win ? "border-gold/30 bg-gold/5" : "border-ember/30 bg-ember/5",
          )}
        >
          {/* Efeito de fundo decorativo */}
          <div className={cn(
            "absolute -top-24 -left-24 w-64 h-64 blur-[100px] opacity-20 rounded-full",
            win ? "bg-gold" : "bg-ember"
          )} />

          <div className="relative z-10 space-y-2">
            <span className="text-7xl block animate-bounce drop-shadow-glow">
              {win ? "🏆" : "💀"}
            </span>
            <h2 className="font-display text-6xl font-black italic tracking-tighter uppercase leading-none">
              {win ? "Vitória" : "Derrota"}
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              {mode === "ranked" ? "Partida Ranqueada" : mode === "friendly" ? "Amistoso" : "Treino IA"}
              {" "}· VS {outcome.record.opponentName}
            </p>
          </div>

          <div className="grid w-full max-w-4xl grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            {/* Bloco de Troféus (se ranqueada) */}
            {mode === "ranked" && (
              <div className="panel p-6 space-y-4 bg-background/40 backdrop-blur-sm border-white/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Progresso de Liga</p>
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{after.league.icon}</span>
                  <div className="text-right">
                    <p className="font-display font-black text-xl italic leading-none">{after.league.name}</p>
                    <p className={cn("text-xs font-black", win ? "text-emerald-400" : "text-ember")}>
                      {outcome.delta >= 0 ? "+" : ""}{outcome.delta} 🏆
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                    <div
                      className={cn("h-full rounded-full transition-all duration-1000", win ? "bg-gold" : "bg-primary")}
                      style={{ width: `${after.pct}%` }}
                    />
                  </div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase text-center">
                    {after.next ? `${num(after.trophiesAfter)} / ${num(after.next.minTrophies)} para ${after.next.name}` : "Nível Máximo Atingido"}
                  </p>
                </div>
              </div>
            )}

            {/* Recompensas (simuladas por enquanto, as reais vem do state) */}
            <div className="panel p-6 space-y-4 bg-background/40 backdrop-blur-sm border-white/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recompensas</p>
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                      <p className="text-[9px] font-black text-muted-foreground uppercase">Moedas</p>
                      <p className="font-display font-black text-lg italic leading-none text-gold">+{win ? "250" : "50"}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[9px] font-black text-muted-foreground uppercase">XP Conta</p>
                      <p className="font-display font-black text-lg italic leading-none text-primary">+{win ? "100" : "20"}</p>
                   </div>
                </div>
            </div>

            {/* MVP do time */}
            {win && bestMonster && (
              <div className="panel p-6 space-y-4 bg-background/40 backdrop-blur-sm border-white/5 relative group cursor-help">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Destaque da Equipe</p>
                <div className="flex items-center gap-3">
                   <div className="w-16 h-16 shrink-0">
                      <MonsterArt art={bestMonster.art} rarity={bestMonster.rarity} size="sm" animate />
                   </div>
                   <div className="text-left min-w-0">
                      <p className="font-display font-black text-lg italic tracking-tight truncate leading-none uppercase">{bestMonster.name}</p>
                      <p className="text-[9px] font-black text-gold uppercase tracking-widest">MVP DA PARTIDA</p>
                   </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-4 relative z-10 w-full">
            <Button
              size="lg"
              className="min-w-[200px] h-14 rounded-2xl font-black text-xs tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              onClick={() => {
                setOutcome(null);
                setBattle(null);
                setOpponent(null);
                setPhase("team");
              }}
            >
              JOGAR NOVAMENTE
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="min-w-[200px] h-14 rounded-2xl font-black text-xs tracking-[0.2em] border-2 hover:bg-secondary/50 transition-all"
              onClick={() => {
                setOutcome(null);
                setBattle(null);
                setOpponent(null);
                setPhase("home");
              }}
            >
              VOLTAR AO HUB
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

      {forfeited && (
        <div className="panel border border-ember/40 bg-ember/10 p-4">
          <p className="font-display text-sm font-semibold text-ember">
            💀 Batalha perdida por abandono
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Você saiu da ranqueada contra {forfeited.opponentName} antes de terminar. A partida foi
            registrada como derrota: {forfeited.delta} troféus (agora {num(forfeited.trophiesAfter)}{" "}
            🏆).
          </p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setForfeited(null)}>
            Entendi
          </Button>
        </div>
      )}


      <div className="panel aurora p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-3xl ring-1 ring-primary/40">
            {prog.league.icon}
          </span>
          <div className="min-w-48 flex-1">
            <p className="font-display text-xl font-bold">Liga {prog.league.name}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
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
            troféus. Derrota: −17 a 25 troféus. Ao encontrar o oponente a batalha é definitiva:
            abandonar conta como derrota.
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

      <ElementTable />

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
                    {shortDate(h.at.slice(0, 10))} · {leagueOf(h.trophiesAfter).name} ·{" "}
                    {h.forfeit ? "abandono" : `${h.turns} turnos`}
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
