import { createFileRoute } from "@tanstack/react-router";
import { useGame } from "@/hooks/use-game";
import { ACHIEVEMENTS } from "@/lib/game/achievements";
import { STREAK_MILESTONES } from "@/lib/game/config";
import { PageHeader, StatCard } from "@/components/game/Primitives";
import { money, num, shortDate } from "@/lib/format";
import { todayKey } from "@/lib/game/state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/conquistas")({
  head: () => ({
    meta: [
      { title: "Conquistas — Monster Study" },
      {
        name: "description",
        content: "Desbloqueie conquistas por sessões, livros lidos, raridades encontradas e streaks.",
      },
      { property: "og:title", content: "Conquistas — Monster Study" },
      {
        property: "og:description",
        content: "Marcos, medalhas e recompensas da sua jornada de estudo.",
      },
    ],
  }),
  component: Achievements,
});

function Achievements() {
  const state = useGame();
  const unlocked = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length;

  // calendário dos últimos 70 dias
  const days: Array<{ key: string; active: boolean; today: boolean }> = [];
  for (let i = 69; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    const a = state.activity[key];
    days.push({ key, active: Boolean(a && a.sessions > 0), today: key === todayKey() });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conquistas"
        icon="🏆"
        subtitle={`${unlocked} / ${ACHIEVEMENTS.length} desbloqueadas`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Streak atual" value={`🔥 ${state.streak.current} dias`} />
        <StatCard label="Melhor streak" value={`${state.streak.best} dias`} />
        <StatCard label="Conquistas" value={`${unlocked}/${ACHIEVEMENTS.length}`} />
      </div>

      <section className="panel p-5">
        <h2 className="font-display text-lg font-semibold">Calendário de atividade</h2>
        <div className="mt-4 grid grid-flow-col grid-rows-7 gap-1.5">
          {days.map((d) => (
            <div
              key={d.key}
              title={`${shortDate(d.key)}${d.active ? " · ativo" : ""}`}
              className={cn(
                "h-4 w-4 rounded-[5px]",
                d.active ? "bg-primary shadow-[0_0_10px_var(--primary)]" : "bg-muted",
                d.today && "ring-2 ring-gold",
              )}
            />
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {STREAK_MILESTONES.map((m) => {
            const done = state.streak.claimed.includes(m.days) || state.streak.best >= m.days;
            return (
              <span
                key={m.days}
                className={cn(
                  "rounded-full px-3 py-1 text-xs",
                  done ? "bg-primary/25 text-foreground ring-1 ring-primary/50" : "bg-secondary/60 text-muted-foreground",
                )}
              >
                {done ? "✅" : "🔒"} {m.days} dias · {money(m.reward)}
              </span>
            );
          })}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const at = state.achievements[a.id];
          const p = a.progress?.(state);
          return (
            <div
              key={a.id}
              className={cn("panel p-5", at ? "ring-1 ring-gold/50" : "opacity-90")}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl",
                    at ? "bg-gold/20 ring-1 ring-gold/50" : "bg-secondary/60 grayscale",
                  )}
                >
                  {a.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold">{a.name}</p>
                  <p className="text-sm text-muted-foreground">{a.description}</p>
                  {p && !at && (
                    <>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${(p.current / p.target) * 100}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {num(p.current)} / {num(p.target)}
                      </p>
                    </>
                  )}
                  <p className="mt-2 text-xs text-gold">Recompensa: {money(a.reward)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
