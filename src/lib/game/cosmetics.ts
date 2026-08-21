// ============================================================
// Monster Study — Cosméticos (puramente visuais, sem vantagem)
// ============================================================

export type CosmeticKind = "frame" | "title" | "background" | "badge" | "effect";

export type CosmeticUnlock =
  | { type: "free" }
  | { type: "level"; n: number }
  | { type: "achievements"; n: number }
  | { type: "monsters"; n: number }
  | { type: "studyHours"; n: number }
  | { type: "pages"; n: number }
  | { type: "streak"; n: number }
  | { type: "trophies"; n: number }
  | { type: "wins"; n: number }
  | { type: "season" }
  /** obtido comprando na loja de um evento temporário */
  | { type: "event"; event: string };

export type CosmeticDef = {
  id: string;
  kind: CosmeticKind;
  name: string;
  icon: string;
  description: string;
  unlock: CosmeticUnlock;
  /** classes aplicadas no avatar (frame) ou no painel (background) */
  className?: string;
  /**
   * Fundos de perfil não usam classes: eles apontam para um tema de cena
   * (cor sólida + desenho de contorno + partículas) em src/lib/game/themes.ts.
   * O id do tema é sempre igual ao id do cosmético.
   */
};

const BASE_COSMETICS: CosmeticDef[] = [
  // ---------- Molduras ----------
  { id: "frame_none", kind: "frame", name: "Sem moldura", icon: "⬜", description: "Visual limpo.", unlock: { type: "free" }, className: "" },
  { id: "frame_bronze", kind: "frame", name: "Moldura Bronze", icon: "🥉", description: "Para quem começou a jornada.", unlock: { type: "level", n: 5 }, className: "mframe mframe-bronze" },
  { id: "frame_arcane", kind: "frame", name: "Moldura Arcana", icon: "🔮", description: "Brilho arcano ao redor do retrato.", unlock: { type: "level", n: 15 }, className: "mframe mframe-arcane" },
  { id: "frame_gold", kind: "frame", name: "Moldura Dourada", icon: "🏆", description: "Conquistada nas ligas altas.", unlock: { type: "trophies", n: 1500 }, className: "mframe mframe-gold" },
  { id: "frame_champion", kind: "frame", name: "Moldura de Campeão", icon: "👑", description: "Exclusiva do topo do ranking.", unlock: { type: "season" }, className: "mframe mframe-champion" },
  { id: "frame_scholar", kind: "frame", name: "Moldura do Erudito", icon: "🎓", description: "100 horas de estudo acumuladas.", unlock: { type: "studyHours", n: 100 }, className: "mframe mframe-scholar" },

  { id: "frame_ember", kind: "frame", name: "Moldura Flamejante", icon: "🔥", description: "Sequência de 15 dias.", unlock: { type: "streak", n: 15 }, className: "mframe mframe-ember" },
  { id: "frame_frost", kind: "frame", name: "Moldura Glacial", icon: "❄️", description: "Leia 3.000 páginas.", unlock: { type: "pages", n: 3000 }, className: "mframe mframe-frost" },
  { id: "frame_nature", kind: "frame", name: "Moldura Silvestre", icon: "🌿", description: "Capture 25 monstros.", unlock: { type: "monsters", n: 25 }, className: "mframe mframe-nature" },
  { id: "frame_pro", kind: "frame", name: "Moldura PRO", icon: "⚡", description: "Alcance a liga PRO.", unlock: { type: "trophies", n: 5200 }, className: "mframe mframe-pro" },

  // ---------- Títulos ----------
  { id: "title_cacador", kind: "title", name: "Caçador de Monstros", icon: "🐾", description: "Capture 10 monstros.", unlock: { type: "monsters", n: 10 } },
  { id: "title_estudioso", kind: "title", name: "Estudioso", icon: "📚", description: "Acumule 10 horas de estudo.", unlock: { type: "studyHours", n: 10 } },
  { id: "title_bibliotecario", kind: "title", name: "Bibliotecário", icon: "📖", description: "Leia 1.000 páginas.", unlock: { type: "pages", n: 1000 } },
  { id: "title_imparavel", kind: "title", name: "Imparável", icon: "🔥", description: "Sequência de 30 dias.", unlock: { type: "streak", n: 30 } },
  { id: "title_veterano", kind: "title", name: "Veterano", icon: "⚔️", description: "Vença 100 batalhas.", unlock: { type: "wins", n: 100 } },
  { id: "title_campeao", kind: "title", name: "PRO", icon: "⚡", description: "Alcance a liga PRO.", unlock: { type: "trophies", n: 5200 } },
  { id: "title_top100", kind: "title", name: "Top 100", icon: "🏅", description: "Termine uma temporada entre os 100 melhores.", unlock: { type: "season" } },
  { id: "title_mestre_materia", kind: "title", name: "Mestre da Matéria", icon: "🧮", description: "Desbloqueie 25 conquistas.", unlock: { type: "achievements", n: 25 } },
  { id: "title_lenda", kind: "title", name: "Lenda Viva", icon: "🌌", description: "Chegue ao nível 40.", unlock: { type: "level", n: 40 } },

  // ---------- Fundos de perfil ----------
  { id: "bg_default", kind: "background", name: "Noite Padrão", icon: "🌃", description: "O fundo clássico.", unlock: { type: "free" }, className: "" },
  { id: "bg_forest", kind: "background", name: "Floresta Viva", icon: "🌿", description: "Capture 20 monstros.", unlock: { type: "monsters", n: 20 }, className: "" },
  { id: "bg_volcano", kind: "background", name: "Coração Vulcânico", icon: "🌋", description: "50 horas de estudo.", unlock: { type: "studyHours", n: 50 }, className: "" },
  { id: "bg_cosmos", kind: "background", name: "Cosmos Arcano", icon: "🌌", description: "Nível 25.", unlock: { type: "level", n: 25 }, className: "" },
  { id: "bg_champion", kind: "background", name: "Arena dos Campeões", icon: "🏟️", description: "2.200 troféus.", unlock: { type: "trophies", n: 2200 }, className: "" },

  // ---------- Emblemas ----------
  { id: "badge_none", kind: "badge", name: "Sem emblema", icon: "▫️", description: "Nenhum emblema.", unlock: { type: "free" } },
  { id: "badge_owl", kind: "badge", name: "Coruja", icon: "🌙", description: "Estude de madrugada.", unlock: { type: "studyHours", n: 5 } },
  { id: "badge_flame", kind: "badge", name: "Chama Constante", icon: "🔥", description: "Sequência de 7 dias.", unlock: { type: "streak", n: 7 } },
  { id: "badge_dragon", kind: "badge", name: "Guardião Dragão", icon: "🐉", description: "Capture 30 monstros.", unlock: { type: "monsters", n: 30 } },
  { id: "badge_pro", kind: "badge", name: "Emblema PRO", icon: "⚡", description: "Alcance a liga PRO.", unlock: { type: "trophies", n: 5200 } },

  // ---------- Efeitos ----------
  { id: "fx_none", kind: "effect", name: "Sem efeito", icon: "◽", description: "Nenhum efeito visual.", unlock: { type: "free" }, className: "" },
  { id: "fx_glow", kind: "effect", name: "Brilho Arcano", icon: "✨", description: "Nível 10.", unlock: { type: "level", n: 10 }, className: "pfx pfx-glow" },
  { id: "fx_aura", kind: "effect", name: "Aura Divina", icon: "🌟", description: "40 conquistas desbloqueadas.", unlock: { type: "achievements", n: 40 }, className: "pfx pfx-aura" },
];

