// ============================================================
// Monster Study — Temas de cena (fundos planos + line art + partículas)
// Nada de gradientes: cada tema tem UMA cor sólida (levemente
// metálica), um desenho de contorno próprio e uma partícula própria.
// ============================================================

export type ArtId =
  | "runes"
  | "books"
  | "pages"
  | "bolts"
  | "swords"
  | "targets"
  | "crowns"
  | "flasks"
  | "paws"
  | "coins"
  | "gifts"
  | "trophies"
  | "charts"
  | "scrolls"
  | "gears"
  | "leaves"
  | "peaks"
  | "waves"
  | "stars"
  | "flames";

export type ParticleId = "dust" | "spark" | "ember" | "leaf" | "snow" | "bubble" | "star";

export type SceneTheme = {
  id: string;
  name: string;
  /** cor de fundo sólida */
  bg: string;
  /** cor dos contornos e das partículas */
  ink: string;
  art: ArtId;
  particle: ParticleId;
};

const T = (
  id: string,
  name: string,
  bg: string,
  ink: string,
  art: ArtId,
  particle: ParticleId,
): SceneTheme => ({ id, name, bg, ink, art, particle });

export const THEMES: Record<string, SceneTheme> = {
  // ---------- telas do app ----------
  home: T("home", "Torre Arcana", "oklch(0.17 0.03 285)", "oklch(0.78 0.09 292)", "runes", "dust"),
  study: T("study", "Sala de Estudos", "oklch(0.17 0.028 250)", "oklch(0.8 0.08 248)", "books", "spark"),
  read: T("read", "Ala da Leitura", "oklch(0.175 0.024 70)", "oklch(0.82 0.07 78)", "pages", "dust"),
  free: T("free", "Campo de Treino", "oklch(0.17 0.03 195)", "oklch(0.82 0.08 198)", "bolts", "spark"),
  battle: T("battle", "Arena", "oklch(0.165 0.035 22)", "oklch(0.78 0.11 30)", "swords", "ember"),
  quests: T("quests", "Quadro de Missões", "oklch(0.175 0.03 95)", "oklch(0.84 0.09 92)", "targets", "spark"),
  season: T("season", "Coliseu Sazonal", "oklch(0.17 0.035 320)", "oklch(0.8 0.1 322)", "crowns", "star"),
  inventory: T("inventory", "Depósito", "oklch(0.18 0.014 260)", "oklch(0.8 0.045 260)", "flasks", "dust"),
  dex: T("dex", "Bestiário", "oklch(0.165 0.03 155)", "oklch(0.8 0.09 158)", "paws", "leaf"),
  library: T("library", "Biblioteca", "oklch(0.17 0.026 55)", "oklch(0.8 0.07 60)", "books", "dust"),
  shop: T("shop", "Mercado", "oklch(0.175 0.032 85)", "oklch(0.86 0.1 85)", "coins", "spark"),
  codes: T("codes", "Sala dos Presentes", "oklch(0.17 0.035 340)", "oklch(0.82 0.1 340)", "gifts", "spark"),
  achievements: T("achievements", "Salão da Glória", "oklch(0.175 0.03 78)", "oklch(0.86 0.1 80)", "trophies", "star"),
  stats: T("stats", "Observatório", "oklch(0.165 0.03 215)", "oklch(0.83 0.09 212)", "charts", "dust"),
  history: T("history", "Arquivo", "oklch(0.18 0.012 275)", "oklch(0.78 0.04 275)", "scrolls", "dust"),
  players: T("players", "Guilda", "oklch(0.17 0.028 175)", "oklch(0.82 0.08 178)", "stars", "bubble"),
  account: T("account", "Portal", "oklch(0.17 0.03 265)", "oklch(0.8 0.09 268)", "runes", "spark"),
  profile: T("profile", "Câmara Pessoal", "oklch(0.17 0.03 300)", "oklch(0.8 0.09 302)", "stars", "dust"),
  settings: T("settings", "Oficina", "oklch(0.18 0.01 250)", "oklch(0.78 0.035 250)", "gears", "dust"),
  admin: T("admin", "Torre de Controle", "oklch(0.155 0.03 10)", "oklch(0.78 0.1 18)", "gears", "ember"),

  // ---------- temas de cosméticos (fundos de perfil) ----------
  bg_default: T("bg_default", "Noite Padrão", "oklch(0.17 0.03 285)", "oklch(0.78 0.08 290)", "stars", "dust"),
  bg_forest: T("bg_forest", "Floresta Viva", "oklch(0.165 0.032 150)", "oklch(0.82 0.1 150)", "leaves", "leaf"),
  bg_volcano: T("bg_volcano", "Coração Vulcânico", "oklch(0.155 0.035 30)", "oklch(0.8 0.12 38)", "flames", "ember"),
  bg_cosmos: T("bg_cosmos", "Cosmos Arcano", "oklch(0.16 0.035 300)", "oklch(0.82 0.11 305)", "stars", "star"),
  bg_champion: T("bg_champion", "Arena dos Campeões", "oklch(0.175 0.032 88)", "oklch(0.87 0.1 88)", "trophies", "spark"),

  // ---------- ligas ----------
  bg_rank_bronze: T("bg_rank_bronze", "Arena Bronze", "oklch(0.175 0.024 60)", "oklch(0.78 0.07 62)", "peaks", "dust"),
  bg_rank_prata: T("bg_rank_prata", "Arena Prata", "oklch(0.185 0.008 250)", "oklch(0.85 0.02 250)", "peaks", "snow"),
  bg_rank_ouro: T("bg_rank_ouro", "Arena Ouro", "oklch(0.175 0.032 90)", "oklch(0.88 0.1 90)", "crowns", "spark"),
  bg_rank_diamante: T("bg_rank_diamante", "Arena Diamante", "oklch(0.17 0.03 220)", "oklch(0.88 0.09 210)", "stars", "snow"),
  bg_rank_mitico: T("bg_rank_mitico", "Arena Mítica", "oklch(0.165 0.035 330)", "oklch(0.83 0.11 330)", "runes", "star"),
  bg_rank_lendario: T("bg_rank_lendario", "Arena Lendária", "oklch(0.17 0.035 45)", "oklch(0.85 0.11 55)", "flames", "ember"),
  bg_rank_mestre: T("bg_rank_mestre", "Arena Mestre", "oklch(0.16 0.035 15)", "oklch(0.82 0.12 18)", "crowns", "ember"),
  bg_rank_pro: T("bg_rank_pro", "Arena PRO", "oklch(0.165 0.035 195)", "oklch(0.9 0.12 195)", "bolts", "star"),
};

