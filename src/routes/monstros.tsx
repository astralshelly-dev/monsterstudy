import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/hooks/use-game";
import { MONSTERS_BY_ID } from "@/lib/game/monsters";
import { RARITIES, RARITY_ORDER } from "@/lib/game/config";
import {
  incomeMonsterIds,
  incomeSlots,
  monsterIncome,
  monsterProgress,
  setActiveMonster,
  spendShards,
  toggleIncomeMonster,
} from "@/lib/game/state";
import { EmptyState, PageHeader, StatCard } from "@/components/game/Primitives";
import { MonsterArt, RarityBadge } from "@/components/game/MonsterArt";
import { ElementBadge } from "@/components/game/ElementBadge";
import { Button } from "@/components/ui/button";
import { money, num } from "@/lib/format";
import { moneyPerSecond } from "@/lib/game/state";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/monstros")({
  head: () => ({
    meta: [
      { title: "Meus Monstros — Monster Study" },
      {
        name: "description",
        content:
          "Gerencie sua coleção: escolha o monstro em treino, use duplicatas e acompanhe a renda por segundo.",
      },
      { property: "og:title", content: "Meus Monstros — Monster Study" },
      {
        property: "og:description",
        content: "Treine, evolua e gerencie suas criaturas colecionadas.",
      },
    ],
  }),
  component: MyMonsters,
});

function MyMonsters() {
  const state = useGame();
  const owned = Object.values(state.monsters).sort((a, b) => {
    const da = MONSTERS_BY_ID[a.id]!;
    const db = MONSTERS_BY_ID[b.id]!;
    return RARITY_ORDER.indexOf(db.rarity) - RARITY_ORDER.indexOf(da.rarity);
  });
  const duplicates = owned.reduce((a, m) => a + (m.copies - 1), 0);

  if (owned.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Meus Monstros" icon="🐾" />
        <EmptyState
          icon="✨"
          title="Sua coleção está vazia"
          description="Complete uma sessão de estudo ou leitura para encontrar sua primeira criatura."
          action={
            <Button asChild>
              <Link to="/estudar">Começar a estudar</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const slots = incomeSlots(state);
  const income = incomeMonsterIds(state);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meus Monstros"
        icon="🐾"
        subtitle="Escolha quais monstros geram renda passiva, selecione quem treina no Treino Livre e use duplicatas para evoluir."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Criaturas" value={num(owned.length)} />
        <StatCard label="Duplicatas" value={num(duplicates)} hint={`${state.shards} fragmentos`} />
        <StatCard
          label="Renda total"
          value={`${money(moneyPerSecond(state))}/s`}
          hint={`${income.length}/${slots} slots de renda`}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        💰 Apenas {slots} monstros podem gerar renda ao mesmo tempo. Aumente esse limite com o
        upgrade <span className="font-semibold text-foreground">Covil de Monstros</span> na Loja
        (até +3).
      </p>

      <div className="grid gap-3 lg:grid-cols-2">
        {owned.map((m) => (
          <MonsterRow key={m.id} id={m.id} />
        ))}
      </div>
    </div>
  );
}

function MonsterRow({ id }: { id: string }) {
  const state = useGame();
  const prog = monsterProgress(id, state);
  const [amount] = useState(20);
  if (!prog) return null;
  const active = state.activeMonsterId === id;
  const earning = incomeMonsterIds(state).includes(id);

  return (
    <div className={cn("panel p-4", active && "ring-2 ring-primary", earning && "ring-1 ring-gold/60")}>
      <div className="flex gap-4">
        <MonsterArt art={prog.def.art} rarity={prog.def.rarity} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-bold">{prog.def.name}</p>
              <RarityBadge rarity={prog.def.rarity} />
              <ElementBadge monsterId={prog.def.id} compact />
            </div>
            <p className="whitespace-nowrap text-sm text-gold">
              {money(monsterIncome(id, state))}/s
            </p>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Nível {prog.level} · x{prog.copies} cópias
            {earning ? " · 💰 gerando renda" : ""}
          </p>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${prog.pct}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {prog.maxed ? "Nível máximo" : `${num(prog.xp)} / ${num(prog.need)} XP`}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant={active ? "secondary" : "default"} onClick={() => setActiveMonster(id)}>
              {active ? "Em treino" : "Treinar"}
            </Button>
            <Button
              size="sm"
              variant={earning ? "secondary" : "outline"}
              onClick={() => {
                const res = toggleIncomeMonster(id);
                if (res.ok) toast.success(res.message);
                else toast.error(res.message);
              }}
            >
              {earning ? "Tirar da renda" : "Gerar renda"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={state.shards < amount}
              onClick={() => {
                if (spendShards(id, amount)) {
                  toast.success(`+${amount * 25} XP para ${prog.def.name}`);
                }
              }}
            >
              Usar {amount} fragmentos
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
