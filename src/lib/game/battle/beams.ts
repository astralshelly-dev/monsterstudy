// ============================================================
// Monster Study — ⚡ Feixes Elementais (sinergia de equipe)
//
// Um feixe é ativado quando a equipe reúne certos elementos.
// REGRA CENTRAL: apenas UM feixe fica ativo por batalha. Os bônus são
// pequenos (2%–5%) e nunca se somam.
// ============================================================
import { ELEMENTS_BY_ID, elementIdsOf, type ElementId } from "../elements";

export type BeamBonus = {
  /** multiplicador de dano (0.04 = +4%) */
  dmg?: number;
  /** vida máxima */
  hp?: number;
  /** defesa */
  def?: number;
};

export type BeamDef = {
  id: string;
  name: string;
  icon: string;
  /** elementos que a equipe precisa reunir */
  elements: ElementId[];
  bonus: BeamBonus;
  description: string;
  /** identidade visual (classes do design system) */
  text: string;
  ring: string;
  surface: string;
};

export const BEAMS: BeamDef[] = [
  {
    id: "primordial",
    name: "Feixe Primordial",
    icon: "⚡",
    elements: ["fogo", "agua", "terra", "vento"],
    bonus: { dmg: 0.04, hp: 0.03, def: 0.03 },
    description: "Os quatro elementos que formaram o mundo em equilíbrio perfeito.",
    text: "text-gold",
    ring: "ring-gold/40",
    surface: "rarity-lendario",
  },
  {
    id: "tempestade",
    name: "Feixe da Tempestade",
    icon: "🌩️",
    elements: ["eletrico", "vento", "agua"],
    bonus: { dmg: 0.05 },
    description: "Raio, vendaval e chuva: pura pressão ofensiva.",
    text: "text-mana",
    ring: "ring-mana/40",
    surface: "rarity-super",
  },
  {
    id: "forja",
    name: "Feixe da Forja",
    icon: "🔨",
    elements: ["fogo", "metal", "terra"],
    bonus: { def: 0.05, hp: 0.02 },
    description: "Metal batido no calor da rocha: armadura antes de tudo.",
    text: "text-ember",
    ring: "ring-ember/40",
    surface: "rarity-raro",
  },
  {
    id: "estacoes",
    name: "Feixe das Estações",
    icon: "🍃",
    elements: ["natureza", "agua", "gelo"],
    bonus: { hp: 0.04, def: 0.03 },
    description: "O ciclo lento da natureza que sempre volta a crescer.",
    text: "text-rarity-incomum",
    ring: "ring-rarity-incomum/40",
    surface: "rarity-incomum",
  },
  {
    id: "miasma",
    name: "Feixe do Miasma",
    icon: "☠️",
    elements: ["veneno", "natureza"],
    bonus: { dmg: 0.03, hp: 0.03 },
    description: "Esporos e toxinas que corroem devagar, mas nunca param.",
    text: "text-rarity-epico",
    ring: "ring-rarity-epico/40",
    surface: "rarity-epico",
  },
  {
    id: "eclipse",
    name: "Feixe do Eclipse",
    icon: "🌗",
    elements: ["sombrio", "luz"],
    bonus: { dmg: 0.04, def: 0.02 },
    description: "Sombra e brilho ocupando o mesmo instante do céu.",
    text: "text-rarity-mitico",
    ring: "ring-rarity-mitico/40",
    surface: "rarity-mitico",
  },
  {
    id: "veio_telurico",
    name: "Feixe Telúrico",
    icon: "🪨",
    elements: ["terra", "metal", "natureza"],
    bonus: { hp: 0.05, def: 0.02 },
    description: "Raízes, minérios e pedra formando uma muralha viva.",
    text: "text-rarity-comum",
    ring: "ring-rarity-comum/40",
    surface: "rarity-comum",
  },
  {
    id: "fornalha",
    name: "Feixe da Fornalha",
    icon: "🔥",
    elements: ["fogo", "eletrico"],
    bonus: { dmg: 0.05 },
    description: "Calor e carga elétrica: tudo queima mais rápido.",
    text: "text-ember",
    ring: "ring-ember/40",
    surface: "rarity-lendario",
  },
  {
    id: "nucleo_gelido",
    name: "Feixe do Núcleo Gélido",
    icon: "❄️",
    elements: ["gelo", "metal"],
    bonus: { def: 0.05 },
    description: "Aço congelado que não cede a golpe nenhum.",
    text: "text-rarity-super",
    ring: "ring-rarity-super/40",
    surface: "rarity-super",
  },
  {
    id: "mare_profunda",
    name: "Feixe da Maré Profunda",
    icon: "🌊",
    elements: ["agua", "sombrio"],
    bonus: { hp: 0.04, dmg: 0.02 },
    description: "As correntes do abismo, onde a luz nunca chega.",
    text: "text-primary",
    ring: "ring-primary/40",
    surface: "rarity-divino",
  },
  {
    id: "ventos_puros",
    name: "Feixe dos Ventos Puros",
    icon: "🌪️",
    elements: ["vento", "luz"],
    bonus: { dmg: 0.03, hp: 0.02 },
    description: "Correntes altas iluminadas que carregam a equipe adiante.",
    text: "text-rarity-mitico",
    ring: "ring-rarity-mitico/40",
    surface: "rarity-incomum",
  },
  {
    id: "juizo",
    name: "Feixe do Juízo",
    icon: "🌌",
    elements: ["deus", "luz", "sombrio"],
    bonus: { dmg: 0.03, hp: 0.03, def: 0.03 },
    description: "Uma presença divina entre a luz e a sombra: raríssimo de reunir.",
    text: "text-rarity-divino",
    ring: "ring-rarity-divino/40",
    surface: "rarity-divino",
  },
];

