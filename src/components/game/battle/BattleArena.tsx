import { useEffect, useMemo, useRef, useState } from "react";
import { MonsterArt, RarityBadge } from "@/components/game/MonsterArt";
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

type Float = { id: string; side: SideId; text: string; heal?: boolean };

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
  const finished = useRef(false);

  const player = battle.player.fighters[battle.player.active]!;
  const foe = battle.foe.fighters[battle.foe.active]!;
  const specialReady = isSpecialReady(player);
  const specialPct = Math.min(
    100,
    ((player.ability.cooldown - Math.max(0, player.charge - 1)) / player.ability.cooldown) * 100,
  );

  function digest(next: Battle) {
    const news: Float[] = [];
    for (const e of next.events) {
      if (e.kind === "damage" && e.target) {
        news.push({ id: e.id, side: e.target, text: `-${e.damage}` });
      }
      if (e.kind === "heal" && e.heal) {
        news.push({ id: e.id, side: e.side, text: `+${e.heal}`, heal: true });
      }
    }
    if (news.length > 0) {
      setFloats((f) => [...f, ...news]);
      const hurt = news.find((n) => !n.heal);
      if (hurt) {
        setShake(hurt.side);
        window.setTimeout(() => setShake(null), 320);
      }
      window.setTimeout(() => {
        setFloats((f) => f.filter((x) => !news.some((n) => n.id === x.id)));
      }, 1100);
    }
    setBattle(next);
  }

  // turno da IA (e do deck adversário no PvP assíncrono) roda sozinho
  useEffect(() => {
    if (battle.over || battle.awaitingSwitch || battle.turn !== "foe") return;
    const id = window.setTimeout(() => digest(takeTurn(battle)), 900);
    return () => window.clearTimeout(id);
  }, [battle]);

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
      <div className="panel aurora relative overflow-hidden p-4 sm:p-6">
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

        <div className="grid grid-cols-2 items-end gap-3 sm:gap-6">
          <FighterView
            fighter={player}
            side="player"
            floats={floats.filter((f) => f.side === "player")}
            shake={shake === "player"}
            label="Você"
            team={battle.player.fighters}
            activeIndex={battle.player.active}
          />
          <FighterView
            fighter={foe}
            side="foe"
            floats={floats.filter((f) => f.side === "foe")}
            shake={shake === "foe"}
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
                className="flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-left text-sm ring-1 ring-border/60 hover:bg-secondary"
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
                      className="flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-left text-sm ring-1 ring-border/60 transition hover:bg-secondary disabled:opacity-50"
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

      <div className="panel max-h-40 overflow-y-auto p-4 text-xs text-muted-foreground">
        {battle.log.length === 0 ? (
          <p>A batalha vai começar…</p>
        ) : (
          <ul className="space-y-1">
            {battle.log
              .slice(-14)
              .reverse()
              .map((l, i) => (
                <li key={`${i}-${l}`}>{l}</li>
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
  label,
  team,
  activeIndex,
}: {
  fighter: Fighter;
  side: SideId;
  floats: Float[];
  shake: boolean;
  label: string;
  team: Fighter[];
  activeIndex: number;
}) {
  const pct = Math.max(0, (fighter.hp / fighter.maxHp) * 100);
  return (
    <div className={cn("relative flex flex-col gap-2", side === "foe" ? "items-end text-right" : "items-start")}>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className={cn("relative", shake && "animate-pulse")}>
        <MonsterArt
          art={fighter.art}
          rarity={fighter.rarity}
          size="lg"
          className={cn(shake && "translate-x-1 scale-95 transition-transform")}
        />
        {floats.map((f) => (
          <span
            key={f.id}
            className={cn(
              "pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 animate-float font-display text-2xl font-bold drop-shadow",
              f.heal ? "text-emerald-400" : "text-ember",
            )}
          >
            {f.text}
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
              "h-full rounded-full transition-all duration-500",
              pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-gold" : "bg-ember",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
          {fighter.hp}/{fighter.maxHp} PV · ATQ {Math.round(fighter.atk * (1 + fighter.atkBuff))} · DEF{" "}
          {Math.round(fighter.def * (1 + fighter.defBuff))}
          {fighter.shield > 0 && ` · 🛡️ ${fighter.shield}`}
        </p>
        <div className={cn("mt-1 flex items-center gap-1", side === "foe" && "justify-end")}>
          <RarityBadge rarity={fighter.rarity} />
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
