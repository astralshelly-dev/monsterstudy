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
      <SceneProps theme={theme} />
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

function SceneProps({ theme }: { theme: SceneTheme }) {
  if (!theme.props?.length) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {theme.props.map((p, i) => (
        <span
          key={`${theme.id}-prop-${i}`}
          className="absolute anim-float opacity-30 grayscale-[0.4] select-none"
          style={{
            top: `${p.top}%`,
            left: `${p.left}%`,
            fontSize: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            filter: "blur(0.5px)",
          }}
        >
          {p.icon}
        </span>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Partículas: três camadas (trajeto → oscilação → brilho)
// para um movimento orgânico em vez de pontos duros subindo.
// ------------------------------------------------------------
type ParticleSpec = {
  count: number;
  min: number;
  max: number;
  /** trajeto vertical */
  travel: string;
  travelDur: [number, number];
  /** oscilação horizontal */
  swing: [number, number];
  swingDur: [number, number];
  /** brilho: respiração lenta ou cintilância rápida */
  glow: "breathe" | "steady";
  glowDur: [number, number];
  opacity: [number, number];
  shape: "dot" | "glow" | "diamond" | "star" | "ring";
  blur?: number;
  spin?: boolean;
};

const PARTICLES: Record<ParticleId, ParticleSpec> = {
  dust: {
    count: 46,
    min: 1.5,
    max: 3.5,
    travel: "scene-drift-up",
    travelDur: [26, 52],
    swing: [10, 34],
    swingDur: [7, 14],
    glow: "breathe",
    glowDur: [5, 11],
    opacity: [0.12, 0.4],
    shape: "glow",
  },
  spark: {
    count: 40,
    min: 1.5,
    max: 3,
    travel: "scene-drift-up",
    travelDur: [22, 44],
    swing: [8, 22],
    swingDur: [5, 10],
    glow: "breathe",
    glowDur: [1.8, 4.5],
    opacity: [0.3, 0.9],
    shape: "star",
  },
  ember: {
    count: 34,
    min: 2,
    max: 5,
    travel: "scene-rise",
    travelDur: [12, 26],
    swing: [16, 44],
    swingDur: [3.5, 8],
    glow: "breathe",
    glowDur: [1.6, 3.6],
    opacity: [0.25, 0.75],
    shape: "glow",
    blur: 1.2,
  },
  leaf: {
    count: 18,
    min: 5,
    max: 10,
    travel: "scene-sway",
    travelDur: [20, 38],
    swing: [40, 90],
    swingDur: [6, 12],
    glow: "steady",
    glowDur: [8, 14],
    opacity: [0.14, 0.32],
    shape: "diamond",
    spin: true,
  },
  snow: {
    count: 52,
    min: 2,
    max: 4.5,
    travel: "scene-fall",
    travelDur: [18, 40],
    swing: [22, 60],
    swingDur: [5, 11],
    glow: "breathe",
    glowDur: [6, 12],
    opacity: [0.2, 0.6],
    shape: "glow",
  },
  bubble: {
    count: 20,
    min: 8,
    max: 20,
    travel: "scene-rise",
    travelDur: [24, 46],
    swing: [18, 46],
    swingDur: [6, 13],
    glow: "steady",
    glowDur: [10, 18],
    opacity: [0.08, 0.2],
    shape: "ring",
  },
  star: {
    count: 34,
    min: 2,
    max: 5,
    travel: "scene-twinkle",
    travelDur: [14, 30],
    swing: [6, 18],
    swingDur: [8, 16],
    glow: "breathe",
    glowDur: [2.4, 6],
    opacity: [0.25, 0.9],
    shape: "star",
  },
};

/** ruído determinístico: mesma cena em SSR e no cliente (sem hydration mismatch) */
function rnd(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function Particles({ theme }: { theme: SceneTheme }) {
  const spec = PARTICLES[theme.particle];
  const items = useMemo(() => {
    const base = theme.particle.length * 17 + theme.art.length * 5;
    return Array.from({ length: spec.count }, (_, i) => {
      const a = rnd(base + i * 5 + 1);
      const b = rnd(base + i * 5 + 2);
      const c = rnd(base + i * 5 + 3);
      const d = rnd(base + i * 5 + 4);
      const e = rnd(base + i * 5 + 5);
      // profundidade: partículas "longe" são menores, mais lentas e mais fracas
      const depth = a;
      return {
        left: r2(b * 100),
        top: r2(c * 100),
        size: r2(lerp(spec.min, spec.max, depth)),
        travelDur: r2(lerp(spec.travelDur[1], spec.travelDur[0], depth)),
        travelDelay: r2(d * lerp(spec.travelDur[1], spec.travelDur[0], depth)),
        swing: r2(lerp(spec.swing[0], spec.swing[1], e)),
        swingDur: r2(lerp(spec.swingDur[0], spec.swingDur[1], d)),
        glowDur: r2(lerp(spec.glowDur[0], spec.glowDur[1], e)),
        glowDelay: r2(e * 6),
        opacity: r2(lerp(spec.opacity[0], spec.opacity[1], depth)),
        spinDur: r2(lerp(9, 22, c)),
      };
    });
  }, [theme.particle, theme.art, spec]);

  return (
    <div className="absolute inset-0">
      {items.map((p, i) => (
        <span
          key={i}
          className="absolute will-change-transform"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            animation: `${spec.travel} ${p.travelDur}s linear ${-p.travelDelay}s infinite, scene-life ${p.travelDur}s linear ${-p.travelDelay}s infinite`,
          }}
        >
          <span
            className="block"
            style={{
              animation: `scene-swing ${p.swingDur}s ease-in-out ${-p.glowDelay}s infinite`,
              // amplitude da oscilação
              width: 0,
              height: 0,
              transform: `translateX(${p.swing / 2}px)`,
            }}
          >
            <span
              className="block"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
                filter: spec.blur ? `blur(${spec.blur}px)` : undefined,
                animation: [
                  spec.glow === "breathe"
                    ? `scene-breathe ${p.glowDur}s ease-in-out ${-p.glowDelay}s infinite`
                    : null,
                  spec.spin ? `scene-tumble ${p.spinDur}s linear ${-p.glowDelay}s infinite` : null,
                ]
                  .filter(Boolean)
                  .join(", "),
                ...shapeStyle(spec.shape, theme.ink, p.size),
              }}
            />
          </span>
        </span>
      ))}
    </div>
  );
}

function shapeStyle(
  shape: ParticleSpec["shape"],
  ink: string,
  size: number,
): Record<string, string | undefined> {
  switch (shape) {
    case "glow":
      return {
        borderRadius: "999px",
        background: `radial-gradient(circle, ${ink} 0%, color-mix(in oklab, ${ink} 45%, transparent) 45%, transparent 72%)`,
      };
    case "star":
      return {
        borderRadius: "999px",
        background: `radial-gradient(circle, white 0%, ${ink} 35%, transparent 70%)`,
        boxShadow: `0 0 ${r2(size * 3)}px ${r2(size / 1.5)}px color-mix(in oklab, ${ink} 40%, transparent)`,
      };
    case "ring":
      return {
        borderRadius: "999px",
        border: `1px solid color-mix(in oklab, ${ink} 70%, transparent)`,
        background: `radial-gradient(circle at 32% 28%, color-mix(in oklab, ${ink} 30%, transparent) 0%, transparent 55%)`,
      };
    case "diamond":
      return {
        borderRadius: "3px",
        background: `linear-gradient(140deg, color-mix(in oklab, ${ink} 85%, transparent), color-mix(in oklab, ${ink} 30%, transparent))`,
      };
    default:
      return { borderRadius: "999px", backgroundColor: ink };
  }
}

