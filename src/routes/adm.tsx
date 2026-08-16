import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { useCloudSync } from "@/hooks/use-auth";
import { isAdminEmail } from "@/lib/admin";
import { EmptyState, PageHeader, StatCard } from "@/components/game/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MonsterArt, RarityBadge } from "@/components/game/MonsterArt";
import { MONSTERS, MONSTERS_BY_ID } from "@/lib/game/monsters";
import { money, num } from "@/lib/format";
import { leagueOf } from "@/lib/game/battle/config";
import {
  adminBanPlayer,
  adminBulkGrant,
  adminClearCodes,
  adminDeleteAccount,
  adminGetPlayer,
  adminGiveMonster,
  adminGrantResources,
  adminOverview,
  adminRemoveMonster,
  adminRenamePlayer,
  adminResetPlayer,
  adminSearchPlayers,
  adminSetLevel,
  adminUnbanPlayer,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/adm")({
  head: () => ({
    meta: [
      { title: "Painel ADM — Monster Study" },
      {
        name: "description",
        content:
          "Painel administrativo do Monster Study: gerenciar jogadores por ID, recursos, monstros, banimentos e ações em massa.",
      },
      { property: "og:title", content: "Painel ADM — Monster Study" },
      { property: "og:description", content: "Área restrita de administração do Monster Study." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type Overview = Awaited<ReturnType<typeof adminOverview>>;
type PlayerDetail = Awaited<ReturnType<typeof adminGetPlayer>>;
type SearchRow = Awaited<ReturnType<typeof adminSearchPlayers>>[number];

function AdminPage() {
  const { user } = useCloudSync();
  const allowed = isAdminEmail(user?.email);

  if (!user || !allowed) {
    return (
      <div className="space-y-6">
        <PageHeader title="Painel ADM" icon="🛡️" />
        <EmptyState
          icon="⛔"
          title="Área restrita"
          description="Este painel é exclusivo da conta de administração do Monster Study."
          action={
            <Button asChild variant="secondary">
              <Link to="/">Voltar ao dashboard</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return <AdminConsole />;
}

function AdminConsole() {
  const overviewFn = useServerFn(adminOverview);
  const searchFn = useServerFn(adminSearchPlayers);
  const getFn = useServerFn(adminGetPlayer);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState("");
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const reloadOverview = useCallback(() => {
    void overviewFn().then(setOverview).catch(() => toast.error("Falha ao carregar a visão geral."));
  }, [overviewFn]);

  useEffect(reloadOverview, [reloadOverview]);

  const run = useCallback(
    async (label: string, fn: () => Promise<unknown>, refresh = true) => {
      setBusy(true);
      try {
        await fn();
        toast.success(label);
        if (refresh && target) setPlayer(await getFn({ data: { publicId: target } }));
        if (refresh) reloadOverview();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha na operação.");
      } finally {
        setBusy(false);
      }
    },
    [getFn, reloadOverview, target],
  );

  const load = useCallback(
    async (publicId: string) => {
      const id = publicId.trim().toUpperCase();
      if (!id) return;
      setTarget(id);
      setBusy(true);
      try {
        setPlayer(await getFn({ data: { publicId: id } }));
      } catch (e) {
        setPlayer(null);
        toast.error(e instanceof Error ? e.message : "Jogador não encontrado.");
      } finally {
        setBusy(false);
      }
    },
    [getFn],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel ADM"
        icon="🛡️"
        subtitle="Controle total: recursos, coleções, moderação e ações em massa. Todas as ações passam por verificação no servidor."
      />

      <div className="panel flex items-start gap-3 border-ember/40 p-4 text-sm text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-ember" />
        <p>
          As alterações afetam a conta na nuvem imediatamente. O jogador vê os novos valores no próximo
          carregamento do jogo.
        </p>
      </div>

      {/* ---------------- visão geral ---------------- */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Visão geral</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Jogadores" value={num(overview?.players ?? 0)} icon="👥" />
          <StatCard label="Ativos (24h)" value={num(overview?.activeToday ?? 0)} icon="⚡" />
          <StatCard label="Moedas no mundo" value={money(overview?.totalMoney ?? 0)} icon="💰" />
          <StatCard label="Fragmentos" value={num(overview?.totalShards ?? 0)} icon="🔮" />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <RankPanel
            title="Top nível"
            items={(overview?.topLevel ?? []).map((p) => ({
              publicId: p.publicId,
              name: p.name,
              value: `Nv ${p.level}`,
            }))}
            onPick={load}
          />
          <RankPanel
            title="Top troféus"
            items={(overview?.topTrophies ?? []).map((p) => ({
              publicId: p.publicId,
              name: p.name,
              value: `${num(p.trophies)} ${leagueOf(p.trophies).icon}`,
            }))}
            onPick={load}
          />
        </div>
      </section>

      {/* ---------------- busca ---------------- */}
      <section className="panel space-y-3 p-4">
        <h2 className="font-display text-lg font-bold">Buscar jogadores</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ID público ou nome"
            className="max-w-xs"
          />
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void searchFn({ data: { query } })
                .then(setRows)
                .catch(() => toast.error("Falha na busca."))
            }
          >
            Buscar
          </Button>
          <Button disabled={busy} onClick={() => void load(query)}>
            Abrir por ID
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2">ID</th>
                <th className="py-2">Nome</th>
                <th className="py-2">Nv</th>
                <th className="py-2">Moedas</th>
                <th className="py-2">Frag.</th>
                <th className="py-2">Troféus</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(rows.length > 0 ? rows : (overview?.recent ?? [])).map((r) => (
                <tr key={r.publicId} className="border-t border-border/50">
                  <td className="py-2 font-mono text-xs">{r.publicId}</td>
                  <td className="py-2">{r.name}</td>
                  <td className="py-2 tabular-nums">{r.level}</td>
                  <td className="py-2 tabular-nums">{money(r.money)}</td>
                  <td className="py-2 tabular-nums">{r.shards}</td>
                  <td className="py-2 tabular-nums">{num(r.trophies)}</td>
                  <td className="py-2 text-right">
                    <Button size="sm" variant="secondary" onClick={() => void load(r.publicId)}>
                      Gerenciar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- ficha do jogador ---------------- */}
      {player && (
        <PlayerConsole
          player={player}
          busy={busy}
          onRun={run}
          onCleared={() => {
            setPlayer(null);
            setTarget("");
          }}
        />
      )}

      {/* ---------------- massa ---------------- */}
      <BulkPanel busy={busy} onRun={run} />
    </div>
  );
}

function RankPanel({
  title,
  items,
  onPick,
}: {
  title: string;
  items: { publicId: string; name: string; value: string }[];
  onPick: (id: string) => void;
}) {
  return (
    <div className="panel space-y-2 p-4">
      <h3 className="font-display text-sm font-bold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem dados.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {items.map((p, i) => (
            <li key={p.publicId} className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onPick(p.publicId)}
                className="truncate text-left hover:text-primary"
              >
                {i + 1}. {p.name} <span className="font-mono text-xs text-muted-foreground">{p.publicId}</span>
              </button>
              <span className="shrink-0 tabular-nums text-muted-foreground">{p.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type RunFn = (label: string, fn: () => Promise<unknown>, refresh?: boolean) => Promise<void>;

function PlayerConsole({
  player,
  busy,
  onRun,
  onCleared,
}: {
  player: PlayerDetail;
  busy: boolean;
  onRun: RunFn;
  onCleared: () => void;
}) {
  const grantFn = useServerFn(adminGrantResources);
  const levelFn = useServerFn(adminSetLevel);
  const renameFn = useServerFn(adminRenamePlayer);
  const giveFn = useServerFn(adminGiveMonster);
  const removeFn = useServerFn(adminRemoveMonster);
  const banFn = useServerFn(adminBanPlayer);
  const unbanFn = useServerFn(adminUnbanPlayer);
  const resetFn = useServerFn(adminResetPlayer);
  const codesFn = useServerFn(adminClearCodes);
  const deleteFn = useServerFn(adminDeleteAccount);
  const id = player.publicId;
  const [money_, setMoney] = useState("0");
  const [shards, setShards] = useState("0");
  const [xp, setXp] = useState("0");
  const [trophies, setTrophies] = useState("0");
  const [mode, setMode] = useState<"add" | "set">("add");
  const [level, setLevel] = useState(String(player.level));
  const [name, setName] = useState(player.name);
  const [monsterId, setMonsterId] = useState("");
  const [monsterLevel, setMonsterLevel] = useState("1");
  const [banHours, setBanHours] = useState("0");

  const monsterOptions = useMemo(() => MONSTERS.map((m) => ({ id: m.id, name: m.name })), []);
  const banned = player.bannedUntil && new Date(player.bannedUntil).getTime() > Date.now();

  return (
    <section className="space-y-4">
      <div className="panel space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">
              {player.name} <span className="font-mono text-xs text-muted-foreground">{id}</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              {player.email ?? "sem e-mail"} · criado em {new Date(player.createdAt).toLocaleDateString("pt-BR")} ·
              último login{" "}
              {player.lastSignIn ? new Date(player.lastSignIn).toLocaleString("pt-BR") : "—"}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              banned ? "bg-ember/20 text-ember" : "bg-emerald-500/15 text-emerald-400"
            }`}
          >
            {banned ? `Banido até ${new Date(player.bannedUntil!).toLocaleString("pt-BR")}` : "Conta ativa"}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Nível" value={String(player.level)} icon="⭐" />
          <StatCard label="Moedas" value={money(player.money)} icon="💰" />
          <StatCard label="Fragmentos" value={num(player.shards)} icon="🔮" />
          <StatCard label="Troféus" value={num(player.trophies)} icon={leagueOf(player.trophies).icon} />
          <StatCard label="Monstros" value={num(player.monsterCount)} icon="🐲" />
          <StatCard label="Sessões" value={num(player.sessions)} icon="📚" />
        </div>
        <p className="text-xs text-muted-foreground">
          Vitórias {num(player.wins)} · Derrotas {num(player.losses)} · Livros {num(player.books)} · Sequência{" "}
          {player.streak.current}d (recorde {player.streak.best}d) · Save{" "}
          {player.hasSave ? "presente" : "ausente"} · Códigos usados: {player.redeemedCodes.length}
        </p>
      </div>

      {/* recursos */}
      <div className="panel space-y-3 p-4">
        <h3 className="font-display text-sm font-bold">Recursos</h3>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Moedas" value={money_} onChange={setMoney} />
          <Field label="Fragmentos" value={shards} onChange={setShards} />
          <Field label="XP" value={xp} onChange={setXp} />
          <Field label="Troféus" value={trophies} onChange={setTrophies} />
          <div className="flex gap-1">
            {(["add", "set"] as const).map((m) => (
              <Button
                key={m}
                size="sm"
                variant={mode === m ? "default" : "secondary"}
                onClick={() => setMode(m)}
              >
                {m === "add" ? "Somar" : "Definir"}
              </Button>
            ))}
          </div>
          <Button
            disabled={busy}
            onClick={() =>
              void onRun("Recursos atualizados.", () =>
                grantFn({
                  data: {
                    publicId: id,
                    money: Number(money_),
                    shards: Number(shards),
                    xp: Number(xp),
                    trophies: Number(trophies),
                    mode,
                  },
                }),
              )
            }
          >
            Aplicar
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {[1000, 10000, 100000, 1000000].map((v) => (
            <Button
              key={v}
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void onRun(`+${money(v)} moedas`, () =>
                  grantFn({ data: { publicId: id, money: v, mode: "add" } }),
                )
              }
            >
              +{money(v)}
            </Button>
          ))}
          {[50, 250, 1000].map((v) => (
            <Button
              key={`s${v}`}
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void onRun(`+${v} fragmentos`, () =>
                  grantFn({ data: { publicId: id, shards: v, mode: "add" } }),
                )
              }
            >
              +{v} 🔮
            </Button>
          ))}
        </div>
      </div>

      {/* perfil */}
      <div className="panel space-y-3 p-4">
        <h3 className="font-display text-sm font-bold">Perfil</h3>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Nível" value={level} onChange={setLevel} />
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void onRun("Nível definido.", () =>
                levelFn({ data: { publicId: id, level: Number(level) } }),
              )
            }
          >
            Definir nível
          </Button>
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">Nome</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="w-44" />
          </div>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void onRun("Nome alterado.", () => renameFn({ data: { publicId: id, name } }))}
          >
            Renomear
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void onRun("Códigos liberados.", () => codesFn({ data: { publicId: id } }))}
          >
            Liberar códigos promocionais
          </Button>
        </div>
      </div>

      {/* coleção */}
      <div className="panel space-y-3 p-4">
        <h3 className="font-display text-sm font-bold">Coleção</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">Monstro</label>
            <select
              value={monsterId}
              onChange={(e) => setMonsterId(e.target.value)}
              className="h-9 rounded-lg bg-secondary/70 px-2 text-sm ring-1 ring-border/60"
            >
              <option value="">Selecione…</option>
              {monsterOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id})
                </option>
              ))}
            </select>
          </div>
          <Field label="Nível (1-10)" value={monsterLevel} onChange={setMonsterLevel} />
          <Button
            disabled={busy || !monsterId}
            onClick={() =>
              void onRun("Monstro entregue.", () =>
                giveFn({ data: { publicId: id, monsterId, level: Number(monsterLevel) } }),
              )
            }
          >
            Dar monstro
          </Button>
        </div>
        {player.monsters.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum monstro na coleção.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {player.monsters.map((m) => {
              const def = MONSTERS_BY_ID[m.id];
              return (
                <div key={m.id} className="flex items-center gap-2 rounded-xl bg-secondary/50 p-2">
                  {def && <MonsterArt art={def.art} rarity={def.rarity} size="sm" animate={false} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{def?.name ?? m.id}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Nv {m.level} · x{m.copies}
                    </p>
                    {def && <RarityBadge rarity={def.rarity} />}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      void onRun("Monstro removido.", () =>
                        removeFn({ data: { publicId: id, monsterId: m.id } }),
                      )
                    }
                  >
                    Remover
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* moderação */}
      <div className="panel space-y-3 border-ember/40 p-4">
        <h3 className="font-display text-sm font-bold text-ember">Moderação</h3>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Horas (0 = permanente)" value={banHours} onChange={setBanHours} />
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() =>
              void onRun("Conta banida.", () =>
                banFn({ data: { publicId: id, hours: Number(banHours) } }),
              )
            }
          >
            Banir conta
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void onRun("Banimento removido.", () => unbanFn({ data: { publicId: id } }))}
          >
            Desbanir
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              if (!window.confirm(`Zerar todo o progresso de ${id}?`)) return;
              void onRun("Progresso zerado.", () => resetFn({ data: { publicId: id } }));
            }}
          >
            Zerar progresso
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => {
              if (!window.confirm(`APAGAR definitivamente a conta ${id}?`)) return;
              void onRun("Conta apagada.", async () => {
                await deleteFn({ data: { publicId: id } });
                onCleared();
              }, false);
            }}
          >
            Apagar conta
          </Button>
        </div>
      </div>
    </section>
  );
}

function BulkPanel({ busy, onRun }: { busy: boolean; onRun: RunFn }) {
  const bulkFn = useServerFn(adminBulkGrant);
  const [money_, setMoney] = useState("0");
  const [shards, setShards] = useState("0");
  return (
    <section className="panel space-y-3 p-4">
      <h3 className="font-display text-sm font-bold">Ações em massa</h3>
      <p className="text-xs text-muted-foreground">
        Distribui recursos para todos os jogadores cadastrados (use valores negativos para retirar).
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Moedas" value={money_} onChange={setMoney} />
        <Field label="Fragmentos" value={shards} onChange={setShards} />
        <Button
          disabled={busy}
          onClick={() => {
            if (!window.confirm("Aplicar a todos os jogadores?")) return;
            void onRun("Presente enviado a todos.", () =>
              bulkFn({ data: { money: Number(money_), shards: Number(shards) } }),
            );
          }}
        >
          Enviar para todos
        </Button>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} inputMode="numeric" className="w-32" />
    </div>
  );
}
