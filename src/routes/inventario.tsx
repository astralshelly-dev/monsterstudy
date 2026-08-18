import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useGame } from "@/hooks/use-game";
import { inventoryEntries, itemDropProgress, useItem } from "@/lib/game/state";
import { ITEM_RARITY_BY_ID, itemRarityChances, ITEMS } from "@/lib/game/items";
import { PageHeader, StatCard } from "@/components/game/Primitives";
import { Button } from "@/components/ui/button";
import { duration, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inventario")({
  head: () => ({
    meta: [
      { title: "Inventário — Monster Study" },
      {
        name: "description",
        content:
          "Itens encontrados durante os estudos: poções de XP, rações, fragmentos raros e tesouros lendários.",
      },
      { property: "og:title", content: "Inventário — Monster Study" },
      {
        property: "og:description",
        content: "Use poções, rações e tesouros conquistados com tempo real de estudo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inventory,
});

function Inventory() {
  const state = useGame();
  const items = inventoryEntries(state);
  const drop = itemDropProgress(state);
  const total = items.reduce((a, x) => a + x.qty, 0);
  const log = (state.itemLog ?? []).slice(0, 12);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventário"
        icon="🎒"
        subtitle="Cada 30 minutos reais de estudo ou leitura rendem um item sorteado."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Itens no inventário" value={total} />
        <StatCard label="Itens encontrados" value={(state.itemLog ?? []).length} />
        <StatCard
          label="Progresso do próximo"
          value={`${Math.round(drop.pct)}%`}
          hint={`${duration(drop.current)} de ${duration(drop.target)}`}
        />
      </div>

      <div className="panel p-5">
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${drop.pct}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {itemRarityChances().map((r) => (
            <span
              key={r.id}
              className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", r.surface, r.text)}
            >
              {r.name} · {r.pct.toFixed(0)}%
            </span>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="panel p-6 text-sm text-muted-foreground">
          Você ainda não encontrou itens. Estude ou leia por 30 minutos para receber o primeiro.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ def, qty }) => {
            const r = ITEM_RARITY_BY_ID[def.rarity];
            return (
              <div key={def.id} className="panel flex flex-col gap-3 p-5">
                <div className="flex items-start gap-3">
                  <span className={cn("grid h-12 w-12 place-items-center rounded-xl text-2xl", r.surface)}>
                    {def.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display font-semibold">{def.name}</p>
                    <span className={cn("text-[11px] font-semibold uppercase tracking-wider", r.text)}>
                      {r.name}
                    </span>
                  </div>
                  <span className="ml-auto font-display text-lg font-bold tabular-nums">x{qty}</span>
                </div>
                <p className="text-sm text-muted-foreground">{def.description}</p>
                <Button
                  size="sm"
                  onClick={() => {
                    const res = useItem(def.id);
                    if (res.ok) toast.success(res.message);
                    else toast.error(res.message);
                  }}
                >
                  Usar item
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Todos os itens do jogo</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {ITEMS.map((def) => {
            const r = ITEM_RARITY_BY_ID[def.rarity];
            const owned = state.inventory?.[def.id] ?? 0;
            return (
              <div key={def.id} className="flex min-w-0 items-center gap-3 rounded-xl bg-secondary/40 p-3">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg", r.surface)}>
                  {def.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{def.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{def.description}</p>
                  <p className={cn("text-[10px] font-semibold uppercase sm:hidden", r.text)}>{r.name}</p>
                </div>
                <span className={cn("hidden shrink-0 text-[11px] font-semibold uppercase sm:inline", r.text)}>
                  {r.name}
                </span>
                <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {owned > 0 ? `x${owned}` : "—"}
                </span>
              </div>

            );
          })}
        </div>
      </section>

      {log.length > 0 && (
        <section className="panel space-y-2 p-5">
          <h2 className="font-display text-lg font-semibold">Últimos achados</h2>
          {log.map((entry, i) => {
            const def = ITEMS.find((x) => x.id === entry.itemId);
            if (!def) return null;
            return (
              <div key={`${entry.at}-${i}`} className="flex items-center gap-2 text-sm">
                <span>{def.icon}</span>
                <span className="font-medium">{def.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {shortDate(entry.at.slice(0, 10))}
                </span>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
