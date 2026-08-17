import type { RarityId, ShelfId, UpgradeId } from "./config";
import type { DailyQuests } from "./quests";
import type { SeasonRecord } from "./seasons";

export type OwnedMonster = {
  id: string;
  copies: number;
  level: number;
  xp: number;
  discoveredAt: string;
};

export type Book = {
  id: string;
  title: string;
  subtitle?: string | undefined;
  author: string;
  totalPages: number;
  currentPage: number;
  synopsis: string;
  genre: string;
  cover?: string | undefined;
  shelf: ShelfId;
  addedAt: string;
  finishedAt?: string | undefined;
};


export type Reward = {
  /** null quando a sessão foi encerrada cedo demais para gerar monstro */
  monsterId: string | null;
  rarity: RarityId;
  duplicate: boolean;
  xp: number;
  money: number;
  shards: number;
};

export type StudySession = {
  id: string;
  kind: "study";
  startedAt: string;
  endedAt: string;
  durationSec: number;
  plannedSec: number;
  earlyEnd: boolean;
  /** quantos cronômetros foram emendados nesta sessão */
  segments?: number | undefined;
  subject: string;
  topic?: string | undefined;
  goal?: string | undefined;
  bookId?: string | undefined;
  learned?: string | undefined;
  notes?: string | undefined;
  reward?: Reward | undefined;
};

export type ReadingSession = {
  id: string;
  kind: "read";
  startedAt: string;
  endedAt: string;
  durationSec: number;
  plannedSec: number;
  earlyEnd: boolean;
  /** quantos cronômetros foram emendados nesta sessão */
  segments?: number | undefined;
  bookId: string;
  startPage: number;
  endPage: number;
  pagesRead: number;
  /** minutos gastos por página */
  minPerPage: number;
  notes?: string | undefined;
  reward?: Reward | undefined;
};


export type FreeSession = {
  id: string;
  kind: "free";
  /** treino livre de estudo ou de leitura */
  mode: "study" | "read";
  startedAt: string;
  endedAt: string;
  durationSec: number;
  subject?: string | undefined;
  notes?: string | undefined;
  bookId?: string | undefined;
  startPage?: number | undefined;
  endPage?: number | undefined;
  pagesRead?: number | undefined;
  monsterId?: string | undefined;
  monsterXp: number;
  /** XP extra ganho por atingir metas de tempo */
  milestoneXp?: number | undefined;
};


export type Session = StudySession | ReadingSession | FreeSession;

export type ActiveTimer = {
  kind: "study" | "read" | "free";
  startedAt: number;
  /** null = livre (contagem crescente) */
  durationSec: number | null;
  pausedAt: number | null;
  pausedMs: number;
  meta: {
    subject?: string | undefined;
    topic?: string | undefined;
    goal?: string | undefined;
    bookId?: string | undefined;
    startPage?: number | undefined;
    earlyEnd?: boolean | undefined;
    /** fração do tempo planejado cumprida ao encerrar antes do fim (0-1) */
    completion?: number | undefined;
    /** id da sessão que este cronômetro continua (sessões emendadas) */
    continueSessionId?: string | undefined;
  };
};

export type BattleTeam = { monsterId: string; level: number };

export type BattleRecord = {
  id: string;
  at: string;
  mode: "ranked" | "training";
  result: "win" | "loss";
  opponentName: string;
  opponentId?: string | null | undefined;
  opponentSource: "player" | "bot";
  trophiesDelta: number;
  trophiesBefore: number;
  trophiesAfter: number;
  league: string;
  turns: number;
  team: string[];
  opponentTeam: string[];
  /** derrota automática por abandono (saiu da batalha ou do app) */
  forfeit?: boolean | undefined;
};

/**
 * Batalha ranqueada em andamento. Assim que o oponente é encontrado ela fica
 * registrada aqui: se o jogador sair da batalha, fechar ou atualizar o app,
 * a partida é resolvida como derrota na próxima vez que abrir as Batalhas.
 */
