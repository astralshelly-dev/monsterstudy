import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  BookMarked,
  BookOpen,
  Brain,
  Flame,
  Gift,

  GraduationCap,
  LayoutDashboard,
  Library,
  LineChart,
  Menu,
  PawPrint,
  ScrollText,
  Search,
  Settings,
  Backpack,
  CalendarDays,
  Target,
  ShieldAlert,
  ShoppingBag,
  Swords,
  Sparkles,
  Trophy,
  User,
  UserRound,
  Users,
} from "lucide-react";
import { useGame, useHydrated } from "@/hooks/use-game";
import { CloudSyncProvider, useCloudSync } from "@/hooks/use-auth";
import { isAdminEmail } from "@/lib/admin";
import { moneyPerSecond, userProgress } from "@/lib/game/state";
import { money, num } from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { WelcomeBack } from "@/components/game/WelcomeBack";
import { SceneThemeProvider } from "@/components/game/SceneTheme";
import { cn } from "@/lib/utils";


type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; primary?: boolean };
type NavGroup = { id: string; label: string; emoji: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: "principal",
    label: "Principal",
    emoji: "🏠",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, primary: true },
      { to: "/estatisticas", label: "Estatísticas", icon: LineChart },
      { to: "/historico", label: "Histórico", icon: ScrollText },
    ],
  },
  {
    id: "estudo",
    label: "Estudo",
    emoji: "📚",
    items: [
      { to: "/estudar", label: "Estudar", icon: GraduationCap, primary: true },
      { to: "/livre", label: "Treino Livre", icon: Brain },
      { to: "/ler", label: "Ler", icon: BookOpen, primary: true },
      { to: "/biblioteca", label: "Biblioteca", icon: Library },
    ],
  },
  {
    id: "monstros",
    label: "Monstros",
    emoji: "🐉",
    items: [
      { to: "/monstros", label: "Meus Monstros", icon: Sparkles },
      { to: "/monsterdex", label: "MonsterDex", icon: PawPrint, primary: true },
    ],
  },
  {
    id: "batalhas",
    label: "Batalhas",
    emoji: "⚔️",
    items: [
      { to: "/batalhas", label: "Batalhas", icon: Swords, primary: true },
      { to: "/temporada", label: "Temporada", icon: CalendarDays },
    ],
  },
  {
    id: "progresso",
    label: "Progresso",
    emoji: "🏆",
    items: [
      { to: "/conquistas", label: "Conquistas", icon: Trophy },
      { to: "/missoes", label: "Missões", icon: Target },
    ],
  },
  {
    id: "social",
    label: "Social",
    emoji: "👥",
    items: [
      { to: "/amigos", label: "Amigos", icon: Users },
      { to: "/jogadores", label: "Pesquisar jogador", icon: Search },
    ],
  },
  {
    id: "recursos",
    label: "Recursos",
    emoji: "🛒",
    items: [
      { to: "/loja", label: "Loja", icon: ShoppingBag },
      { to: "/codigos", label: "Códigos", icon: Gift },
      { to: "/inventario", label: "Inventário", icon: Backpack },
    ],
  },
  {
    id: "perfil",
    label: "Perfil",
    emoji: "👤",
    items: [
      { to: "/perfil", label: "Perfil", icon: User },
      { to: "/entrar", label: "Conta", icon: UserRound },
      { to: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

const ADMIN_GROUP: NavGroup = {
  id: "adm",
  label: "Painel ADM",
  emoji: "💻",
  items: [{ to: "/adm", label: "Painel ADM", icon: ShieldAlert }],
};

function isActivePath(pathname: string, to: string) {
  return pathname === to || (to !== "/" && pathname.startsWith(to));
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <CloudSyncProvider>
      <SceneThemeProvider>
        <AppShellContent>{children}</AppShellContent>
      </SceneThemeProvider>
    </CloudSyncProvider>
  );
}

function AppShellContent({ children }: { children: ReactNode }) {
  const { offline, dismissOffline } = useHydrated();
  const { user } = useCloudSync();
  const nav = isAdminEmail(user?.email) ? [...NAV, ADMIN_NAV] : [...NAV];

  const state = useGame();

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prog = userProgress(state);
  const rate = moneyPerSecond(state);
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen w-full">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/50 px-3 py-5 backdrop-blur lg:flex">
        <Link to="/" className="mb-6 flex items-center gap-2.5 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/20 text-xl ring-1 ring-primary/40">
            🐲
          </span>
          <span className="leading-tight">
            <span className="block font-display text-base font-bold">Monster Study</span>
            <span className="block text-[11px] text-muted-foreground">Estude. Colecione.</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {nav.map((item) => {
            const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-primary/20 text-foreground ring-1 ring-primary/40"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="panel mt-4 p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Renda passiva</p>
          <p className="font-display text-lg font-bold text-gold">{money(rate)}/s</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/50 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <span className="text-xl">🐲</span>
              <span className="font-display text-sm font-bold">Monster Study</span>
            </Link>
            <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
              <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${prog.pct}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {num(prog.xp)} / {num(prog.need)} XP
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Pill icon={<span className="text-gold">💰</span>} value={money(state.money)} />
              <Pill icon={<Flame className="h-3.5 w-3.5 text-ember" />} value={`${state.streak.current}d`} />
              <Pill icon={<span>⭐</span>} value={`Nv ${state.profile.level}`} />
              <Pill icon={<BookMarked className="h-3.5 w-3.5 text-mana" />} value={`${state.shards}`} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 lg:pb-10">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
          <div className="grid grid-cols-5">
            {nav.filter((n) => "primary" in n && n.primary)
              .slice(0, 4)
              .map((item) => {
                const active =
                  pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2.5 text-[10px]",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground"
                >
                  <Menu className="h-5 w-5" />
                  Mais
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
                <SheetHeader className="text-left">
                  <SheetTitle className="font-display">Todas as seções</SheetTitle>
                </SheetHeader>
                <div className="mt-4 grid grid-cols-2 gap-2 pb-6">
                  {nav.map((item) => {
                    const active =
                      pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm",
                          active
                            ? "bg-primary/20 text-foreground ring-1 ring-primary/40"
                            : "bg-secondary/60 text-muted-foreground",
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
      </nav>
      </div>
      {offline && <WelcomeBack offline={offline} onClose={dismissOffline} />}
    </div>
  );
}


function Pill({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/70 px-2.5 py-1 text-xs font-semibold tabular-nums ring-1 ring-border/60">
      {icon}
      {value}
    </span>
  );
}
