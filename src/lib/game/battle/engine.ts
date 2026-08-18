// ============================================================
// Monster Study — Motor de batalha por turnos (PvP assíncrono e IA)
// Puro: recebe um estado e devolve o próximo. Sem React, sem I/O.
// ============================================================
import { MONSTERS_BY_ID } from "../monsters";
import type { RarityId } from "../config";
import { abilityFor, abilityScale, battleStats, type Ability } from "./config";
import { elementIdsOf, elementOf, typeEffectMulti, type ElementId } from "../elements";
import { beamBonusOf, resolveBeam, type BeamDef } from "./beams";
import { roleIdOf, type RoleId } from "./roles";


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
  spd: number;
  ability: Ability;
  /** tipo elemental principal */
  element: ElementId;
  /** todos os tipos do monstro (1 ou 2) — tipo duplo soma vantagens e fraquezas */
  elements: ElementId[];
  /** turnos restantes para a habilidade disparar */
  charge: number;
  /** quantas vezes a habilidade já foi usada (Equinoxis: 1ª recarga = 3) */
  abilityUses: number;
  atkBuff: number;
  defBuff: number;
  shield: number;
  /** turnos de proteção por troca: recebe 30% menos dano na rodada em que entrou */
  guard: number;
  burn: { turns: number; dmg: number } | null;
  /** veneno: dano contínuo que ignora escudos */
  poison: { turns: number; dmg: number } | null;
  /** modificador de velocidade (haste / ferrugem) */
  spdBuff: number;
  /** eco temporal: repete parte do dano nos próximos turnos do usuário */
  echo: { turns: number; dmg: number } | null;
  /** marcado pelo veredito (permanente): dano ampliado + dreno para quem o ferir */
  mark: { pct: number; lifestealPct: number; abilityLifestealPct: number } | null;


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
  /** vantagem de tipo aplicada neste evento */
  effect?: "super" | "weak" | "normal";
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
  const s = battleStats(def.rarity, level, monsterId);
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
    spd: s.spd,
    ability: abilityFor(monsterId),
    element: elementOf(monsterId).id,
    elements: elementIdsOf(monsterId),
    charge: abilityFor(monsterId).cooldown,
    abilityUses: 0,
    atkBuff: 0,
    defBuff: 0,
    shield: 0,
    guard: 0,
    burn: null,
    poison: null,
    spdBuff: 0,
    echo: null,
    mark: null,
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
    turn: firstMover(player, foe),
    turnNo: 1,
    events: [],
    log: [],
    over: false,
    winner: null,
    awaitingSwitch: false,
  };
}

/** velocidade efetiva: comportamento da IA muda um pouco a iniciativa */
export function effSpd(f: Fighter, behavior: AiBehavior): number {
  const bias = behavior === "ofensivo" ? 1.06 : behavior === "defensivo" ? 0.96 : 1;
  return f.spd * (1 + (f.spdBuff ?? 0)) * bias;
}