export const BEAMS_BY_ID: Record<string, BeamDef> = Object.fromEntries(
  BEAMS.map((b) => [b.id, b]),
);

/** todos os elementos presentes numa equipe (contando tipos duplos) */
export function teamElements(monsterIds: string[]): ElementId[] {
  const set = new Set<ElementId>();
  for (const id of monsterIds) for (const e of elementIdsOf(id)) set.add(e);
  return Array.from(set);
}

/** peso do feixe: usado como desempate quando nenhum foi escolhido */
function beamWeight(b: BeamDef): number {
  const total = (b.bonus.dmg ?? 0) + (b.bonus.hp ?? 0) + (b.bonus.def ?? 0);
  return b.elements.length * 100 + total * 100;
}

/** feixes que a composição atual desbloqueia (pode ser mais de um) */
export function availableBeams(monsterIds: string[]): BeamDef[] {
  const els = teamElements(monsterIds);
  return BEAMS.filter((b) => b.elements.every((e) => els.includes(e))).sort(
    (a, z) => beamWeight(z) - beamWeight(a),
  );
}

/**
 * Resolve o feixe ATIVO da equipe: usa o escolhido pelo jogador quando ele
 * ainda é válido; senão cai no mais exigente disponível. Sempre 1 (ou nenhum).
 */
export function resolveBeam(monsterIds: string[], chosenId?: string | null): BeamDef | null {
  const options = availableBeams(monsterIds);
  if (options.length === 0) return null;
  const chosen = chosenId ? options.find((b) => b.id === chosenId) : undefined;
  return chosen ?? options[0]!;
}

export function beamBonusOf(beam: BeamDef | null): Required<BeamBonus> {
  return {
    dmg: beam?.bonus.dmg ?? 0,
    hp: beam?.bonus.hp ?? 0,
    def: beam?.bonus.def ?? 0,
  };
}

/** texto curto com os bônus, ex.: "+4% Dano · +3% Vida" */
export function beamBonusLabel(beam: BeamDef): string {
  const parts: string[] = [];
  if (beam.bonus.dmg) parts.push(`+${Math.round(beam.bonus.dmg * 100)}% Dano`);
  if (beam.bonus.hp) parts.push(`+${Math.round(beam.bonus.hp * 100)}% Vida`);
  if (beam.bonus.def) parts.push(`+${Math.round(beam.bonus.def * 100)}% Defesa`);
  return parts.join(" · ");
}

export function beamElementLabel(beam: BeamDef): string {
  return beam.elements.map((e) => ELEMENTS_BY_ID[e].icon).join(" + ");
}
