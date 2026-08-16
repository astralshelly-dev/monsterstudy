// ============================================================
// Monster Study — Nível individual por matéria
// Usa as matérias já registradas nas sessões de estudo.
// ============================================================

/** XP necessário para sair do nível informado */
export function subjectXpForLevel(level: number): number {
  return Math.round(300 * Math.pow(1.18, level - 1));
}

/** XP de matéria ganho por minuto estudado */
export const SUBJECT_XP_PER_MINUTE = 12;

export type SubjectProgress = {
  key: string;
  name: string;
  icon: string;
  level: number;
  xp: number;
  need: number;
  pct: number;
  totalXp: number;
};

const ICONS: Array<[RegExp, string]> = [
  [/mat|calc|algebr|geometr/i, "🧮"],
  [/fis|físic/i, "⚛️"],
  [/quim|químic/i, "🧪"],
  [/bio|genet/i, "🧬"],
  [/hist/i, "📖"],
  [/geo/i, "🌍"],
  [/portug|gramat|redac|redaç|liter/i, "✍️"],
  [/ingl|espanh|idiom|frances|francês/i, "🗣️"],
  [/program|code|comput|softw|dev/i, "💻"],
  [/filos/i, "🦉"],
  [/sociol/i, "👥"],
  [/direit|jurid|juríd/i, "⚖️"],
  [/med|anat|enferm/i, "🩺"],
  [/econ|contab|financ/i, "💰"],
  [/art|desenh|music|músic/i, "🎨"],
  [/eletr|engenh/i, "🔧"],
];

export function subjectIcon(name: string): string {
  for (const [re, icon] of ICONS) if (re.test(name)) return icon;
  return "📚";
}

/** chave normalizada para não duplicar matérias por acento/caixa */
export function subjectKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function subjectLevelFromXp(totalXp: number): { level: number; xp: number; need: number } {
  let level = 1;
  let xp = Math.max(0, Math.round(totalXp));
  while (xp >= subjectXpForLevel(level)) {
    xp -= subjectXpForLevel(level);
    level += 1;
  }
  return { level, xp, need: subjectXpForLevel(level) };
}