export type PendingBattle = {
  startedAt: number;
  opponentName: string;
  opponentId?: string | null | undefined;
  opponentSource: "player" | "bot";
  team: string[];
  opponentTeam: string[];
};

export type BattleData = {
  trophies: number;
  bestTrophies: number;
  wins: number;
  losses: number;
  /** equipe salva do jogador (ids de monstros) */
  team: string[];
  history: BattleRecord[];
  /** batalha ranqueada em andamento (abandono = derrota) */
  pending?: PendingBattle | null | undefined;
};


export type GameState = {
  version: number;
  /** instante da última alteração local persistível, usado para reconciliar com a nuvem */
  lastModifiedAt?: number | undefined;
  profile: {
    name: string;
    avatar: string;
    /** monstro usado como foto de perfil (tem prioridade sobre avatar) */
    avatarMonsterId?: string | null | undefined;
    /** id público para busca de perfil por outros jogadores */
    publicId?: string | undefined;
    createdAt: string;
    xp: number;
    level: number;
  };
  money: number;
  shards: number;
  lastSeen: number;
  monsters: Record<string, OwnedMonster>;

  activeMonsterId: string | null;
  /** monstros escolhidos para gerar renda passiva (limitado pelos slots) */
  incomeMonsterIds: string[];
  books: Book[];
  sessions: Session[];
  upgrades: Record<UpgradeId, number>;
  unlockedTimers: number[];
  achievements: Record<string, string>;
  streak: { current: number; best: number; lastDay: string | null; claimed: number[] };
  activity: Record<string, DayActivity>;
  /** troféus registrados no fim de cada dia (para comparar períodos) */
  trophyLog?: Record<string, number> | undefined;
  settings: {
    sounds: boolean;
    animations: boolean;
    notifications: boolean;
    compact: boolean;
  };
  timer: ActiveTimer | null;
  /** recompensa pendente aguardando revelação */
  pendingReward: Reward | null;
  /** códigos promocionais já resgatados */
  redeemedCodes: string[];
  /** progresso do sistema de batalhas */
  battle: BattleData;
  /** última sessão salva (base para "continuar sessão") */
  lastSessionId?: string | null | undefined;

  // ---------- expansão ----------
  /** XP e tempo por matéria (chave normalizada) */
  subjects: Record<string, SubjectStat>;
  /** itens possuídos: id do item -> quantidade */
  inventory: Record<string, number>;
  /** segundos de estudo/leitura acumulados para a próxima chance de item */
  itemProgressSec: number;
  /** itens encontrados (histórico curto) */
  itemLog: Array<{ itemId: string; at: string }>;
  /** missões diárias do dia atual */
  quests: DailyQuests;
  /** progresso competitivo por temporada */
  seasons: SeasonState;
  /** cosméticos desbloqueados e selecionados */
  cosmetics: CosmeticState;
};

/** resumo de um dia — base das comparações por período */
export type DayActivity = {
  studySec: number;
  readSec: number;
  pages: number;
  sessions: number;
  /** XP de jogador ganho no dia */
  xp?: number | undefined;
  /** monstros capturados no dia */
  monsters?: number | undefined;
  /** missões diárias concluídas (coletadas) no dia */
  quests?: number | undefined;
  wins?: number | undefined;
  losses?: number | undefined;
};

export type SubjectStat = {
  name: string;
  xp: number;
  totalSec: number;
};

export type SeasonState = {
  /** número da temporada em que este save está */
  current: number;
  /** melhor liga/troféus alcançados na temporada atual */
  maxTrophies: number;
  wins: number;
  losses: number;
  history: SeasonRecord[];
};

export type CosmeticState = {
  owned: string[];
  frame: string | null;
  title: string | null;
  background: string | null;
  badge: string | null;
  effect: string | null;
};


