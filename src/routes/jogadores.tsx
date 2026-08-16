import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { useCloudSync } from "@/hooks/use-auth";
import { findProfile, topProfiles, type PublicProfile } from "@/lib/game/cloud";
import { EmptyState, PageHeader, StatCard } from "@/components/game/Primitives";
import { ProfileAvatar } from "@/components/game/Avatar";
import { MonsterArt, RarityBadge } from "@/components/game/MonsterArt";
import { MONSTERS_BY_ID } from "@/lib/game/monsters";
import { RARITIES, RARITY_ORDER } from "@/lib/game/config";
import { leagueOf, leagueProgress } from "@/lib/game/battle/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { duration, money, num } from "@/lib/format";
import { COSMETICS_BY_ID } from "@/lib/game/cosmetics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/jogadores")({
  head: () => ({
    meta: [
      { title: "Pesquisar jogador — Monster Study" },
      {
        name: "description",
        content:
          "Digite o ID de um amigo para ver o perfil completo: nível, coleção de monstros, tempo estudado e sequência.",
      },
      { property: "og:title", content: "Pesquisar jogador — Monster Study" },
      { property: "og:description", content: "Veja o perfil de outros caçadores pelo ID." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlayersPage,
});

function PlayersPage() {
  const { publicId, user } = useCloudSync();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<PublicProfile | null>(null);
  const [top, setTop] = useState<PublicProfile[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    void topProfiles(8).then(setTop);
  }, [user]);

  async function search() {
    setBusy(true);
    const p = await findProfile(query);
    setBusy(false);
    if (!p) {
      toast.error("Nenhum jogador com esse ID.");
      setFound(null);
      return;
    }
    setFound(p);
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pesquisar jogador" icon="🔎" />
        <EmptyState
          icon="🔐"
          title="Entre na sua conta"
          description="Os perfis online ficam disponíveis depois de criar sua conta — é ela que gera seu ID de jogador."
          action={
            <Button asChild>
              <Link to="/entrar">Entrar ou criar conta</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pesquisar jogador"
        icon="🔎"
        subtitle="Digite o ID de um amigo para ver o perfil dele."
      />

      <div className="panel space-y-3 p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Seu ID de jogador</p>
        <p className="font-display text-3xl font-bold tracking-[0.2em] text-primary">
          {publicId ?? "..."}
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (publicId) {
              void navigator.clipboard.writeText(publicId);
              toast.success("ID copiado!");
            }
          }}
        >
          Copiar ID
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          placeholder="Ex: A7K2M9QX"
          className="font-mono tracking-widest"
        />
        <Button onClick={search} disabled={busy || query.trim().length < 4}>
          <Search className="h-4 w-4" /> Buscar
        </Button>
      </div>

      {found && <ProfileView profile={found} />}

      {top.length > 0 && (
        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">Maiores caçadores</h2>
          <ul className="mt-3 space-y-2">
            {top.map((p) => (
              <li key={p.publicId}>
                <button
                  type="button"
                  onClick={() => setFound(p)}
                  className="flex w-full items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2 text-left hover:bg-secondary"
                >
                  <ProfileAvatar avatar={p.avatar} monsterId={p.avatarMonsterId} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {p.stats.cosmetics?.badge
                        ? `${COSMETICS_BY_ID[p.stats.cosmetics.badge]?.icon ?? ""} `
                        : ""}
                      {p.displayName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {p.stats.title ? `${p.stats.title} · ` : ""}
                      {leagueOf(p.stats.trophies ?? 0).icon} {num(p.stats.trophies ?? 0)} 🏆
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">Nv {p.level}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ProfileView({ profile: p }: { profile: PublicProfile }) {
  const owned = Object.entries(p.monsters)
    .map(([id, v]) => ({ id, ...v, def: MONSTERS_BY_ID[id] }))
    .filter((x) => x.def)
    .sort((a, b) => RARITY_ORDER.indexOf(b.def!.rarity) - RARITY_ORDER.indexOf(a.def!.rarity));

  const cos = p.stats.cosmetics ?? {};
  const frame = cos.frame ? COSMETICS_BY_ID[cos.frame] : undefined;
  const title = cos.title ? COSMETICS_BY_ID[cos.title] : undefined;
  const bg = cos.background ? COSMETICS_BY_ID[cos.background] : undefined;
  const badge = cos.badge ? COSMETICS_BY_ID[cos.badge] : undefined;
  const fx = cos.effect ? COSMETICS_BY_ID[cos.effect] : undefined;
  const league = leagueOf(p.stats.trophies ?? 0);
  const team = (p.stats.team ?? []).map((id) => MONSTERS_BY_ID[id]).filter(Boolean);
  const topMonster = p.stats.topMonsterId ? MONSTERS_BY_ID[p.stats.topMonsterId] : undefined;

  return (
    <div className="space-y-5">
      <div className={cn("panel aurora flex flex-wrap items-center gap-5 p-6", bg?.className)}>
        <div className={cn("rounded-2xl", frame?.className, fx?.className)}>
          <ProfileAvatar avatar={p.avatar} monsterId={p.avatarMonsterId} size="lg" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-2xl font-bold">
            {badge && <span className="mr-1.5">{badge.icon}</span>}
            {p.displayName}
          </p>
          {title && (
            <p className="text-sm font-semibold text-primary">
              {title.icon} {title.name}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            ID {p.publicId} · Nível {p.level} · 🔥 {p.streakCurrent} dias
          </p>
          <p className="text-xs text-muted-foreground">
            {league.icon} Liga {league.name} · Temporada {p.stats.season ?? 1}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="font-display text-2xl font-bold text-gold">{money(p.money)}</p>
          <p className="text-xs text-muted-foreground">{num(p.shards)} fragmentos</p>
        </div>
      </div>

      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">🎨 Personalização</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["Título", title],
              ["Moldura", frame],
              ["Fundo", bg],
              ["Emblema", badge],
              ["Efeito", fx],
            ] as const
          ).map(([label, item]) => (
            <div key={label} className="flex items-center gap-2 rounded-xl bg-secondary/40 p-2.5">
              <span className="text-lg">{item?.icon ?? "▫️"}</span>
              <span className="min-w-0">
                <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">
                  {label}
                </span>
                <span className="block truncate text-sm font-medium">
                  {item?.name ?? "Nada equipado"}
                </span>
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {num(p.stats.cosmeticsOwned ?? 0)} cosméticos desbloqueados
        </p>
      </section>

      <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="font-display text-base font-semibold">🤝 Batalha amistosa</p>
          <p className="text-xs text-muted-foreground">
            Enfrente a equipe de {p.displayName} sem ganhar nem perder troféus.
          </p>
        </div>
        <Button asChild>
          <Link to="/batalhas" search={{ amistoso: p.publicId }}>
            Desafiar
          </Link>
        </Button>
      </div>

      {team.length > 0 && (
        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">🛡️ Equipe de batalha</h2>
          <div className="mt-3 flex flex-wrap gap-4">
            {team.map((def) => (
              <div key={def!.id} className="flex flex-col items-center gap-1 text-center">
                <MonsterArt art={def!.art} rarity={def!.rarity} size="sm" animate={false} />
                <p className="truncate text-xs font-medium">{def!.name}</p>
                <RarityBadge rarity={def!.rarity} />
              </div>
            ))}
          </div>
        </section>
      )}

      {topMonster && (
        <section className="panel flex items-center gap-4 p-5">
          <MonsterArt art={topMonster.art} rarity={topMonster.rarity} size="sm" animate={false} />
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Joia da coleção</p>
            <p className="font-display text-lg font-bold">{topMonster.name}</p>
            <RarityBadge rarity={topMonster.rarity} />
          </div>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tempo estudando" value={duration(p.stats.studySec ?? 0)} />
        <StatCard label="Tempo lendo" value={duration(p.stats.readSec ?? 0)} />
        <StatCard label="Páginas lidas" value={num(p.stats.pages ?? 0)} />
        <StatCard label="Sessões" value={num(p.stats.sessions ?? 0)} />
        <StatCard label="Livros concluídos" value={num(p.stats.booksDone ?? 0)} />
        <StatCard label="Livros na estante" value={num(p.stats.books ?? 0)} />
        <StatCard label="Monstros" value={num(p.stats.discovered ?? owned.length)} />
        <StatCard label="Conquistas" value={num(p.stats.achievements ?? 0)} />
        <StatCard label="Itens no inventário" value={num(p.stats.items ?? 0)} />
        <StatCard
          label="Ritmo de leitura"
          value={p.stats.avgMinPerPage ? `${p.stats.avgMinPerPage} min/pág` : "—"}
        />
        <StatCard label="Melhor sequência" value={`🔥 ${p.streakBest} dias`} />
        <StatCard label="XP" value={num(p.xp)} />
      </div>


      <section className="panel space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">⚔️ Batalhas</h2>
          <span className="font-display text-xl font-bold text-gold">
            {num(p.stats.trophies ?? 0)} 🏆
          </span>
        </div>
        <p className="text-sm">
          {leagueOf(p.stats.trophies ?? 0).icon} Liga {leagueOf(p.stats.trophies ?? 0).name}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
            style={{ width: `${leagueProgress(p.stats.trophies ?? 0).pct}%` }}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Vitórias" value={num(p.stats.wins ?? 0)} />
          <StatCard label="Derrotas" value={num(p.stats.losses ?? 0)} />
          <StatCard
            label="Total de batalhas"
            value={num(p.stats.battles ?? (p.stats.wins ?? 0) + (p.stats.losses ?? 0))}
          />
          <StatCard label="Maior troféus" value={num(p.stats.bestTrophies ?? 0)} />
        </div>
      </section>

      {p.stats.subjects && p.stats.subjects.length > 0 && (
        <section className="panel p-5">
          <h2 className="font-display text-lg font-semibold">Níveis por matéria</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {p.stats.subjects.map((sub) => (
              <div key={sub.key} className="flex items-center gap-2 rounded-xl bg-secondary/40 p-2.5">
                <span>{sub.icon}</span>
                <span className="truncate text-sm font-medium">{sub.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  Nv. {sub.level} · {num(sub.minutes)} min
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {p.stats.byRarity && (
        <div className="panel flex flex-wrap gap-2 p-4">
          {RARITY_ORDER.filter((r) => (p.stats.byRarity?.[r] ?? 0) > 0).map((r) => (
            <span key={r} className="text-xs">
              <RarityBadge rarity={r} /> ×{p.stats.byRarity?.[r]}
            </span>
          ))}
        </div>
      )}

      <section className="panel p-5">
        <h2 className="font-display text-lg font-semibold">Coleção ({owned.length})</h2>
        {owned.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Este jogador ainda não encontrou monstros.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {owned.map((m) => (
              <div key={m.id} className="flex flex-col items-center gap-1 text-center">
                <MonsterArt art={m.def!.art} rarity={m.def!.rarity} size="sm" animate={false} />
                <p className="truncate text-xs font-medium">{m.def!.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  Nv {m.level} · {RARITIES[m.def!.rarity].name}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
