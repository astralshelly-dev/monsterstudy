import arcanist from "@/assets/avatars/arcanist.png";
import ranger from "@/assets/avatars/ranger.png";
import astromancer from "@/assets/avatars/astromancer.png";
import dragonknight from "@/assets/avatars/dragonknight.png";
import librarian from "@/assets/avatars/librarian.png";
import alchemist from "@/assets/avatars/alchemist.png";
import nightwitch from "@/assets/avatars/nightwitch.png";

export type AvatarDef = { id: string; name: string; src: string };

/** avatares ilustrados (o valor salvo em profile.avatar é `art:<id>`) */
export const ILLUSTRATED_AVATARS: AvatarDef[] = [
  { id: "arcanist", name: "Arcanista", src: arcanist },
  { id: "ranger", name: "Guardião", src: ranger },
  { id: "astromancer", name: "Astromante", src: astromancer },
  { id: "dragonknight", name: "Cavaleiro Dragão", src: dragonknight },
  { id: "librarian", name: "Bibliotecário", src: librarian },
  { id: "alchemist", name: "Alquimista", src: alchemist },
  { id: "nightwitch", name: "Bruxa da Lua", src: nightwitch },
];

export const AVATAR_EMOJIS = [
  "🧙",
  "🧝",
  "🧛",
  "🦸",
  "🥷",
  "🧚",
  "🐉",
  "🦉",
  "🔮",
  "📚",
  "⚔️",
  "🌙",
];

export function illustratedAvatar(value: string): AvatarDef | undefined {
  if (!value.startsWith("art:")) return undefined;
  const id = value.slice(4);
  return ILLUSTRATED_AVATARS.find((a) => a.id === id);
}
