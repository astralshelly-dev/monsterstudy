// ============================================================
// Monster Study — Motor de batalha por turnos (PvP assíncrono e IA)
// Puro: recebe um estado e devolve o próximo. Sem React, sem I/O.
// ============================================================
import { MONSTERS_BY_ID } from "../monsters";
import type { RarityId } from "../config";
import { abilityFor, battleStats, type Ability } from "./config";

export type AiBehavior = "ofensivo" | "defensivo" | "equilibrado";

export type Fighter = {
  key: string;
  monsterId: string;
  name: string;
  art: string;
  rarity: RarityId;
  level: number;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  ability: Ability;
  /** turnos restantes para a habilidade disparar */
  charge: number;
  atkBuff: number;
  defBuff: number;
  shield: number;
  burn: { turns: number; dmg: number } | null;
};

export type SideId = "player" | "foe";

export type Side = {
  name: string;
  fighters: Fighter[];
  active: number;
  behavior: AiBehavior;
};

export type BattleEvent = {
  id: string;
  kind: "attack" | "ability" | "damage" | "heal" | "buff" | "ko" | "switch" | "end";
  side: SideId;
  target?: SideId;
  text: string;
  damage?: number;
  heal?: number;
};

export type Battle = {
  mode: "ranked" | "training";
  player: Side;
  foe: Side;
  turn: SideId;
  turnNo: number;
  /** eventos do último turno resolvido */
  events: BattleEvent[];
  log: string[];
  over: boolean;
  winner: SideId | null;
  /** o jogador precisa escolher um substituto */
  awaitingSwitch: boolean;
};

let seq = 0;
const eid = () => `e${(seq += 1)}`;

export function makeFighter(monsterId: string, level: number, keySuffix = ""): Fighter | null {
  const def = MONSTERS_BY_ID[monsterId];
  if (!def) return null;
  const s = battleStats(def.rarity, level);
  return {
    key: `${monsterId}${keySuffix}`,
    monsterId,
    name: def.name,
    art: def.art,
    rarity: def.rarity,
    level,
    maxHp: s.maxHp,
    hp: s.maxHp,
    atk: s.atk,
    def: s.def,
    ability: abilityFor(monsterId),
    charge: abilityFor(monsterId).cooldown,
    atkBuff: 0,
    defBuff: 0,
    shield: 0,
    burn: null,
  };
}

export function createBattle(input: {
  mode: "ranked" | "training";
  playerName: string;
  playerTeam: { monsterId: string; level: number }[];
  foeName: string;
  foeTeam: { monsterId: string; level: number }[];
  foeBehavior?: AiBehavior;
}): Battle {
  const player: Side = {
    name: input.playerName,
    fighters: input.playerTeam
      .map((m, i) => makeFighter(m.monsterId, m.level, `-p${i}`))
      .filter((f): f is Fighter => !!f),
    active: 0,
    behavior: "equilibrado",
  };
  const foe: Side = {
    name: input.foeName,
    fighters: input.foeTeam
      .map((m, i) => makeFighter(m.monsterId, m.level, `-f${i}`))
      .filter((f): f is Fighter => !!f),
    active: 0,
    behavior: input.foeBehavior ?? "equilibrado",
  };
  return {
    mode: input.mode,
    player,
    foe,
    turn: "player",
    turnNo: 1,
    events: [],
    log: [],
    over: false,
    winner: null,
    awaitingSwitch: false,
  };
}

const clone = (b: Battle): Battle => JSON.parse(JSON.stringify(b)) as Battle;
const rand = (min: number, max: number) => min + Math.random() * (max - min);

function activeOf(b: Battle, side: SideId): Fighter {
  const s = side === "player" ? b.player : b.foe;
  return s.fighters[s.active]!;
}

function alive(side: Side): Fighter[] {
  return side.fighters.filter((f) => f.hp > 0);
}

function effAtk(f: Fighter, behavior: AiBehavior): number {
  const bias = behavior === "ofensivo" ? 1.12 : behavior === "defensivo" ? 0.92 : 1;
  return f.atk * (1 + f.atkBuff) * bias;
}

function effDef(f: Fighter, behavior: AiBehavior): number {
  const bias = behavior === "defensivo" ? 1.15 : behavior === "ofensivo" ? 0.92 : 1;
  return f.def * (1 + f.defBuff) * bias;
}

/** turno em que a batalha começa a escalar para nunca ficar infinita */
export const SUDDEN_DEATH_TURN = 40;
export const MAX_TURNS = 100;

let escalation = 1;

function rawDamage(atk: number, def: number, mult: number, ignoreDef = false): number {
  const mitig = ignoreDef ? 1 : 1 - def / (def + 60);
  return Math.max(1, Math.round(atk * mult * mitig * escalation * rand(0.92, 1.08)));
}

function hpShare(side: Side): number {
  const max = side.fighters.reduce((a, f) => a + f.maxHp, 0) || 1;
  return side.fighters.reduce((a, f) => a + f.hp, 0) / max;
}

