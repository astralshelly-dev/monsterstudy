import type { HabitatId, RarityId } from "./config";

export type MonsterDef = {
  id: string;
  name: string;
  /** arte do monstro (glifo) — substituível por imagem futuramente */
  art: string;
  rarity: RarityId;
  habitat: HabitatId;
  description: string;
};

export const MONSTERS: MonsterDef[] = [
  // ---------- Comum ----------
  {
    id: "mosslet",
    name: "Mosslet",
    art: "🍃",
    rarity: "comum",
    habitat: "floresta",
    description: "Um filhote de musgo que dorme entre raízes e desperta com o som de páginas virando.",
  },
  {
    id: "pebbly",
    name: "Pebbly",
    art: "🪨",
    rarity: "comum",
    habitat: "deserto",
    description: "Feito de cascalho quente. Rola em círculos enquanto você se concentra.",
  },
  {
    id: "drippet",
    name: "Drippet",
    art: "💧",
    rarity: "comum",
    habitat: "oceano",
    description: "Uma gota viva e curiosa. Adora escorrer pelas margens dos cadernos.",
  },
  {
    id: "sparkid",
    name: "Sparkid",
    art: "✳️",
    rarity: "comum",
    habitat: "vulcao",
    description: "Faísca teimosa que insiste em não apagar antes do fim do cronômetro.",
  },
  {
    id: "frostnib",
    name: "Frostnib",
    art: "❄️",
    rarity: "comum",
    habitat: "tundra",
    description: "Pequeno cristal de gelo que refresca a mente durante longas revisões.",
  },
  {
    id: "vinelet",
    name: "Vinelet",
    art: "🌱",
    rarity: "comum",
    habitat: "selva",
    description: "Cipó recém-nascido. Cresce um centímetro por sessão concluída.",
  },

  // ---------- Incomum ----------
  {
    id: "thornhop",
    name: "Thornhop",
    art: "🦗",
    rarity: "incomum",
    habitat: "floresta",
    description: "Salta entre espinhos sem se ferir. Símbolo de disciplina ágil.",
  },
  {
    id: "tidewhisk",
    name: "Tidewhisk",
    art: "🐟",
    rarity: "incomum",
    habitat: "oceano",
    description: "Nada em correntes de tinta e devolve ideias esquecidas à superfície.",
  },
  {
    id: "cindertail",
    name: "Cindertail",
    art: "🦎",
    rarity: "incomum",
    habitat: "vulcao",
    description: "Sua cauda brasa marca no chão o quanto você já estudou hoje.",
  },
  {
    id: "glaciva",
    name: "Glaciva",
    art: "🐧",
    rarity: "incomum",
    habitat: "tundra",
    description: "Guardiã paciente das planícies brancas. Nunca apressa uma leitura.",
  },
  {
    id: "dunecoil",
    name: "Dunecoil",
    art: "🐍",
    rarity: "incomum",
    habitat: "deserto",
    description: "Enrola-se em espirais que lembram fórmulas antigas.",
  },
  {
    id: "lumibug",
    name: "Lumibug",
    art: "🪲",
    rarity: "incomum",
    habitat: "selva",
    description: "Ilumina apenas o parágrafo que você precisa reler.",
  },

  // ---------- Raro ----------
  {
    id: "emberfang",
    name: "Emberfang",
    art: "🐉",
    rarity: "raro",
    habitat: "vulcao",
    description: "Dragonete de presas incandescentes. Ruge quando um capítulo termina.",
  },
  {
    id: "moonfang",
    name: "Moonfang",
    art: "🐺",
    rarity: "raro",
    habitat: "tundra",
    description: "Lobo de pelo prateado que caça sob o luar das madrugadas de estudo.",
  },
  {
    id: "abyssquill",
    name: "Abyssquill",
    art: "🦑",
    rarity: "raro",
    habitat: "oceano",
    description: "Escreve com tinta abissal aquilo que você jurou não esquecer.",
  },
  {
    id: "barkgolem",
    name: "Barkgolem",
    art: "🌳",
    rarity: "raro",
    habitat: "floresta",
    description: "Guardião de casca antiga. Um anel novo por cada cem páginas lidas.",
  },
  {
    id: "mirasand",
    name: "Mirasand",
    art: "🦂",
    rarity: "raro",
    habitat: "deserto",
    description: "Miragem viva que só aparece para quem estuda em silêncio absoluto.",
  },
  {
    id: "petalynx",
    name: "Petalynx",
    art: "🐆",
    rarity: "raro",
    habitat: "selva",
    description: "Felino coberto de pétalas. Passos completamente inaudíveis.",
  },

  // ---------- Super Raro ----------
  {
    id: "stormhorn",
    name: "Stormhorn",
    art: "🦏",
    rarity: "super_raro",
    habitat: "tundra",
    description: "Seu chifre acumula trovões — e libera um por maratona concluída.",
  },
  {
    id: "voidbloom",
    name: "Voidbloom",
    art: "🌺",
    rarity: "super_raro",
    habitat: "mistico",
    description: "Flor que só abre em dimensões onde o tempo é bem aproveitado.",
  },
  {
    id: "kraveel",
    name: "Kraveel",
    art: "🐙",
    rarity: "super_raro",
    habitat: "oceano",
    description: "Oito braços, oito livros, uma leitura simultânea impossível.",
  },
  {
    id: "magmaw",
    name: "Magmaw",
    art: "🦖",
    rarity: "super_raro",
    habitat: "vulcao",
    description: "Devora rochas derretidas com o mesmo apetite com que você devora capítulos.",
  },

  // ---------- Épico ----------
  {
    id: "aurelith",
    name: "Aurelith",
    art: "🦅",
    rarity: "epico",
    habitat: "espaco",
    description: "Ave de asas de aurora que sobrevoa constelações de conhecimento.",
  },
  {
    id: "cryotaur",
    name: "Cryotaur",
    art: "🐂",
    rarity: "epico",
    habitat: "tundra",
    description: "Colosso de gelo eterno. Cada passo congela distrações.",
  },
  {
    id: "sylvaqueen",
    name: "Sylvaqueen",
    art: "🦋",
    rarity: "epico",
    habitat: "selva",
    description: "Rainha das folhas suspensas. Suas asas escrevem em pólen dourado.",
  },
  {
    id: "obsidrake",
    name: "Obsidrake",
    art: "🐊",
    rarity: "epico",
    habitat: "vulcao",
    description: "Escamas de obsidiana polida refletem tudo o que você aprendeu.",
  },

  // ---------- Lendário ----------
  {
    id: "solmyrr",
    name: "Solmyrr",
    art: "🦁",
    rarity: "lendario",
    habitat: "deserto",
    description: "Leão solar cuja juba é feita de horas de dedicação acumuladas.",
  },
  {
    id: "nebulith",
    name: "Nebulith",
    art: "🐋",
    rarity: "lendario",
    habitat: "espaco",
    description: "Baleia cósmica que navega nebulosas guardando memórias inteiras.",
  },
  {
    id: "thundrix",
    name: "Thundrix",
    art: "🦌",
    rarity: "lendario",
    habitat: "tundra",
    description: "Galhadas de relâmpago congelado. Aparece uma vez por estação de estudos.",
  },

  // ---------- Mítico ----------
  {
    id: "eclipsaur",
    name: "Eclipsaur",
    art: "🦕",
    rarity: "mitico",
    habitat: "espaco",
    description: "Ancião que existe entre dois eclipses. Fala apenas em equações.",
  },
  {
    id: "arcanyx",
    name: "Arcanyx",
    art: "🦚",
    rarity: "mitico",
    habitat: "mistico",
    description: "Cada pena guarda um feitiço que só a concentração absoluta revela.",
  },
  {
    id: "abyssaria",
    name: "Abyssaria",
    art: "🐳",
    rarity: "mitico",
    habitat: "oceano",
    description: "Canta no fundo do mundo. Quem a ouve nunca mais perde o foco.",
  },

  // ---------- Divino ----------
  {
    id: "astraeon",
    name: "Astraeon",
    art: "🐲",
    rarity: "divino",
    habitat: "mistico",
    description:
      "O Dragão dos Ciclos Infinitos. Diz-se que ele apenas se mostra a quem transformou estudo em ritual.",
  },
  {
    id: "luminara",
    name: "Luminara",
    art: "🕊️",
    rarity: "divino",
    habitat: "espaco",
    description:
      "Nascida da primeira página já escrita. Sua luz reordena o tempo em favor de quem aprende.",
  },
];

export const MONSTERS_BY_ID: Record<string, MonsterDef> = Object.fromEntries(
  MONSTERS.map((m) => [m.id, m]),
);

export const MONSTERS_BY_RARITY = MONSTERS.reduce<Record<string, MonsterDef[]>>((acc, m) => {
  (acc[m.rarity] ||= []).push(m);
  return acc;
}, {});