export const DEFAULT_THEME_ID = "home";

/** cada rota tem seu próprio fundo */
const ROUTE_THEMES: Array<[string, string]> = [
  ["/estudar", "study"],
  ["/ler", "read"],
  ["/livre", "free"],
  ["/batalhas", "battle"],
  ["/missoes", "quests"],
  ["/temporada", "season"],
  ["/inventario", "inventory"],
  ["/monsterdex", "dex"],
  ["/monstros", "dex"],
  ["/biblioteca", "library"],
  ["/loja", "shop"],
  ["/codigos", "codes"],
  ["/conquistas", "achievements"],
  ["/estatisticas", "stats"],
  ["/historico", "history"],
  ["/jogadores", "players"],
  ["/entrar", "account"],
  ["/perfil", "profile"],
  ["/configuracoes", "settings"],
  ["/adm", "admin"],
];

export function themeIdForPath(pathname: string): string {
  for (const [prefix, id] of ROUTE_THEMES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return id;
  }
  return DEFAULT_THEME_ID;
}

export function themeById(id?: string | null): SceneTheme {
  return (id && THEMES[id]) || THEMES[DEFAULT_THEME_ID]!;
}

// ------------------------------------------------------------
// Desenhos: apenas contornos (sem preenchimento, sem cor)
// Cada arte é um tile de 160x160 repetido.
// ------------------------------------------------------------
export const ART_TILES: Record<ArtId, string> = {
  runes: `<circle cx="40" cy="40" r="22"/><path d="M28 40h24M40 28v24"/><path d="M96 26l22 38h-44z"/><path d="M108 108m-18 0a18 18 0 1036 0a18 18 0 10-36 0"/><path d="M20 104l24 24M44 104l-24 24"/>`,
  books: `<rect x="18" y="22" width="42" height="56" rx="4"/><path d="M26 22v56"/><rect x="76" y="34" width="56" height="42" rx="4"/><path d="M76 46h56"/><rect x="34" y="98" width="52" height="40" rx="4"/><path d="M34 110h52"/><path d="M104 96l26 12-26 12z"/>`,
  pages: `<rect x="22" y="20" width="52" height="66" rx="5"/><path d="M32 36h32M32 48h32M32 60h22"/><rect x="88" y="70" width="52" height="66" rx="5"/><path d="M98 86h32M98 98h32M98 110h22"/>`,
  bolts: `<path d="M46 16l-18 46h20l-8 40 34-52H52l14-34z"/><path d="M118 74l-14 34h16l-6 30 26-40h-16l10-24z"/><circle cx="26" cy="126" r="12"/>`,
  swords: `<path d="M22 22l52 52M74 22L22 74"/><path d="M62 18h16v16M18 62v16h16"/><path d="M100 132V78l14-16 14 16v54z"/><path d="M96 108h36"/>`,
  targets: `<circle cx="46" cy="46" r="30"/><circle cx="46" cy="46" r="18"/><circle cx="46" cy="46" r="6"/><circle cx="112" cy="114" r="22"/><circle cx="112" cy="114" r="10"/><path d="M112 92v-16M134 114h16"/>`,
  crowns: `<path d="M20 74l8-40 20 22 18-30 18 30 20-22 8 40z"/><path d="M20 74h92v14H20z"/><path d="M84 132l6-26 12 14 12-14 6 26z"/>`,
  flasks: `<path d="M34 20h28v22l20 44a14 14 0 01-12 22H26a14 14 0 01-12-22l20-44z"/><path d="M28 86h40"/><rect x="98" y="88" width="34" height="48" rx="8"/><path d="M104 78h22v10h-22z"/>`,
  paws: `<circle cx="44" cy="60" r="18"/><circle cx="22" cy="34" r="9"/><circle cx="44" cy="24" r="9"/><circle cx="66" cy="34" r="9"/><circle cx="116" cy="122" r="14"/><circle cx="98" cy="102" r="7"/><circle cx="116" cy="94" r="7"/><circle cx="134" cy="102" r="7"/>`,
  coins: `<circle cx="42" cy="42" r="24"/><circle cx="42" cy="42" r="12"/><circle cx="112" cy="104" r="18"/><path d="M112 92v24M104 104h16"/><path d="M18 118h48M18 130h32"/>`,
  gifts: `<rect x="20" y="42" width="60" height="46" rx="5"/><path d="M50 42v46M20 60h60"/><path d="M50 42c-10-16-28-10-20 0M50 42c10-16 28-10 20 0"/><rect x="94" y="98" width="46" height="36" rx="5"/><path d="M117 98v36M94 112h46"/>`,
  trophies: `<path d="M40 20h44v26a22 22 0 01-44 0z"/><path d="M40 26H24a14 14 0 0016 16M84 26h16a14 14 0 01-16 16"/><path d="M56 68h12v18H50h24"/><circle cx="118" cy="112" r="18"/><path d="M118 100v24"/>`,
  charts: `<path d="M20 96V40M20 96h60"/><rect x="30" y="66" width="12" height="30"/><rect x="48" y="52" width="12" height="44"/><rect x="66" y="76" width="12" height="20"/><path d="M92 138l16-26 14 12 22-34"/><circle cx="92" cy="138" r="4"/><circle cx="144" cy="90" r="4"/>`,
  scrolls: `<path d="M28 26h64v72H28z"/><path d="M28 26a10 10 0 000 20M92 98a10 10 0 000-20"/><path d="M40 46h40M40 60h40M40 74h24"/><path d="M104 116h44v22h-44z"/><path d="M104 116a8 8 0 000 16"/>`,
  gears: `<circle cx="48" cy="48" r="20"/><circle cx="48" cy="48" r="8"/><path d="M48 18v10M48 68v10M18 48h10M68 48h10M28 28l7 7M68 68l-7-7M68 28l-7 7M28 68l7-7"/><circle cx="114" cy="112" r="14"/><path d="M114 90v10M114 124v10M92 112h10M126 112h10"/>`,
  leaves: `<path d="M22 78c0-32 24-56 56-56 0 32-24 56-56 56z"/><path d="M30 70c14-14 28-24 44-32"/><path d="M96 138c0-24 18-42 42-42 0 24-18 42-42 42z"/><path d="M102 132c10-10 20-18 32-24"/>`,
  peaks: `<path d="M12 108l38-56 26 34 18-22 44 64z"/><path d="M50 52l14 20-8 12"/><path d="M12 132h136"/>`,
  waves: `<path d="M8 48q20-18 40 0t40 0t40 0t40 0"/><path d="M8 84q20-18 40 0t40 0t40 0t40 0"/><path d="M8 120q20-18 40 0t40 0t40 0t40 0"/>`,
  stars: `<path d="M44 16l8 22 22 8-22 8-8 22-8-22-22-8 22-8z"/><path d="M116 82l6 16 16 6-16 6-6 16-6-16-16-6 16-6z"/><circle cx="30" cy="120" r="6"/><circle cx="136" cy="34" r="5"/>`,
  flames: `<path d="M48 20c18 20 26 30 26 46a26 26 0 01-52 0c0-12 8-20 14-28 2 10 8 12 8 12s-4-16 4-30z"/><path d="M118 84c12 14 18 20 18 32a18 18 0 01-36 0c0-9 6-14 10-20 1 7 6 9 6 9s-3-11 2-21z"/>`,
};
