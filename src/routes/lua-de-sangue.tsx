import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useGame } from "@/hooks/use-game";
import {
  bloodMoonProgress,
  bloodMoonState,
  buyBloodMoonCosmetic,
  buyBloodMoonSkin,
  ownsBloodMoonSkin,
  toggleBloodMoonSkin,
} from "@/lib/game/state";
import {
  BLOOD_MOON,
  BLOOD_MOON_COSMETICS,
  BLOOD_MOON_SKINS,
  bloodMoonActive,
  bloodMoonRemaining,
  type BloodMoonSkin,
} from "@/lib/game/bloodmoon";
import { MONSTERS_BY_ID } from "@/lib/game/monsters";
import { COSMETICS_BY_ID } from "@/lib/game/cosmetics";

import { MonsterArt, RarityBadge, rarityText } from "@/components/game/MonsterArt";
import { PageHeader, StatCard } from "@/components/game/Primitives";
import { AnimatedNumber, SmoothBar, Stagger } from "@/components/game/motion";
import { Button } from "@/components/ui/button";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lua-de-sangue")({
  head: () => ({
    meta: [
      { title: "Lua de Sangue — evento especial do Monster Study" },
      {
        name: "description",
        content:
          "Estude e leia durante a Lua de Sangue para ganhar moedas do evento e comprar 10 skins exclusivas de monstros lendários, míticos e divinos.",
      },
      { property: "og:title", content: "🌕🔴 Lua de Sangue — Monster Study" },
      {
        property: "og:description",
        content: "Evento temporário com moeda própria, loja exclusiva e skins que ficam para sempre.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BloodMoonPage,
});

function BloodMoonPage() {
  const state = useGame();
  const ev = bloodMoonState(state);
  const active = bloodMoonActive();
  const [remaining, setRemaining] = useState(() => bloodMoonRemaining());
  const [flash, setFlash] = useState<string | null>(null);
  const prog = bloodMoonProgress(state);

  useEffect(() => {
    const id = window.setInterval(() => setRemaining(bloodMoonRemaining()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  function purchaseSkin(skin: BloodMoonSkin) {
    const res = buyBloodMoonSkin(skin.id);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    setFlash(skin.id);
    window.setTimeout(() => setFlash(null), 1800);
    toast.success(`🩸 ${res.message}`);
  }

  return (
    <div className="bm-scope space-y-6">
      <PageHeader
        title="Lua de Sangue"
        icon="🌕"
        subtitle={
          active
            ? "Evento temporário: cada minuto de estudo ou leitura rende moedas do evento."
            : "Evento encerrado — o que você comprou continua seu para sempre."
        }
      />

      {/* ---------- cabeçalho do evento ---------- */}
      <section className="panel bm-panel relative overflow-hidden p-5 sm:p-7">
        <div className="bm-moon pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full opacity-80" />
        {active &&
          Array.from({ length: 7 }).map((_, i) => (
            <span
              key={i}
              className="bm-drip pointer-events-none absolute top-0 h-6 w-[3px] rounded-full bg-[oklch(0.55_0.21_22)]"
              style={{ left: `${8 + i * 13}%`, animationDelay: `${i * 0.4}s` }}
            />
          ))}

        <div className="relative space-y-4">
          <p className="anim-up font-display text-xs font-bold uppercase tracking-[0.35em] text-[oklch(0.68_0.2_22)]">
            {BLOOD_MOON.icon} Evento especial
          </p>
          <h2 className="anim-up font-display text-3xl font-bold text-glow">
            {active ? "A Lua de Sangue está no céu" : "Lua de Sangue encerrada"}
          </h2>
          <p className="anim-up max-w-2xl text-sm text-muted-foreground">
            {active
              ? BLOOD_MOON.description
              : "As lembranças da Lua de Sangue permanecem na sua coleção."}
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label={active ? "Tempo restante" : "Situação"}
              value={active ? remaining.label : "Encerrado"}
              hint={active ? `${remaining.days} dias e ${remaining.hours} horas` : "Loja fechada"}
            />
            <StatCard
              label="Moedas do evento"
              value={
                <span className="text-[oklch(0.7_0.2_22)]">
                  🩸 <AnimatedNumber value={ev.coins} format={(n) => num(n)} />
                </span>
              }
              hint={`${num(ev.earned)} ganhas no total`}
            />
            <StatCard
              label="Skins conquistadas"
              value={`${ev.skins.length}/${BLOOD_MOON_SKINS.length}`}
              hint="Permanentes na sua conta"
            />
          </div>

          {active && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                Próxima moeda: {Math.round(prog.current)}s / {prog.target}s de estudo ou leitura
                (≈60 moedas por hora)
              </p>
              <SmoothBar
                pct={prog.pct}
                barClassName="bg-[oklch(0.58_0.21_22)]"
              />
            </div>
          )}
        </div>
      </section>

      {/* ---------- loja de skins ---------- */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">🩸 Loja da Lua de Sangue — Skins</h2>
        <p className="text-sm text-muted-foreground">
          10 skins exclusivas: 3 divinas, 3 míticas e 4 lendárias. Só a moeda do evento é aceita.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BLOOD_MOON_SKINS.map((skin, i) => {
            const def = MONSTERS_BY_ID[skin.monsterId];
            if (!def) return null;
            const owned = ownsBloodMoonSkin(skin.id, state);
            const equipped = ev.equipped[skin.monsterId] === skin.id;
            const missing = skin.price - ev.coins;
            return (
              <Stagger key={skin.id} index={i}>
                <article
                  className={cn(
                    "panel panel-hover flex h-full flex-col gap-3 p-4",
                    owned && "bm-panel",
                    flash === skin.id && "anim-pop",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <MonsterArt art={def.art} rarity={def.rarity} size="md" skinId={skin.id} />
                    <div className="min-w-0">
                      <p className="font-display text-sm font-bold leading-tight">{skin.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <RarityBadge rarity={skin.rarity} />
                        <span className={cn("text-[11px] font-semibold", rarityText(skin.rarity))}>
                          Skin exclusiva
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">{skin.description}</p>
                    </div>
                  </div>

                  <div className="mt-auto space-y-2">
                    <p className="font-display text-lg font-bold text-[oklch(0.7_0.2_22)]">
                      🩸 {num(skin.price)}
                    </p>
                    {owned ? (
                      <Button
                        variant={equipped ? "default" : "secondary"}
                        className="w-full"
                        onClick={() => toggleBloodMoonSkin(skin.id)}
                      >
                        {equipped ? "✔️ Equipada — remover" : "Equipar skin"}
                      </Button>
                    ) : active ? (
                      <Button
                        className="w-full"
                        disabled={missing > 0}
                        onClick={() => purchaseSkin(skin)}
                      >
                        {missing > 0 ? `Faltam 🩸 ${num(missing)}` : "Comprar"}
                      </Button>
                    ) : (
                      <Button className="w-full" disabled>
                        Indisponível — evento encerrado
                      </Button>
                    )}
                  </div>
                </article>
              </Stagger>
            );
          })}
        </div>
      </section>

      {/* ---------- cosméticos do evento ---------- */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">🌘 Cosméticos do evento</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BLOOD_MOON_COSMETICS.map((entry, i) => {
            const def = COSMETICS_BY_ID[entry.cosmeticId];
            if (!def) return null;
            const owned = (state.cosmetics?.owned ?? []).includes(entry.cosmeticId);
            const missing = entry.price - ev.coins;
            return (
              <Stagger key={entry.cosmeticId} index={i}>
                <article className="panel panel-hover flex h-full flex-col gap-2 p-4">
                  <span className="text-2xl">{def.icon}</span>
                  <p className="font-display text-sm font-bold">{def.name}</p>
                  <p className="text-xs text-muted-foreground">{def.description}</p>
                  <p className="mt-auto font-display font-bold text-[oklch(0.7_0.2_22)]">
                    🩸 {num(entry.price)}
                  </p>
                  {owned ? (
                    <Button variant="secondary" className="w-full" disabled>
                      ✔️ Adquirido
                    </Button>
                  ) : active ? (
                    <Button
                      className="w-full"
                      disabled={missing > 0}
                      onClick={() => {
                        const res = buyBloodMoonCosmetic(entry.cosmeticId);
                        if (res.ok) toast.success(`🩸 ${res.message}`);
                        else toast.error(res.message);
                      }}
                    >
                      {missing > 0 ? `Faltam 🩸 ${num(missing)}` : "Comprar"}
                    </Button>
                  ) : (
                    <Button className="w-full" disabled>
                      Evento encerrado
                    </Button>
                  )}
                </article>
              </Stagger>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Cosméticos comprados aparecem em Perfil → Cosméticos e continuam disponíveis depois do
          evento. A moeda da Lua de Sangue não é convertida em dinheiro, diamantes ou fragmentos.
        </p>
      </section>
    </div>
  );
}
