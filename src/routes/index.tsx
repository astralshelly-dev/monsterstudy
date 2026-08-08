import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Brain, GraduationCap } from "lucide-react";
import { useGame } from "@/hooks/use-game";
import { moneyPerSecond, todayKey, totals, userProgress } from "@/lib/game/state";
import { duration, money, num } from "@/lib/format";
import { PageHeader, StatCard } from "@/components/game/Primitives";
import { ActiveMonsterCard, MonsterCard } from "@/components/game/MonsterCard";
import { Button } from "@/components/ui/button";
import { MONSTERS_BY_ID } from "@/lib/game/monsters";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Monster Study" },
      {
        name: "description",
        content:
          "Veja seu progresso diário: tempo estudado, páginas lidas, renda dos monstros e ações rápidas.",
      },
      { property: "og:title", content: "Dashboard — Monster Study" },
      {
        property: "og:description",
        content: "Seu resumo de estudo, leitura e coleção de criaturas mágicas.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const state = useGame();
  const t = totals(state);
  const prog = userProgress(state);
  const rate = moneyPerSecond(state);
  const today = state.activity[todayKey()] ?? { studySec: 0, readSec: 0, pages: 0, sessions: 0 };
  const active = state.activeMonsterId ? state.monsters[state.activeMonsterId] : undefined;
  const recent = state.sessions
    .flatMap((s) => ("reward" in s && s.reward ? [s.reward] : []))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bem-vindo, ${state.profile.name}`}
        subtitle="Cada minuto de foco aumenta suas chances de encontrar algo lendário."
        icon="🐲"
      />

      <div className="panel aurora relative overflow-hidden p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/20 text-3xl ring-1 ring-primary/40">
              {state.profile.avatar}
            </span>
            <div>
              <p className="font-display text-2xl font-bold">{state.profile.name}</p>
              <p className="text-sm text-muted-foreground">
                Nível {state.profile.level} · {num(prog.xp)} / {num(prog.need)} XP · 🔥{" "}
                {state.streak.current} dias
              </p>
              <div className="mt-2 h-2 w-56 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent via-primary to-arcane"
                  style={{ width: `${prog.pct}%` }}
                />
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl font-bold text-gold tabular-nums">
              {money(state.money)}
            </p>
            <p className="text-sm text-muted-foreground">+{money(rate)}/s</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Estudo de hoje" value={duration(today.studySec)} icon={<span>⏱️</span>} />
        <StatCard label="Leitura de hoje" value={`${num(today.pages)} páginas`} icon={<span>📖</span>} />
        <StatCard
          label="Monstros"
          value={`${t.discovered} / ${t.totalMonsters}`}
          icon={<span>🐾</span>}
        />
        <StatCard label="Sessões" value={num(t.sessions)} icon={<span>🏆</span>} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel space-y-3 p-5 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Ações rápidas</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button asChild size="lg" className="h-auto flex-col gap-1 py-4">
              <Link to="/estudar">
                <GraduationCap className="h-5 w-5" />
                Começar estudo
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="h-auto flex-col gap-1 py-4">
              <Link to="/ler">
                <BookOpen className="h-5 w-5" />
                Começar leitura
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="h-auto flex-col gap-1 py-4">
              <Link to="/livre">
                <Brain className="h-5 w-5" />
                Estudo livre
              </Link>
            </Button>
          </div>
          {state.timer && (
            <div className="rounded-xl bg-primary/15 px-4 py-3 text-sm ring-1 ring-primary/40">
              Você tem uma sessão em andamento.{" "}
              <Link
                to={state.timer.kind === "read" ? "/ler" : state.timer.kind === "free" ? "/livre" : "/estudar"}
                className="font-semibold underline"
              >
                Retomar agora
              </Link>
            </div>
          )}
        </div>

        <div className="panel space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">Monstro ativo</h2>
          {active && state.activeMonsterId ? (
            <ActiveMonsterCard monsterId={state.activeMonsterId} owned={active} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Conclua uma sessão para encontrar seu primeiro monstro.
            </p>
          )}
        </div>
      </div>

      <div className="panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Coleção recente</h2>
          <Link to="/monsterdex" className="text-sm text-primary hover:underline">
            Ver MonsterDex
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum monstro encontrado ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {recent.map((r, i) => {
              const def = MONSTERS_BY_ID[r.monsterId];
              if (!def) return null;
              return (
                <MonsterCard
                  key={`${r.monsterId}-${i}`}
                  monsterId={r.monsterId}
                  owned={state.monsters[r.monsterId]}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
