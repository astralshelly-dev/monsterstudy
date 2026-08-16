import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useCloudSync } from "@/hooks/use-auth";
import { isAdminEmail } from "@/lib/admin";
import { EmptyState, PageHeader } from "@/components/game/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MonsterArt, RarityBadge } from "@/components/game/MonsterArt";
import { MONSTERS, MONSTERS_BY_ID } from "@/lib/game/monsters";
import { ACHIEVEMENTS } from "@/lib/game/achievements";
import { LEAGUES } from "@/lib/game/battle/config";
import { money as fmtMoney, num as fmtNum, duration, dateTime } from "@/lib/format";
import {
  adminAnalytics,
  adminBulkGrant,
  adminDeleteAnnouncement,
  adminDeleteCode,
  adminGetPlayer,
  adminGetSettings,
  adminListAnnouncements,
  adminListCodes,
  adminLogs,
  adminModerate,
  adminMonsterAction,
  adminMonsterStats,
  adminOverview,
  adminRankings,
  adminRenamePlayer,
  adminSaveAnnouncement,
  adminSaveCode,
  adminSaveSettings,
  adminSearchPlayers,
  adminSetAchievement,
  adminGiveItem,
  adminSetCosmetic,
  adminProgressOp,
  adminSetLeague,
  adminSetResource,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/adm")({
  head: () => ({
    meta: [
      { title: "Painel ADM — Monster Study" },
      {
        name: "description",
        content:
          "Centro de administração do Monster Study: jogadores, economia, batalhas, ligas, códigos, anúncios, auditoria e configurações globais.",
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
type Analytics = Awaited<ReturnType<typeof adminAnalytics>>;
type PlayerDetail = Awaited<ReturnType<typeof adminGetPlayer>>;
type SearchRow = Awaited<ReturnType<typeof adminSearchPlayers>>[number];
type LogRow = Awaited<ReturnType<typeof adminLogs>>[number];
type Rankings = Awaited<ReturnType<typeof adminRankings>>;
type MonsterStat = Awaited<ReturnType<typeof adminMonsterStats>>[number];

const SECTIONS = [
  { id: "overview", label: "Visão geral", icon: "📊" },
  { id: "players", label: "Jogadores", icon: "👥" },
  { id: "monsters", label: "Monstros", icon: "🐲" },
  { id: "battles", label: "Batalhas", icon: "⚔️" },
  { id: "leagues", label: "Ligas", icon: "🏆" },
  { id: "economy", label: "Economia", icon: "💰" },
  { id: "codes", label: "Códigos", icon: "🎟️" },
  { id: "announcements", label: "Anúncios", icon: "📣" },
  { id: "analytics", label: "Analytics", icon: "📈" },
  { id: "logs", label: "Logs", icon: "🧾" },
  { id: "rankings", label: "Rankings", icon: "🥇" },
  { id: "system", label: "Sistema", icon: "⚙️" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

// ------------------------------------------------------------
// blocos visuais
// ------------------------------------------------------------
function Panel({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-lg shadow-primary/5 backdrop-blur">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Metric({ icon, label, value, hint }: { icon: string; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Bars({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">{d.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted/40">
            <div className="h-full rounded-full bg-primary/80" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="w-12 shrink-0 text-right text-xs font-semibold">{fmtNum(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// página
// ------------------------------------------------------------
function AdminPage() {
  const { user } = useCloudSync();
  if (!user || !isAdminEmail(user.email)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Painel ADM" icon="🛡️" />
        <EmptyState
          icon="⛔"
          title="Área restrita"
          description="Este painel é exclusivo da conta de administração do Monster Study. As ações também são bloqueadas no servidor."
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
  const getFn = useServerFn(adminGetPlayer);

  const [section, setSection] = useState<SectionId>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const reloadOverview = useCallback(() => {
    void overviewFn()
      .then(setOverview)
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao carregar a visão geral."));
  }, [overviewFn]);

  useEffect(reloadOverview, [reloadOverview]);

  const openPlayer = useCallback(
    async (publicId: string) => {
      const id = publicId.trim().toUpperCase();
      if (!id) return;
      setBusy(true);
      try {
        const detail = await getFn({ data: { publicId: id } });
        setPlayer(detail);
        setSection("players");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Jogador não encontrado.");
      } finally {
        setBusy(false);
      }
    },
    [getFn],
  );

  /** executa a ação, mostra erro real em caso de falha e RELÊ o jogador do banco */
  const run = useCallback(
    async (label: string, fn: () => Promise<unknown>) => {
      setBusy(true);
      try {
        await fn();
        if (player) setPlayer(await getFn({ data: { publicId: player.publicId } }));
        reloadOverview();
        toast.success(`${label} — salvo no banco.`);
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Falha na operação. Nada foi alterado.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [getFn, player, reloadOverview],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Monster Study — ADMIN" icon="🛡️" />

      {overview ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Metric icon="👥" label="Jogadores" value={fmtNum(overview.players)} hint={`+${overview.newToday} hoje`} />
          <Metric icon="🟢" label="Online agora" value={fmtNum(overview.onlineNow)} hint={`${overview.activeToday} em 24h`} />
          <Metric icon="⚔️" label="Batalhas" value={fmtNum(overview.battles)} hint={`${overview.winRate}% vitórias`} />
          <Metric icon="📚" label="Horas estudadas" value={fmtNum(Math.round(overview.studySec / 3600))} hint={`${fmtNum(overview.sessions)} sessões`} />
          <Metric icon="💰" label="Moedas" value={fmtMoney(overview.totalMoney)} hint={`${fmtNum(overview.totalShards)} fragmentos`} />
          <Metric icon="🏆" label="Troféus" value={fmtNum(overview.totalTrophies)} hint={`melhor streak ${overview.bestStreak}`} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Carregando indicadores reais do banco…</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex flex-wrap gap-2 lg:sticky lg:top-4 lg:h-fit lg:flex-col">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                section === s.id
                  ? "border-primary/60 bg-primary/15 text-foreground shadow-md shadow-primary/20"
                  : "border-border/50 bg-card/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="mr-2">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>

        <div className="space-y-6">
          {section === "overview" && <OverviewSection overview={overview} onOpen={openPlayer} />}
          {section === "players" && (
            <PlayersSection player={player} busy={busy} onOpen={openPlayer} run={run} onClose={() => setPlayer(null)} />
          )}
          {section === "monsters" && <MonstersSection />}
          {section === "battles" && <BattlesSection player={player} onOpen={openPlayer} overview={overview} />}
          {section === "leagues" && <LeaguesSection onOpen={openPlayer} />}
          {section === "economy" && <EconomySection overview={overview} run={run} busy={busy} />}
          {section === "codes" && <CodesSection run={run} busy={busy} />}
          {section === "announcements" && <AnnouncementsSection run={run} busy={busy} />}
          {section === "analytics" && <AnalyticsSection />}
          {section === "logs" && <LogsSection />}
          {section === "rankings" && <RankingsSection onOpen={openPlayer} />}
          {section === "system" && <SystemSection run={run} busy={busy} />}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Visão geral
// ------------------------------------------------------------
function OverviewSection({ overview, onOpen }: { overview: Overview | null; onOpen: (id: string) => void }) {
  const rankFn = useServerFn(adminRankings);
  const [ranks, setRanks] = useState<Rankings | null>(null);
  useEffect(() => {
    void rankFn().then(setRanks).catch(() => undefined);
  }, [rankFn]);

  if (!overview) return <Panel title="Visão geral"><p className="text-sm text-muted-foreground">Carregando…</p></Panel>;

  return (
    <>
      <Panel title="Números do jogo" subtitle="Tudo calculado a partir dos dados reais do banco.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric icon="🆕" label="Novos hoje" value={fmtNum(overview.newToday)} />
          <Metric icon="📅" label="Novos na semana" value={fmtNum(overview.newWeek)} />
          <Metric icon="⏱️" label="Tempo estudado" value={duration(overview.studySec)} />
          <Metric icon="📖" label="Tempo lido" value={duration(overview.readSec)} />
          <Metric icon="📄" label="Páginas lidas" value={fmtNum(overview.pages)} />
          <Metric icon="🐲" label="Monstros capturados" value={fmtNum(overview.monsters)} />
          <Metric icon="✅" label="Vitórias" value={fmtNum(overview.wins)} />
          <Metric icon="❌" label="Derrotas" value={fmtNum(overview.losses)} />
          <Metric icon="📚" label="Livros concluídos" value={fmtNum(overview.booksDone)} />
          <Metric icon="🧮" label="Média de estudo" value={duration(overview.avgStudySec)} hint="por jogador" />
          <Metric icon="🧾" label="Média de sessões" value={fmtNum(overview.avgSessions)} hint="por jogador" />
          <Metric icon="🔥" label="Maior streak" value={fmtNum(overview.bestStreak)} />
        </div>
      </Panel>

      {ranks ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Panel title="Top nível">
            <RankList rows={ranks.level.map((r) => ({ id: r.publicId, name: r.name, value: `Nv. ${r.level}` }))} onOpen={onOpen} />
          </Panel>
          <Panel title="Top troféus">
            <RankList rows={ranks.trophies.map((r) => ({ id: r.publicId, name: r.name, value: `${fmtNum(r.trophies)} 🏆` }))} onOpen={onOpen} />
          </Panel>
        </div>
      ) : null}
    </>
  );
}

function RankList({ rows, onOpen }: { rows: Array<{ id: string; name: string; value: string }>; onOpen: (id: string) => void }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">Sem dados ainda.</p>;
  return (
    <ol className="space-y-1.5">
      {rows.map((r, i) => (
        <li key={r.id}>
          <button
            type="button"
            onClick={() => onOpen(r.id)}
            className="flex w-full items-center justify-between rounded-lg border border-border/40 bg-background/30 px-3 py-2 text-sm hover:border-primary/50"
          >
            <span className="truncate">
              <span className="mr-2 text-muted-foreground">#{i + 1}</span>
              {r.name} <span className="text-xs text-muted-foreground">({r.id})</span>
            </span>
            <span className="font-semibold">{r.value}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

// ------------------------------------------------------------
// Jogadores
// ------------------------------------------------------------
type RunFn = (label: string, fn: () => Promise<unknown>) => Promise<boolean>;

function PlayersSection({
  player,
  busy,
  onOpen,
  run,
  onClose,
}: {
  player: PlayerDetail | null;
  busy: boolean;
  onOpen: (id: string) => void;
  run: RunFn;
  onClose: () => void;
}) {
  const searchFn = useServerFn(adminSearchPlayers);
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("updated");
  const [league, setLeague] = useState("");
  const [minLevel, setMinLevel] = useState(0);

  const search = useCallback(() => {
    void searchFn({ data: { query, sort, league, minLevel } })
      .then(setRows)
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Falha na busca."));
  }, [league, minLevel, query, searchFn, sort]);

  useEffect(search, [search]);

  return (
    <>
      <Panel title="Buscar jogadores" subtitle="Nome, ID, liga, nível — direto da base de perfis.">
        <div className="flex flex-wrap gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome ou ID público"
            className="w-56"
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="updated">Atividade recente</option>
            <option value="created">Cadastro recente</option>
            <option value="level">Nível</option>
            <option value="trophies">Troféus</option>
            <option value="money">Moedas</option>
            <option value="study">Tempo estudado</option>
            <option value="name">Nome</option>
          </select>
          <select
            value={league}
            onChange={(e) => setLeague(e.target.value)}
            className="rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="">Todas as ligas</option>
            {LEAGUES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.icon} {l.name}
              </option>
            ))}
          </select>
          <Input
            type="number"
            value={minLevel || ""}
            onChange={(e) => setMinLevel(Number(e.target.value) || 0)}
            placeholder="Nível mín."
            className="w-28"
          />
          <Button onClick={search} variant="secondary">
            Buscar
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Jogador</th>
                <th>Nível</th>
                <th>Moedas</th>
                <th>Frag.</th>
                <th>Liga</th>
                <th>Estudo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.publicId} className="border-t border-border/40">
                  <td className="py-2">
                    <span className={`mr-2 inline-block h-2 w-2 rounded-full ${r.online ? "bg-emerald-400" : "bg-muted"}`} />
                    {r.name} <span className="text-xs text-muted-foreground">{r.publicId}</span>
                  </td>
                  <td>{r.level}</td>
                  <td>{fmtMoney(r.money)}</td>
                  <td>{fmtNum(r.shards)}</td>
                  <td className="text-xs">{r.leagueName}</td>
                  <td className="text-xs">{duration(r.studySec)}</td>
                  <td className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => onOpen(r.publicId)}>
                      Abrir
                    </Button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-muted-foreground">
                    Nenhum jogador encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {player ? <PlayerConsole player={player} busy={busy} run={run} onClose={onClose} /> : null}
    </>
  );
}

function PlayerConsole({ player, busy, run, onClose }: { player: PlayerDetail; busy: boolean; run: RunFn; onClose: () => void }) {
  const resourceFn = useServerFn(adminSetResource);
  const leagueFn = useServerFn(adminSetLeague);
  const renameFn = useServerFn(adminRenamePlayer);
  const monsterFn = useServerFn(adminMonsterAction);
  const achievementFn = useServerFn(adminSetAchievement);
  const itemFn = useServerFn(adminGiveItem);
  const cosmeticFn = useServerFn(adminSetCosmetic);
  const progressFn = useServerFn(adminProgressOp);
  const moderateFn = useServerFn(adminModerate);

  const [name, setName] = useState(player.name);
  const [monsterId, setMonsterId] = useState(MONSTERS[0]?.id ?? "");
  const [monsterLevel, setMonsterLevel] = useState(1);
  const [achievementId, setAchievementId] = useState(ACHIEVEMENTS[0]?.id ?? "");
  const [itemId, setItemId] = useState(ITEMS[0]?.id ?? "");
  const [itemQty, setItemQty] = useState(1);
  const [cosmeticId, setCosmeticId] = useState(COSMETICS[0]?.id ?? "");
  const [banHours, setBanHours] = useState(0);
  const [reason, setReason] = useState("");

  useEffect(() => setName(player.name), [player.name, player.publicId]);

  const confirmAnd = (message: string, fn: () => Promise<unknown>) => () => {
    if (!window.confirm(message)) return;
    void fn();
  };

  return (
    <Panel
      title={`${player.name} · ${player.publicId}`}
      subtitle={`${player.email ?? "sem e-mail"} · save rev ${player.rev}${player.hasSave ? "" : " · ⚠️ sem save na nuvem"}`}
      action={
        <Button variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric icon="💰" label="Moedas" value={fmtMoney(player.money)} />
        <Metric icon="💎" label="Fragmentos" value={fmtNum(player.shards)} />
        <Metric icon="⭐" label="Nível / XP" value={`${player.level} · ${fmtNum(player.xp)}`} />
        <Metric icon="🏆" label="Troféus" value={`${fmtNum(player.trophies)} · ${player.leagueName}`} />
        <Metric icon="🔥" label="Streak" value={`${player.streak.current} (rec. ${player.streak.best})`} />
        <Metric icon="🐲" label="Monstros" value={fmtNum(player.monsters.length)} />
        <Metric icon="⚔️" label="V / D" value={`${player.wins} / ${player.losses}`} />
        <Metric icon="🧾" label="Sessões" value={fmtNum(player.sessionCount)} />
      </div>

      {player.bannedUntil ? (
        <p className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
          Conta suspensa até {dateTime(player.bannedUntil)}
        </p>
      ) : null}

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {(
          [
            ["money", "💰 Moedas", player.money],
            ["shards", "💎 Fragmentos", player.shards],
            ["xp", "⭐ XP", player.xp],
            ["trophies", "🏆 Troféus", player.trophies],
            ["level", "📈 Nível", player.level],
            ["streak", "🔥 Streak", player.streak.current],
          ] as const
        ).map(([key, label, current]) => (
          <ResourceRow
            key={key}
            label={label}
            current={current}
            busy={busy}
            onApply={(amount, mode) =>
              run(`${label} atualizado`, () => resourceFn({ data: { publicId: player.publicId, key, amount, mode } }))
            }
          />
        ))}
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-semibold">Nome do jogador</p>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Button
              disabled={busy}
              onClick={() => void run("Nome alterado", () => renameFn({ data: { publicId: player.publicId, name } }))}
            >
              Salvar
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Liga</p>
          <div className="flex gap-2">
            <select
              defaultValue={player.league}
              onChange={(e) =>
                void run("Liga alterada", () => leagueFn({ data: { publicId: player.publicId, leagueId: e.target.value } }))
              }
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {LEAGUES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.icon} {l.name} ({l.min}+)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <p className="text-sm font-semibold">🐲 Coleção</p>
        <div className="flex flex-wrap gap-2">
          <select
            value={monsterId}
            onChange={(e) => setMonsterId(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {MONSTERS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {m.rarity}
              </option>
            ))}
          </select>
          <Input
            type="number"
            min={1}
            max={10}
            value={monsterLevel}
            onChange={(e) => setMonsterLevel(Number(e.target.value) || 1)}
            className="w-24"
          />
          <Button
            disabled={busy}
            onClick={() =>
              void run("Monstro entregue", () =>
                monsterFn({ data: { publicId: player.publicId, monsterId, op: "give", level: monsterLevel, copies: 1 } }),
              )
            }
          >
            Dar monstro
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run("Nível do monstro alterado", () =>
                monsterFn({ data: { publicId: player.publicId, monsterId, op: "level", level: monsterLevel, copies: 1 } }),
              )
            }
          >
            Definir nível
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {player.monsters.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/40 p-2">
              <MonsterArt art={MONSTERS_BY_ID[m.id]?.art ?? "🐲"} rarity={MONSTERS_BY_ID[m.id]?.rarity ?? "comum"} size="sm" />
              <div className="text-xs">
                <p className="font-semibold">{m.name}</p>
                <p className="text-muted-foreground">
                  Nv. {m.level} · x{m.copies}
                </p>
              </div>
              <RarityBadge rarity={MONSTERS_BY_ID[m.id]?.rarity ?? "comum"} />
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={confirmAnd(`Remover ${m.name} de ${player.name}?`, () =>
                  run("Monstro removido", () =>
                    monsterFn({ data: { publicId: player.publicId, monsterId: m.id, op: "remove", level: 1, copies: 1 } }),
                  ),
                )}
              >
                ✕
              </Button>
            </div>
          ))}
          {!player.monsters.length && <p className="text-sm text-muted-foreground">Sem monstros.</p>}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-sm font-semibold">🏅 Conquistas ({player.achievements.length})</p>
        <div className="flex flex-wrap gap-2">
          <select
            value={achievementId}
            onChange={(e) => setAchievementId(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {ACHIEVEMENTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon} {a.name}
              </option>
            ))}
          </select>
          <Button
            disabled={busy}
            onClick={() =>
              void run("Conquista liberada", () =>
                achievementFn({ data: { publicId: player.publicId, achievementId, granted: true } }),
              )
            }
          >
            Liberar
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run("Conquista removida", () =>
                achievementFn({ data: { publicId: player.publicId, achievementId, granted: false } }),
              )
            }
          >
            Remover
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Desbloqueadas: {player.achievements.map((a) => ACHIEVEMENTS.find((x) => x.id === a.id)?.name ?? a.id).join(", ") || "nenhuma"}
        </p>
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-sm font-semibold">🎒 Itens do inventário</p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {ITEMS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.icon} {i.name}
              </option>
            ))}
          </select>
          <Input
            type="number"
            value={itemQty}
            onChange={(e) => setItemQty(Number(e.target.value) || 0)}
            className="w-24"
          />
          <Button
            disabled={busy}
            onClick={() =>
              void run("Item entregue", () =>
                itemFn({ data: { publicId: player.publicId, itemId, qty: Math.abs(itemQty) } }),
              )
            }
          >
            Entregar
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run("Item removido", () =>
                itemFn({ data: { publicId: player.publicId, itemId, qty: -Math.abs(itemQty) } }),
              )
            }
          >
            Remover
          </Button>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-sm font-semibold">🎨 Cosméticos</p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={cosmeticId}
            onChange={(e) => setCosmeticId(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {COSMETICS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          <Button
            disabled={busy}
            onClick={() =>
              void run("Cosmético liberado", () =>
                cosmeticFn({ data: { publicId: player.publicId, cosmeticId, granted: true } }),
              )
            }
          >
            Liberar
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run("Cosmético removido", () =>
                cosmeticFn({ data: { publicId: player.publicId, cosmeticId, granted: false } }),
              )
            }
          >
            Remover
          </Button>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-sm font-semibold">🎯 Missões e temporada</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={busy}
            onClick={() =>
              void run("Missões do dia concluídas", () =>
                progressFn({ data: { publicId: player.publicId, op: "completeQuests" } }),
              )
            }
          >
            Concluir missões de hoje
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={confirmAnd(
              `Reiniciar a temporada de ${player.name}? Os troféus voltam a zero.`,
              () =>
                run("Temporada reiniciada", () =>
                  progressFn({ data: { publicId: player.publicId, op: "resetSeason" } }),
                ),
            )}
          >
            Reiniciar temporada
          </Button>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-sm font-semibold">🛡️ Moderação</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            min={0}
            value={banHours || ""}
            onChange={(e) => setBanHours(Number(e.target.value) || 0)}
            placeholder="Horas (0 = permanente)"
            className="w-44"
          />
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo" className="w-56" />
          <Button
            variant="destructive"
            disabled={busy}
            onClick={confirmAnd(`Suspender ${player.name}?`, () =>
              run("Conta suspensa", () =>
                moderateFn({ data: { publicId: player.publicId, op: "ban", hours: banHours, reason } }),
              ),
            )}
          >
            Suspender
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run("Conta reativada", () => moderateFn({ data: { publicId: player.publicId, op: "unban", hours: 0, reason } }))
            }
          >
            Reativar
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run("Códigos liberados", () =>
                moderateFn({ data: { publicId: player.publicId, op: "clearCodes", hours: 0, reason } }),
              )
            }
          >
            Liberar códigos
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={confirmAnd(`ZERAR todo o progresso de ${player.name}? Isso não pode ser desfeito.`, () =>
              run("Progresso zerado", () =>
                moderateFn({ data: { publicId: player.publicId, op: "reset", hours: 0, reason } }),
              ),
            )}
          >
            Zerar progresso
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={confirmAnd(`APAGAR a conta de ${player.name} definitivamente?`, () =>
              run("Conta apagada", () =>
                moderateFn({ data: { publicId: player.publicId, op: "delete", hours: 0, reason } }),
              ),
            )}
          >
            Apagar conta
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold">🧾 Sessões recentes</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {player.recentSessions.map((s, i) => (
              <li key={i}>
                {s.kind} · {duration(s.durationSec)} {s.subject ? `· ${s.subject}` : ""} {s.rarity ? `· ${s.rarity}` : ""}
              </li>
            ))}
            {!player.recentSessions.length && <li>Sem sessões.</li>}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">📜 Histórico administrativo</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {player.adminHistory.map((h, i) => (
              <li key={i} className={h.success ? "" : "text-destructive"}>
                {dateTime(h.at)} · {h.action} · {h.admin}
              </li>
            ))}
            {!player.adminHistory.length && <li>Sem alterações registradas.</li>}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

function ResourceRow({
  label,
  current,
  busy,
  onApply,
}: {
  label: string;
  current: number;
  busy: boolean;
  onApply: (amount: number, mode: "add" | "remove" | "set") => Promise<boolean>;
}) {
  const [amount, setAmount] = useState("");
  const value = Number(amount) || 0;
  const apply = (mode: "add" | "remove" | "set") => async () => {
    const ok = await onApply(value, mode);
    if (ok) setAmount("");
  };
  return (
    <div className="rounded-xl border border-border/50 bg-background/30 p-3">
      <p className="text-sm font-semibold">
        {label} <span className="text-muted-foreground">· atual {fmtNum(current)}</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Quantidade"
          className="w-32"
        />
        <Button size="sm" disabled={busy} onClick={() => void apply("add")()}>
          + Adicionar
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void apply("remove")()}>
          − Remover
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void apply("set")()}>
          = Definir
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Monstros
// ------------------------------------------------------------
function MonstersSection() {
  const statsFn = useServerFn(adminMonsterStats);
  const [rows, setRows] = useState<MonsterStat[]>([]);
  const [sort, setSort] = useState<"owners" | "copies" | "rarity">("owners");

  useEffect(() => {
    void statsFn().then(setRows).catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao carregar."));
  }, [statsFn]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    if (sort === "owners") copy.sort((a, z) => z.owners - a.owners);
    if (sort === "copies") copy.sort((a, z) => z.copies - a.copies);
    if (sort === "rarity") copy.sort((a, z) => a.rarity.localeCompare(z.rarity));
    return copy;
  }, [rows, sort]);

  const rarest = [...rows].filter((r) => r.owners > 0).sort((a, z) => a.owners - z.owners)[0];
  const most = [...rows].sort((a, z) => z.owners - a.owners)[0];

  return (
    <Panel
      title="Catálogo de monstros"
      subtitle="Posse real por jogador, calculada a partir dos perfis salvos."
      action={
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-md border border-border bg-background px-3 py-1.5 text-sm">
          <option value="owners">Mais possuídos</option>
          <option value="copies">Mais cópias</option>
          <option value="rarity">Raridade</option>
        </select>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Metric icon="🐲" label="Monstros no jogo" value={fmtNum(rows.length)} />
        <Metric icon="🔥" label="Mais capturado" value={most?.name ?? "—"} hint={`${most?.owners ?? 0} jogadores`} />
        <Metric icon="💠" label="Mais raro em posse" value={rarest?.name ?? "—"} hint={`${rarest?.owners ?? 0} jogadores`} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2">Monstro</th>
              <th>Raridade</th>
              <th>Donos</th>
              <th>%</th>
              <th>Cópias</th>
              <th>Nv. médio</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => (
              <tr key={m.id} className="border-t border-border/40">
                <td className="flex items-center gap-2 py-1.5">
                  <MonsterArt art={MONSTERS_BY_ID[m.id]?.art ?? "🐲"} rarity={MONSTERS_BY_ID[m.id]?.rarity ?? "comum"} size="sm" />
                  {m.name}
                </td>
                <td>
                  <RarityBadge rarity={m.rarity} />
                </td>
                <td>{fmtNum(m.owners)}</td>
                <td>{m.ownedPct}%</td>
                <td>{fmtNum(m.copies)}</td>
                <td>{m.avgLevel || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Os atributos base dos monstros fazem parte do código do jogo (mesma fonte usada nas batalhas), por isso não são
        editáveis aqui — evitar duplicar o catálogo em outro lugar mantém batalhas, drops e Monsterdex coerentes.
      </p>
    </Panel>
  );
}

// ------------------------------------------------------------
// Batalhas
// ------------------------------------------------------------
function BattlesSection({
  player,
  overview,
  onOpen,
}: {
  player: PlayerDetail | null;
  overview: Overview | null;
  onOpen: (id: string) => void;
}) {
  const [id, setId] = useState("");
  return (
    <>
      <Panel title="Central de batalhas" subtitle="Totais reais somados dos perfis.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric icon="⚔️" label="Batalhas" value={fmtNum(overview?.battles ?? 0)} />
          <Metric icon="✅" label="Vitórias" value={fmtNum(overview?.wins ?? 0)} />
          <Metric icon="❌" label="Derrotas" value={fmtNum(overview?.losses ?? 0)} />
          <Metric icon="📊" label="Taxa de vitória" value={`${overview?.winRate ?? 0}%`} />
        </div>
      </Panel>
      <Panel title="Histórico de batalhas de um jogador">
        <div className="flex gap-2">
          <Input value={id} onChange={(e) => setId(e.target.value)} placeholder="ID público" className="w-48" />
          <Button variant="secondary" onClick={() => onOpen(id)}>
            Carregar
          </Button>
        </div>
        {player ? (
          <ul className="mt-4 space-y-1 text-sm">
            {player.battles.map((b) => (
              <li key={b.id} className="rounded-lg border border-border/40 bg-background/30 px-3 py-2">
                <span className={b.result === "win" ? "text-emerald-400" : "text-destructive"}>
                  {b.result === "win" ? "Vitória" : "Derrota"}
                </span>{" "}
                vs {b.opponent} · {b.mode} · {b.turns} turnos · {b.delta >= 0 ? "+" : ""}
                {b.delta} 🏆 ({b.before} → {b.after}) · {dateTime(b.at)}
                <p className="text-xs text-muted-foreground">
                  Time: {b.team.map((t) => MONSTERS_BY_ID[t]?.name ?? t).join(", ")} · Oponente:{" "}
                  {b.opponentTeam.map((t) => MONSTERS_BY_ID[t]?.name ?? t).join(", ")}
                </p>
              </li>
            ))}
            {!player.battles.length && <li className="text-muted-foreground">Sem batalhas registradas.</li>}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Carregue um jogador para ver o histórico detalhado.</p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Para corrigir o resultado de uma batalha, ajuste os troféus do jogador na aba Jogadores — a alteração fica
          registrada na auditoria.
        </p>
      </Panel>
    </>
  );
}

// ------------------------------------------------------------
// Ligas
// ------------------------------------------------------------
function LeaguesSection({ onOpen }: { onOpen: (id: string) => void }) {
  const analyticsFn = useServerFn(adminAnalytics);
  const rankFn = useServerFn(adminRankings);
  const [data, setData] = useState<Analytics | null>(null);
  const [ranks, setRanks] = useState<Rankings | null>(null);
  useEffect(() => {
    void analyticsFn().then(setData).catch(() => undefined);
    void rankFn().then(setRanks).catch(() => undefined);
  }, [analyticsFn, rankFn]);

  return (
    <>
      <Panel title="Distribuição de ligas" subtitle="Faixas de troféus definidas no jogo.">
        {data ? <Bars data={data.leagues.map((l) => ({ label: `${l.icon} ${l.name}`, value: l.count }))} /> : <p className="text-sm text-muted-foreground">Carregando…</p>}
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2">Liga</th>
              <th>Troféus necessários</th>
              <th>Jogadores</th>
            </tr>
          </thead>
          <tbody>
            {LEAGUES.map((l) => (
              <tr key={l.id} className="border-t border-border/40">
                <td className="py-1.5">
                  {l.icon} {l.name}
                </td>
                <td>{l.min}+</td>
                <td>{data?.leagues.find((x) => x.id === l.id)?.count ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel title="Ranking global de troféus">
        {ranks ? (
          <RankList rows={ranks.trophies.map((r) => ({ id: r.publicId, name: `${r.name} · ${r.league}`, value: `${fmtNum(r.trophies)} 🏆` }))} onOpen={onOpen} />
        ) : null}
      </Panel>
    </>
  );
}

// ------------------------------------------------------------
// Economia
// ------------------------------------------------------------
function EconomySection({ overview, run, busy }: { overview: Overview | null; run: RunFn; busy: boolean }) {
  const bulkFn = useServerFn(adminBulkGrant);
  const [money, setMoney] = useState("");
  const [shards, setShards] = useState("");

  return (
    <>
      <Panel title="Circulação" subtitle="Soma real de todos os perfis.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric icon="💰" label="Moedas em circulação" value={fmtMoney(overview?.totalMoney ?? 0)} />
          <Metric icon="💎" label="Fragmentos" value={fmtNum(overview?.totalShards ?? 0)} />
          <Metric
            icon="🧮"
            label="Média por jogador"
            value={fmtMoney(Math.round((overview?.totalMoney ?? 0) / Math.max(1, overview?.players ?? 1)))}
          />
          <Metric icon="👥" label="Jogadores" value={fmtNum(overview?.players ?? 0)} />
        </div>
      </Panel>
      <Panel title="Presente em massa" subtitle="Aplica a alteração no save de cada jogador, um a um, com auditoria.">
        <div className="flex flex-wrap gap-2">
          <Input type="number" value={money} onChange={(e) => setMoney(e.target.value)} placeholder="Moedas" className="w-36" />
          <Input type="number" value={shards} onChange={(e) => setShards(e.target.value)} placeholder="Fragmentos" className="w-36" />
          <Button
            disabled={busy}
            onClick={() => {
              if (!window.confirm("Enviar este presente para TODOS os jogadores?")) return;
              void run("Presente em massa aplicado", () =>
                bulkFn({ data: { money: Number(money) || 0, shards: Number(shards) || 0 } }),
              );
            }}
          >
            Enviar para todos
          </Button>
        </div>
      </Panel>
    </>
  );
}

// ------------------------------------------------------------
// Códigos
// ------------------------------------------------------------
type CodeRow = Record<string, unknown>;

function CodesSection({ run, busy }: { run: RunFn; busy: boolean }) {
  const listFn = useServerFn(adminListCodes);
  const saveFn = useServerFn(adminSaveCode);
  const deleteFn = useServerFn(adminDeleteCode);
  const [data, setData] = useState<{ codes: CodeRow[]; uses: CodeRow[] } | null>(null);
  const [form, setForm] = useState({ code: "", label: "", money: "", shards: "", xp: "", monsterId: "", maxUses: "", active: true });

  const reload = useCallback(() => {
    void listFn().then(setData).catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao carregar códigos."));
  }, [listFn]);
  useEffect(reload, [reload]);

  return (
    <>
      <Panel title="Criar / editar código" subtitle="Códigos ficam no banco e valem para todos os jogadores.">
        <div className="grid gap-2 md:grid-cols-3">
          <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CÓDIGO" />
          <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Descrição" />
          <Input value={form.money} onChange={(e) => setForm({ ...form, money: e.target.value })} placeholder="Moedas" type="number" />
          <Input value={form.shards} onChange={(e) => setForm({ ...form, shards: e.target.value })} placeholder="Fragmentos" type="number" />
          <Input value={form.xp} onChange={(e) => setForm({ ...form, xp: e.target.value })} placeholder="XP" type="number" />
          <select
            value={form.monsterId}
            onChange={(e) => setForm({ ...form, monsterId: e.target.value })}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Sem monstro</option>
            {MONSTERS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {m.rarity}
              </option>
            ))}
          </select>
          <Input value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="Usos máx. (vazio = ilimitado)" type="number" />
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /> Ativo
          </label>
          <Button
            disabled={busy}
            onClick={async () => {
              const ok = await run("Código salvo", () =>
                saveFn({
                  data: {
                    code: form.code,
                    label: form.label,
                    money: Number(form.money) || 0,
                    shards: Number(form.shards) || 0,
                    xp: Number(form.xp) || 0,
                    monsterId: form.monsterId || null,
                    maxUses: form.maxUses === "" ? null : Number(form.maxUses),
                    active: form.active,
                  },
                }),
              );
              if (ok) reload();
            }}
          >
            Salvar código
          </Button>
        </div>
      </Panel>

      <Panel title="Códigos existentes">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Código</th>
                <th>Recompensa</th>
                <th>Usos</th>
                <th>Ativo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(data?.codes ?? []).map((c) => {
                const code = String(c['code']);
                return (
                  <tr key={code} className="border-t border-border/40">
                    <td className="py-1.5">
                      {code} <span className="text-xs text-muted-foreground">{String(c['label'] ?? "")}</span>
                    </td>
                    <td className="text-xs">
                      {fmtMoney(Number(c['money'] ?? 0))} · {String(c['shards'] ?? 0)} 💎
                      {c['monster_id'] ? ` · ${MONSTERS_BY_ID[String(c['monster_id'])]?.name ?? ""}` : ""}
                    </td>
                    <td>
                      {String(c['uses'] ?? 0)}
                      {c['max_uses'] ? ` / ${String(c['max_uses'])}` : ""}
                    </td>
                    <td>{c['active'] ? "sim" : "não"}</td>
                    <td className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={async () => {
                          if (!window.confirm(`Excluir o código ${code}?`)) return;
                          const ok = await run("Código excluído", () => deleteFn({ data: { code } }));
                          if (ok) reload();
                        }}
                      >
                        Excluir
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {!data?.codes.length && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground">
                    Nenhum código cadastrado no banco ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

// ------------------------------------------------------------
// Anúncios
// ------------------------------------------------------------
function AnnouncementsSection({ run, busy }: { run: RunFn; busy: boolean }) {
  const listFn = useServerFn(adminListAnnouncements);
  const saveFn = useServerFn(adminSaveAnnouncement);
  const deleteFn = useServerFn(adminDeleteAnnouncement);
  const [rows, setRows] = useState<CodeRow[]>([]);
  const [form, setForm] = useState({ title: "", body: "", kind: "info", audience: "all", audienceValue: "", active: true });

  const reload = useCallback(() => {
    void listFn().then(setRows).catch(() => undefined);
  }, [listFn]);
  useEffect(reload, [reload]);

  return (
    <>
      <Panel title="Novo anúncio" subtitle="Fica salvo no banco e aparece para os jogadores escolhidos.">
        <div className="grid gap-2">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título" />
          <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Mensagem" rows={3} />
          <div className="flex flex-wrap gap-2">
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="info">Informação</option>
              <option value="event">Evento</option>
              <option value="warning">Aviso</option>
              <option value="maintenance">Manutenção</option>
            </select>
            <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="all">Todos</option>
              <option value="player">Jogador específico</option>
              <option value="league">Liga</option>
              <option value="level">Nível mínimo</option>
            </select>
            {form.audience !== "all" && (
              <Input
                value={form.audienceValue}
                onChange={(e) => setForm({ ...form, audienceValue: e.target.value })}
                placeholder={form.audience === "player" ? "ID público" : form.audience === "league" ? "id da liga" : "nível"}
                className="w-44"
              />
            )}
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /> Ativo
            </label>
            <Button
              disabled={busy}
              onClick={async () => {
                const ok = await run("Anúncio publicado", () => saveFn({ data: { ...form } }));
                if (ok) reload();
              }}
            >
              Publicar
            </Button>
          </div>
        </div>
      </Panel>
      <Panel title="Anúncios publicados">
        <ul className="space-y-2 text-sm">
          {rows.map((a) => (
            <li key={String(a['id'])} className="flex items-start justify-between gap-3 rounded-lg border border-border/40 bg-background/30 px-3 py-2">
              <div>
                <p className="font-semibold">
                  {String(a['title'])} <span className="text-xs text-muted-foreground">· {String(a['audience'])} · {a['active'] ? "ativo" : "inativo"}</span>
                </p>
                <p className="text-xs text-muted-foreground">{String(a['body'] ?? "")}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={async () => {
                  if (!window.confirm("Excluir este anúncio?")) return;
                  const ok = await run("Anúncio excluído", () => deleteFn({ data: { id: String(a['id']) } }));
                  if (ok) reload();
                }}
              >
                Excluir
              </Button>
            </li>
          ))}
          {!rows.length && <li className="text-muted-foreground">Nenhum anúncio.</li>}
        </ul>
      </Panel>
    </>
  );
}

// ------------------------------------------------------------
// Analytics
// ------------------------------------------------------------
function AnalyticsSection() {
  const analyticsFn = useServerFn(adminAnalytics);
  const [data, setData] = useState<Analytics | null>(null);
  useEffect(() => {
    void analyticsFn().then(setData).catch(() => undefined);
  }, [analyticsFn]);
  if (!data) return <Panel title="Analytics"><p className="text-sm text-muted-foreground">Carregando…</p></Panel>;
  return (
    <>
      <Panel title="Novos jogadores (14 dias)">
        <Bars data={data.days.map((d) => ({ label: d.day.slice(5), value: d.signups }))} />
      </Panel>
      <Panel title="Jogadores ativos por dia (14 dias)">
        <Bars data={data.days.map((d) => ({ label: d.day.slice(5), value: d.active }))} />
      </Panel>
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Distribuição de níveis">
          <Bars data={data.levels.map((l) => ({ label: `Nv. ${l.label}`, value: l.count }))} />
        </Panel>
        <Panel title="Monstros por raridade">
          <Bars data={data.rarities.map((r) => ({ label: r.rarity, value: r.count }))} />
        </Panel>
      </div>
    </>
  );
}

// ------------------------------------------------------------
// Logs
// ------------------------------------------------------------
function LogsSection() {
  const logsFn = useServerFn(adminLogs);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [publicId, setPublicId] = useState("");
  const [action, setAction] = useState("");
  const [days, setDays] = useState(30);

  const load = useCallback(() => {
    void logsFn({ data: { publicId, action, days, limit: 200 } })
      .then(setRows)
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao carregar logs."));
  }, [action, days, logsFn, publicId]);
  useEffect(load, [load]);

  return (
    <Panel title="Auditoria administrativa" subtitle="Toda ação — inclusive as que falharam — fica registrada no banco.">
      <div className="mb-4 flex flex-wrap gap-2">
        <Input value={publicId} onChange={(e) => setPublicId(e.target.value.toUpperCase())} placeholder="ID do jogador" className="w-40" />
        <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Ação" className="w-44" />
        <Input type="number" value={days} onChange={(e) => setDays(Number(e.target.value) || 30)} className="w-28" />
        <Button variant="secondary" onClick={load}>
          Filtrar
        </Button>
      </div>
      <ul className="space-y-2 text-sm">
        {rows.map((l) => (
          <li
            key={l.id}
            className={`rounded-lg border px-3 py-2 ${l.success ? "border-border/40 bg-background/30" : "border-destructive/50 bg-destructive/10"}`}
          >
            <p className="font-semibold">
              {l.action} {l.success ? "" : "— FALHOU"}
            </p>
            <p className="text-xs text-muted-foreground">
              ADM: {l.admin} · Jogador: {l.targetName || "—"} ({l.target}) · {dateTime(l.at)}
            </p>
            {l.success && Object.keys(l.after).length ? (
              <p className="text-xs text-muted-foreground">
                Antes: 💰{fmtNum(Number(l.before['money'] ?? 0))} ⭐{fmtNum(Number(l.before['xp'] ?? 0))} 💎
                {fmtNum(Number(l.before['shards'] ?? 0))} 🏆{fmtNum(Number(l.before['trophies'] ?? 0))} → Depois: 💰
                {fmtNum(Number(l.after['money'] ?? 0))} ⭐{fmtNum(Number(l.after['xp'] ?? 0))} 💎
                {fmtNum(Number(l.after['shards'] ?? 0))} 🏆{fmtNum(Number(l.after['trophies'] ?? 0))}
              </p>
            ) : null}
            {l.error ? <p className="text-xs text-destructive">{l.error}</p> : null}
          </li>
        ))}
        {!rows.length && <li className="text-muted-foreground">Nenhum registro no período.</li>}
      </ul>
    </Panel>
  );
}

// ------------------------------------------------------------
// Rankings
// ------------------------------------------------------------
function RankingsSection({ onOpen }: { onOpen: (id: string) => void }) {
  const rankFn = useServerFn(adminRankings);
  const [ranks, setRanks] = useState<Rankings | null>(null);
  useEffect(() => {
    void rankFn().then(setRanks).catch(() => undefined);
  }, [rankFn]);
  if (!ranks) return <Panel title="Rankings"><p className="text-sm text-muted-foreground">Carregando…</p></Panel>;
  const blocks: Array<[string, Array<{ id: string; name: string; value: string }>]> = [
    ["Nível", ranks.level.map((r) => ({ id: r.publicId, name: r.name, value: `Nv. ${r.level}` }))],
    ["Troféus", ranks.trophies.map((r) => ({ id: r.publicId, name: r.name, value: `${fmtNum(r.trophies)} 🏆` }))],
    ["Tempo estudado", ranks.study.map((r) => ({ id: r.publicId, name: r.name, value: duration(r.studySec) }))],
    ["Monstros", ranks.monsters.map((r) => ({ id: r.publicId, name: r.name, value: `${r.monsters}` }))],
    ["Livros concluídos", ranks.books.map((r) => ({ id: r.publicId, name: r.name, value: `${r.booksDone}` }))],
    ["Vitórias", ranks.wins.map((r) => ({ id: r.publicId, name: r.name, value: `${r.wins}` }))],
    ["Moedas", ranks.money.map((r) => ({ id: r.publicId, name: r.name, value: fmtMoney(r.money) }))],
  ];
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {blocks.map(([title, rows]) => (
        <Panel key={title} title={title}>
          <RankList rows={rows} onOpen={onOpen} />
        </Panel>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Sistema
// ------------------------------------------------------------
function SystemSection({ run, busy }: { run: RunFn; busy: boolean }) {
  const getFn = useServerFn(adminGetSettings);
  const saveFn = useServerFn(adminSaveSettings);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [meta, setMeta] = useState<{ updatedAt: string | null; updatedBy: string | null }>({ updatedAt: null, updatedBy: null });

  const reload = useCallback(() => {
    void getFn()
      .then((s) => {
        setSettings(s.value);
        setMeta({ updatedAt: s.updatedAt, updatedBy: s.updatedBy });
      })
      .catch(() => undefined);
  }, [getFn]);
  useEffect(reload, [reload]);

  if (!settings) return <Panel title="Sistema"><p className="text-sm text-muted-foreground">Carregando…</p></Panel>;

  const toggles: Array<[string, string]> = [
    ["battlesEnabled", "⚔️ Batalhas"],
    ["rankedEnabled", "🏆 Ranqueada"],
    ["trainingEnabled", "🤖 Treinamento"],
    ["shopEnabled", "🛒 Loja"],
    ["codesEnabled", "🎟️ Códigos"],
    ["signupEnabled", "🆕 Cadastro"],
    ["maintenance", "🚧 Modo manutenção"],
  ];

  const save = (patch: Record<string, unknown>) =>
    run("Configuração salva", async () => {
      const fresh = await saveFn({ data: patch });
      setSettings(fresh.value);
      setMeta({ updatedAt: fresh.updatedAt, updatedBy: fresh.updatedBy });
    });

  return (
    <Panel
      title="Controle global"
      subtitle={meta.updatedAt ? `Última alteração: ${dateTime(meta.updatedAt)} por ${meta.updatedBy}` : "Configurações persistentes no banco."}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {toggles.map(([key, label]) => (
          <label key={key} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/30 px-3 py-2 text-sm">
            {label}
            <Switch checked={!!settings[key]} disabled={busy} onCheckedChange={(v) => void save({ [key]: v })} />
          </label>
        ))}
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-semibold">Mensagem de manutenção</p>
          <Textarea
            defaultValue={String(settings['maintenanceMessage'] ?? "")}
            rows={2}
            onBlur={(e) => void save({ maintenanceMessage: e.target.value })}
          />
        </div>
        <div>
          <p className="mb-1 text-sm font-semibold">Versão</p>
          <Input defaultValue={String(settings['version'] ?? "")} onBlur={(e) => void save({ version: e.target.value })} />
        </div>
      </div>
    </Panel>
  );
}
