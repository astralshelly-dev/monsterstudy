import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  ART_TILES,
  themeById,
  themeIdForPath,
  type ParticleId,
  type SceneTheme,
} from "@/lib/game/themes";

// ------------------------------------------------------------
// Contexto: a rota define o tema, mas telas podem sobrescrever
// (ex.: ao abrir o perfil de outro jogador usamos o fundo dele).
// ------------------------------------------------------------
type Ctx = {
  theme: SceneTheme;
  setOverride: (id: string | null) => void;
};

const SceneThemeContext = createContext<Ctx | null>(null);

export function SceneThemeProvider({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [override, setOverride] = useState<string | null>(null);

  // trocar de aba sempre limpa o tema emprestado
  useEffect(() => {
    setOverride(null);
  }, [pathname]);

  const theme = useMemo(
    () => themeById(override ?? themeIdForPath(pathname)),
    [override, pathname],
  );

  const value = useMemo<Ctx>(() => ({ theme, setOverride }), [theme]);

  return (
    <SceneThemeContext.Provider value={value}>
      <SceneBackground theme={theme} className="-z-10" />
      {children}
    </SceneThemeContext.Provider>
  );
}

export function useSceneTheme(): SceneTheme {
  return useContext(SceneThemeContext)?.theme ?? themeById(null);
}

/**
 * Aplica um tema enquanto o componente estiver montado.
 * Ao desmontar (fechar o perfil, trocar de jogador ou de aba) volta ao tema da rota.
 */
export function useSceneThemeOverride(themeId?: string | null) {
  const ctx = useContext(SceneThemeContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setOverride(themeId ?? null);
    return () => ctx.setOverride(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId]);
}

// ------------------------------------------------------------
// Cena: cor sólida + desenho de contorno + partículas
// ------------------------------------------------------------
export function SceneBackground({
  theme,
  absolute = false,
  className,
}: {
  theme: SceneTheme;
  absolute?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={[
        absolute ? "absolute" : "fixed",
        "inset-0 overflow-hidden transition-colors duration-700",
        className ?? "",
      ].join(" ")}
      style={{ backgroundColor: theme.bg }}
    >
      <ArtLayer theme={theme} />
      <Particles theme={theme} />
      {/* leve toque metálico: brilho plano no topo, sem gradiente colorido */}
      <div className="absolute inset-x-0 top-0 h-px" style={{ backgroundColor: theme.ink, opacity: 0.25 }} />
    </div>
  );
}

function ArtLayer({ theme }: { theme: SceneTheme }) {
  const url = useMemo(() => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">` +
      `<g fill="none" stroke="${theme.ink}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">` +
      `${ART_TILES[theme.art]}</g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, [theme.art, theme.ink]);

  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: url,
        backgroundRepeat: "repeat",
        backgroundSize: "220px 220px",
        opacity: 0.11,
      }}
    />
  );
}

type ParticleSpec = {
  count: number;
  min: number;
  max: number;
  keyframe: string;
  duration: [number, number];
  opacity: number;
  shape: "dot" | "square" | "diamond" | "star";
  blur?: number;
};

const PARTICLES: Record<ParticleId, ParticleSpec> = {
  dust: { count: 34, min: 2, max: 4, keyframe: "scene-drift-up", duration: [16, 30], opacity: 0.35, shape: "dot" },
  spark: { count: 28, min: 2, max: 5, keyframe: "scene-twinkle", duration: [2.4, 5.6], opacity: 0.7, shape: "star" },
  ember: { count: 30, min: 3, max: 6, keyframe: "scene-rise", duration: [7, 14], opacity: 0.55, shape: "dot", blur: 1 },
  leaf: { count: 20, min: 5, max: 10, keyframe: "scene-sway", duration: [12, 22], opacity: 0.3, shape: "diamond" },
  snow: { count: 40, min: 2, max: 5, keyframe: "scene-fall", duration: [12, 24], opacity: 0.45, shape: "dot" },
  bubble: { count: 22, min: 6, max: 14, keyframe: "scene-rise", duration: [14, 26], opacity: 0.18, shape: "dot" },
  star: { count: 26, min: 4, max: 9, keyframe: "scene-twinkle", duration: [3, 7], opacity: 0.6, shape: "star" },
};

/** ruído determinístico: mesma cena em SSR e no cliente (sem hydration mismatch) */
function rnd(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function Particles({ theme }: { theme: SceneTheme }) {
  const spec = PARTICLES[theme.particle];
  const items = useMemo(() => {
    const base = theme.particle.length * 17 + theme.art.length * 5;
    return Array.from({ length: spec.count }, (_, i) => {
      const a = rnd(base + i * 3 + 1);
      const b = rnd(base + i * 3 + 2);
      const c = rnd(base + i * 3 + 3);
      const r2 = (n: number) => Math.round(n * 100) / 100;
      return {
        left: r2(b * 100),
        top: r2(c * 100),
        size: r2(spec.min + a * (spec.max - spec.min)),
        delay: r2(a * 12),
        duration: r2(spec.duration[0] + c * (spec.duration[1] - spec.duration[0])),
      };
    });
  }, [theme.particle, theme.art, spec]);

  return (
    <div className="absolute inset-0">
      {items.map((p, i) => (
        <span
          key={i}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: spec.shape === "star" ? "transparent" : theme.ink,
            boxShadow: spec.shape === "star" ? `0 0 ${p.size * 2}px ${p.size / 2}px ${theme.ink}` : undefined,
            borderRadius: spec.shape === "dot" ? "999px" : spec.shape === "diamond" ? "2px" : "999px",
            transform: spec.shape === "diamond" ? "rotate(45deg)" : undefined,
            filter: spec.blur ? `blur(${spec.blur}px)` : undefined,
            opacity: spec.opacity,
            animation: `${spec.keyframe} ${p.duration}s linear ${-p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
