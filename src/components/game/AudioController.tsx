import { useEffect } from "react";
import { useGame } from "@/hooks/use-game";
import {
  playSfx,
  refreshMusicVolume,
  setMusicSuspended,
  startMusic,
  stopMusic,
} from "@/lib/game/audio";

/**
 * Liga a trilha ambiente (tema Lua de Sangue) após a primeira interação do
 * usuário, aplica os volumes das Configurações, silencia tudo durante sessões
 * de estudo/leitura e toca um clique discreto nos controles.
 */
export function AudioController() {
  const state = useGame();
  const musicOn = state.settings.music !== false;
  const musicVol = state.settings.musicVolume ?? 0.35;
  const inSession = state.timer !== null;

  // clique global em controles
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const el = (e.target as HTMLElement | null)?.closest(
        "button, a[href], [role='tab'], [role='menuitem'], [role='option'], label.press",
      );
      if (!el || (el as HTMLButtonElement).disabled) return;
      playSfx("click");
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // a música só pode iniciar depois de uma interação (política do navegador)
  useEffect(() => {
    if (!musicOn) {
      stopMusic();
      return;
    }
    const kick = () => startMusic();
    startMusic();
    document.addEventListener("pointerdown", kick, { once: true });
    document.addEventListener("keydown", kick, { once: true });
    return () => {
      document.removeEventListener("pointerdown", kick);
      document.removeEventListener("keydown", kick);
    };
  }, [musicOn]);

  useEffect(() => {
    refreshMusicVolume();
  }, [musicVol, musicOn]);

  // silêncio total durante uma sessão em andamento
  useEffect(() => {
    setMusicSuspended(inSession);
  }, [inSession]);

  useEffect(() => () => stopMusic(), []);

  return null;
}
