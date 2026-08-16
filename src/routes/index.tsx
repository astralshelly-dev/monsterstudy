import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Brain, GraduationCap } from "lucide-react";
import { useGame } from "@/hooks/use-game";
import {
  incomeMonsterIds,
  incomeSlots,
  moneyPerSecond,
  todayKey,
  totals,
  userProgress,
} from "@/lib/game/state";
import { duration, money, num } from "@/lib/format";
import { PageHeader, StatCard } from "@/components/game/Primitives";
import { DayShareButton } from "@/components/game/ShareCard";
import { ProfileAvatar } from "@/components/game/Avatar";
import { ActiveMonsterCard, MonsterCard } from "@/components/game/MonsterCard";
import { Button } from "@/components/ui/button";
import { useCloudSync } from "@/hooks/use-auth";
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
  const slots = incomeSlots(state);
  const showcase = incomeMonsterIds(state).filter((id) => MONSTERS_BY_ID[id]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bem-vindo, ${state.profile.name}`}
        subtitle="Cada minuto de foco aumenta suas chances de encontrar algo lendário."
        icon="🐲"
      />

      <SignupCallout />

      <DailyQuestsCard />

      <div className="panel aurora relative overflow-hidden p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <ProfileAvatar
              avatar={state.profile.avatar}
              monsterId={state.profile.avatarMonsterId}
              size="md"
            />
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
        <StatCard
          label="Leitura de hoje"
          value={`${num(today.pages)} páginas · ${duration(today.readSec)}`}
          icon={<span>📖</span>}
        />
        <StatCard
          label="Monstros"
          value={`${t.discovered} / ${t.totalMonsters}`}
          icon={<span>🐾</span>}
        />
        <StatCard label="Sessões" value={num(t.sessions)} icon={<span>🏆</span>} />
      </div>

      <DayShareButton dayKey={todayKey()} className="w-full sm:w-auto" />

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
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold">Coleção amostra</h2>
            <p className="text-xs text-muted-foreground">
              {showcase.length}/{slots} monstros gerando renda
            </p>
          </div>
          <Link to="/monstros" className="shrink-0 text-sm text-primary hover:underline">
            Gerenciar
          </Link>
        </div>
        {showcase.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Escolha em Meus Monstros quais criaturas vão gerar renda passiva.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {showcase.map((id) => (
              <MonsterCard key={id} monsterId={id} owned={state.monsters[id]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** convite para criar conta (com as recompensas de boas-vindas) */
function SignupCallout() {
  const { user } = useCloudSync();
  if (user) return null;
  return (
    <div className="panel flex flex-wrap items-center justify-between gap-4 border border-primary/40 p-5">
      <div className="min-w-0">
        <p className="font-display text-lg font-semibold">🎁 Crie sua conta e ganhe recompensas</p>
        <p className="text-sm text-muted-foreground">
          Ao criar a conta você recebe <strong>1 monstro raro</strong>,{" "}
          <strong>10.000 moedas</strong> e <strong>60 fragmentos</strong> — além de salvar seu
          progresso na nuvem, ganhar um ID de jogador e liberar as batalhas online.
        </p>
      </div>
      <Button asChild size="lg" className="shrink-0">
        <Link to="/entrar">Ir criar conta</Link>
      </Button>
    </div>
  );
}

/** resumo das missões diárias com progresso real */
function DailyQuestsCard() {
  const state = useGame();
  const quests = dailyQuests(state);
  if (quests.length === 0) return null;
  const done = quests.filter((q) => q.done).length;
  const toClaim = quests.filter((q) => q.done && !q.claimed).length;
  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">🎯 Missões de hoje</h2>
        <Link to="/missoes" className="text-sm text-primary hover:underline">
          {toClaim > 0 ? `${toClaim} recompensa(s) para coletar` : `${done}/${quests.length} concluídas`}
        </Link>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {quests.slice(0, 3).map((q) => {
          const t = QUESTS_BY_ID[q.templateId];
          if (!t) return null;
          const pct = Math.min(100, (q.progress / t.target) * 100);
          return (
            <div key={q.templateId} className="rounded-xl bg-secondary/40 p-3">
              <p className="truncate text-sm font-medium">
                {t.icon} {t.title}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={q.done ? "h-full rounded-full bg-gold" : "h-full rounded-full bg-primary"}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
