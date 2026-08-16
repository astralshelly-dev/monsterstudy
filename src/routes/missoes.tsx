import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useGame } from "@/hooks/use-game";
import { claimQuest, dailyQuests, ensureDailyQuests, itemDropProgress } from "@/lib/game/state";
import { QUESTS_BY_ID, rewardLabel } from "@/lib/game/quests";
import { PageHeader, StatCard } from "@/components/game/Primitives";
import { Button } from "@/components/ui/button";
import { duration } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/missoes")({
  head: () => ({
    meta: [
      { title: "Missões Diárias — Monster Study" },
      {
        name: "description",
        content:
          "Missões diárias de estudo, leitura e batalhas com recompensas reais em XP, moedas, fragmentos e itens.",
      },
      { property: "og:title", content: "Missões Diárias — Monster Study" },
      {
        property: "og:description",
        content: "Cumpra objetivos do dia e receba XP, moedas, fragmentos e itens.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Missions,
});

function Missions() {
  const state = useGame();
  useEffect(() => {
    ensureDailyQuests();
  }, []);
  const quests = dailyQuests(state);
  const done = quests.filter((q) => q.done).length;
  const claimed = quests.filter((q) => q.claimed).length;
  const drop = itemDropProgress(state);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Missões Diárias"
        icon="🎯"
        subtitle="Renovadas todos os dias. O progresso vem das suas atividades reais."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Missões concluídas" value={`${done}/${quests.length}`} />
        <StatCard label="Recompensas coletadas" value={`${claimed}/${quests.length}`} />
        <StatCard
          label="Próximo item"
          value={`${Math.round(drop.pct)}%`}
          hint={`${duration(drop.current)} de ${duration(drop.target)} de estudo/leitura`}
        />
      </div>

      <div className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display font-semibold">🎁 Caça ao item</p>
          <span className="text-xs text-muted-foreground">
            A cada 30 minutos reais de estudo ou leitura você encontra um item.
          </span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${drop.pct}%` }}
          />
        </div>
      </div>

      <div className="grid gap-3">
        {quests.map((q) => {
          const t = QUESTS_BY_ID[q.templateId];
          if (!t) return null;
          const pct = Math.min(100, (q.progress / t.target) * 100);
          return (
            <div
              key={q.templateId}
              className={cn("panel p-5", q.done && !q.claimed && "ring-1 ring-primary/50")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold">
                    <span className="mr-2">{t.icon}</span>
                    {t.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{rewardLabel(t.reward)}</p>
                </div>
                {q.claimed ? (
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
                    Coletada
                  </span>
                ) : q.done ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      const r = claimQuest(q.templateId);
                      if (r.ok) toast.success(r.message);
                      else toast.error(r.message);
                    }}
                  >
                    Coletar recompensa
                  </Button>
                ) : (
                  <span className="rounded-full bg-secondary/70 px-3 py-1 text-xs font-semibold text-muted-foreground">
                    Em andamento
                  </span>
                )}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    q.done ? "bg-gold" : "bg-primary",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                {Math.min(q.progress, t.target).toLocaleString("pt-BR")} /{" "}
                {t.target.toLocaleString("pt-BR")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
