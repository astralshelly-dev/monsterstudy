import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  Brain,
  GraduationCap,
  Trophy,
  Flame,
  Zap,
  Target,
  Clock,
  Layers,
  ChevronRight,
  TrendingUp,
  History as HistoryIcon,
  Swords,
  Gift,
  ArrowRight,
} from "lucide-react";
import { useGame } from "@/hooks/use-game";
import {
  incomeMonsterIds,
  incomeSlots,
  moneyPerSecond,
  todayKey,
  totals,
  userProgress,
  dailyQuests,
  equippedCosmetic,
} from "@/lib/game/state";
import { QUESTS_BY_ID } from "@/lib/game/quests";
import { duration, money, num } from "@/lib/format";
import { PageHeader, StatCard } from "@/components/game/Primitives";
import { ProfileAvatar } from "@/components/game/Avatar";
import { ActiveMonsterCard, MonsterCard } from "@/components/game/MonsterCard";
import { Button } from "@/components/ui/button";
import { useCloudSync } from "@/hooks/use-auth";
import { MONSTERS_BY_ID } from "@/lib/game/monsters";
import { bloodMoonActive, bloodMoonRemaining, bloodMoonState } from "@/lib/game/bloodmoon";
import { BumpOnChange, SmoothBar, Stagger, AnimatedNumber } from "@/components/game/motion";
import { cn } from "@/lib/utils";
import { leagueOf } from "@/lib/game/battle/config";
import { MonsterDialog } from "./monsterdex";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Monster Study" },
      {
        name: "description",
        content: "O centro da sua jornada no Monster Study. Veja seu progresso, missões e monstros.",
      },
      { property: "og:title", content: "Dashboard — Monster Study" },
      { property: "og:description", content: "Sua central de estudo e coleção de monstros." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const state = useGame();
  const { user } = useCloudSync();
  const t = totals(state);
  const prog = userProgress(state);
  const rate = moneyPerSecond(state);
  const today = state.activity[todayKey()] ?? { studySec: 0, readSec: 0, pages: 0, sessions: 0, xp: 0, diamonds: 0 };
  const slots = incomeSlots(state);
  const showcase = incomeMonsterIds(state).filter((id) => MONSTERS_BY_ID[id]);
  const league = leagueOf(state.battle?.trophies ?? 0);
  
  const [selectedMonster, setSelectedMonster] = useState<string | null>(null);

  // Atividade recente baseada em logs reais (monstros, conquistas, batalhas)
  const recentActivity = useMemo(() => {
    const list = [];
    
    // Últimos 3 monstros obtidos
    const monsterEntries = Object.entries(state.monsters)
      .sort((a, b) => (b[1].createdAt || "").localeCompare(a[1].createdAt || ""))
      .slice(0, 2);
    for (const [id] of monsterEntries) {
      const m = MONSTERS_BY_ID[id];
      if (m) list.push({ icon: "🐉", text: `Novo monstro: ${m.name}`, at: state.monsters[id]?.createdAt });
    }

    // Últimas 2 batalhas
    const battleHistory = (state.battle?.history || []).slice(0, 2);
    for (const bh of battleHistory) {
      list.push({ 
        icon: bh.result === "win" ? "🏆" : "⚔️", 
        text: `${bh.result === "win" ? "Vitória" : "Derrota"} vs ${bh.opponentName}`,
        at: bh.at 
      });
    }

    return list.sort((a, b) => (b.at || "").localeCompare(a.at || "")).slice(0, 4);
  }, [state.monsters, state.battle?.history]);

  return (
    <div className="space-y-8 pb-10">
      {/* SEÇÃO PRINCIPAL */}
      <section className="panel aurora relative overflow-hidden border-2 border-primary/20 shadow-xl">
        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <ProfileAvatar
                avatar={state.profile.avatar}
                monsterId={state.profile.avatarMonsterId}
                size="lg"
                frameClassName={equippedCosmetic("frame", state)?.className}
                className="ring-4 ring-primary/20 shadow-2xl transition-transform group-hover:scale-105"
              />
              <div className="absolute -bottom-2 -right-2 bg-background shadow-lg rounded-full px-2 py-0.5 border-2 border-primary/20 flex items-center gap-1">
                <Flame className="h-3 w-3 text-orange-500 fill-orange-500" />
                <span className="text-[10px] font-black">{state.streak.current}d</span>
              </div>
            </div>
            
            <div className="text-center sm:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <h1 className="font-display text-3xl font-black tracking-tight">{state.profile.name}</h1>
                <div className="bg-primary/20 text-primary px-3 py-0.5 rounded-full text-xs font-black ring-1 ring-primary/30 uppercase tracking-tighter">
                  NV {state.profile.level}
                </div>
                <div className={cn("px-3 py-0.5 rounded-full text-xs font-black ring-1 uppercase tracking-tighter flex items-center gap-1", league.text, "bg-secondary/40 ring-border/50")}>
                  {league.icon} {league.name}
                </div>
              </div>
              
              <div className="space-y-1.5 max-w-xs mx-auto sm:mx-0">
                <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                  <span>Progresso</span>
                  <span>{num(prog.xp)} / {num(prog.need)} XP</span>
                </div>
                <SmoothBar pct={prog.pct} className="h-3 shadow-inner" />
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2">
                <div className="flex items-center gap-1.5" title="Moedas">
                  <span className="text-xl">💰</span>
                  <p className="font-display font-black text-gold text-lg leading-none tabular-nums">
                    <AnimatedNumber value={state.money} format={money} />
                  </p>
                </div>
                <div className="flex items-center gap-1.5" title="Diamantes">
                  <span className="text-xl">💎</span>
                  <p className="font-display font-black text-primary text-lg leading-none tabular-nums">
                    <AnimatedNumber value={state.diamonds || 0} />
                  </p>
                </div>
                <div className="flex items-center gap-1.5" title="Troféus">
                  <span className="text-xl">🏆</span>
                  <p className="font-display font-black text-gold text-lg leading-none tabular-nums">
                    <AnimatedNumber value={state.battle?.trophies || 0} />
                  </p>
                </div>
              </div>
            </div>
          </div>

          {!user && (
            <div className="bg-primary/5 rounded-2xl p-4 border border-dashed border-primary/30 text-center md:text-right space-y-2 md:max-w-[240px]">
              <p className="text-xs font-bold text-primary flex items-center justify-center md:justify-end gap-1.5">
                <Gift className="h-3.5 w-3.5" /> RECOMPENSAS PENDENTES
              </p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Entre na sua conta para garantir 10k moedas e liberar o ID de jogador.
              </p>
              <Button asChild size="sm" className="w-full rounded-xl">
                <Link to="/entrar">Criar Conta</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* COLUNA ESQUERDA - FOCO E MISSÃO */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* AÇÃO RÁPIDA */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <QuickActionButton 
              to="/estudar" 
              icon={<GraduationCap className="h-6 w-6" />} 
              label="ESTUDAR" 
              desc="Temporizador de foco"
              variant="default"
            />
            <QuickActionButton 
              to="/ler" 
              icon={<BookOpen className="h-6 w-6" />} 
              label="LER" 
              desc="Contador de páginas"
              variant="secondary"
            />
            <QuickActionButton 
              to="/batalhas" 
              icon={<Swords className="h-6 w-6" />} 
              label="BATALHAR" 
              desc="Ranked e Treino"
              variant="secondary"
            />
          </section>

          {/* PROGRESSO DE HOJE */}
          <section className="panel p-6 space-y-4 shadow-sm border-primary/5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-black tracking-widest text-primary/80 flex items-center gap-2 uppercase">
                <Clock className="h-5 w-5" /> PROGRESSO DE HOJE
              </h2>
              <Link to="/estatisticas" className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                Ver tudo <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <TodayStat label="Estudado" value={duration(today.studySec)} sub="Hoje" />
              <TodayStat label="Páginas" value={num(today.pages)} sub="Lidas" />
              <TodayStat label="Sessões" value={num(today.sessions)} sub="Foco" />
              <TodayStat label="XP ganho" value={`+${num(today.xp || 0)}`} sub="Total" />
              <TodayStat label="Diamantes" value={`+${num(today.diamonds || 0)}`} sub="Ganhos" />
            </div>
          </section>

          {/* MISSÃO / OBJETIVO ATUAL */}
          <CurrentQuestSection state={state} />

          {/* EVENTO ATUAL */}
          <FeaturedEventSection />
        </div>

        {/* COLUNA DIREITA - MONSTRO E ATIVIDADE */}
        <div className="lg:col-span-4 space-y-6">
          {/* MONSTRO EM DESTAQUE */}
          <section className="panel p-6 space-y-4 relative overflow-hidden group">
            <h2 className="font-display text-lg font-black tracking-widest text-primary/80 flex items-center gap-2 uppercase">
              <Zap className="h-5 w-5" /> MONSTRO EM DESTAQUE
            </h2>
            
            <div 
              className="panel bg-background/40 p-4 flex flex-col items-center gap-4 border-2 border-primary/5 hover:border-primary/20 transition-all cursor-pointer shadow-inner"
              onClick={() => state.activeMonsterId && setSelectedMonster(state.activeMonsterId)}
            >
              {state.activeMonsterId ? (
                <FeaturedMonster id={state.activeMonsterId} state={state} />
              ) : (
                <div className="py-10 text-center space-y-2">
                  <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-2xl grayscale">🐉</div>
                  <p className="text-xs text-muted-foreground font-bold">Nenhum monstro treinando</p>
                  <Button asChild size="sm" variant="ghost" className="text-[10px] font-black uppercase tracking-widest">
                    <Link to="/monstros">Selecionar</Link>
                  </Button>
                </div>
              )}
            </div>
          </section>

          {/* ATIVIDADE RECENTE */}
          <section className="panel p-6 space-y-4">
            <h2 className="font-display text-lg font-black tracking-widest text-primary/80 flex items-center gap-2 uppercase">
              <HistoryIcon className="h-5 w-5" /> ATIVIDADE RECENTE
            </h2>
            <div className="space-y-2">
              {recentActivity.length > 0 ? (
                recentActivity.map((act, i) => (
                  <Stagger key={i} index={i}>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-primary/5 hover:bg-secondary/50 transition-colors">
                      <span className="text-lg">{act.icon}</span>
                      <p className="text-xs font-bold truncate flex-1">{act.text}</p>
                    </div>
                  </Stagger>
                ))
              ) : (
                <p className="text-center py-6 text-xs text-muted-foreground italic font-medium">
                  Sua jornada está começando…
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      <MonsterDialog id={selectedMonster} onClose={() => setSelectedMonster(null)} />
    </div>
  );
}

function QuickActionButton({ to, icon, label, desc, variant }: { to: string, icon: React.ReactNode, label: string, desc: string, variant: "default" | "secondary" }) {
  return (
    <Button asChild variant={variant} className="h-auto p-0 rounded-2xl overflow-hidden shadow-lg group press border-0">
      <Link to={to} className="flex flex-col items-center gap-1 w-full py-5 relative">
        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative z-10 text-primary drop-shadow-sm group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="relative z-10 mt-1">
          <p className="font-display text-sm font-black tracking-widest leading-none">{label}</p>
          <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-70 tracking-tighter mt-0.5">{desc}</p>
        </div>
      </Link>
    </Button>
  );
}

function TodayStat({ label, value, sub }: { label: string, value: string, sub: string }) {
  return (
    <div className="text-center space-y-1 group">
      <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground opacity-60 group-hover:text-primary transition-colors">{label}</p>
      <p className="font-display text-base font-black truncate">{value}</p>
      <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-tighter">{sub}</p>
    </div>
  );
}

function CurrentQuestSection({ state }: { state: any }) {
  const quests = dailyQuests(state);
  const activeQuest = quests.find(q => !q.done) || quests[0];
  
  if (!activeQuest) return null;
  const t = QUESTS_BY_ID[activeQuest.templateId];
  if (!t) return null;
  const pct = Math.min(100, (activeQuest.progress / t.target) * 100);

  return (
    <section className="panel p-6 space-y-4 border-2 border-primary/10 bg-primary/5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-black tracking-widest text-primary flex items-center gap-2 uppercase">
          <Target className="h-5 w-5" /> MISSÃO ATUAL
        </h2>
        <Link to="/missoes" className="text-[10px] font-black uppercase tracking-tighter text-primary hover:underline">
          Lista de missões
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl shadow-inner border border-primary/20 shrink-0">
          {t.icon}
        </div>
        <div className="flex-1 w-full space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <p className="font-display font-black text-base uppercase tracking-tight">{t.title}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {activeQuest.progress} / {t.target} {t.metric.includes('minutes') ? 'min' : t.metric.includes('pages') ? 'pág' : ''}
              </p>
            </div>
            <Button asChild size="sm" className="rounded-xl px-6 h-8 font-black text-[10px] tracking-widest">
              <Link to={t.metric.includes('read') ? '/ler' : '/estudar'}>CONTINUAR</Link>
            </Button>
          </div>
          <div className="relative">
            <SmoothBar pct={pct} className="h-3" barClassName={activeQuest.done ? "bg-gold" : "bg-primary"} />
            {activeQuest.done && (
              <div className="absolute inset-0 flex items-center justify-center">
                 <span className="text-[8px] font-black text-gold-foreground uppercase tracking-widest animate-pulse">Concluída! Coletar prêmio</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedEventSection() {
  const active = bloodMoonActive();
  if (!active) return null;
  const rem = bloodMoonRemaining();
  const state = useGame();
  const bm = bloodMoonState(state);

  return (
    <section className="panel p-6 border-2 border-destructive/20 bg-destructive/5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 text-destructive/10 group-hover:scale-150 group-hover:rotate-12 transition-transform">
        <Moon className="h-20 w-20 fill-current" />
      </div>
      
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-3xl animate-pulse">🌕🔴</span>
          <div className="space-y-0.5">
            <h3 className="font-display font-black text-xl tracking-tight text-destructive">LUA DE SANGUE</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-destructive/70">
              {rem.label} restantes · <span className="text-destructive font-black">🩸 {num(bm.coins)}</span>
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant="destructive" className="rounded-xl px-8 font-black text-[10px] tracking-widest shadow-lg shadow-destructive/20">
          <Link to="/lua-de-sangue">VER EVENTO</Link>
        </Button>
      </div>
    </section>
  );
}

function FeaturedMonster({ id, state }: { id: string, state: any }) {
  const def = MONSTERS_BY_ID[id];
  const owned = state.monsters[id];
  if (!def || !owned) return null;

  return (
    <div className="w-full flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-500">
      <MonsterArt 
        art={def.art} 
        rarity={def.rarity} 
        size="lg" 
        animate 
        skinId={state.bloodMoon?.equipped?.[id] || null} 
        className="drop-shadow-2xl transition-transform group-hover:scale-110"
      />
      <div className="text-center w-full space-y-1">
        <p className="font-display text-2xl font-black uppercase tracking-tighter truncate leading-none">
          {def.name}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
           <div className="bg-primary/20 text-primary px-2 py-0.5 rounded-md text-[9px] font-black tracking-tighter uppercase">
             NV {owned.level}
           </div>
           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
             {def.role === 'attacker' ? 'Atacante' : def.role === 'tank' ? 'Tanque' : def.role === 'support' ? 'Suporte' : 'Controle'}
           </p>
        </div>
      </div>
    </div>
  );
}