// ---------- Conjuntos de liga (um título + um fundo para cada rank) ----------
/** ligas espelhando src/lib/game/battle/config.ts (mantido local para evitar ciclos) */
const RANK_LADDER: Array<{
  id: string;
  name: string;
  icon: string;
  min: number;
  title: string;
  bg: string;
}> = [
  { id: "bronze", name: "Bronze", icon: "🥉", min: 0, title: "Aspirante de Bronze", bg: "" },
  { id: "prata", name: "Prata", icon: "🥈", min: 400, title: "Guardião de Prata", bg: "" },
  { id: "ouro", name: "Ouro", icon: "🥇", min: 900, title: "Sentinela de Ouro", bg: "" },
  { id: "diamante", name: "Diamante", icon: "💎", min: 1500, title: "Lâmina de Diamante", bg: "" },
  { id: "mitico", name: "Mítico", icon: "🔮", min: 2200, title: "Arcanista Mítico", bg: "" },
  { id: "lendario", name: "Lendário", icon: "🐉", min: 3000, title: "Domador Lendário", bg: "" },
  { id: "mestre", name: "Mestre", icon: "👑", min: 4000, title: "Grão-Mestre", bg: "" },
  { id: "pro", name: "PRO", icon: "⚡", min: 5200, title: "PRO", bg: "" },
];

const RANK_COSMETICS: CosmeticDef[] = RANK_LADDER.flatMap((r) => [
  {
    id: `title_rank_${r.id}`,
    kind: "title" as const,
    name: r.title,
    icon: r.icon,
    description: `Título exclusivo da liga ${r.name}.`,
    unlock: r.min === 0 ? { type: "free" as const } : { type: "trophies" as const, n: r.min },
  },
  {
    id: `bg_rank_${r.id}`,
    kind: "background" as const,
    name: `Arena ${r.name}`,
    icon: r.icon,
    description: `Fundo de perfil da liga ${r.name}.`,
    unlock: r.min === 0 ? { type: "free" as const } : { type: "trophies" as const, n: r.min },
    className: r.bg,
  },
]);

