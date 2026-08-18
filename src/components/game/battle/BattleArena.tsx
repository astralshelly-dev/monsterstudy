import { useEffect, useMemo, useRef, useState } from "react";
import { MonsterArt, RarityBadge } from "@/components/game/MonsterArt";
import { ElementBadge } from "@/components/game/ElementBadge";
import { RoleBadge } from "@/components/game/RoleBadge";
import { beamBonusLabel } from "@/lib/game/battle/beams";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  isSpecialReady,
  switchPlayerFighter,
  takeTurn,
  voluntarySwitch,
  type Battle,
  type Fighter,
  type SideId,
} from "@/lib/game/battle/engine";

type Float = { id: string; side: SideId; text: string; heal?: boolean; effect?: "super" | "weak" | "normal" };
type Fx = {
  attacker: SideId | null;
  hit: SideId | null;
  effect: "super" | "weak" | null;
  banner: string | null;
  special: SideId | null;
};
const NO_FX: Fx = { attacker: null, hit: null, effect: null, banner: null, special: null };

export function BattleArena({
  battle,
  setBattle,
  onFinish,
}: {
  battle: Battle;
  setBattle: (b: Battle) => void;
  onFinish: (winner: SideId, turns: number) => void;
}) {
  const [floats, setFloats] = useState<Float[]>([]);
  const [shake, setShake] = useState<SideId | null>(null);
  const [fx, setFx] = useState<Fx>(NO_FX);
  const [intro, setIntro] = useState(true);
  const finished = useRef(false);
  const logRef = useRef<HTMLDivElement | null>(null);

  // abertura cinematográfica da batalha
  useEffect(() => {
    const id = window.setTimeout(() => setIntro(false), 1500);
    return () => window.clearTimeout(id);
  }, []);

  // o log fica em ordem cronológica e sempre mostra a última ação
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [battle.log]);

  const player = battle.player.fighters[battle.player.active]!;
  const foe = battle.foe.fighters[battle.foe.active]!;
  const specialReady = isSpecialReady(player);
  const specialPct = Math.min(
    100,
    ((player.ability.cooldown - Math.max(0, player.charge - 1)) / player.ability.cooldown) * 100,
  );

  function digest(next: Battle) {
    const news: Float[] = [];
    let attacker: SideId | null = null;
    let effect: "super" | "weak" | null = null;
    let banner: string | null = null;
    let special: SideId | null = null;
    for (const e of next.events) {
      if (e.kind === "attack" || e.kind === "ability") attacker = e.side;
      if (e.kind === "ability") {
        banner = e.text;
        special = e.side;
      }
      if (e.kind === "damage" && e.target) {
        news.push({ id: e.id, side: e.target, text: `-${e.damage}`, effect: e.effect });
        if (e.effect === "super" || e.effect === "weak") effect = e.effect;
      }
      if (e.kind === "heal" && e.heal) {
        news.push({ id: e.id, side: e.side, text: `+${e.heal}`, heal: true });
      }
    }
    const hurt = news.find((n) => !n.heal);
    if (news.length > 0) {
      setFloats((f) => [...f, ...news]);
      if (hurt) {
        setShake(hurt.side);
        window.setTimeout(() => setShake(null), 380);
      }
      window.setTimeout(() => {
        setFloats((f) => f.filter((x) => !news.some((n) => n.id === x.id)));
      }, 1100);
    }
    if (attacker || hurt || banner) {
      setFx({ attacker, hit: hurt?.side ?? null, effect, banner, special });
      window.setTimeout(() => setFx(NO_FX), banner ? 1400 : 520);
    }
    setBattle(next);
  }

  // turno da IA (e do deck adversário no PvP assíncrono) roda sozinho
  useEffect(() => {
    if (intro || battle.over || battle.awaitingSwitch || battle.turn !== "foe") return;
    const id = window.setTimeout(() => digest(takeTurn(battle)), 900);
    return () => window.clearTimeout(id);
  }, [battle, intro]);

  useEffect(() => {
    if (battle.over && battle.winner && !finished.current) {
      finished.current = true;
      const id = window.setTimeout(() => onFinish(battle.winner!, battle.turnNo), 1300);
      return () => window.clearTimeout(id);
    }
    return;
  }, [battle.over, battle.winner]);

  const benchAlive = useMemo(
    () => battle.player.fighters.map((f, i) => ({ f, i })).filter((x) => x.f.hp > 0 && x.i !== battle.player.active),
    [battle],
  );

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "panel aurora relative overflow-hidden p-4 sm:p-6",
          fx.special && "fx-special-zoom",
        )}
      >
        <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
          <span>Turno {battle.turnNo}</span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 font-semibold",
              battle.turn === "player" ? "bg-primary/20 text-primary" : "bg-ember/20 text-ember",
            )}
          >
            {battle.over ? "Fim" : battle.turn === "player" ? "Sua vez" : `Vez de ${battle.foe.name}`}
          </span>
        </div>

        {(battle.player.beam || battle.foe.beam) && (
          <div className="anim-up mb-3 grid grid-cols-2 gap-2 text-[11px]">
            <span className={cn("truncate font-semibold", battle.player.beam?.text)}>
              {battle.player.beam
                ? `${battle.player.beam.icon} ${battle.player.beam.name} · ${beamBonusLabel(battle.player.beam)}`
                : ""}
            </span>
            <span className={cn("truncate text-right font-semibold", battle.foe.beam?.text)}>
              {battle.foe.beam
                ? `${battle.foe.beam.icon} ${battle.foe.beam.name} · ${beamBonusLabel(battle.foe.beam)}`
                : ""}
            </span>
          </div>
        )}

        {fx.effect && (
          <div
            className={cn(
              "fx-flash pointer-events-none absolute inset-0 z-10",
              fx.effect === "super"
                ? "bg-gradient-to-b from-gold/25 to-transparent"
                : "bg-gradient-to-b from-mana/20 to-transparent",
            )}
          />
        )}
        {fx.special && (
          <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
            <span className="fx-special-flare absolute inset-0" />
            <span className="fx-special-rays absolute inset-0" />
          </div>
        )}
        {fx.banner && (
          <div className="pointer-events-none absolute inset-x-0 top-1/3 z-20 grid place-items-center px-4">
            <p className="anim-banner max-w-full truncate rounded-full bg-background/85 px-4 py-1.5 text-center font-display text-xs font-bold uppercase tracking-[0.18em] text-glow ring-1 ring-primary/40">
              {fx.banner}
            </p>
          </div>
        )}
        {intro && (
          <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-background/70 backdrop-blur-sm">
            <div className="fx-intro-vs text-center">
              <p className="font-display text-3xl font-black tracking-[0.2em] text-glow sm:text-4xl">VS</p>
              <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {battle.foe.name}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 items-end gap-3 sm:gap-6">
          <FighterView
            fighter={player}
            side="player"
            floats={floats.filter((f) => f.side === "player")}
            shake={shake === "player"}
            attacking={fx.attacker === "player"}
            casting={fx.special === "player"}
            entering={intro}
            label="Você"
            team={battle.player.fighters}
            activeIndex={battle.player.active}
          />
          <FighterView
            fighter={foe}
            side="foe"
            floats={floats.filter((f) => f.side === "foe")}
            shake={shake === "foe"}
            attacking={fx.attacker === "foe"}
            casting={fx.special === "foe"}
            entering={intro}
            label={battle.foe.name}
            team={battle.foe.fighters}
            activeIndex={battle.foe.active}
          />
        </div>
      </div>

      {battle.awaitingSwitch ? (
        <div className="panel space-y-3 p-4">
          <p className="font-display text-sm font-semibold">
            {player.name} caiu. Escolha o próximo monstro:
          </p>
          <div className="flex flex-wrap gap-2">
            {benchAlive.map(({ f, i }) => (
              <button
                key={f.key}
                type="button"
                onClick={() => digest(switchPlayerFighter(battle, i))}
                className="press flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-left text-sm ring-1 ring-border/60 hover:bg-secondary hover:ring-primary/40"
              >
                <MonsterArt art={f.art} rarity={f.rarity} size="sm" animate={false} />
                <span>
                  <span className="block font-medium">{f.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    Nv {f.level} · {f.hp}/{f.maxHp} PV
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        !battle.over && (
          <div className="panel space-y-3 p-4">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-display font-semibold">
                {player.ability.icon} {player.ability.name}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {specialReady ? "Pronto!" : `${Math.max(1, player.charge)} turno(s)`}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  specialReady ? "bg-gold animate-pulse" : "bg-primary",
                )}
                style={{ width: `${specialPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{player.ability.description}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" disabled={battle.turn !== "player"} onClick={() => digest(takeTurn(battle))}>
                ⚔️ Atacar
              </Button>
              <Button
                size="lg"
                variant="secondary"
                disabled={battle.turn !== "player" || !specialReady}
                onClick={() => digest(takeTurn(battle, { useSpecial: true }))}
              >
                {player.ability.icon} Usar especial
              </Button>
              <p className="text-xs text-muted-foreground">
                O especial soma o ataque normal com 50% de dano + {player.ability.name}.
              </p>
            </div>
            {benchAlive.length > 0 && (
              <div className="border-t border-border/60 pt-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Trocar de monstro (gasta o seu turno)
                </p>
                <div className="flex flex-wrap gap-2">
                  {benchAlive.map(({ f, i }) => (
                    <button
                      key={f.key}
                      type="button"
                      disabled={battle.turn !== "player"}
                      onClick={() => digest(voluntarySwitch(battle, i))}
                      className="press flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-left text-sm ring-1 ring-border/60 hover:bg-secondary hover:ring-primary/40 disabled:opacity-50"
                    >
                      <MonsterArt art={f.art} rarity={f.rarity} size="sm" animate={false} />
                      <span>
                        <span className="block font-medium">{f.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          Nv {f.level} · {f.hp}/{f.maxHp} PV
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      <div ref={logRef} className="panel max-h-40 overflow-y-auto p-4 text-xs text-muted-foreground">
        {battle.log.length === 0 ? (
          <p>A batalha vai começar…</p>
        ) : (
          <ul className="space-y-1">
            {battle.log.slice(-40).map((l, i) => (
              <li key={`${i}-${l}`} className="anim-up">
                {l}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FighterView({
  fighter,
  side,
  floats,
  shake,
  attacking,
  casting = false,
  entering = false,
  label,
  team,
  activeIndex,
}: {
  fighter: Fighter;
  side: SideId;
  floats: Float[];
  shake: boolean;
  attacking: boolean;
  casting?: boolean;
  entering?: boolean;
  label: string;
  team: Fighter[];
  activeIndex: number;
}) {
  const pct = Math.max(0, (fighter.hp / fighter.maxHp) * 100);
  return (
    <div
      className={cn(
        "relative flex flex-col gap-2",
        side === "foe" ? "items-end text-right" : "items-start",
        entering && (side === "foe" ? "fx-enter-right" : "fx-enter-left"),
      )}
    >
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div
        className={cn(
          "relative",
          attacking && (side === "player" ? "fx-attack-player" : "fx-attack-foe"),
          casting && "fx-cast",
          shake && "fx-hit",
        )}
      >
        <MonsterArt
          art={fighter.art}
          rarity={fighter.rarity}
          size="lg"
          skinId={side === "player" ? equippedSkinFor(fighter.monsterId) : null}
        />
        {casting && (
          <span className="fx-cast-ring pointer-events-none absolute inset-0 rounded-full ring-4 ring-gold/70" />
        )}
        {shake && (
          <span className="fx-burst pointer-events-none absolute inset-0 rounded-full ring-4 ring-ember/70" />
        )}
        {fighter.mark && (
          <span
            className="anim-mark pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-1.5 text-xs ring-1 ring-gold/60"
            title="Marca do Eclipse ativa"
          >
            ⚖️
          </span>
        )}
        {floats.map((f) => (
          <span
            key={f.id}
            className={cn(
              "pointer-events-none absolute left-1/2 top-0 font-display font-bold drop-shadow",
              "animate-[ms-dmg-float_1.1s_var(--ease-out-soft)_both]",
              f.heal ? "text-emerald-400" : f.effect === "super" ? "text-gold" : "text-ember",
              f.effect === "super" ? "text-3xl" : "text-2xl",
            )}
          >
            {f.text}
            {f.effect === "super" && <span className="ml-0.5 text-sm">✦</span>}
          </span>
        ))}
      </div>
      <div className="w-full">
        <p className="truncate font-display text-sm font-bold">
          {fighter.name} <span className="text-muted-foreground">Nv {fighter.level}</span>
        </p>
        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width,background-color] duration-700 ease-out",
              pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-gold" : "bg-ember",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
          {fighter.hp}/{fighter.maxHp} PV · ATQ {Math.round(fighter.atk * (1 + fighter.atkBuff))} · DEF{" "}
          {Math.round(fighter.def * (1 + fighter.defBuff))} · VEL{" "}
          {Math.round(fighter.spd * (1 + (fighter.spdBuff ?? 0)) * 10) / 10}
          {fighter.shield > 0 && ` · 🛡️ ${fighter.shield}`}
          {fighter.guard > 0 && " · 🌀 -30% dano"}
          {fighter.burn && ` · 🔥 ${fighter.burn.turns}t`}
          {fighter.poison && ` · ☠️ ${fighter.poison.turns}t`}
        </p>
        <div className={cn("mt-1 flex flex-wrap items-center gap-1", side === "foe" && "justify-end")}>
          <RarityBadge rarity={fighter.rarity} />
          <ElementBadge elements={fighter.elements ?? [fighter.element]} compact />
          <RoleBadge role={fighter.role} compact />
          <span className="text-[10px] text-muted-foreground">
            {fighter.ability.icon} {Math.max(1, fighter.charge)}t
          </span>
        </div>
        <div className={cn("mt-1 flex gap-1", side === "foe" && "justify-end")}>
          {team.map((f, i) => (
            <span
              key={f.key}
              title={f.name}
              className={cn(
                "h-1.5 w-5 rounded-full",
                f.hp <= 0 ? "bg-muted" : i === activeIndex ? "bg-primary" : "bg-primary/40",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
