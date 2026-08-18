import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, History, Users, ArrowRight, ShieldCheck, Trophy, Flame, Clock, BookOpen, Layers } from "lucide-react";
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
import { COSMETICS_BY_ID, titleNameClass } from "@/lib/game/cosmetics";
import { useSceneThemeOverride } from "@/components/game/SceneTheme";
import { RoleBadge } from "@/components/game/RoleBadge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/jogadores")({
  head: () => ({
    meta: [
      { title: "Pesquisar Jogador — Monster Study" },
      {
        name: "description",
        content: "Encontre outros estudantes, veja seus perfis e acompanhe suas conquistas no mundo do Monster Study.",
      },
      { property: "og:title", content: "Pesquisar Jogador — Monster Study" },
      { property: "og:description", content: "Área social para encontrar e comparar perfis de caçadores." },
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
  const [recent, setRecent] = useState<PublicProfile[]>([]);
  const [busy, setBusy] = useState(false);

  // Carrega histórico do localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ms:recent_searches");
    if (saved) {
      try {
        setRecent(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar histórico", e);
      }
    }
  }, []);

  const saveToRecent = (profile: PublicProfile) => {
    const next = [profile, ...recent.filter((p) => p.publicId !== profile.publicId)].slice(0, 5);
    setRecent(next);
    localStorage.setItem("ms:recent_searches", JSON.stringify(next));
  };

  async function search() {
    if (!query.trim()) return;
    setBusy(true);
    const p = await findProfile(query.toUpperCase());
    setBusy(false);
    if (!p) {
      toast.error("Nenhum jogador encontrado com esse nome ou ID.");
      setFound(null);
      return;
    }
    setFound(p);
    saveToRecent(p);
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pesquisar Jogador" icon="👥" />
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
    <div className="space-y-10 pb-20">
      <div className="text-center space-y-4 pt-6">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-3xl shadow-inner mb-2 ring-1 ring-primary/20">
          👥
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight">PESQUISAR JOGADOR</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Encontre outros estudantes, veja seus perfis e acompanhe suas conquistas.
        </p>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4">
        <div className="relative group">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Nome de jogador ou ID..."
            className="h-16 pl-14 pr-32 text-lg font-display rounded-2xl bg-secondary/30 border-2 border-secondary focus:border-primary transition-all shadow-xl"
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Button 
            onClick={search} 
            disabled={busy || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-12 px-6 rounded-xl shadow-lg"
          >
            {busy ? "Buscando..." : "Pesquisar"}
          </Button>
        </div>
        
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Seu ID: <span className="font-mono font-bold text-primary select-all">{publicId}</span></span>
          <button 
            onClick={() => {
              void navigator.clipboard.writeText(publicId!);
              toast.success("ID copiado!");
            }}
            className="hover:text-primary transition-colors"
          >
            (Copiar)
          </button>
        </div>
      </div>

      {found ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> RESULTADO ENCONTRADO
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setFound(null)}>
              Limpar busca
            </Button>
          </div>
          <PlayerCardSummary profile={found} />
          <div className="mt-10">
            <ProfileDetailedView profile={found} />
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 space-y-8">
          {recent.length > 0 && (
            <section className="space-y-4 animate-in fade-in duration-700">
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground flex items-center gap-2">
                <History className="h-3.5 w-3.5" /> PESQUISADOS RECENTEMENTE
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recent.map((p) => (
                  <button
                    key={p.publicId}
                    onClick={() => setFound(p)}
                    className="panel panel-hover p-3 flex items-center gap-3 text-left transition-all hover:scale-[1.02]"
                  >
                    <ProfileAvatar avatar={p.avatar} monsterId={p.avatarMonsterId} size="sm" />
                    <div className="min-w-0">
                      <p className="font-display font-bold truncate leading-none">
                        {p.displayName}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Nv. {p.level} · {leagueOf(p.stats.trophies ?? 0).icon} {leagueOf(p.stats.trophies ?? 0).name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="panel p-8 text-center space-y-4 border-dashed border-2 border-primary/10 bg-primary/5">
             <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">
               ✨
             </div>
             <h3 className="font-display text-lg font-bold">Descubra novos amigos</h3>
             <p className="text-sm text-muted-foreground max-w-sm mx-auto">
               Pesquise pelo ID de jogadores que você conhece para comparar progresso e ver suas coleções.
             </p>
          </section>
        </div>
      )}
    </div>
  );
}

function PlayerCardSummary({ profile: p }: { profile: PublicProfile }) {
  const cos = p.stats.cosmetics ?? {};
  const frame = cos.frame ? COSMETICS_BY_ID[cos.frame] : undefined;
  const title = cos.title ? COSMETICS_BY_ID[cos.title] : undefined;
  const badge = cos.badge ? COSMETICS_BY_ID[cos.badge] : undefined;
  const league = leagueOf(p.stats.trophies ?? 0);

  return (
    <div className="panel overflow-hidden border-2 border-primary/20 shadow-2xl transition-all">
      <div className="bg-primary/5 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          <ProfileAvatar
            avatar={p.avatar}
            monsterId={p.avatarMonsterId}
            size="lg"
            frameClassName={frame?.className}
          />
          {badge && (
            <div className="absolute -top-2 -right-2 bg-background shadow-lg rounded-full w-8 h-8 flex items-center justify-center text-lg border-2 border-primary/20">
              {badge.icon}
            </div>
          )}
        </div>
        
        <div className="text-center sm:text-left flex-1 min-w-0">
          <p className={cn("font-display text-3xl font-black tracking-tight", titleNameClass(title?.id))}>
            {p.displayName}
          </p>
          {title && (
            <p className="text-primary font-bold text-sm mt-0.5">
              "{title.name}"
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3">
             <div className="bg-secondary/50 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
               <span className="text-primary">NV</span> {p.level}
             </div>
             <div className="bg-gold/10 text-gold px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
               {league.icon} {league.name}
             </div>
             <div className="text-xs text-muted-foreground font-mono">
               #{p.publicId}
             </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full sm:w-auto">
          <div className="text-center p-3 rounded-2xl bg-background/50 ring-1 ring-primary/10">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Trofés</p>
            <p className="text-xl font-display font-black text-gold leading-none mt-1">{num(p.stats.trophies ?? 0)}</p>
          </div>
          <div className="text-center p-3 rounded-2xl bg-background/50 ring-1 ring-primary/10">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter">Streak</p>
            <p className="text-xl font-display font-black text-orange-500 leading-none mt-1">🔥 {p.streakCurrent}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileDetailedView({ profile: p }: { profile: PublicProfile }) {
  const cos = p.stats.cosmetics ?? {};
  const bg = cos.background ? COSMETICS_BY_ID[cos.background] : undefined;
  const team = (p.stats.team ?? []).map((id) => MONSTERS_BY_ID[id]).filter(Boolean);
  
  // o tema do jogador vale enquanto o perfil estiver aberto
  useSceneThemeOverride(bg?.id ?? null);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h3 className="font-display text-lg font-black flex items-center gap-2 tracking-widest text-primary/80">
          <ShieldCheck className="h-5 w-5" /> VISÃO GERAL
        </h3>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <StatMiniCard icon={<Clock />} label="Estudado" value={duration(p.stats.studySec ?? 0)} />
          <StatMiniCard icon={<BookOpen />} label="Páginas" value={num(p.stats.pages ?? 0)} />
          <StatMiniCard icon={<Layers />} label="Monstros" value={num(p.stats.discovered ?? 0)} />
          <StatMiniCard icon={<Trophy />} label="Conquistas" value={num(p.stats.achievements ?? 0)} />
        </div>
      </section>

      {team.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-display text-lg font-black flex items-center gap-2 tracking-widest text-primary/80">
            🛡️ MONSTROS EM DESTAQUE
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {team.map((def) => (
              <div key={def!.id} className="panel p-4 flex flex-col items-center gap-2 text-center group hover:border-primary/40 transition-colors">
                <MonsterArt art={def!.art} rarity={def!.rarity} size="sm" animate={false} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold uppercase">{def!.name}</p>
                  <RarityBadge rarity={def!.rarity} />
                  <div className="mt-1">
                    <RoleBadge monsterId={def!.id} compact />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <section className="space-y-4">
          <h3 className="font-display text-lg font-black flex items-center gap-2 tracking-widest text-primary/80">
            <Flame className="h-5 w-5" /> ESTATÍSTICAS
          </h3>
          <div className="grid grid-cols-2 gap-3">
             <StatCard label="Vitórias" value={num(p.stats.wins ?? 0)} className="bg-secondary/20" />
             <StatCard label="Derrotas" value={num(p.stats.losses ?? 0)} className="bg-secondary/20" />
             <StatCard label="Livros Lidos" value={num(p.stats.booksDone ?? 0)} className="bg-secondary/20" />
             <StatCard label="Nível Médio" value={num(p.level)} className="bg-secondary/20" />
          </div>
        </section>

        <section className="space-y-4">
           <h3 className="font-display text-lg font-black flex items-center gap-2 tracking-widest text-primary/80">
             🤝 AÇÕES SOCIAIS
           </h3>
           <div className="panel p-6 space-y-4 bg-primary/5 flex flex-col justify-center items-center text-center">
              <p className="text-sm text-muted-foreground">
                Deseja interagir com este caçador?
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button size="lg" className="rounded-xl px-8" asChild>
                  <Link to="/batalhas" search={{ amistoso: p.publicId }}>
                    Desafiar
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="rounded-xl px-8" onClick={() => toast.info("Sistema de amigos em breve!")}>
                   + Adicionar Amigo
                </Button>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
}

function StatMiniCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="panel p-4 flex flex-col items-center gap-1 text-center bg-background/40 hover:bg-background/60 transition-colors">
      <div className="text-primary opacity-60 mb-1">{icon}</div>
      <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display text-base font-bold truncate w-full">{value}</p>
    </div>
}
