// ============================================================
// Monster Study — IA de batalha
//
// A IA joga com EXATAMENTE as mesmas regras do jogador: mesmos atributos,
// mesmos cooldowns, mesmas fraquezas, sem informação oculta e sem trapaça.
// Ela avalia a situação (vida, atributos, elementos, habilidades, status,
// funções e feixe ativo) e escolhe entre ataque normal, habilidade especial
// e troca de monstro — sempre com uma margem de erro humana.
// ============================================================
import { abilityScale } from "./config";
import { roleIdOf } from "./roles";
import { typeEffectMulti } from "../elements";
import type { AiBehavior, Battle, Fighter, Side } from "./engine";

export type AiAction =
  | { kind: "attack" }
  | { kind: "ability" }
  | { kind: "switch"; index: number };

// ---------------- helpers puros (espelham o motor, sem aleatoriedade) ----------------

function atkOf(f: Fighter, behavior: AiBehavior): number {
  const bias = behavior === "ofensivo" ? 1.12 : behavior === "defensivo" ? 0.92 : 1;
  return f.atk * (1 + f.atkBuff) * bias * (1 + (f.dmgBonus ?? 0));
}

function defOf(f: Fighter, behavior: AiBehavior): number {
  const bias = behavior === "defensivo" ? 1.15 : behavior === "ofensivo" ? 0.92 : 1;
  return f.def * (1 + f.defBuff) * bias;
}

function matchup(a: Fighter, d: Fighter) {
  return typeEffectMulti(a.elements ?? [a.element], d.elements ?? [d.element]);
}

/** dano médio esperado (sem sorte, sem escalonamento de morte súbita) */
function estimateDamage(
  attacker: Fighter,
  attackerBehavior: AiBehavior,
  defender: Fighter,
  defenderBehavior: AiBehavior,
  mult: number,
  ignoreDef = false,
): number {
  const atk = atkOf(attacker, attackerBehavior);
  const dfn = defOf(defender, defenderBehavior);
  const mitig = ignoreDef ? 1 : 1 - dfn / (dfn + 60);
  const eff = matchup(attacker, defender).mult;
  let dmg = Math.max(1, atk * mult * mitig * eff);
  if (defender.mark) dmg *= 1 + defender.mark.pct;
  if (defender.guard > 0) dmg *= 0.7;
  return Math.max(1, dmg - defender.shield);
}

