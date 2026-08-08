import type { RarityId, ShelfId, UpgradeId } from "./config";

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
  monsterId: string;
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
  bookId: string;
  startPage: number;
  endPage: number;
  pagesRead: number;
  pagesPerMin: number;
  notes?: string | undefined;
  reward?: Reward | undefined;
};

export type FreeSession = {
  id: string;
  kind: "free";
  startedAt: string;
  endedAt: string;
  durationSec: number;
  subject?: string | undefined;
  notes?: string | undefined;
  monsterId?: string | undefined;
  monsterXp: number;
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
  };

};

export type GameState = {
  version: number;
  profile: {
    name: string;
    avatar: string;
    createdAt: string;
    xp: number;
    level: number;
  };
  money: number;
  shards: number;
  lastSeen: number;
  monsters: Record<string, OwnedMonster>;
  activeMonsterId: string | null;
  books: Book[];
  sessions: Session[];
  upgrades: Record<UpgradeId, number>;
  unlockedTimers: number[];
  achievements: Record<string, string>;
  streak: { current: number; best: number; lastDay: string | null; claimed: number[] };
  activity: Record<string, { studySec: number; readSec: number; pages: number; sessions: number }>;
  settings: {
    sounds: boolean;
    animations: boolean;
    notifications: boolean;
    compact: boolean;
  };
  timer: ActiveTimer | null;
  /** recompensa pendente aguardando revelação */
  pendingReward: Reward | null;
};
