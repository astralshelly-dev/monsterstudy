// Arte das skins do evento Lua de Sangue (hospedada no CDN).
// Cada skin é o MESMO monstro, com paleta, roupas e pose diferentes.

import s0 from "@/assets/skins/bm_skin_equinoxis.png.asset.json";
import s1 from "@/assets/skins/bm_skin_luminara.png.asset.json";
import s2 from "@/assets/skins/bm_skin_astraeon.png.asset.json";
import s3 from "@/assets/skins/bm_skin_eclipsaur.png.asset.json";
import s4 from "@/assets/skins/bm_skin_abyssaria.png.asset.json";
import s5 from "@/assets/skins/bm_skin_umbraleth.png.asset.json";
import s6 from "@/assets/skins/bm_skin_chronavyr.png.asset.json";
import s7 from "@/assets/skins/bm_skin_solmyrr.png.asset.json";
import s8 from "@/assets/skins/bm_skin_thundrix.png.asset.json";
import s9 from "@/assets/skins/bm_skin_titanox.png.asset.json";

export const SKIN_ART: Record<string, string> = {
  bm_skin_equinoxis: s0.url,
  bm_skin_luminara: s1.url,
  bm_skin_astraeon: s2.url,
  bm_skin_eclipsaur: s3.url,
  bm_skin_abyssaria: s4.url,
  bm_skin_umbraleth: s5.url,
  bm_skin_chronavyr: s6.url,
  bm_skin_solmyrr: s7.url,
  bm_skin_thundrix: s8.url,
  bm_skin_titanox: s9.url,
};

export function skinArt(skinId?: string | null): string | undefined {
  return skinId ? SKIN_ART[skinId] : undefined;
}