function applyDamage(b: Battle, target: SideId, fighter: Fighter, amount: number): number {
  let dmg = amount;
  if (fighter.shield > 0) {
    const absorbed = Math.min(fighter.shield, dmg);
    fighter.shield -= absorbed;
    dmg -= absorbed;
    if (absorbed > 0) {
      b.events.push({
        id: eid(),
        kind: "buff",
        side: target,
        text: `🛡️ Escudo de ${fighter.name} absorveu ${absorbed}`,
      });
    }
  }
  fighter.hp = Math.max(0, fighter.hp - dmg);
  return dmg;
}

function useAbility(b: Battle, side: SideId, attacker: Fighter, defenderSide: Side, defSideId: SideId) {
  const a = attacker.ability;
  const mySide = side === "player" ? b.player : b.foe;
  const defender = defenderSide.fighters[defenderSide.active]!;
  b.events.push({
    id: eid(),
    kind: "ability",
    side,
    text: `${a.icon} ${attacker.name} usa ${a.name}!`,
  });
  const atk = effAtk(attacker, mySide.behavior);
  const dfn = effDef(defender, defenderSide.behavior);
  const e = a.effect;

  const hit = (mult: number, ignoreDef = false) => {
    const dealt = applyDamage(b, defSideId, defender, rawDamage(atk, dfn, mult, ignoreDef));
    b.events.push({
      id: eid(),
      kind: "damage",
      side,
      target: defSideId,
      text: `${defender.name} sofre ${dealt} de dano`,
      damage: dealt,
    });
    return dealt;
  };

  switch (e.type) {
    case "damage":
      hit(e.mult, e.ignoreDef);
      break;
    case "damage_hits":
      for (let i = 0; i < e.hits; i += 1) if (defender.hp > 0) hit(e.mult);
      break;
    case "execute": {
      const wounded = defender.hp / defender.maxHp <= e.threshold;
      hit(e.mult + (wounded ? e.bonusMult : 0));
      break;
    }
    case "drain": {
      const dealt = hit(e.mult);
      const heal = Math.round(dealt * e.healPct);
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
      b.events.push({ id: eid(), kind: "heal", side, text: `${attacker.name} recupera ${heal}`, heal });
      break;
    }
    case "burn": {
      hit(e.mult);
      defender.burn = { turns: e.turns, dmg: Math.max(1, Math.round(atk * e.dotPct)) };
      b.events.push({ id: eid(), kind: "buff", side, text: `${defender.name} está queimando` });
      break;
    }
    case "splash": {
      hit(e.mult);
      for (const f of defenderSide.fighters) {
        if (f === defender || f.hp <= 0) continue;
        const dealt = applyDamage(b, defSideId, f, Math.max(1, Math.round(rawDamage(atk, f.def, e.mult) * e.benchPct)));
        b.events.push({
          id: eid(),
          kind: "damage",
          side,
          target: defSideId,
          text: `${f.name} (reserva) sofre ${dealt}`,
          damage: dealt,
        });
      }
      break;
    }
    case "team_heal": {
      for (const f of mySide.fighters) {
        if (f.hp <= 0) continue;
        const heal = Math.round(f.maxHp * e.pct);
        f.hp = Math.min(f.maxHp, f.hp + heal);
      }
      b.events.push({
        id: eid(),
        kind: "heal",
        side,
        text: `A equipe de ${mySide.name} recupera vida`,
        heal: Math.round(attacker.maxHp * e.pct),
      });
      break;
    }
    case "rage":
      attacker.atkBuff += e.atkPct;
      b.events.push({ id: eid(), kind: "buff", side, text: `${attacker.name} está enfurecido (+ataque)` });
      break;
    case "weaken":
      defender.atkBuff = Math.max(-0.7, defender.atkBuff - e.atkPct);
      b.events.push({ id: eid(), kind: "buff", side, text: `${defender.name} teve o ataque reduzido` });
      break;
    case "shield":
      attacker.shield += Math.round(attacker.maxHp * e.pct);
      b.events.push({ id: eid(), kind: "buff", side, text: `${attacker.name} ergue um escudo` });
      break;
    case "fortify": {
      attacker.defBuff += e.defPct;
      const heal = Math.round(attacker.maxHp * e.healPct);
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
      b.events.push({ id: eid(), kind: "buff", side, text: `${attacker.name} se fortifica (+defesa)`, heal });
      break;
    }
  }
  attacker.charge = a.cooldown;
}

function basicAttack(
  b: Battle,
  side: SideId,
  attacker: Fighter,
  defenderSide: Side,
  defSideId: SideId,
  mult = 1,
) {
  const mySide = side === "player" ? b.player : b.foe;
  const defender = defenderSide.fighters[defenderSide.active]!;
  const dealt = applyDamage(
    b,
    defSideId,
    defender,
    rawDamage(effAtk(attacker, mySide.behavior), effDef(defender, defenderSide.behavior), mult),
  );
  b.events.push({ id: eid(), kind: "attack", side, text: `${attacker.name} atacou!` });
  b.events.push({
    id: eid(),
    kind: "damage",
    side,
    target: defSideId,
    text: `${defender.name} sofre ${dealt} de dano`,
    damage: dealt,
  });
}