/** o quanto a habilidade vale AGORA, em "pontos de vida equivalentes" */
function abilityValue(
  b: Battle,
  me: Fighter,
  mySide: Side,
  opp: Fighter,
  oppSide: Side,
): { value: number; damage: number } {
  const e = me.ability.effect;
  const k = abilityScale(me.level);
  const dmg = (mult: number, ignoreDef = false, hits = 1) =>
    estimateDamage(me, mySide.behavior, opp, oppSide.behavior, mult * k, ignoreDef) * hits;
  const teamMissing = mySide.fighters
    .filter((f) => f.hp > 0)
    .reduce((a, f) => a + (f.maxHp - f.hp), 0);
  const myMissing = me.maxHp - me.hp;
  const oppRatio = opp.hp / opp.maxHp;

  switch (e.type) {
    case "damage":
      return { value: dmg(e.mult, e.ignoreDef), damage: dmg(e.mult, e.ignoreDef) };
    case "damage_hits": {
      const d = dmg(e.mult, false, e.hits);
      return { value: d, damage: d };
    }
    case "execute": {
      const d = dmg(oppRatio <= e.threshold ? e.mult + e.bonusMult : e.mult);
      return { value: d, damage: d };
    }
    case "drain": {
      const d = dmg(e.mult);
      return { value: d + Math.min(myMissing, d * e.healPct), damage: d };
    }
    case "burn": {
      const d = dmg(e.mult);
      // queimadura desperdiçada se o alvo já queima ou vai morrer agora
      const dot = opp.burn || opp.hp <= d ? 0 : d * e.dotPct * e.turns;
      return { value: d + dot, damage: d };
    }
    case "poison": {
      const d = dmg(e.mult);
      const dot = opp.poison || opp.hp <= d ? 0 : d * e.dotPct * e.turns;
      return { value: d + dot, damage: d };
    }
    case "splash": {
      const d = dmg(e.mult);
      const bench = oppSide.fighters.filter((f) => f.hp > 0 && f !== opp).length;
      return { value: d * (1 + bench * e.benchPct * 0.5), damage: d };
    }
    case "double_edge": {
      const d = dmg(e.mult);
      const recoil = me.maxHp * e.selfPct;
      // suicídio não vale a pena
      const risky = me.hp <= recoil * 1.4 ? recoil * 2 : recoil;
      return { value: d - risky, damage: d };
    }
    case "break_def": {
      const d = dmg(e.mult);
      const wasted = opp.defBuff <= -0.5 || opp.hp <= d;
      return { value: d + (wasted ? 0 : opp.maxHp * 0.08), damage: d };
    }
    case "haste": {
      const d = dmg(e.mult);
      const wasted = (me.spdBuff ?? 0) >= 0.6;
      return { value: d + (wasted ? 0 : me.maxHp * 0.06), damage: d };
    }
    case "slow": {
      const d = dmg(e.mult);
      const wasted = (opp.spdBuff ?? 0) <= -0.4 || opp.hp <= d;
      return { value: d + (wasted ? 0 : me.maxHp * 0.05), damage: d };
    }
    case "echo": {
      const d = dmg(e.mult);
      return { value: d * (1 + e.echoPct * e.turns * 0.8), damage: d };
    }
    case "judgment": {
      // não causa dano: inútil se o alvo já está marcado ou quase morto
      if (opp.mark || oppRatio < 0.35) return { value: 0, damage: 0 };
      return { value: opp.hp * e.markPct * 1.2, damage: 0 };
    }
    case "team_heal": {
      const heal = mySide.fighters
        .filter((f) => f.hp > 0)
        .reduce((a, f) => a + Math.min(f.maxHp - f.hp, f.maxHp * e.pct * k), 0);
      return { value: heal, damage: 0 };
    }
    case "rage": {
      const gain = atkOf(me, mySide.behavior) * e.atkPct * k * 2.2;
      // fúria não vale nada se este monstro está prestes a cair
      return { value: me.hp / me.maxHp < 0.25 ? gain * 0.3 : gain, damage: 0 };
    }
    case "weaken": {
      const wasted = opp.atkBuff <= -0.5 || oppRatio < 0.3;
      return { value: wasted ? 0 : atkOf(opp, oppSide.behavior) * e.atkPct * 2.2, damage: 0 };
    }
    case "shield": {
      const wasted = me.shield > me.maxHp * 0.2;
      return { value: wasted ? 0 : me.maxHp * e.pct * k * 0.9, damage: 0 };
    }
    case "team_shield": {
      const alive = mySide.fighters.filter((f) => f.hp > 0);
      return {
        value: alive.reduce((a, f) => a + (f.shield > f.maxHp * 0.15 ? 0 : f.maxHp * e.pct * k), 0),
        damage: 0,
      };
    }
    case "fortify": {
      const heal = Math.min(myMissing, me.maxHp * e.healPct * k);
      return { value: heal + me.maxHp * 0.1, damage: 0 };
    }
    case "purge": {
      const cleanse = me.poison || me.burn || me.atkBuff < 0 || me.defBuff < 0 ? me.maxHp * 0.12 : 0;
      return { value: Math.min(myMissing, me.maxHp * e.healPct * k) + cleanse, damage: 0 };
    }
    default:
      return { value: teamMissing * 0.1, damage: 0 };
  }
}

/** o quanto vale trocar para um monstro do banco */
function switchValue(b: Battle, mySide: Side, oppSide: Side, index: number): number {
  const me = mySide.fighters[mySide.active]!;
  const cand = mySide.fighters[index];
  const opp = oppSide.fighters[oppSide.active]!;
  if (!cand || cand.hp <= 0) return -Infinity;

  const myEff = matchup(me, opp);
  const candEff = matchup(cand, opp);
  const myTaken = matchup(opp, me);
  const candTaken = matchup(opp, cand);

  let v = 0;
  // ganho ofensivo/defensivo com a troca
  v += (candEff.mult - myEff.mult) * cand.maxHp * 0.55;
  v += (myTaken.mult - candTaken.mult) * cand.maxHp * 0.55;
  // salvar um monstro quase morto
  const myRatio = me.hp / me.maxHp;
  if (myRatio < 0.25) v += me.maxHp * 0.28;
  else if (myRatio < 0.45) v += me.maxHp * 0.1;
  // não jogar um monstro ferido na frente
  v -= (1 - cand.hp / cand.maxHp) * cand.maxHp * 0.35;
  // trocar custa o turno: penalidade pelo dano que deixo de causar
  v -= estimateDamage(me, mySide.behavior, opp, oppSide.behavior, 1) * 1.15;
  // identidade: tanque cobre a troca melhor, suporte entra atrás
  const role = roleIdOf(cand.monsterId);
  if (role === "tanque") v += cand.maxHp * 0.06;
  if (role === "suporte" && opp.hp / opp.maxHp > 0.6) v -= cand.maxHp * 0.05;
  // status ruins no monstro atual empurram a troca
  if (me.poison) v += me.maxHp * 0.08;
  if (me.burn) v += me.maxHp * 0.06;
  if (me.atkBuff < -0.2) v += me.maxHp * 0.06;
  // quem está com escudo/buff investido prefere ficar
  if (me.shield > 0) v -= me.maxHp * 0.1;
  if (me.atkBuff > 0.2) v -= me.maxHp * 0.14;
  // comportamento
  if (mySide.behavior === "ofensivo") v -= cand.maxHp * 0.1;
  if (mySide.behavior === "defensivo") v += cand.maxHp * 0.05;
  return v;
}

