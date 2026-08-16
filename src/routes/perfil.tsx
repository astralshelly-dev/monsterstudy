import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useGame } from "@/hooks/use-game";
import {
  battleData,
  cosmeticUnlocked,
  equippedCosmetic,
  monsterProgress,
  seasonState,
  setCosmetic,
  subjectList,
  totals,
  updateProfile,
  userProgress,
} from "@/lib/game/state";
import { COSMETICS, COSMETIC_KINDS, unlockLabel } from "@/lib/game/cosmetics";
import { SceneBackground, useSceneThemeOverride } from "@/components/game/SceneTheme";
import { themeById } from "@/lib/game/themes";
import { NAME_MAX_LENGTH, validateName } from "@/lib/game/names";

import { leagueProgress } from "@/lib/game/battle/config";
import { PageHeader, StatCard } from "@/components/game/Primitives";
import { MonsterArt, RarityBadge } from "@/components/game/MonsterArt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { duration, money, num, shortDate } from "@/lib/format";
import { ILLUSTRATED_AVATARS } from "@/lib/game/avatars";
import { MONSTERS_BY_ID } from "@/lib/game/monsters";
import { ProfileAvatar } from "@/components/game/Avatar";
import { cn } from "@/lib/utils";
import { useCloudSync } from "@/hooks/use-auth";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Monster Study" },
      {
        name: "description",
        content: "Seu caçador de conhecimento: nível, XP, monstro em treino e totais acumulados.",
      },
      { property: "og:title", content: "Perfil — Monster Study" },
      { property: "og:description", content: "Nível, XP e resumo da sua jornada no Monster Study." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const state = useGame();
  const { saveNow, ready } = useCloudSync();
  const t = totals(state);
  const up = userProgress(state);
  const active = state.activeMonsterId ? monsterProgress(state.activeMonsterId, state) : null;
  const [name, setName] = useState(state.profile.name);
  useEffect(() => setName(state.profile.name), [state.profile.name]);
  const bd = battleData(state);
  const lp = leagueProgress(bd.trophies);
  const ss = seasonState(state);
  const subjects = subjectList(state);
  const frame = equippedCosmetic("frame", state);
  const title = equippedCosmetic("title", state);
  const bg = equippedCosmetic("background", state);
  const badge = equippedCosmetic("badge", state);
  const fx = equippedCosmetic("effect", state);
  useSceneThemeOverride(bg?.id ?? null);

  return (
    <div className="space-y-6">
      <PageHeader title="Perfil" icon="🧙" subtitle="Sua identidade de caçador de conhecimento." />

      <div className={cn("panel p-6", bg?.className)}>
        <div className="flex flex-wrap items-center gap-5">
          <div className={cn("rounded-2xl", frame?.className, fx?.className)}>
            <ProfileAvatar
              avatar={state.profile.avatar}
              monsterId={state.profile.avatarMonsterId}
              size="lg"
            />
          </div>
          <div className="min-w-56 flex-1">
            <p className="font-display text-2xl font-bold">
              {badge && <span className="mr-1.5">{badge.icon}</span>}
              {state.profile.name}
            </p>
            {title && (
              <p className="text-sm font-semibold text-primary">
                {title.icon} {title.name}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Nível {state.profile.level} · desde {shortDate(state.profile.createdAt.slice(0, 10))}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${up.pct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {num(up.xp)} / {num(up.need)} XP
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <div className="flex gap-2">
              <Input
                value={name}
                maxLength={NAME_MAX_LENGTH}
                onChange={(e) => setName(e.target.value)}
              />
              <Button
                disabled={!name.trim()}
                onClick={async () => {
                  const check = validateName(name);
                  if (!check.ok) {
                    toast.error(check.error ?? "Nome inválido");
                    setName(check.name);
                    return;
                  }
                  updateProfile({ name: check.name });
                  setName(check.name);
                  if (!ready) {
                    toast.success("Perfil salvo neste dispositivo");
                    return;
                  }
                  const saved = await saveNow();
                  if (saved) toast.success("Perfil salvo e sincronizado");
                  else toast.error("Salvo neste dispositivo; sincronização pendente");
                }}
              >
                Salvar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Sem emojis · até {NAME_MAX_LENGTH} caracteres.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Foto de perfil</Label>
            <p className="text-xs text-muted-foreground">Escolha um retrato ilustrado.</p>
            <div className="flex flex-wrap gap-2">
              {ILLUSTRATED_AVATARS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  title={a.name}
                  onClick={() => {
                    updateProfile({ avatar: `art:${a.id}`, avatarMonsterId: null });
                    toast.success(`Retrato: ${a.name}`);
                  }}
                  className={cn(
                    "h-14 w-14 overflow-hidden rounded-xl bg-secondary/60 ring-1 ring-border/60 transition-transform hover:scale-105",
                    state.profile.avatar === `art:${a.id}` &&
                      !state.profile.avatarMonsterId &&
                      "ring-2 ring-primary",
                  )}
                >
                  <img src={a.src} alt={a.name} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel space-y-3 p-6">
        <h2 className="font-display text-lg font-semibold">Usar um monstro como foto</h2>
        <p className="text-sm text-muted-foreground">
          Qualquer criatura que você já capturou pode ser sua foto de perfil.
        </p>
        {Object.keys(state.monsters).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Você ainda não capturou monstros. Complete uma sessão para começar.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.values(state.monsters).map((m) => {
              const def = MONSTERS_BY_ID[m.id];
              if (!def) return null;
              return (
                <button
                  key={m.id}
                  type="button"
                  title={def.name}
                  onClick={() => {
                    updateProfile({ avatarMonsterId: m.id });
                    toast.success(`Foto de perfil: ${def.name}`);
                  }}
                  className={cn(
                    "h-14 w-14 overflow-hidden rounded-xl bg-secondary/60 ring-1 ring-border/60 transition-transform hover:scale-105",
                    state.profile.avatarMonsterId === m.id && "ring-2 ring-primary",
                  )}
                >
                  <img src={def.art} alt={def.name} className="h-full w-full object-cover" />
                </button>
              );
            })}
          </div>
        )}
        {state.profile.avatarMonsterId && (
          <Button variant="outline" size="sm" onClick={() => updateProfile({ avatarMonsterId: null })}>
            Remover monstro da foto
          </Button>
        )}
      </div>

      {active && (
        <div className="panel flex items-center gap-4 p-5">
          <MonsterArt art={active.def.art} rarity={active.def.rarity} />
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Em treino</p>
            <p className="font-display text-lg font-bold">{active.def.name}</p>
            <div className="mt-1 flex items-center gap-2">
              <RarityBadge rarity={active.def.rarity} />
              <span className="text-xs text-muted-foreground">Nível {active.level}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sessões" value={num(t.sessions)} />
        <StatCard label="Tempo total" value={duration(t.studySec + t.readSec)} />
        <StatCard label="Páginas lidas" value={num(t.pages)} />
        <StatCard label="Livros concluídos" value={num(t.booksDone)} />
        <StatCard label="Monstros" value={`${t.discovered}/${t.totalMonsters}`} />
        <StatCard label="Fragmentos" value={num(state.shards)} />
        <StatCard label="Dinheiro" value={money(state.money)} />
        <StatCard label="Melhor streak" value={`🔥 ${state.streak.best} dias`} />
      </div>

      <section className="panel space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">⚔️ Batalhas</h2>
          <span className="font-display text-xl font-bold text-gold">{num(bd.trophies)} 🏆</span>
        </div>
        <div>
          <p className="text-sm">
            {lp.league.icon} Liga {lp.league.name}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${lp.pct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {lp.next
              ? `Faltam ${num(lp.missing)} troféus para ${lp.next.name}`
              : "Liga máxima alcançada."}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Temporada {ss.season.number} · {ss.season.name} · {ss.season.daysLeft} dia(s) restante(s)
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Vitórias" value={num(bd.wins)} />
          <StatCard label="Derrotas" value={num(bd.losses)} />
          <StatCard label="Total de batalhas" value={num(bd.wins + bd.losses)} />
          <StatCard label="Maior troféus" value={num(bd.bestTrophies)} />
        </div>
      </section>

      {subjects.length > 0 && (
        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">📚 Níveis por matéria</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {subjects.slice(0, 8).map((sub) => (
              <div key={sub.key} className="flex items-center gap-2 rounded-xl bg-secondary/40 p-2.5">
                <span>{sub.icon}</span>
                <span className="truncate text-sm font-medium">{sub.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  Nv. {sub.level} · {duration(sub.totalSec)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel space-y-4 p-5">
        <div>
          <h2 className="font-display text-lg font-semibold">🎨 Cosméticos</h2>
          <p className="text-sm text-muted-foreground">
            Desbloqueados jogando. São apenas visuais — nenhuma vantagem em batalha.
          </p>
        </div>
        {COSMETIC_KINDS.map((kind) => {
          const list = COSMETICS.filter((c) => c.kind === kind.id);
          const current = state.cosmetics?.[kind.id] ?? null;
          return (
            <div key={kind.id} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {kind.icon} {kind.name}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {list.map((c) => {
                  const unlocked = cosmeticUnlocked(c.id, state);
                  const active = current === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => {
                        if (setCosmetic(kind.id, active ? null : c.id)) {
                          toast.success(active ? `${c.name} removido` : `${c.name} equipado`);
                        } else {
                          toast.error("Cosmético ainda bloqueado");
                        }
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-xl bg-secondary/40 p-3 text-left transition-colors",
                        unlocked ? "hover:bg-secondary/70" : "opacity-50",
                        active && "ring-2 ring-primary",
                      )}
                    >
                      {c.kind === "background" ? (
                        <span className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg ring-1 ring-border/60">
                          <SceneBackground theme={themeById(c.id)} absolute />
                        </span>
                      ) : (
                        <span className="text-lg">{c.icon}</span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{c.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {unlocked ? c.description : `🔒 ${unlockLabel(c.unlock)}`}
                        </span>
                      </span>
                      {active && <span className="ml-auto text-xs text-primary">Equipado</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