/** escolha do próximo monstro da IA (estratégica/aleatória conforme comportamento) */
export function pickAiSwitch(side: Side): number {
  const options = side.fighters.map((f, i) => ({ f, i })).filter((x) => x.f.hp > 0);
  if (options.length === 0) return side.active;
  if (side.behavior === "equilibrado" && Math.random() < 0.35) {
    return options[Math.floor(Math.random() * options.length)]!.i;
  }
  const score = (f: Fighter) =>
    side.behavior === "defensivo" ? f.hp + f.def * 8 : f.atk * 8 + f.hp * 0.6;
  return options.sort((a, z) => score(z.f) - score(a.f))[0]!.i;
}

function tickBurn(b: Battle, side: SideId) {
  const f = activeOf(b, side);
  if (!f.burn || f.hp <= 0) return;
  const dealt = Math.min(f.hp, f.burn.dmg);
  f.hp -= dealt;
  f.burn.turns -= 1;
  if (f.burn.turns <= 0) f.burn = null;
  b.events.push({
    id: eid(),
    kind: "damage",
    side: side === "player" ? "foe" : "player",
    target: side,
    text: `🔥 ${f.name} sofre ${dealt} de queimadura`,
    damage: dealt,
  });
}

function finishTurn(b: Battle, actor: SideId) {
  const foeSideId: SideId = actor === "player" ? "foe" : "player";
  const defSide = actor === "player" ? b.foe : b.player;
  const defender = defSide.fighters[defSide.active]!;

  if (defender.hp <= 0) {
    b.events.push({ id: eid(), kind: "ko", side: foeSideId, text: `${defender.name} foi derrotado!` });
    if (alive(defSide).length === 0) {
      b.over = true;
      b.winner = actor;
      b.events.push({
        id: eid(),
        kind: "end",
        side: actor,
        text: actor === "player" ? "Você venceu a batalha!" : "Você foi derrotado.",
      });
    } else if (foeSideId === "player") {
      b.awaitingSwitch = true;
    } else {
      defSide.active = pickAiSwitch(defSide);
      b.events.push({
        id: eid(),
        kind: "switch",
        side: foeSideId,
        text: `${defSide.name} envia ${defSide.fighters[defSide.active]!.name}`,
      });
    }
  }

  if (!b.over && !b.awaitingSwitch) {
    b.turn = foeSideId;
    b.turnNo += 1;
  } else if (!b.over && b.awaitingSwitch) {
    b.turn = "player";
  }
  b.log = [...b.log, ...b.events.map((e) => e.text)].slice(-60);
}

/** resolve o turno de quem está na vez (habilidade dispara sozinha quando pronta) */
export function takeTurn(prev: Battle): Battle {
  if (prev.over || prev.awaitingSwitch) return prev;
  const b = clone(prev);
  b.events = [];
  escalation = b.turnNo > SUDDEN_DEATH_TURN ? 1 + (b.turnNo - SUDDEN_DEATH_TURN) * 0.06 : 1;
  const actor = b.turn;
  const attacker = activeOf(b, actor);
  const defSide = actor === "player" ? b.foe : b.player;
  const defSideId: SideId = actor === "player" ? "foe" : "player";

  attacker.charge = Math.max(0, attacker.charge - 1);
  if (attacker.charge === 0) useAbility(b, actor, attacker, defSide, defSideId);
  else basicAttack(b, actor, attacker, defSide, defSideId);

  if (defSide.fighters[defSide.active]!.hp > 0) tickBurn(b, defSideId);
  finishTurn(b, actor);
  if (!b.over && b.turnNo >= MAX_TURNS) {
    const winner: SideId = hpShare(b.player) >= hpShare(b.foe) ? "player" : "foe";
    b.over = true;
    b.winner = winner;
    b.awaitingSwitch = false;
    b.events.push({
      id: eid(),
      kind: "end",
      side: winner,
      text:
        winner === "player"
          ? "Tempo esgotado: você venceu com mais vida restante!"
          : "Tempo esgotado: o adversário terminou com mais vida.",
    });
    b.log = [...b.log, b.events[b.events.length - 1]!.text].slice(-60);
  }
  return b;
}

/** o jogador escolhe o substituto após um nocaute */
export function switchPlayerFighter(prev: Battle, index: number): Battle {
  const b = clone(prev);
  const f = b.player.fighters[index];
  if (!f || f.hp <= 0) return prev;
  b.player.active = index;
  b.awaitingSwitch = false;
  b.events = [{ id: eid(), kind: "switch", side: "player", text: `Você envia ${f.name}` }];
  b.log = [...b.log, `Você envia ${f.name}`].slice(-60);
  // trocar não consome o turno (a IA também troca de graça)
  b.turn = "player";
  return b;
}