const jitter = (amount: number) => 1 + (Math.random() * 2 - 1) * amount;

/** chance de a IA cometer um erro humano (nunca é perfeita) */
function mistakeChance(behavior: AiBehavior): number {
  return behavior === "ofensivo" ? 0.18 : behavior === "defensivo" ? 0.14 : 0.12;
}

/**
 * Decide a ação da IA no turno atual.
 * `abilityReady` diz se a habilidade dispara neste turno (mesma regra do jogador).
 */
export function decideAiAction(b: Battle, abilityReady: boolean): AiAction {
  const mySide = b.foe;
  const oppSide = b.player;
  const me = mySide.fighters[mySide.active]!;
  const opp = oppSide.fighters[oppSide.active]!;

  const normal = estimateDamage(me, mySide.behavior, opp, oppSide.behavior, 1);
  const ability = abilityReady
    ? abilityValue(b, me, mySide, opp, oppSide)
    : { value: -Infinity, damage: 0 };

  const killWithNormal = normal >= opp.hp;
  const killWithAbility = abilityReady && ability.damage >= opp.hp;

  // 1) finalizar é quase sempre a melhor jogada
  if (killWithNormal || killWithAbility) {
    if (Math.random() > mistakeChance(mySide.behavior)) {
      // se o normal já resolve, guarda a habilidade para o próximo monstro
      if (killWithNormal) return { kind: "attack" };
      return { kind: "ability" };
    }
  }

  // 2) avaliar troca (nunca quando o abandono do turno perde a chance de matar)
  let best: { score: number; action: AiAction } = {
    score: normal * jitter(0.12),
    action: { kind: "attack" },
  };
  if (abilityReady) {
    const bias =
      mySide.behavior === "ofensivo" ? 1.15 : mySide.behavior === "defensivo" ? 1.05 : 1.08;
    const score = ability.value * bias * jitter(0.18);
    if (score > best.score) best = { score, action: { kind: "ability" } };
  }
  if (!killWithNormal && !killWithAbility) {
    for (let i = 0; i < mySide.fighters.length; i += 1) {
      if (i === mySide.active) continue;
      const score = switchValue(b, mySide, oppSide, i) * jitter(0.2);
      // trocar precisa ser claramente melhor que agir: evita ficar trocando toda hora
      if (score > best.score * 1.6) best = { score, action: { kind: "switch", index: i } };
    }
  }

  // 3) erro humano: às vezes a IA escolhe uma ação apenas razoável
  if (Math.random() < mistakeChance(mySide.behavior)) {
    if (abilityReady && Math.random() < 0.5) return { kind: "ability" };
    return { kind: "attack" };
  }
  return best.action;
}

/** substituto após um nocaute: melhor matchup contra quem está em campo */
export function pickAiReplacement(mySide: Side, oppSide: Side): number {
  const opp = oppSide.fighters[oppSide.active];
  const options = mySide.fighters.map((f, i) => ({ f, i })).filter((x) => x.f.hp > 0);
  if (options.length === 0) return mySide.active;
  // erro humano: de vez em quando manda qualquer um
  if (Math.random() < mistakeChance(mySide.behavior) * 1.6) {
    return options[Math.floor(Math.random() * options.length)]!.i;
  }
  const score = ({ f }: { f: Fighter }) => {
    let v = f.hp * 0.5 + f.atk * 5 + f.def * 3.5 + f.spd * 1.5;
    if (opp) {
      v += (matchup(f, opp).mult - 1) * f.maxHp * 0.9;
      v -= (matchup(opp, f).mult - 1) * f.maxHp * 0.9;
    }
    const role = roleIdOf(f.monsterId);
    if (role === "tanque") v += f.maxHp * 0.05;
    if (mySide.behavior === "ofensivo" && role === "atacante") v += f.maxHp * 0.05;
    if (mySide.behavior === "defensivo" && (role === "suporte" || role === "tanque")) {
      v += f.maxHp * 0.05;
    }
    return v * jitter(0.12);
  };
  return options.sort((a, z) => score(z) - score(a))[0]!.i;
}
