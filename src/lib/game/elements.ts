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
 * Tabela de vantagens: STRONG_AGAINST[atacante] = tipos que sofrem dano extra.
 * Tabela oficial do jogo (editar aqui muda todo o balanceamento).
 */
export const STRONG_AGAINST: Record<ElementId, ElementId[]> = {
  fogo: ["gelo", "natureza", "metal"],
  gelo: ["natureza", "vento"],
  natureza: ["agua", "terra"],
  agua: ["fogo", "terra"],
  eletrico: ["agua", "vento"],
  terra: ["eletrico", "fogo", "veneno"],
  metal: ["gelo", "veneno"],
  veneno: ["natureza", "luz"],
  vento: ["terra", "gelo"],
  sombrio: ["luz"],
  luz: ["sombrio"],
  deus: [],
};

/**
 * WEAK_AGAINST[defensor] = tipos contra os quais ele sofre penalidade de dano.
 * Declarado explicitamente porque a tabela não é perfeitamente simétrica.
 */
export const WEAK_AGAINST: Record<ElementId, ElementId[]> = {
  fogo: ["agua", "terra"],
  gelo: ["fogo", "metal"],
  natureza: ["fogo", "gelo", "veneno"],
  agua: ["eletrico", "natureza"],
  eletrico: ["terra", "metal"],
  terra: ["agua", "natureza", "vento"],
  metal: ["fogo", "eletrico", "terra"],
  veneno: ["terra", "metal"],
  vento: ["eletrico", "fogo"],
  sombrio: [],
  luz: [],
  deus: [],
};

/** ordem de exibição da tabela */
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

/** bônus/penalidade de dano por vantagem de tipo */
export const TYPE_BONUS = 0.15;

export type TypeEffect = {
  mult: number;
  kind: "super" | "weak" | "normal";
  label: string | null;
};

/** vantagem de tipo aplicada ao dano (um tipo contra um tipo) */
export function typeEffect(attacker: ElementId, defender: ElementId): TypeEffect {
  if (attacker === "deus" || defender === "deus") {
    return { mult: 1, kind: "normal", label: null };
  }
  if (STRONG_AGAINST[attacker].includes(defender)) {
    return { mult: 1 + TYPE_BONUS, kind: "super", label: "SUPER EFETIVO!" };
  }
  if (WEAK_AGAINST[defender].includes(attacker)) {
    return { mult: 1 - TYPE_BONUS, kind: "weak", label: "POUCO EFETIVO" };
  }
  return { mult: 1, kind: "normal", label: null };
}

/**
 * Monstros de tipo duplo: somam TODAS as vantagens e TODAS as fraquezas
 * dos dois elementos (sem acumular — o bônus continua sendo ±15%).
 */
export function typeEffectMulti(attackers: ElementId[], defenders: ElementId[]): TypeEffect {
  if (attackers.includes("deus") || defenders.includes("deus")) {
    return { mult: 1, kind: "normal", label: null };
  }
  const strong = attackers.some((a) => defenders.some((d) => STRONG_AGAINST[a].includes(d)));
  if (strong) return { mult: 1 + TYPE_BONUS, kind: "super", label: "SUPER EFETIVO!" };
  const weak = defenders.some((d) => attackers.some((a) => WEAK_AGAINST[d].includes(a)));
  if (weak) return { mult: 1 - TYPE_BONUS, kind: "weak", label: "POUCO EFETIVO" };
  return { mult: 1, kind: "normal", label: null };
}

/** tipos que este elemento vence / perde */
export function elementMatchups(id: ElementId) {
  return {
    strong: STRONG_AGAINST[id],
    weak: WEAK_AGAINST[id],
  };
}

/** união das vantagens/fraquezas de um monstro (funciona para tipo duplo) */
export function combinedMatchups(ids: ElementId[]) {
  const uniq = (xs: ElementId[]) => Array.from(new Set(xs));
  return {
    strong: uniq(ids.flatMap((i) => STRONG_AGAINST[i])),
    weak: uniq(ids.flatMap((i) => WEAK_AGAINST[i])),
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
  chronavyr: "vento",
  equinoxis: "sombrio",
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

/**
 * Segundo elemento (tipo duplo) — apenas para monstros em que faz sentido.
 * Um monstro de tipo duplo herda TODAS as vantagens e TODAS as fraquezas
 * dos dois elementos.
 */
export const MONSTER_ELEMENTS_2: Record<string, ElementId> = {
  // gelo + água faz sentido para criaturas de gelo aquático
  frostnib: "agua",
  // vaga-lume brilhante da floresta
  lumibug: "natureza",
  // peixe bioluminescente
  glowfin: "luz",
  // toupeira de cinzas vulcânicas
  ashmole: "fogo",
  // golem feito de casca e pedra
  barkgolem: "terra",
  // criatura de lava e rocha
  magmaw: "terra",
  // serpente floral venenosa
  bloomserp: "veneno",
  // dragão de obsidiana vulcânica
  obsidrake: "terra",
  // tempestade sobre o mar
  tempestrix: "agua",
  // eclipse: luz e sombra
  eclipsaur: "luz",
  // equinócio: sombrio + luz
  equinoxis: "luz",
  // sapo tóxico aquático
  toxlet: "agua",
};

export function elementOf(monsterId: string): ElementDef {
  return ELEMENTS_BY_ID[MONSTER_ELEMENTS[monsterId] ?? "natureza"];
}

/** todos os elementos de um monstro (1 ou 2) */
export function elementIdsOf(monsterId: string): ElementId[] {
  const primary = MONSTER_ELEMENTS[monsterId] ?? "natureza";
  const second = MONSTER_ELEMENTS_2[monsterId];
  return second && second !== primary ? [primary, second] : [primary];
}

export function elementDefsOf(monsterId: string): ElementDef[] {
  return elementIdsOf(monsterId).map((id) => ELEMENTS_BY_ID[id]);
}

