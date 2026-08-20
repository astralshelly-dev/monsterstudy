// Retratos (fotos de perfil) das skins do evento Lua de Sangue.
// Cada retrato é desbloqueado ao comprar a skin correspondente.

import a0 from "@/assets/skin-avatars/bm_av_equinoxis.png.asset.json";
import a1 from "@/assets/skin-avatars/bm_av_luminara.png.asset.json";
import a2 from "@/assets/skin-avatars/bm_av_astraeon.png.asset.json";
import a3 from "@/assets/skin-avatars/bm_av_eclipsaur.png.asset.json";
import a4 from "@/assets/skin-avatars/bm_av_abyssaria.png.asset.json";
import a5 from "@/assets/skin-avatars/bm_av_umbraleth.png.asset.json";
import a6 from "@/assets/skin-avatars/bm_av_chronavyr.png.asset.json";
import a7 from "@/assets/skin-avatars/bm_av_solmyrr.png.asset.json";
import a8 from "@/assets/skin-avatars/bm_av_thundrix.png.asset.json";
import a9 from "@/assets/skin-avatars/bm_av_titanox.png.asset.json";

/** retrato por id de skin */
export const SKIN_AVATARS: Record<string, string> = {
  bm_skin_equinoxis: a0.url,
  bm_skin_luminara: a1.url,
  bm_skin_astraeon: a2.url,
  bm_skin_eclipsaur: a3.url,
  bm_skin_abyssaria: a4.url,
  bm_skin_umbraleth: a5.url,
  bm_skin_chronavyr: a6.url,
  bm_skin_solmyrr: a7.url,
  bm_skin_thundrix: a8.url,
  bm_skin_titanox: a9.url,
};

/** prefixo salvo em profile.avatar */
export const SKIN_AVATAR_PREFIX = "skinav:";

export function skinAvatarArt(skinId?: string | null): string | undefined {
  return skinId ? SKIN_AVATARS[skinId] : undefined;
}

/** resolve `skinav:<skinId>` guardado no perfil */
export function skinAvatarFromValue(value: string): string | undefined {
  if (!value.startsWith(SKIN_AVATAR_PREFIX)) return undefined;
  return SKIN_AVATARS[value.slice(SKIN_AVATAR_PREFIX.length)];
}
