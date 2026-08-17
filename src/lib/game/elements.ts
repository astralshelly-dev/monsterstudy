// ============================================================
// Monster Study — Tipos elementais, vantagens e fraquezas
// Tabela centralizada e fácil de editar.
// ============================================================

export type ElementId =
  | "fogo"
  | "gelo"
  | "natureza"
  | "agua"
  | "eletrico"
  | "terra"
  | "metal"
  | "veneno"
  | "vento"
  | "sombrio"
  | "luz"
  | "deus";

export type ElementDef = {
  id: ElementId;
  name: string;
  icon: string;
  /** classe de cor do design system */
  text: string;
  ring: string;
};

export const ELEMENTS: ElementDef[] = [
  { id: "fogo", name: "Fogo", icon: "🔥", text: "text-rarity-lendario", ring: "ring-rarity-lendario/40" },
  { id: "gelo", name: "Gelo", icon: "❄️", text: "text-rarity-super", ring: "ring-rarity-super/40" },
  { id: "natureza", name: "Natureza", icon: "🌿", text: "text-rarity-incomum", ring: "ring-rarity-incomum/40" },
  { id: "agua", name: "Água", icon: "🌊", text: "text-primary", ring: "ring-primary/40" },
  { id: "eletrico", name: "Elétrico", icon: "⚡", text: "text-gold", ring: "ring-gold/40" },
  { id: "terra", name: "Terra", icon: "🪨", text: "text-rarity-comum", ring: "ring-rarity-comum/40" },
  { id: "metal", name: "Metal", icon: "⚙️", text: "text-muted-foreground", ring: "ring-border" },
  { id: "veneno", name: "Veneno", icon: "☠️", text: "text-rarity-epico", ring: "ring-rarity-epico/40" },
  { id: "vento", name: "Vento", icon: "🌪️", text: "text-mana", ring: "ring-mana/40" },
  { id: "sombrio", name: "Sombrio", icon: "🌑", text: "text-rarity-epico", ring: "ring-rarity-epico/40" },
  { id: "luz", name: "Luz", icon: "✨", text: "text-rarity-mitico", ring: "ring-rarity-mitico/40" },
  { id: "deus", name: "Deus", icon: "🌌", text: "text-rarity-divino", ring: "ring-rarity-divino/40" },
];

export const ELEMENTS_BY_ID: Record<ElementId, ElementDef> = Object.fromEntries(
  ELEMENTS.map((e) => [e.id, e]),
) as Record<ElementId, ElementDef>;

/**
 * Ciclo elemental: 9 elementos em roda. Cada um é FORTE contra os DOIS
 * seguintes e FRACO contra os DOIS anteriores — ninguém fica sem counter.
 * Luz e Sombrio formam um par próprio (só se counteram entre si) e
 * Deus é neutro: não ganha nem perde vantagem contra ninguém.
 */
export const ELEMENT_CYCLE: ElementId[] = [
  "fogo",
  "gelo",
  "natureza",
  "agua",
  "eletrico",
  "terra",
  "metal",
  "veneno",
  "vento",
];

function buildStrongTable(): Record<ElementId, ElementId[]> {
  const table = {} as Record<ElementId, ElementId[]>;
  const n = ELEMENT_CYCLE.length;
  ELEMENT_CYCLE.forEach((id, i) => {
    table[id] = [ELEMENT_CYCLE[(i + 1) % n]!, ELEMENT_CYCLE[(i + 2) % n]!];
  });
  table.luz = ["sombrio"];
  table.sombrio = ["luz"];
  table.deus = [];
  return table;
}

/**
 * Tabela de vantagens: STRONG_AGAINST[atacante] = tipos que sofrem dano extra.
 * Gerada a partir do ciclo acima (editar o ciclo muda todo o jogo).
 */
export const STRONG_AGAINST: Record<ElementId, ElementId[]> = buildStrongTable();

/** bônus/penalidade de dano por vantagem de tipo */
export const TYPE_BONUS = 0.15;

export type TypeEffect = {
  mult: number;
  kind: "super" | "weak" | "normal";
  label: string | null;
};

/** vantagem de tipo aplicada ao dano */
export function typeEffect(attacker: ElementId, defender: ElementId): TypeEffect {
  if (attacker === "deus" || defender === "deus") {
    return { mult: 1, kind: "normal", label: null };
  }
  if (STRONG_AGAINST[attacker].includes(defender)) {
    return { mult: 1 + TYPE_BONUS, kind: "super", label: "SUPER EFETIVO!" };
  }
  if (STRONG_AGAINST[defender].includes(attacker)) {
    return { mult: 1 - TYPE_BONUS, kind: "weak", label: "POUCO EFETIVO" };
  }
  return { mult: 1, kind: "normal", label: null };
}

/** tipos que este elemento vence / perde */
export function elementMatchups(id: ElementId) {
  return {
    strong: STRONG_AGAINST[id],
    weak: ELEMENTS.filter(
      (e) => e.id !== "deus" && STRONG_AGAINST[e.id].includes(id) && !STRONG_AGAINST[id].includes(e.id),
    ).map((e) => e.id),
  };
}

/** elemento de cada monstro (o secreto é o único "Deus") */
export const MONSTER_ELEMENTS: Record<string, ElementId> = {
  // comuns
  mosslet: "natureza",
  pebbly: "terra",
  drippet: "agua",
  sparkid: "fogo",
  frostnib: "gelo",
  vinelet: "natureza",
  twiglin: "natureza",
  sandpip: "terra",
  // incomuns
  thornhop: "natureza",
  tidewhisk: "agua",
  cindertail: "fogo",
  glaciva: "gelo",
  dunecoil: "terra",
  lumibug: "luz",
  mistmote: "vento",
  glowfin: "agua",
  // raros
  ashmole: "terra",
  emberfang: "fogo",
  moonfang: "sombrio",
  abyssquill: "veneno",
  barkgolem: "natureza",
  mirasand: "luz",
  petalynx: "natureza",
  quartzox: "metal",
  bloomserp: "natureza",
  starkit: "luz",
  // super raros
  stormhorn: "eletrico",
  voidbloom: "sombrio",
  kraveel: "agua",
  magmaw: "fogo",
  thornmaw: "veneno",
  voltyx: "eletrico",
  // épicos
  aurelith: "luz",
  cryotaur: "gelo",
  sylvaqueen: "natureza",
  obsidrake: "fogo",
  tempestrix: "vento",
  dunephar: "luz",
  // lendários
  solmyrr: "fogo",
  nebulith: "sombrio",
  thundrix: "eletrico",
  seraphae: "luz",
  // míticos
  eclipsaur: "sombrio",
  arcanyx: "eletrico",
  abyssaria: "agua",
  umbraleth: "sombrio",
  // divinos
  astraeon: "gelo",
  luminara: "luz",
  // secreto
  aetheryon: "deus",
  // ---- expansão: novos elementos ----
  cragling: "terra",
  terrabor: "terra",
  gaiaruk: "terra",
  ferrik: "metal",
  chromaw: "metal",
  titanox: "metal",
  zephyx: "vento",
  gustwing: "vento",
  aeromyr: "vento",
  toxlet: "veneno",
  venomyra: "veneno",
  malachor: "veneno",
};

export function elementOf(monsterId: string): ElementDef {
  return ELEMENTS_BY_ID[MONSTER_ELEMENTS[monsterId] ?? "natureza"];
}
