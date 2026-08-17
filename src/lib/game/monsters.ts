import type { HabitatId, RarityId } from "./config";
import { MONSTER_ART } from "./monster-art";

export type MonsterDef = {
  id: string;
  name: string;
  /** arte do monstro — URL da ilustração (CDN) */
  art: string;
  rarity: RarityId;
  habitat: HabitatId;
  description: string;
};

type MonsterSeed = Omit<MonsterDef, "art">;

const SEEDS: MonsterSeed[] = [
  // ---------- Comum ----------
  {
    id: "mosslet",
    name: "Mosslet",
    rarity: "comum",
    habitat: "floresta",
    description: "Um filhote de musgo que dorme entre raízes e desperta com o som de páginas virando.",
  },
  {
    id: "pebbly",
    name: "Pebbly",
    rarity: "comum",
    habitat: "deserto",
    description: "Feito de cascalho quente. Rola em círculos enquanto você se concentra.",
  },
  {
    id: "drippet",
    name: "Drippet",
    rarity: "comum",
    habitat: "oceano",
    description: "Uma gota viva e curiosa. Adora escorrer pelas margens dos cadernos.",
  },
  {
    id: "sparkid",
    name: "Sparkid",
    rarity: "comum",
    habitat: "vulcao",
    description: "Faísca teimosa que insiste em não apagar antes do fim do cronômetro.",
  },
  {
    id: "frostnib",
    name: "Frostnib",
    rarity: "comum",
    habitat: "tundra",
    description: "Pequeno cristal de gelo que refresca a mente durante longas revisões.",
  },
  {
    id: "vinelet",
    name: "Vinelet",
    rarity: "comum",
    habitat: "selva",
    description: "Cipó recém-nascido. Cresce um centímetro por sessão concluída.",
  },
  {
    id: "twiglin",
    name: "Twiglin",
    rarity: "comum",
    habitat: "floresta",
    description: "Feito de galhos secos e teimosia. Coleciona folhas de cada capítulo lido.",
  },
  {
    id: "sandpip",
    name: "Sandpip",
    rarity: "comum",
    habitat: "deserto",
    description: "Filhote de pena dourada que pia sempre que o cronômetro chega ao fim.",
  },

  // ---------- Incomum ----------
  {
    id: "thornhop",
    name: "Thornhop",
    rarity: "incomum",
    habitat: "floresta",
    description: "Salta entre espinhos sem se ferir. Símbolo de disciplina ágil.",
  },
  {
    id: "tidewhisk",
    name: "Tidewhisk",
    rarity: "incomum",
    habitat: "oceano",
    description: "Nada em correntes de tinta e devolve ideias esquecidas à superfície.",
  },
  {
    id: "cindertail",
    name: "Cindertail",
    rarity: "incomum",
    habitat: "vulcao",
    description: "Sua cauda brasa marca no chão o quanto você já estudou hoje.",
  },
  {
    id: "glaciva",
    name: "Glaciva",
    rarity: "incomum",
    habitat: "tundra",
    description: "Guardiã paciente das planícies brancas. Nunca apressa uma leitura.",
  },
  {
    id: "dunecoil",
    name: "Dunecoil",
    rarity: "incomum",
    habitat: "deserto",
    description: "Enrola-se em espirais que lembram fórmulas antigas.",
  },
  {
    id: "lumibug",
    name: "Lumibug",
    rarity: "incomum",
    habitat: "selva",
    description: "Ilumina apenas o parágrafo que você precisa reler.",
  },
  {
    id: "mistmote",
    name: "Mistmote",
    rarity: "incomum",
    habitat: "mistico",
    description: "Névoa curiosa que se condensa sobre anotações inacabadas.",
  },
  {
    id: "glowfin",
    name: "Glowfin",
    rarity: "incomum",
    habitat: "oceano",
    description: "Acende sua lanterna natural nas madrugadas mais escuras de estudo.",
  },

  // ---------- Raro ----------
  {
    id: "ashmole",
    name: "Ashmole",
    rarity: "raro",
    habitat: "vulcao",
    description: "Escava túneis de cinza guardando tudo o que você não quer esquecer.",
  },
  {
    id: "emberfang",
    name: "Emberfang",
    rarity: "raro",
    habitat: "vulcao",
    description: "Dragonete de presas incandescentes. Ruge quando um capítulo termina.",
  },
  {
    id: "moonfang",
    name: "Moonfang",
    rarity: "raro",
    habitat: "tundra",
    description: "Lobo de pelo prateado que caça sob o luar das madrugadas de estudo.",
  },
  {
    id: "abyssquill",
    name: "Abyssquill",
    rarity: "raro",
    habitat: "oceano",
    description: "Escreve com tinta abissal aquilo que você jurou não esquecer.",
  },
  {
    id: "barkgolem",
    name: "Barkgolem",
    rarity: "raro",
    habitat: "floresta",
    description: "Guardião de casca antiga. Um anel novo por cada cem páginas lidas.",
  },
  {
    id: "mirasand",
    name: "Mirasand",
    rarity: "raro",
    habitat: "deserto",
    description: "Miragem viva que só aparece para quem estuda em silêncio absoluto.",
  },
  {
    id: "petalynx",
    name: "Petalynx",
    rarity: "raro",
    habitat: "selva",
    description: "Felino coberto de pétalas. Passos completamente inaudíveis.",
  },
  {
    id: "quartzox",
    name: "Quartzox",
    rarity: "raro",
    habitat: "tundra",
    description: "Raposa de quartzo que reflete cada revisão bem feita.",
  },
  {
    id: "bloomserp",
    name: "Bloomserp",
    rarity: "raro",
    habitat: "selva",
    description: "Serpente florida que desabrocha a cada meta cumprida.",
  },
  {
    id: "starkit",
    name: "Starkit",
    rarity: "raro",
    habitat: "espaco",
    description: "Gatinho estelar que ronrona em frequências de constelação.",
  },

  // ---------- Super Raro ----------
  {
    id: "stormhorn",
    name: "Stormhorn",
    rarity: "super_raro",
    habitat: "tundra",
    description: "Seu chifre acumula trovões — e libera um por maratona concluída.",
  },
  {
    id: "voidbloom",
    name: "Voidbloom",
    rarity: "super_raro",
    habitat: "mistico",
    description: "Flor que só abre em dimensões onde o tempo é bem aproveitado.",
  },
  {
    id: "kraveel",
    name: "Kraveel",
    rarity: "super_raro",
    habitat: "oceano",
    description: "Oito braços, oito livros, uma leitura simultânea impossível.",
  },
  {
    id: "magmaw",
    name: "Magmaw",
    rarity: "super_raro",
    habitat: "vulcao",
    description: "Devora rochas derretidas com o mesmo apetite com que você devora capítulos.",
  },
  {
    id: "thornmaw",
    name: "Thornmaw",
    rarity: "super_raro",
    habitat: "selva",
    description: "Guardião carnívoro das estufas proibidas. Devora distrações.",
  },
  {
    id: "voltyx",
    name: "Voltyx",
    rarity: "super_raro",
    habitat: "espaco",
    description: "Lince elétrico que atravessa ideias na velocidade de um relâmpago.",
  },

  // ---------- Épico ----------
  {
    id: "aurelith",
    name: "Aurelith",
    rarity: "epico",
    habitat: "espaco",
    description: "Ave de asas de aurora que sobrevoa constelações de conhecimento.",
  },
  {
    id: "cryotaur",
    name: "Cryotaur",
    rarity: "epico",
    habitat: "tundra",
    description: "Colosso de gelo eterno. Cada passo congela distrações.",
  },
  {
    id: "sylvaqueen",
    name: "Sylvaqueen",
    rarity: "epico",
    habitat: "selva",
    description: "Rainha das folhas suspensas. Suas asas escrevem em pólen dourado.",
  },
  {
    id: "obsidrake",
    name: "Obsidrake",
    rarity: "epico",
    habitat: "vulcao",
    description: "Escamas de obsidiana polida refletem tudo o que você aprendeu.",
  },
  {
    id: "tempestrix",
    name: "Tempestrix",
    rarity: "epico",
    habitat: "oceano",
    description: "Cavalga tempestades e transforma ondas em parágrafos memorizados.",
  },
  {
    id: "dunephar",
    name: "Dunephar",
    rarity: "epico",
    habitat: "deserto",
    description: "Esfinge de areia que só responde perguntas de quem estudou o bastante.",
  },

  // ---------- Lendário ----------
  {
    id: "solmyrr",
    name: "Solmyrr",
    rarity: "lendario",
    habitat: "deserto",
    description: "Leão solar cuja juba é feita de horas de dedicação acumuladas.",
  },
  {
    id: "nebulith",
    name: "Nebulith",
    rarity: "lendario",
    habitat: "espaco",
    description: "Baleia cósmica que navega nebulosas guardando memórias inteiras.",
  },
  {
    id: "thundrix",
    name: "Thundrix",
    rarity: "lendario",
    habitat: "tundra",
    description: "Galhadas de relâmpago congelado. Aparece uma vez por estação de estudos.",
  },
  {
    id: "seraphae",
    name: "Seraphae",
    rarity: "lendario",
    habitat: "mistico",
    description: "Cervo alado de luz serena. Abençoa quem estuda sem pressa.",
  },

  // ---------- Mítico ----------
  {
    id: "eclipsaur",
    name: "Eclipsaur",
    rarity: "mitico",
    habitat: "espaco",
    description: "Ancião que existe entre dois eclipses. Fala apenas em equações.",
  },
  {
    id: "arcanyx",
    name: "Arcanyx",
    rarity: "mitico",
    habitat: "mistico",
    description: "Cada pena guarda um feitiço que só a concentração absoluta revela.",
  },
  {
    id: "abyssaria",
    name: "Abyssaria",
    rarity: "mitico",
    habitat: "oceano",
    description: "Canta no fundo do mundo. Quem a ouve nunca mais perde o foco.",
  },
  {
    id: "umbraleth",
    name: "Umbraleth",
    rarity: "mitico",
    habitat: "tundra",
    description: "Pantera de sombras congeladas que caça pensamentos dispersos.",
  },

  // ---------- Divino ----------
  {
    id: "astraeon",
    name: "Astraeon",
    rarity: "divino",
    habitat: "mistico",
    description:
      "O Dragão dos Ciclos Infinitos. Diz-se que ele apenas se mostra a quem transformou estudo em ritual.",
  },
  {
    id: "luminara",
    name: "Luminara",
    rarity: "divino",
    habitat: "espaco",
    description:
      "Nascida da primeira página já escrita. Sua luz reordena o tempo em favor de quem aprende.",
  },

  // ---------- Expansão elemental: Terra, Metal, Vento e Veneno ----------
  {
    id: "cragling",
    name: "Cragling",
    rarity: "comum",
    habitat: "deserto",
    description: "Um bebê de rocha rachada. Empilha pedrinhas a cada matéria que você conclui.",
  },
  {
    id: "toxlet",
    name: "Toxlet",
    rarity: "comum",
    habitat: "selva",
    description: "Girino roxo de baba ácida. Inofensivo, desde que você não pare de estudar.",
  },
  {
    id: "ferrik",
    name: "Ferrik",
    rarity: "comum",
    habitat: "mistico",
    description: "Bonequinho de ferro fundido em uma forja de biblioteca. Range ao anotar.",
  },
  {
    id: "zephyx",
    name: "Zephyx",
    rarity: "incomum",
    habitat: "espaco",
    description: "Redemoinho travesso que vira as páginas antes de você terminar de ler.",
  },
  {
    id: "gustwing",
    name: "Gustwing",
    rarity: "raro",
    habitat: "selva",
    description: "Falcão de vento cortante. Aparece quando o foco fica leve e constante.",
  },
  {
    id: "terrabor",
    name: "Terrabor",
    rarity: "raro",
    habitat: "floresta",
    description: "Tatu de granito que cava túneis entre raízes e enterra distrações.",
  },
  {
    id: "venomyra",
    name: "Venomyra",
    rarity: "super_raro",
    habitat: "selva",
    description: "Serpente-orquídea de presas translúcidas. Seu veneno dissolve a preguiça.",
  },
  {
    id: "chromaw",
    name: "Chromaw",
    rarity: "super_raro",
    habitat: "espaco",
    description: "Felino de placas cromadas. Reflete a própria luz das estrelas que caça.",
  },
  {
    id: "gaiaruk",
    name: "Gaiaruk",
    rarity: "epico",
    habitat: "floresta",
    description: "Colosso de terra viva com um jardim inteiro nas costas. Anda no ritmo das estações.",
  },
  {
    id: "aeromyr",
    name: "Aeromyr",
    rarity: "epico",
    habitat: "espaco",
    description: "Guardiã dos ventos altos. Suas asas desenham correntes que carregam ideias.",
  },
  {
    id: "titanox",
    name: "Titanox",
    rarity: "lendario",
    habitat: "mistico",
    description: "Touro de aço antigo forjado nas fundações do mundo. Cada passo soa como um sino.",
  },
  {
    id: "malachor",
    name: "Malachor",
    rarity: "mitico",
    habitat: "mistico",
    description: "O Alquimista Corrompido. Transforma o próprio veneno em conhecimento proibido.",
  },

  // ---------- Secreto (oculto até ser desbloqueado) ----------
  {
    id: "aetheryon",
    name: "Aetheryon",
    rarity: "secreto",
    habitat: "mistico",
    description:
      "O Serafim Prismático do Fim das Eras. Não existe registro dele em nenhum bestiário — apenas rumores de que aparece a quem atravessa cinco horas inteiras de foco absoluto.",
  },
];

export const MONSTERS: MonsterDef[] = SEEDS.map((m) => ({
  ...m,
  art: MONSTER_ART[m.id] ?? "",
}));

export const MONSTERS_BY_ID: Record<string, MonsterDef> = Object.fromEntries(
  MONSTERS.map((m) => [m.id, m]),
);

export const MONSTERS_BY_RARITY = MONSTERS.reduce<Record<string, MonsterDef[]>>((acc, m) => {
  (acc[m.rarity] ||= []).push(m);
  return acc;
}, {});
