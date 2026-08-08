import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pause, Play, Square } from "lucide-react";
import { useGame } from "@/hooks/use-game";
import {
  cancelTimer,
  monsterProgress,
  pauseTimer,
  resumeTimer,
  saveFreeSession,
  startTimer,
  timerElapsedSec,
} from "@/lib/game/state";
import { EmptyState, PageHeader } from "@/components/game/Primitives";
import { TimerDial } from "@/components/game/TimerDial";
import { useTick } from "@/components/game/TimerPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonsterArt } from "@/components/game/MonsterArt";
import { duration, num } from "@/lib/format";
import { XP } from "@/lib/game/config";

export const Route = createFileRoute("/livre")({
  head: () => ({
    meta: [
      { title: "Estudo Livre — Monster Study" },
      {
        name: "description",
        content:
          "Cronômetro livre e sem limite: estude o quanto quiser para treinar e evoluir o monstro ativo.",
      },
      { property: "og:title", content: "Estudo Livre — Monster Study" },
      {
        property: "og:description",
        content: "Modo sem limite de tempo focado em ganhar XP para seus monstros.",
      },
    ],
  }),
  component: FreePage,
});

function FreePage() {
  const state = useGame();
  const timer = state.timer?.kind === "free" ? state.timer : null;
  useTick(Boolean(timer));
  const [result, setResult] = useState<{ xp: number; levels: number; monsterId: string | null } | null>(
    null,
  );

  const activeId = state.activeMonsterId;
  const prog = activeId ? monsterProgress(activeId, state) : null;

  if (result) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="panel animate-reveal max-w-md space-y-4 p-8 text-center">
          {result.levels > 0 && (
            <p className="font-display text-2xl font-bold text-gold text-glow">LEVEL UP!</p>
          )}
          {result.monsterId && prog && (
            <MonsterArt art={prog.def.art} rarity={prog.def.rarity} size="lg" className="mx-auto" />
          )}
          <p className="font-display text-xl font-semibold">
            +{num(result.xp)} XP {prog ? `para ${prog.def.name}` : ""}
          </p>
          {result.levels > 0 && prog && (
            <p className="text-sm text-muted-foreground">
              Subiu {result.levels} {result.levels === 1 ? "nível" : "níveis"} — agora está no nível{" "}
              {prog.level}.
            </p>
          )}
          <Button className="w-full" onClick={() => setResult(null)}>
            Continuar
          </Button>
        </div>
      </div>
    );
  }

  if (!activeId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Estudo Livre" icon="🧠" />
        <EmptyState
          icon="🐾"
          title="Nenhum monstro ativo"
          description="O Estudo Livre treina o monstro selecionado. Conclua uma sessão de estudo ou leitura para encontrar seu primeiro monstro."
          action={
            <Button asChild>
              <Link to="/estudar">Fazer uma sessão de estudo</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (timer) {
    const elapsed = timerElapsedSec(timer);
    const paused = Boolean(timer.pausedAt);
    return (
      <div className="space-y-8">
        <PageHeader title="Estudo Livre" icon="🧠" subtitle="Sem limite de tempo. Pare quando quiser." />
        <div className="panel aurora grid place-items-center gap-6 p-8">
          <TimerDial
            remaining={0}
            total={0}
            countUp
            elapsed={elapsed}
            label={timer.meta.subject ? `📚 ${timer.meta.subject}` : "🧠 Estudo Livre"}
            sublabel={prog ? `Treinando ${prog.def.name} · Nv ${prog.level}` : undefined}
          />
          <p className="text-sm text-muted-foreground">
            XP acumulado: <span className="font-semibold">{num((elapsed / 60) * XP.freeStudyPerMinute)}</span>
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {paused ? (
              <Button size="lg" onClick={resumeTimer}>
                <Play className="h-4 w-4" /> Retomar
              </Button>
            ) : (
              <Button size="lg" variant="secondary" onClick={pauseTimer}>
                <Pause className="h-4 w-4" /> Pausar
              </Button>
            )}
            <Button
              size="lg"
              onClick={() => {
                const r = saveFreeSession({ timer, durationSec: elapsed });
                setResult({ xp: r.monsterXp, levels: r.levelsGained, monsterId: r.monsterId });
              }}
            >
              <Square className="h-4 w-4" /> Encerrar e ganhar XP
            </Button>
            <Button size="lg" variant="ghost" onClick={cancelTimer}>
              Descartar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <FreeSetup />;
}

function FreeSetup() {
  const state = useGame();
  const [subject, setSubject] = useState("");
  const activeId = state.activeMonsterId!;
  const prog = monsterProgress(activeId, state);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estudo Livre"
        icon="🧠"
        subtitle="Cronômetro crescente, sem limite. Todo o tempo vira XP para o monstro ativo."
      />

      {prog && (
        <div className="panel flex items-center gap-5 p-6">
          <MonsterArt art={prog.def.art} rarity={prog.def.rarity} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl font-bold">{prog.def.name}</p>
            <p className="text-sm text-muted-foreground">Nível {prog.level}</p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
                style={{ width: `${prog.pct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {num(prog.xp)} / {num(prog.need)} XP
            </p>
            <Link to="/monstros" className="mt-2 inline-block text-xs text-primary hover:underline">
              Trocar monstro em treino
            </Link>
          </div>
        </div>
      )}

      <div className="panel space-y-4 p-6">
        <div className="space-y-2">
          <Label>O que você vai estudar? (opcional)</Label>
          <Input
            placeholder="Ex: Revisão geral de Física"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Ganho: {XP.freeStudyPerMinute} XP por minuto para o monstro ativo. Sessões livres contam para
          seu streak, mas não geram novos monstros.
        </p>
        <Button
          size="lg"
          className="w-full"
          disabled={state.timer !== null}
          onClick={() =>
            startTimer({ kind: "free", durationSec: null, meta: { subject: subject || undefined } })
          }
        >
          Iniciar Estudo Livre ({duration(0)})
        </Button>
      </div>
    </div>
  );
}
