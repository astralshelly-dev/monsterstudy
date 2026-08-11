import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, Square, X } from "lucide-react";
import { useGame } from "@/hooks/use-game";
import {
  cancelTimer,
  clearPendingReward,
  endTimerEarly,
  pauseTimer,
  resumeTimer,
  saveStudySession,
  startTimer,
  timerElapsedSec,
  timerRemainingSec,
} from "@/lib/game/state";
import { PageHeader } from "@/components/game/Primitives";
import { TimerDial } from "@/components/game/TimerDial";
import { TimerPicker, useTick } from "@/components/game/TimerPicker";
import { RewardReveal } from "@/components/game/RewardReveal";
import { ContinueSessionPanel } from "@/components/game/ContinueSession";
import { playTimerEndSfx } from "@/lib/game/sfx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { duration } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/estudar")({
  head: () => ({
    meta: [
      { title: "Estudar — Monster Study" },
      {
        name: "description",
        content:
          "Escolha um cronômetro, registre matéria e assunto e ganhe monstros ao concluir sua sessão de estudo.",
      },
      { property: "og:title", content: "Estudar — Monster Study" },
      {
        property: "og:description",
        content: "Sessões de estudo cronometradas com recompensas de criaturas raras.",
      },
    ],
  }),
  component: StudyPage,
});

const SUBJECTS = [
  "Matemática",
  "História",
  "Programação",
  "Biologia",
  "Inglês",
  "Física",
  "Química",
  "Geografia",
  "Literatura",
  "Direito",
  "Medicina",
  "Outro",
];

function StudyPage() {
  const state = useGame();
  const timer = state.timer?.kind === "study" ? state.timer : null;
  useTick(Boolean(timer));

  if (state.pendingReward) {
    return (
      <RewardReveal reward={state.pendingReward} kind="study" onClose={() => clearPendingReward()} />
    );
  }

  if (timer) {
    const remaining = timerRemainingSec(timer);
    if (remaining <= 0) return <StudyCompletion />;
    return <StudyRunning />;
  }

  return <StudySetup />;
}

function StudySetup() {
  const state = useGame();
  const [subject, setSubject] = useState("Matemática");
  const [customSubject, setCustomSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [bookId, setBookId] = useState("none");
  const [minutes, setMinutes] = useState<number | null>(30);

  const busy = state.timer !== null;

  function begin() {
    if (!minutes) return;
    startTimer({
      kind: "study",
      durationSec: minutes * 60,
      meta: {
        subject: subject === "Outro" ? customSubject || "Estudo" : subject,
        topic: topic || undefined,
        goal: goal || undefined,
        bookId: bookId === "none" ? undefined : bookId,
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estudar"
        icon="📚"
        subtitle="O que você vai estudar agora? Sessões maiores atraem criaturas mais raras."
      />

      <ContinueSessionPanel kind="study" />

      {busy && (
        <div className="panel p-4 text-sm text-muted-foreground">
          Existe outra sessão em andamento. Finalize ou cancele antes de iniciar uma nova.
        </div>
      )}

      <div className="panel space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold">O que você está estudando?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Tema / matéria</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subject === "Outro" && (
              <Input
                placeholder="Digite a matéria"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
              />
            )}
          </div>
          <div className="space-y-2">
            <Label>Assunto específico (opcional)</Label>
            <Input
              placeholder="Ex: Equações de segundo grau"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Objetivo da sessão (opcional)</Label>
            <Input
              placeholder="Ex: Revisar para a prova de sexta-feira"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Livro relacionado (opcional)</Label>
            <Select value={bookId} onValueChange={setBookId}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {state.books.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Escolha o cronômetro</h2>
        <TimerPicker value={minutes} onChange={setMinutes} />
      </div>

      <Button size="lg" className="w-full" disabled={!minutes || busy} onClick={begin}>
        Iniciar sessão de estudo
      </Button>
    </div>
  );
}

function StudyRunning() {
  const state = useGame();
  const timer = state.timer!;
  useTick();
  const remaining = timerRemainingSec(timer);
  const paused = Boolean(timer.pausedAt);

  return (
    <div className="space-y-8">
      <PageHeader title="Sessão em andamento" icon="⏱️" subtitle="Mantenha o foco. Boa sorte." />
      <div className="panel aurora grid place-items-center gap-6 p-8">
        <TimerDial
          remaining={remaining}
          total={timer.durationSec ?? 0}
          label={`📚 ${timer.meta.subject}`}
          sublabel={timer.meta.topic ? `📌 ${timer.meta.topic}` : undefined}
        />
        {timer.meta.goal && (
          <p className="max-w-md text-center text-sm text-muted-foreground">🎯 {timer.meta.goal}</p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          {paused ? (
            <Button onClick={resumeTimer} size="lg">
              <Play className="h-4 w-4" /> Retomar
            </Button>
          ) : (
            <Button onClick={pauseTimer} size="lg" variant="secondary">
              <Pause className="h-4 w-4" /> Pausar
            </Button>
          )}
          <Button onClick={endTimerEarly} size="lg" variant="outline">
            <Square className="h-4 w-4" /> Encerrar
          </Button>
          <Button onClick={cancelTimer} size="lg" variant="ghost">
            <X className="h-4 w-4" /> Cancelar sessão
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Encerrar antes do tempo reduz as chances de raridade — e abaixo de 50% do tempo você não
          ganha monstro nenhum. Cancelar descarta a sessão.
        </p>
      </div>
    </div>
  );
}

function StudyCompletion() {
  const state = useGame();
  const timer = state.timer!;
  const [learned, setLearned] = useState("");
  const [notes, setNotes] = useState("");
  const durationSec = Math.min(timerElapsedSec(timer), timer.durationSec ?? 0);
  const earlyEnd = Boolean(timer.meta.earlyEnd);
  useEffect(() => {
    if (!earlyEnd) playTimerEndSfx();
  }, [earlyEnd]);

  function save() {
    saveStudySession({
      timer,
      durationSec,
      earlyEnd,
      learned: learned || undefined,
      notes: notes || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Sessão concluída!" icon="✅" subtitle="Registre o que ficou dessa sessão." />
      <div className="panel grid gap-3 p-6 sm:grid-cols-3">
        <Info label="⏱️ Tempo estudado" value={duration(durationSec)} />
        <Info label="📚 Matéria" value={timer.meta.subject ?? "—"} />
        <Info label="📌 Assunto" value={timer.meta.topic ?? "—"} />
      </div>

      {earlyEnd && (
        <div className="panel p-4 text-sm text-ember">
          Você encerrou antes do tempo — as recompensas serão reduzidas.
        </div>
      )}

      <div className="panel space-y-4 p-6">
        <div className="space-y-2">
          <Label>O que você aprendeu?</Label>
          <Textarea
            rows={5}
            placeholder="Ex: Aprendi como resolver equações usando a fórmula de Bhaskara."
            value={learned}
            onChange={(e) => setLearned(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Anotações (opcional)</Label>
          <Textarea
            rows={3}
            placeholder="Ex: Preciso revisar o discriminante depois."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <Button size="lg" className="w-full" onClick={save}>
          Salvar sessão
        </Button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-semibold">{value}</p>
    </div>
  );
}
