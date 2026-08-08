import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useGame } from "@/hooks/use-game";
import { monsterProgress, totals, updateProfile, userProgress } from "@/lib/game/state";
import { PageHeader, StatCard } from "@/components/game/Primitives";
import { MonsterArt, RarityBadge } from "@/components/game/MonsterArt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { duration, money, num, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const AVATARS = ["🧙", "🧝", "🧛", "🦸", "🥷", "🧚", "🐉", "🦉", "🔮", "📚", "⚔️", "🌙"];

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Monster Study" },
      {
        name: "description",
        content: "Seu caçador de conhecimento: nível, XP, monstro em treino e totais acumulados.",
      },
      { property: "og:title", content: "Perfil — Monster Study" },
      { property: "og:description", content: "Nível, XP e resumo da sua jornada no Monster Study." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const state = useGame();
  const t = totals(state);
  const up = userProgress(state);
  const active = state.activeMonsterId ? monsterProgress(state.activeMonsterId, state) : null;
  const [name, setName] = useState(state.profile.name);

  return (
    <div className="space-y-6">
      <PageHeader title="Perfil" icon="🧙" subtitle="Sua identidade de caçador de conhecimento." />

      <div className="panel p-6">
        <div className="flex flex-wrap items-center gap-5">
          <span className="grid h-20 w-20 place-items-center rounded-2xl bg-secondary/70 text-4xl ring-1 ring-primary/40">
            {state.profile.avatar}
          </span>
          <div className="min-w-56 flex-1">
            <p className="font-display text-2xl font-bold">{state.profile.name}</p>
            <p className="text-sm text-muted-foreground">
              Nível {state.profile.level} · desde {shortDate(state.profile.createdAt.slice(0, 10))}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent via-primary to-arcane"
                style={{ width: `${up.pct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {num(up.xp)} / {num(up.need)} XP
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <div className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
              <Button
                onClick={() => {
                  updateProfile({ name: name.trim() || "Caçador" });
                  toast.success("Perfil atualizado");
                }}
              >
                Salvar
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Avatar</Label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => updateProfile({ avatar: a })}
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-lg bg-secondary/60 text-xl transition-transform hover:scale-110",
                    state.profile.avatar === a && "ring-2 ring-primary",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {active && (
        <div className="panel flex items-center gap-4 p-5">
          <MonsterArt art={active.def.art} rarity={active.def.rarity} />
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Em treino</p>
            <p className="font-display text-lg font-bold">{active.def.name}</p>
            <div className="mt-1 flex items-center gap-2">
              <RarityBadge rarity={active.def.rarity} />
              <span className="text-xs text-muted-foreground">Nível {active.level}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sessões" value={num(t.sessions)} />
        <StatCard label="Tempo total" value={duration(t.studySec + t.readSec)} />
        <StatCard label="Páginas lidas" value={num(t.pages)} />
        <StatCard label="Livros concluídos" value={num(t.booksDone)} />
        <StatCard label="Monstros" value={`${t.discovered}/${t.totalMonsters}`} />
        <StatCard label="Fragmentos" value={num(state.shards)} />
        <StatCard label="Dinheiro" value={money(state.money)} />
        <StatCard label="Melhor streak" value={`🔥 ${state.streak.best} dias`} />
      </div>
    </div>
  );
}
