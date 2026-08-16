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
  | { type: "season" };

export type CosmeticDef = {
  id: string;
  kind: CosmeticKind;
  name: string;
  icon: string;
  description: string;
  unlock: CosmeticUnlock;
  /** classes aplicadas no avatar (frame) ou no painel (background) */
  className?: string;
};

export const COSMETICS: CosmeticDef[] = [
  // ---------- Molduras ----------
  { id: "frame_none", kind: "frame", name: "Sem moldura", icon: "⬜", description: "Visual limpo.", unlock: { type: "free" }, className: "" },
  { id: "frame_bronze", kind: "frame", name: "Moldura Bronze", icon: "🥉", description: "Para quem começou a jornada.", unlock: { type: "level", n: 5 }, className: "ring-4 ring-rarity-comum/70" },
  { id: "frame_arcane", kind: "frame", name: "Moldura Arcana", icon: "🔮", description: "Brilho arcano ao redor do retrato.", unlock: { type: "level", n: 15 }, className: "ring-4 ring-arcane/70 shadow-[0_0_24px_hsl(var(--arcane)/0.45)]" },
  { id: "frame_gold", kind: "frame", name: "Moldura Dourada", icon: "🏆", description: "Conquistada nas ligas altas.", unlock: { type: "trophies", n: 1500 }, className: "ring-4 ring-gold/80 shadow-[0_0_24px_hsl(var(--gold)/0.5)]" },
  { id: "frame_champion", kind: "frame", name: "Moldura de Campeão", icon: "👑", description: "Exclusiva do topo do ranking.", unlock: { type: "season" }, className: "ring-4 ring-rarity-divino shadow-[0_0_32px_hsl(var(--rarity-divino)/0.6)]" },
  { id: "frame_scholar", kind: "frame", name: "Moldura do Erudito", icon: "🎓", description: "100 horas de estudo acumuladas.", unlock: { type: "studyHours", n: 100 }, className: "ring-4 ring-rarity-mitico/70" },

  // ---------- Títulos ----------
  { id: "title_cacador", kind: "title", name: "Caçador de Monstros", icon: "🐾", description: "Capture 10 monstros.", unlock: { type: "monsters", n: 10 } },
  { id: "title_estudioso", kind: "title", name: "Estudioso", icon: "📚", description: "Acumule 10 horas de estudo.", unlock: { type: "studyHours", n: 10 } },
  { id: "title_bibliotecario", kind: "title", name: "Bibliotecário", icon: "📖", description: "Leia 1.000 páginas.", unlock: { type: "pages", n: 1000 } },
  { id: "title_imparavel", kind: "title", name: "Imparável", icon: "🔥", description: "Sequência de 30 dias.", unlock: { type: "streak", n: 30 } },
  { id: "title_veterano", kind: "title", name: "Veterano", icon: "⚔️", description: "Vença 100 batalhas.", unlock: { type: "wins", n: 100 } },
  { id: "title_campeao", kind: "title", name: "Campeão", icon: "👑", description: "Alcance a liga PRO ou o topo do ranking.", unlock: { type: "trophies", n: 5200 } },
  { id: "title_top100", kind: "title", name: "Top 100", icon: "🏅", description: "Termine uma temporada entre os 100 melhores.", unlock: { type: "season" } },
  { id: "title_mestre_materia", kind: "title", name: "Mestre da Matéria", icon: "🧮", description: "Desbloqueie 25 conquistas.", unlock: { type: "achievements", n: 25 } },
  { id: "title_lenda", kind: "title", name: "Lenda Viva", icon: "🌌", description: "Chegue ao nível 40.", unlock: { type: "level", n: 40 } },

  // ---------- Fundos de perfil ----------
  { id: "bg_default", kind: "background", name: "Noite Padrão", icon: "🌃", description: "O fundo clássico.", unlock: { type: "free" }, className: "bg-gradient-to-br from-secondary/60 to-background" },
  { id: "bg_forest", kind: "background", name: "Floresta Viva", icon: "🌿", description: "Capture 20 monstros.", unlock: { type: "monsters", n: 20 }, className: "bg-gradient-to-br from-rarity-incomum/25 via-background to-background" },
  { id: "bg_volcano", kind: "background", name: "Coração Vulcânico", icon: "🌋", description: "50 horas de estudo.", unlock: { type: "studyHours", n: 50 }, className: "bg-gradient-to-br from-rarity-lendario/25 via-background to-background" },
  { id: "bg_cosmos", kind: "background", name: "Cosmos Arcano", icon: "🌌", description: "Nível 25.", unlock: { type: "level", n: 25 }, className: "bg-gradient-to-br from-arcane/30 via-background to-primary/20" },
  { id: "bg_champion", kind: "background", name: "Arena dos Campeões", icon: "🏟️", description: "2.200 troféus.", unlock: { type: "trophies", n: 2200 }, className: "bg-gradient-to-br from-gold/25 via-background to-rarity-epico/20" },

  // ---------- Emblemas ----------
  { id: "badge_none", kind: "badge", name: "Sem emblema", icon: "▫️", description: "Nenhum emblema.", unlock: { type: "free" } },
  { id: "badge_owl", kind: "badge", name: "Coruja", icon: "🌙", description: "Estude de madrugada.", unlock: { type: "studyHours", n: 5 } },
  { id: "badge_flame", kind: "badge", name: "Chama Constante", icon: "🔥", description: "Sequência de 7 dias.", unlock: { type: "streak", n: 7 } },
  { id: "badge_dragon", kind: "badge", name: "Guardião Dragão", icon: "🐉", description: "Capture 30 monstros.", unlock: { type: "monsters", n: 30 } },
  { id: "badge_pro", kind: "badge", name: "Emblema PRO", icon: "⚡", description: "Alcance a liga PRO.", unlock: { type: "trophies", n: 5200 } },

  // ---------- Efeitos ----------
  { id: "fx_none", kind: "effect", name: "Sem efeito", icon: "◽", description: "Nenhum efeito visual.", unlock: { type: "free" }, className: "" },
  { id: "fx_glow", kind: "effect", name: "Brilho Arcano", icon: "✨", description: "Nível 10.", unlock: { type: "level", n: 10 }, className: "animate-pulse-soft" },
  { id: "fx_aura", kind: "effect", name: "Aura Divina", icon: "🌟", description: "40 conquistas desbloqueadas.", unlock: { type: "achievements", n: 40 }, className: "drop-shadow-[0_0_18px_hsl(var(--gold)/0.7)]" },
];

export const COSMETICS_BY_ID: Record<string, CosmeticDef> = Object.fromEntries(
  COSMETICS.map((c) => [c.id, c]),
);

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
  }
}