/** quem age primeiro: o monstro em campo com mais velocidade (empate = sorteio) */
function firstMover(player: Side, foe: Side): SideId {
  const p = player.fighters[player.active];
  const f = foe.fighters[foe.active];
  if (!p) return "foe";
  if (!f) return "player";
  const ps = effSpd(p, player.behavior);
  const fs = effSpd(f, foe.behavior);
  if (ps === fs) return Math.random() < 0.5 ? "player" : "foe";
  return ps > fs ? "player" : "foe";
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

/** vantagem elemental entre dois lutadores */
export function matchupOf(attacker: Fighter, defender: Fighter) {
  return typeEffectMulti(
    attacker.elements ?? [attacker.element],
    defender.elements ?? [defender.element],
  );
}

/** anuncia SUPER EFETIVO / POUCO EFETIVO */
function pushMatchupEvent(b: Battle, side: SideId, attacker: Fighter, defender: Fighter) {
  const eff = matchupOf(attacker, defender);
  if (!eff.label) return eff;
  b.events.push({
    id: eid(),
    kind: "buff",
    side,
    text: eff.kind === "super" ? `⚡ ${eff.label}` : `🪶 ${eff.label}`,
    effect: eff.kind,
  });
  return eff;
}

function rawDamage(atk: number, def: number, mult: number, ignoreDef = false): number {
  const mitig = ignoreDef ? 1 : 1 - def / (def + 60);
  return Math.max(1, Math.round(atk * mult * mitig * escalation * rand(0.92, 1.08)));
}

function hpShare(side: Side): number {
  const max = side.fighters.reduce((a, f) => a + f.maxHp, 0) || 1;
  return side.fighters.reduce((a, f) => a + f.hp, 0) / max;
}

function applyDamage(
  b: Battle,
  target: SideId,
  fighter: Fighter,
  amount: number,
  src?: { attacker?: Fighter; viaAbility?: boolean },
): number {
  let dmg = amount;
  const marked = !!fighter.mark;
  if (fighter.mark) {
    const extra = Math.max(1, Math.round(dmg * fighter.mark.pct));
    dmg += extra;
    b.events.push({
      id: eid(),
      kind: "buff",
      side: target === "player" ? "foe" : "player",
      text: `⚖️ ${fighter.name} está marcado e sofre +${extra} de dano`,
    });
  }
  if (fighter.guard > 0) {
    const reduced = dmg - Math.max(1, Math.round(dmg * 0.7));
    dmg -= reduced;
    if (reduced > 0) {
      b.events.push({
        id: eid(),
        kind: "buff",
        side: target,
        text: `🌀 ${fighter.name} entrou protegido e evitou ${reduced} de dano`,
      });
    }
  }
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

  // a marca do veredito alimenta quem ferir o alvo marcado
  const healer = src?.attacker;
  if (marked && fighter.mark && healer && healer.hp > 0 && dmg > 0) {
    const pct = src?.viaAbility ? fighter.mark.abilityLifestealPct : fighter.mark.lifestealPct;
    const heal = Math.max(1, Math.round(dmg * pct));
    healer.hp = Math.min(healer.maxHp, healer.hp + heal);
    b.events.push({
      id: eid(),
      kind: "heal",
      side: target === "player" ? "foe" : "player",
      text: `⚖️ ${healer.name} drena ${heal} de vida do marcado`,
      heal,
    });
  }
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
  /** o nível do monstro amplifica todo o efeito da habilidade */
  const k = abilityScale(attacker.level);

  const hit = (mult: number, ignoreDef = false) => {
    const eff = pushMatchupEvent(b, side, attacker, defender);
    const dealt = applyDamage(
      b,
      defSideId,
      defender,
      rawDamage(atk, dfn, mult * k * eff.mult, ignoreDef),
      { attacker, viaAbility: true },
    );

    b.events.push({
      id: eid(),
      kind: "damage",
      side,
      target: defSideId,
      text: `${defender.name} sofre ${dealt} de dano`,
      damage: dealt,
      effect: eff.kind,
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
      const heal = Math.round(dealt * e.healPct * k);
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
      b.events.push({ id: eid(), kind: "heal", side, text: `${attacker.name} recupera ${heal}`, heal });
      break;
    }
    case "burn": {
      hit(e.mult);
      defender.burn = { turns: e.turns, dmg: Math.max(1, Math.round(atk * e.dotPct * k)) };
      b.events.push({ id: eid(), kind: "buff", side, text: `${defender.name} está queimando` });
      break;
    }
    case "splash": {
      hit(e.mult);
      for (const f of defenderSide.fighters) {
        if (f === defender || f.hp <= 0) continue;
        const dealt = applyDamage(b, defSideId, f, Math.max(1, Math.round(rawDamage(atk, f.def, e.mult * k) * e.benchPct)), { attacker, viaAbility: true });
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
        const heal = Math.round(f.maxHp * e.pct * k);
        f.hp = Math.min(f.maxHp, f.hp + heal);
      }
      b.events.push({
        id: eid(),
        kind: "heal",
        side,
        text: `A equipe de ${mySide.name} recupera vida`,
        heal: Math.round(attacker.maxHp * e.pct * k),
      });
      break;
    }
    case "rage":
      attacker.atkBuff += e.atkPct * k;
      b.events.push({ id: eid(), kind: "buff", side, text: `${attacker.name} está enfurecido (+ataque)` });
      break;
    case "weaken":
      defender.atkBuff = Math.max(-0.7, defender.atkBuff - e.atkPct * k);
      b.events.push({ id: eid(), kind: "buff", side, text: `${defender.name} teve o ataque reduzido` });
      break;
    case "shield":
      attacker.shield += Math.round(attacker.maxHp * e.pct * k);
      b.events.push({ id: eid(), kind: "buff", side, text: `${attacker.name} ergue um escudo` });
      break;
    case "poison": {
      hit(e.mult);
      defender.poison = { turns: e.turns, dmg: Math.max(1, Math.round(atk * e.dotPct * k)) };
      b.events.push({ id: eid(), kind: "buff", side, text: `☠️ ${defender.name} foi envenenado` });
      break;
    }
    case "break_def": {
      hit(e.mult);
      defender.defBuff = Math.max(-0.7, defender.defBuff - e.defPct * k);
      b.events.push({ id: eid(), kind: "buff", side, text: `🧪 A defesa de ${defender.name} foi corroída` });
      break;
    }
    case "haste": {
      hit(e.mult);
      attacker.spdBuff = Math.min(1.5, (attacker.spdBuff ?? 0) + e.spdPct * k);
      b.events.push({ id: eid(), kind: "buff", side, text: `🌪️ ${attacker.name} ficou mais rápido` });
      break;
    }
    case "slow": {
      hit(e.mult);
      defender.spdBuff = Math.max(-0.6, (defender.spdBuff ?? 0) - e.spdPct * k);
      b.events.push({ id: eid(), kind: "buff", side, text: `⚙️ ${defender.name} ficou mais lento` });
      break;
    }
    case "double_edge": {
      hit(e.mult);
      const recoil = Math.max(1, Math.round(attacker.maxHp * e.selfPct));
      attacker.hp = Math.max(1, attacker.hp - recoil);
      b.events.push({
        id: eid(),
        kind: "damage",
        side,
        target: side,
        text: `${attacker.name} sofre ${recoil} de recuo`,
        damage: recoil,
      });
      break;
    }
    case "team_shield": {
      for (const f of mySide.fighters) {
        if (f.hp <= 0) continue;
        f.shield += Math.round(f.maxHp * e.pct * k);
      }
      b.events.push({ id: eid(), kind: "buff", side, text: `🛡️ A equipe de ${mySide.name} ganhou escudos` });
      break;
    }
    case "purge": {
      attacker.burn = null;
      attacker.poison = null;
      if (attacker.atkBuff < 0) attacker.atkBuff = 0;
      if (attacker.defBuff < 0) attacker.defBuff = 0;
      if ((attacker.spdBuff ?? 0) < 0) attacker.spdBuff = 0;
      attacker.defBuff += e.defPct * k;
      const heal = Math.round(attacker.maxHp * e.healPct * k);
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
      b.events.push({ id: eid(), kind: "heal", side, text: `🌬️ ${attacker.name} se purificou`, heal });
      break;
    }
    case "echo": {
      const dealt = hit(e.mult);
      attacker.echo = { turns: e.turns, dmg: Math.max(1, Math.round(dealt * e.echoPct)) };
      b.events.push({
        id: eid(),
        kind: "buff",
        side,
        text: `⏳ Um eco do golpe de ${attacker.name} ficou preso no tempo`,
      });
      break;
    }
    case "judgment": {
      // não causa dano próprio: apenas marca o alvo até a morte dele
      defender.mark = {
        pct: e.markPct,
        lifestealPct: e.lifestealPct,
        abilityLifestealPct: e.abilityLifestealPct,
      };
      b.events.push({
        id: eid(),
        kind: "buff",
        side,
        text: `⚖️ ${defender.name} foi marcado pelo veredito: +${Math.round(e.markPct * 100)}% de dano recebido e quem o ferir drena vida`,
      });
      break;
    }

    case "fortify": {
      attacker.defBuff += e.defPct * k;
      const heal = Math.round(attacker.maxHp * e.healPct * k);
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
      b.events.push({ id: eid(), kind: "buff", side, text: `${attacker.name} se fortifica (+defesa)`, heal });
      break;
    }
  }
  attacker.abilityUses += 1;
  // Equinoxis: primeira recarga leva 3 rodadas, depois 4
  attacker.charge = attacker.abilityUses === 1 ? 3 : a.cooldown;
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
  b.events.push({ id: eid(), kind: "attack", side, text: `${attacker.name} atacou!` });
  const eff = pushMatchupEvent(b, side, attacker, defender);
  const dealt = applyDamage(
    b,
    defSideId,
    defender,
    rawDamage(
      effAtk(attacker, mySide.behavior),
      effDef(defender, defenderSide.behavior),
      mult * eff.mult,
    ),
    { attacker, viaAbility: false },
  );

  b.events.push({
    id: eid(),
    kind: "damage",
    side,
    target: defSideId,
    text: `${defender.name} sofre ${dealt} de dano`,
    damage: dealt,
    effect: eff.kind,
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
    side.behavior === "defensivo"
      ? f.hp + f.def * 8 + f.spd * 1.5
      : f.atk * 8 + f.hp * 0.6 + f.spd * 4;
  return options.sort((a, z) => score(z.f) - score(a.f))[0]!.i;
}

function tickPoison(b: Battle, side: SideId) {
  const f = activeOf(b, side);
  if (!f.poison || f.hp <= 0) return;
  const dealt = Math.min(f.hp, f.poison.dmg);
  f.hp -= dealt;
  f.poison.turns -= 1;
  if (f.poison.turns <= 0) f.poison = null;
  b.events.push({
    id: eid(),
    kind: "damage",
    side: side === "player" ? "foe" : "player",
    target: side,
    text: `☠️ ${f.name} sofre ${dealt} de veneno`,
    damage: dealt,
  });
}

/** o eco temporal repete parte do dano no início do turno de quem o criou */
function tickEcho(b: Battle, side: SideId) {
  const attacker = activeOf(b, side);
  if (!attacker.echo || attacker.hp <= 0) return;
  const defSideId: SideId = side === "player" ? "foe" : "player";
  const defSide = side === "player" ? b.foe : b.player;
  const defender = defSide.fighters[defSide.active]!;
  if (defender.hp <= 0) return;
  const dealt = applyDamage(b, defSideId, defender, attacker.echo.dmg, {
    attacker,
    viaAbility: true,
  });

  attacker.echo.turns -= 1;
  if (attacker.echo.turns <= 0) attacker.echo = null;
  b.events.push({
    id: eid(),
    kind: "damage",
    side,
    target: defSideId,
    text: `⏳ O eco do golpe atinge ${defender.name} por ${dealt}`,
    damage: dealt,
  });
}

function tickBurn(b: Battle, side: SideId) {
  const f = activeOf(b, side);
  tickPoison(b, side);
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
      defSide.fighters[defSide.active]!.guard = 1;
      b.events.push({
        id: eid(),
        kind: "switch",
        side: foeSideId,
        text: `${defSide.name} envia ${defSide.fighters[defSide.active]!.name}`,
      });
      // o novo monstro pode ser mais rápido e roubar a iniciativa
      b.turn = firstMover(b.player, b.foe);
      b.turnNo += 1;
      b.log = [...b.log, ...b.events.map((e) => e.text)].slice(-60);
      return;
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

/**
 * A IA decide quando soltar a habilidade conforme o estilo:
 * ofensivo dispara sempre; defensivo guarda para habilidades de proteção ou
 * quando está machucado; equilibrado alterna.
 */
function aiWantsAbility(b: Battle, f: Fighter): boolean {
  const style = f.ability.effect.type;
  const support = ["shield", "fortify", "team_heal", "drain", "weaken"].includes(style);
  const hurt = f.hp / f.maxHp <= 0.6;
  switch (b.foe.behavior) {
    case "ofensivo":
      return true;
    case "defensivo":
      return support || hurt;
    default:
      return support ? hurt || Math.random() < 0.6 : Math.random() < 0.8;
  }
}

/** o especial do jogador é manual (quando carregado); a IA dispara sozinha */
export function isSpecialReady(f: Fighter): boolean {
  return f.charge <= 1;
}

/**
 * resolve o turno de quem está na vez.
 * `useSpecial` (só faz efeito para o jogador com o especial carregado):
 * ataque normal com 50% de dano + a habilidade especial no mesmo turno.
 */
export function takeTurn(prev: Battle, opts?: { useSpecial?: boolean }): Battle {
  if (prev.over || prev.awaitingSwitch) return prev;
  const b = clone(prev);
  b.events = [];
  escalation = b.turnNo > SUDDEN_DEATH_TURN ? 1 + (b.turnNo - SUDDEN_DEATH_TURN) * 0.06 : 1;
  const actor = b.turn;
  const attacker = activeOf(b, actor);
  const defSide = actor === "player" ? b.foe : b.player;
  const defSideId: SideId = actor === "player" ? "foe" : "player";

  tickEcho(b, actor);
  if (defSide.fighters[defSide.active]!.hp <= 0) {
    finishTurn(b, actor);
    return b;
  }

  const wantsSpecial = actor === "player" && !!opts?.useSpecial && isSpecialReady(attacker);
  attacker.charge = Math.max(0, attacker.charge - 1);
  // a proteção da troca vale apenas até o monstro agir
  attacker.guard = 0;

  if (wantsSpecial) {
    basicAttack(b, actor, attacker, defSide, defSideId, 0.5);
    if (defSide.fighters[defSide.active]!.hp > 0) useAbility(b, actor, attacker, defSide, defSideId);
    else attacker.charge = attacker.ability.cooldown;
  } else if (actor === "foe" && attacker.charge === 0 && aiWantsAbility(b, attacker)) {
    useAbility(b, actor, attacker, defSide, defSideId);
  } else {
    basicAttack(b, actor, attacker, defSide, defSideId);
  }


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
  f.guard = 1;
  b.awaitingSwitch = false;
  b.events = [{ id: eid(), kind: "switch", side: "player", text: `Você envia ${f.name}` }];
  b.log = [...b.log, `Você envia ${f.name}`].slice(-60);
  // trocar não consome o turno, mas a velocidade define quem age primeiro
  b.turn = firstMover(b.player, b.foe);
  return b;
}

/** troca voluntária no meio da batalha: consome o turno do jogador */
export function voluntarySwitch(prev: Battle, index: number): Battle {
  if (prev.over || prev.awaitingSwitch || prev.turn !== "player") return prev;
  if (index === prev.player.active) return prev;
  const b = clone(prev);
  const f = b.player.fighters[index];
  if (!f || f.hp <= 0) return prev;
  b.player.active = index;
  f.guard = 1;
  b.events = [{ id: eid(), kind: "switch", side: "player", text: `Você troca para ${f.name} (gastou o turno)` }];
  tickBurn(b, "player");
  if (f.hp <= 0) {
    b.events.push({ id: eid(), kind: "ko", side: "player", text: `${f.name} foi derrotado!` });
    if (alive(b.player).length === 0) {
      b.over = true;
      b.winner = "foe";
      b.events.push({ id: eid(), kind: "end", side: "foe", text: "Você foi derrotado." });
    } else {
      b.awaitingSwitch = true;
    }
  }
  if (!b.over && !b.awaitingSwitch) {
    b.turn = "foe";
    b.turnNo += 1;
  }
  b.log = [...b.log, ...b.events.map((e) => e.text)].slice(-60);
  return b;
}