// ---------- 🌕🔴 Lua de Sangue (comprados com a moeda do evento) ----------
const BLOOD_MOON_COSMETICS_DEFS: CosmeticDef[] = [
  {
    id: "badge_bloodmoon",
    kind: "badge",
    name: "Selo da Lua de Sangue",
    icon: "🩸",
    description: "Emblema exclusivo do evento Lua de Sangue.",
    unlock: { type: "event", event: "Lua de Sangue" },
    className: "badge-blood",

  },
  {
    id: "title_bloodmoon",
    kind: "title",
    name: "Filho da Lua de Sangue",
    icon: "🌕",
    description: "Título exclusivo do evento Lua de Sangue.",
    unlock: { type: "event", event: "Lua de Sangue" },
  },
  {
    id: "fx_bloodmoon",
    kind: "effect",
    name: "Aura Carmesim",
    icon: "🔴",
    description: "Atmosfera de eclipse escarlate no painel do seu perfil.",
    unlock: { type: "event", event: "Lua de Sangue" },
    className: "pfx pfx-blood",
  },
  {
    id: "frame_bloodmoon",
    kind: "frame",
    name: "Moldura da Lua de Sangue",
    icon: "🌘",
    description: "Moldura de eclipse escarlate, só do evento.",
    unlock: { type: "event", event: "Lua de Sangue" },
    className: "mframe mframe-bloodmoon",
  },
];

export const COSMETICS: CosmeticDef[] = [
  ...BASE_COSMETICS,
  ...BLOOD_MOON_COSMETICS_DEFS,
  ...RANK_COSMETICS,
];



export const COSMETICS_BY_ID: Record<string, CosmeticDef> = Object.fromEntries(
  COSMETICS.map((c) => [c.id, c]),
);

// ------------------------------------------------------------
// Cor do nome do jogador conforme o título equipado.
// Fáceis: cor normal · médios: metálico · melhores: gradiente com brilho leve.
// ------------------------------------------------------------
export type TitleTier = "comum" | "metalico" | "elite";

const TITLE_NAME_STYLE: Record<string, { tier: TitleTier; className: string }> = {
  // fáceis
  title_cacador: { tier: "comum", className: "name-plain" },
  title_estudioso: { tier: "comum", className: "name-plain" },
  title_bibliotecario: { tier: "comum", className: "name-plain" },
  title_rank_bronze: { tier: "comum", className: "name-plain" },
  title_rank_prata: { tier: "comum", className: "name-soft" },
  title_imparavel: { tier: "comum", className: "name-soft" },
  // médios (metálicos)
  title_mestre_materia: { tier: "metalico", className: "name-metal name-metal-bronze" },
  title_veterano: { tier: "metalico", className: "name-metal name-metal-silver" },
  title_rank_ouro: { tier: "metalico", className: "name-metal name-metal-silver" },
  title_rank_diamante: { tier: "metalico", className: "name-metal name-metal-gold" },
  title_top100: { tier: "metalico", className: "name-metal name-metal-gold" },
  // melhores (gradiente + efeito leve)
  title_rank_mitico: { tier: "elite", className: "name-elite name-elite-arcane" },
  title_lenda: { tier: "elite", className: "name-elite name-elite-arcane" },
  title_rank_lendario: { tier: "elite", className: "name-elite name-elite-legend" },
  title_rank_mestre: { tier: "elite", className: "name-elite name-elite-legend" },
  title_rank_pro: { tier: "elite", className: "name-elite name-elite-pro" },
  title_campeao: { tier: "elite", className: "name-elite name-elite-pro" },
  // 🌕🔴 evento: nome em sangue com brilho de eclipse
  title_bloodmoon: { tier: "elite", className: "name-blood" },

};

/** classe CSS a aplicar no nome do jogador (vazio quando não há título equipado) */
export function titleNameClass(titleId?: string | null): string {
  return (titleId && TITLE_NAME_STYLE[titleId]?.className) || "";
}

export function titleTier(titleId?: string | null): TitleTier | null {
  return (titleId && TITLE_NAME_STYLE[titleId]?.tier) || null;
}

export function titleTierLabel(tier: TitleTier): string {
  return tier === "comum" ? "Comum" : tier === "metalico" ? "Metálico" : "Elite";
}



export const COSMETIC_KINDS: Array<{ id: CosmeticKind; name: string; icon: string }> = [
  { id: "frame", name: "Molduras", icon: "🖼️" },
  { id: "title", name: "Títulos", icon: "🏷️" },
  { id: "background", name: "Fundos", icon: "🎨" },
  { id: "badge", name: "Emblemas", icon: "🏅" },
  { id: "effect", name: "Efeitos", icon: "✨" },
];

export function unlockLabel(u: CosmeticUnlock): string {
  switch (u.type) {
    case "free":
      return "Disponível desde o início";
    case "level":
      return `Alcance o nível ${u.n}`;
    case "achievements":
      return `Desbloqueie ${u.n} conquistas`;
    case "monsters":
      return `Capture ${u.n} monstros`;
    case "studyHours":
      return `Acumule ${u.n}h de estudo`;
    case "pages":
      return `Leia ${u.n} páginas`;
    case "streak":
      return `Sequência de ${u.n} dias`;
    case "trophies":
      return `Alcance ${u.n} troféus`;
    case "wins":
      return `Vença ${u.n} batalhas`;
    case "season":
      return "Recompensa de temporada";
    case "event":
      return `Loja do evento ${u.event}`;
  }
}
