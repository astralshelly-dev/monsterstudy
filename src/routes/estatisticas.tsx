import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGame } from "@/lib/../hooks/use-game";
import { totals, todayKey, moneyPerSecond } from "@/lib/game/state";
import { RARITIES, RARITY_ORDER } from "@/lib/game/config";
import { MONSTERS_BY_ID } from "@/lib/game/monsters";
import { PageHeader, StatCard } from "@/components/game/Primitives";
import { duration, money, num, shortDate } from "@/lib/format";

export const Route = createFileRoute("/estatisticas")({
  head: () => ({
    meta: [
      { title: "Estatísticas — Monster Study" },
      {
        name: "description",
        content: "Gráficos de tempo estudado, páginas lidas e distribuição de raridades da coleção.",
      },
      { property: "og:title", content: "Estatísticas — Monster Study" },
      { property: "og:description", content: "Analise sua evolução de estudo e leitura." },
    ],
  }),
  component: Stats,
});

function Stats() {
  const state = useGame();
  const t = totals(state);

  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = todayKey(d);
    const a = state.activity[key];
    return {
      day: shortDate(key),
      minutos: Math.round(((a?.studySec ?? 0) + (a?.readSec ?? 0)) / 60),
      paginas: a?.pages ?? 0,
      "minutos lendo": Math.round((a?.readSec ?? 0) / 60),
    };
  });

  const rarityData = RARITY_ORDER.map((r) => ({
    name: RARITIES[r].name,
    value: Object.keys(state.monsters).filter((id) => MONSTERS_BY_ID[id]?.rarity === r).length,
    color: `var(--r-${r})`,
  })).filter((d) => d.value > 0);

  const subjectData = Object.entries(
    state.sessions.reduce<Record<string, number>>((acc, s) => {
      if (s.kind !== "study") return acc;
      acc[s.subject] = (acc[s.subject] ?? 0) + Math.round(s.durationSec / 60);
      return acc;
    }, {}),
  )
    .map(([name, minutos]) => ({ name, minutos }))
    .sort((a, b) => b.minutos - a.minutos)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader title="Estatísticas" icon="📊" subtitle="Sua evolução em números." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tempo estudando" value={duration(t.studySec)} />
        <StatCard label="Tempo lendo" value={duration(t.readSec)} />
        <StatCard label="Páginas lidas" value={`${num(t.pages)} · ${duration(t.readSec)}`} />
        <StatCard label="Renda passiva" value={`${money(moneyPerSecond(state))}/s`} />
      </div>

      <section className="panel p-5">
        <h2 className="font-display text-lg font-semibold">Minutos por dia (14 dias)</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last14}>
              <defs>
                <linearGradient id="gradMin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--foreground)",
                }}
              />
              <Area
                type="monotone"
                dataKey="minutos"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#gradMin)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">Páginas e minutos lendo por dia</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last14}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="paginas" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="minutos lendo" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">Coleção por raridade</h2>
          <div className="mt-4 h-56">
            {rarityData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum monstro coletado ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rarityData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                    {rarityData.map((d) => (
                      <Cell key={d.name} fill={d.color} stroke="var(--card)" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      {subjectData.length > 0 && (
        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">Minutos por matéria</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectData} layout="vertical">
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis type="category" dataKey="name" width={110} stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="minutos" fill="var(--primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}
