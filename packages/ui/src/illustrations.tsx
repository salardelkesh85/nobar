import type { ReactNode } from "react";

/*
 * Hand-drawn produce illustrations (64×64), self-hosted and theme-safe. They stand in for real seller
 * photos (never stock photos). Gradients live once per page in <ProduceDefs/>, rendered by each app layout.
 */

const PALETTES: Record<string, [string, string, string]> = {
  red: ["#FF7A6E", "#E0352B", "#9E1B16"],
  yellow: ["#FFF0A0", "#F2CC3D", "#C49A12"],
  pom: ["#FF6F61", "#C62828", "#7E1414"],
  persimmon: ["#FFC27A", "#F4802A", "#C2510C"],
  orange: ["#FFCF7A", "#F79A26", "#D2690B"],
  tangerine: ["#FFB870", "#F27A1E", "#C4560A"],
  lime: ["#F7F0A6", "#E3D45A", "#A99A1E"],
  quince: ["#FFF1A8", "#EBCB45", "#B8901A"],
  kiwiSkin: ["#C9A06A", "#9A6B3A", "#6B4522"],
  kiwiFlesh: ["#D4EE9C", "#8CC63F", "#5E9A24"],
  grapeW: ["#EEFABB", "#B8DB5A", "#7EA72C"],
  grapeB: ["#B98AD8", "#6B3A8C", "#3A1A52"],
  date: ["#D08A52", "#8A4A22", "#4E2410"],
  walnut: ["#E8C79A", "#B98A55", "#7E5530"],
  tomato: ["#FF8A73", "#E8412E", "#A9221A"],
  cucumber: ["#A4DE84", "#4E9F3D", "#2B6B24"],
  eggplant: ["#BE90DE", "#6E3592", "#3D1757"],
  potato: ["#F4DDB4", "#D2AE74", "#9C7A45"],
  onion: ["#F8D199", "#DB8E45", "#A85A22"],
  pumpkin: ["#FFC683", "#F28A2E", "#C25F12"],
  leaf: ["#B2E58A", "#5DAE3F", "#2F7A26"],
  leafDark: ["#86CC72", "#3E8E3A", "#1F5E22"],
  cherry: ["#FF7A88", "#D11F3A", "#86101F"],
  strawberry: ["#FF8585", "#E22C3A", "#9E1424"],
  apricot: ["#FFD596", "#F7A23A", "#D2741A"],
  peach: ["#FFD9C2", "#FF9A7A", "#E0604E"],
  greengage: ["#DDF39A", "#99CC3E", "#5E8E1E"],
  almond: ["#D6EEAC", "#93C45A", "#5E8C32"],
  rind: ["#86CC72", "#2E7D32", "#1B4D1E"],
  melon: ["#FFA3A3", "#F2545B", "#C42F3A"],
  fig: ["#BE96D2", "#6E3F86", "#3E2050"],
};

/** Renders the shared gradients once per page; place it near the top of <body>. */
export function ProduceDefs() {
  return (
    <svg width="0" height="0" aria-hidden focusable="false" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        {Object.entries(PALETTES).map(([k, [a, b, c]]) => (
          <radialGradient key={k} id={`pg-${k}`} cx="35%" cy="30%" r="80%">
            <stop offset="0" stopColor={a} />
            <stop offset="0.55" stopColor={b} />
            <stop offset="1" stopColor={c} />
          </radialGradient>
        ))}
        <linearGradient id="pg-stem" x1="0" x2="1">
          <stop offset="0" stopColor="#8B5E3C" />
          <stop offset="1" stopColor="#5C3A1E" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const f = (k: string) => `url(#pg-${k})`;
const Shine = ({ x, y, rx = 4, ry = 6, r = -25 }: { x: number; y: number; rx?: number; ry?: number; r?: number }) => (
  <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#fff" opacity="0.45" transform={`rotate(${r} ${x} ${y})`} />
);
const Ground = ({ w = 17 }: { w?: number }) => <ellipse cx="32" cy="59" rx={w} ry="2.6" fill="#000" opacity="0.1" />;
const Leaf = ({ d, k = "leaf" }: { d: string; k?: string }) => <path d={d} fill={f(k)} />;
const Stem = ({ d, w = 2.6 }: { d: string; w?: number }) => <path d={d} stroke="url(#pg-stem)" strokeWidth={w} strokeLinecap="round" fill="none" />;

function apple(k: "red" | "yellow"): ReactNode {
  return (
    <>
      <Ground />
      <path d="M32 19 C 24 12, 9 16, 10.5 33 C 12 47, 22 57, 28 55.5 C 30 55, 34 55, 36 55.5 C 42 57, 52 47, 53.5 33 C 55 16, 40 12, 32 19 Z" fill={f(k)} />
      <Stem d="M32 19 C 32 14, 33 10, 36 7" />
      <Leaf d="M34.5 13 C 38 6, 47 5.5, 50 9 C 46 14.5, 39.5 15.5, 34.5 13 Z" />
      <Shine x={20} y={29} />
    </>
  );
}

function citrus(k: "orange" | "tangerine" | "lime", flat = false): ReactNode {
  const ry = flat ? 17 : 20;
  return (
    <>
      <Ground />
      <ellipse cx="32" cy={36} rx="20" ry={ry} fill={f(k)} />
      {[[22, 30], [28, 44], [40, 40], [36, 28], [44, 32], [24, 40], [32, 50], [42, 48]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="#000" opacity="0.12" />
      ))}
      <Stem d={`M32 ${36 - ry + 1} L32 ${36 - ry - 3}`} w={2.2} />
      <Leaf d={`M32 ${36 - ry - 2} C 36 ${36 - ry - 9}, 44 ${36 - ry - 9}, 47 ${36 - ry - 5} C 43 ${36 - ry}, 37 ${36 - ry}, 32 ${36 - ry - 2} Z`} />
      <Shine x={22} y={28} />
    </>
  );
}

function grapes(k: "grapeW" | "grapeB"): ReactNode {
  const berries = [
    [24, 24], [32, 22.5], [40, 24],
    [20, 32], [28, 31.5], [36, 31.5], [44, 32],
    [24, 40], [32, 39.5], [40, 40],
    [28, 47.5], [36, 47.5],
    [32, 54.5],
  ];
  return (
    <>
      <Ground w={11} />
      <Stem d="M32 21 C 32 15, 30 11, 27 8" />
      <Leaf d="M33 15 C 37 6, 49 5, 53 10 C 48 17, 39 19, 33 15 Z" k="leafDark" />
      {berries.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="5.4" fill={f(k)} />
          <circle cx={x! - 1.8} cy={y! - 1.8} r="1.3" fill="#fff" opacity="0.5" />
        </g>
      ))}
    </>
  );
}

const ILLUSTRATIONS: Record<string, () => ReactNode> = {
  "apple-red": () => apple("red"),
  "apple-yellow": () => apple("yellow"),
  pomegranate: () => (
    <>
      <Ground />
      <circle cx="32" cy="37" r="19.5" fill={f("pom")} />
      <path d="M25 19.5 L26.5 11 L30 16 L32 9 L34 16 L37.5 11 L39 19.5 Z" fill="#7E1414" />
      <path d="M27 37 C 30 33, 34 33, 37 37" stroke="#7E1414" strokeWidth="1" fill="none" opacity="0.35" />
      <Shine x={22} y={30} />
    </>
  ),
  persimmon: () => (
    <>
      <Ground />
      <ellipse cx="32" cy="37" rx="21" ry="17.5" fill={f("persimmon")} />
      <path d="M32 21 C 26 16, 19 18, 18 21 C 23 23.5, 28 23, 32 21 C 36 23, 41 23.5, 46 21 C 45 18, 38 16, 32 21 Z" fill={f("leafDark")} />
      <path d="M32 21 C 30 25, 34 25, 32 21" fill={f("leafDark")} />
      <Stem d="M32 20 L32 15" w={2.4} />
      <Shine x={22} y={32} />
    </>
  ),
  orange: () => citrus("orange"),
  tangerine: () => citrus("tangerine", true),
  "sweet-lime": () => citrus("lime"),
  quince: () => (
    <>
      <Ground />
      <path d="M32 14 C 26 14, 24.5 20, 22 24 C 14 30, 13 44, 20 50.5 C 26 56.5, 38 56.5, 44 50.5 C 51 44, 50 30, 42 24 C 39.5 20, 38 14, 32 14 Z" fill={f("quince")} />
      <Stem d="M32 15 C 32 11, 31 8, 29 6" />
      <Leaf d="M32 11 C 36 4, 45 3, 49 7 C 45 12, 38 13.5, 32 11 Z" />
      <Shine x={23} y={33} />
    </>
  ),
  kiwi: () => (
    <>
      <Ground />
      <ellipse cx="25" cy="30" rx="14" ry="17" fill={f("kiwiSkin")} transform="rotate(-20 25 30)" />
      <circle cx="37" cy="39" r="16" fill="#7A5230" />
      <circle cx="37" cy="39" r="14.2" fill={f("kiwiFlesh")} />
      <circle cx="37" cy="39" r="7.5" fill="#E7F5C5" opacity="0.65" />
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return <ellipse key={i} cx={37 + Math.cos(a) * 7.8} cy={39 + Math.sin(a) * 7.8} rx="0.9" ry="1.6" fill="#1F1A10" transform={`rotate(${(a * 180) / Math.PI + 90} ${37 + Math.cos(a) * 7.8} ${39 + Math.sin(a) * 7.8})`} />;
      })}
      <ellipse cx="37" cy="39" rx="3.4" ry="2.4" fill="#FBFDF1" />
    </>
  ),
  "grape-white": () => grapes("grapeW"),
  "grape-black": () => grapes("grapeB"),
  "dates-mazafati": () => (
    <>
      <Ground />
      {[[22, 36, -30], [34, 32, 10], [42, 42, 45]].map(([x, y, r]) => (
        <g key={`${x}`}>
          <ellipse cx={x} cy={y} rx="7.5" ry="14" fill={f("date")} transform={`rotate(${r} ${x} ${y})`} />
          <ellipse cx={x! - 2} cy={y! - 5} rx="1.6" ry="5" fill="#fff" opacity="0.35" transform={`rotate(${r} ${x} ${y})`} />
        </g>
      ))}
    </>
  ),
  walnut: () => (
    <>
      <Ground />
      <ellipse cx="32" cy="36" rx="19" ry="18" fill={f("walnut")} />
      <path d="M32 18 C 30 26, 34 32, 31 40 C 29 46, 33 50, 32 54" stroke="#7E5530" strokeWidth="1.6" fill="none" />
      <path d="M20 28 C 24 30, 22 36, 25 40 M44 28 C 40 31, 43 36, 39 41 M24 46 C 27 44, 29 48, 28 50 M40 46 C 37 45, 36 48, 37 51" stroke="#7E5530" strokeWidth="1.2" fill="none" opacity="0.7" />
      <Shine x={23} y={28} rx={3} ry={5} />
    </>
  ),
  barberry: () => (
    <>
      <Ground w={14} />
      <Stem d="M10 10 C 22 16, 32 26, 50 48" w={1.8} />
      {[[16, 18], [24, 16], [30, 24], [22, 26], [36, 30], [28, 34], [42, 36], [34, 40], [46, 44], [40, 48]].map(([x, y]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="3.6" ry="4.8" fill={f("cherry")} transform={`rotate(-30 ${x} ${y})`} />
      ))}
      <Leaf d="M12 12 C 10 5, 16 2, 20 3 C 20 8, 17 12, 12 12 Z" />
    </>
  ),
  tomato: () => (
    <>
      <Ground />
      <ellipse cx="32" cy="37" rx="21" ry="18" fill={f("tomato")} />
      <path d="M32 21 L26 17 L29 22 L20 21 L28 24.5 L24 29 L32 25 L40 29 L36 24.5 L44 21 L35 22 L38 17 Z" fill={f("leafDark")} />
      <Stem d="M32 21 L32 15" w={2.2} />
      <Shine x={21} y={32} />
    </>
  ),
  cucumber: () => (
    <>
      <Ground w={20} />
      <path d="M10 44 C 8 38, 14 34, 22 30 L44 18 C 51 14, 57 18, 55 25 C 54 29, 50 31, 44 35 L22 48 C 16 51, 11 49, 10 44 Z" fill={f("cucumber")} />
      {[[18, 40], [26, 34], [34, 30], [42, 25], [24, 44], [32, 39], [40, 34], [48, 27]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="#E7F7D6" opacity="0.8" />
      ))}
      <path d="M54 21 C 57 19, 59 18, 60 16" stroke="#5C3A1E" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="26" cy="35" rx="10" ry="2" fill="#fff" opacity="0.3" transform="rotate(-30 26 35)" />
    </>
  ),
  eggplant: () => (
    <>
      <Ground w={16} />
      <path d="M38 16 C 46 18, 52 28, 50 40 C 48 52, 36 58, 26 54 C 16 50, 14 40, 20 32 C 25 26, 30 21, 38 16 Z" fill={f("eggplant")} />
      <path d="M34 15 C 38 10, 45 10, 47 14 C 49 18, 46 24, 42 22 C 40 26, 34 24, 34 20 C 30 21, 30 16, 34 15 Z" fill={f("leafDark")} />
      <Stem d="M43 12 L47 5" w={2.4} />
      <ellipse cx="25" cy="40" rx="3" ry="8" fill="#fff" opacity="0.3" transform="rotate(25 25 40)" />
    </>
  ),
  potato: () => (
    <>
      <Ground w={19} />
      <path d="M14 34 C 12 24, 22 18, 32 19 C 44 18, 54 24, 53 35 C 52 46, 42 51, 31 50 C 20 50, 15 43, 14 34 Z" fill={f("potato")} />
      {[[22, 30], [36, 26], [44, 38], [28, 42], [40, 46]].map(([x, y]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="1.3" ry="0.8" fill="#7A5A2E" opacity="0.6" />
      ))}
      <Shine x={22} y={26} rx={3} ry={5} />
    </>
  ),
  onion: () => (
    <>
      <Ground />
      <path d="M32 14 C 33 22, 50 26, 50 40 C 50 51, 41 56, 32 56 C 23 56, 14 51, 14 40 C 14 26, 31 22, 32 14 Z" fill={f("onion")} />
      <path d="M32 18 C 26 28, 24 44, 30 55 M32 18 C 38 28, 40 44, 34 55 M32 18 C 21 30, 18 44, 24 53 M32 18 C 43 30, 46 44, 40 53" stroke="#A85A22" strokeWidth="0.9" fill="none" opacity="0.45" />
      <path d="M32 15 C 31 10, 33 6, 36 4" stroke="#B5832F" strokeWidth="2" strokeLinecap="round" fill="none" />
      <Shine x={22} y={38} rx={3} ry={6} r={10} />
    </>
  ),
  pumpkin: () => (
    <>
      <Ground w={21} />
      <ellipse cx="20" cy="39" rx="11" ry="15" fill={f("pumpkin")} />
      <ellipse cx="44" cy="39" rx="11" ry="15" fill={f("pumpkin")} />
      <ellipse cx="32" cy="39" rx="12" ry="16.5" fill={f("pumpkin")} />
      <path d="M32 23 C 31 18, 33 13, 37 11" stroke="#4E6B2A" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <Shine x={27} y={32} rx={2.5} ry={6} r={0} />
    </>
  ),
  herbs: () => (
    <>
      <Ground w={12} />
      {[
        ["M32 54 C 30 40, 22 30, 12 24 C 18 34, 24 42, 32 54 Z", "leaf"],
        ["M32 54 C 34 40, 42 30, 52 24 C 46 34, 40 42, 32 54 Z", "leaf"],
        ["M32 54 C 26 36, 24 22, 26 8 C 32 20, 34 36, 32 54 Z", "leafDark"],
        ["M32 54 C 38 36, 42 24, 44 12 C 36 22, 32 38, 32 54 Z", "leafDark"],
        ["M32 54 C 26 42, 16 38, 8 38 C 16 44, 24 48, 32 54 Z", "leafDark"],
        ["M32 54 C 38 42, 48 38, 56 38 C 48 44, 40 48, 32 54 Z", "leaf"],
      ].map(([d, k]) => (
        <path key={d} d={d} fill={f(k!)} />
      ))}
      <rect x="27" y="47" width="10" height="4" rx="2" fill="#C8102E" opacity="0.85" />
    </>
  ),
  spinach: () => (
    <>
      <Ground w={16} />
      {[
        ["M30 56 C 18 52, 8 40, 12 26 C 16 16, 28 18, 30 30 Z", "leafDark", -10],
        ["M34 56 C 46 52, 56 40, 52 26 C 48 16, 36 18, 34 30 Z", "leafDark", 10],
        ["M32 56 C 22 46, 20 28, 26 14 C 30 8, 36 8, 38 14 C 44 28, 42 46, 32 56 Z", "leaf", 0],
      ].map(([d, k]) => (
        <path key={String(d)} d={String(d)} fill={f(String(k))} />
      ))}
      <path d="M32 54 L32 16 M32 30 L26 24 M32 38 L38 30 M32 46 L26 40" stroke="#E7F7D6" strokeWidth="1" opacity="0.7" fill="none" />
    </>
  ),
  cherry: () => (
    <>
      <Ground w={18} />
      <Stem d="M22 40 C 24 26, 30 16, 40 8 M44 42 C 42 28, 40 18, 40 8" w={1.8} />
      <Leaf d="M40 9 C 46 4, 54 5, 56 9 C 52 13, 45 13, 40 9 Z" />
      <circle cx="21" cy="45" r="10" fill={f("cherry")} />
      <circle cx="44" cy="46" r="10" fill={f("cherry")} />
      <Shine x={17} y={41} rx={2.5} ry={4} />
      <Shine x={40} y={42} rx={2.5} ry={4} />
    </>
  ),
  strawberry: () => (
    <>
      <Ground w={14} />
      <path d="M32 58 C 22 52, 12 40, 14 28 C 15 21, 22 19, 32 21 C 42 19, 49 21, 50 28 C 52 40, 42 52, 32 58 Z" fill={f("strawberry")} />
      {[[22, 30], [30, 28], [38, 28], [44, 32], [26, 38], [34, 36], [42, 40], [28, 46], [36, 46], [32, 52]].map(([x, y]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="0.8" ry="1.3" fill="#FFE27A" />
      ))}
      <path d="M32 22 L22 16 L28 22 L18 22 L28 25 L32 30 L36 25 L46 22 L36 22 L42 16 Z" fill={f("leafDark")} />
    </>
  ),
  apricot: () => (
    <>
      <Ground />
      <circle cx="32" cy="37" r="19" fill={f("apricot")} />
      <path d="M32 18 C 26 28, 26 46, 32 56" stroke="#D2741A" strokeWidth="1.4" fill="none" opacity="0.5" />
      <Leaf d="M33 18 C 36 11, 44 10, 47 13 C 44 18, 38 20, 33 18 Z" />
      <Shine x={23} y={30} />
    </>
  ),
  peach: () => (
    <>
      <Ground />
      <circle cx="32" cy="37" r="19.5" fill={f("peach")} />
      <ellipse cx="40" cy="42" rx="10" ry="9" fill="#E0604E" opacity="0.35" />
      <path d="M32 18 C 26 28, 26 46, 32 56" stroke="#E0604E" strokeWidth="1.4" fill="none" opacity="0.5" />
      <Leaf d="M33 18 C 36 11, 44 10, 47 13 C 44 18, 38 20, 33 18 Z" />
      <Shine x={23} y={30} />
    </>
  ),
  greengage: () => (
    <>
      <Ground w={20} />
      <circle cx="22" cy="40" r="13" fill={f("greengage")} />
      <circle cx="43" cy="42" r="12" fill={f("greengage")} />
      <Stem d="M22 27 L24 21 M43 30 L42 24" w={1.8} />
      <Shine x={17} y={35} rx={3} ry={4.5} />
      <Shine x={39} y={37} rx={3} ry={4.5} />
    </>
  ),
  "green-almond": () => (
    <>
      <Ground w={18} />
      {[[24, 38, -20], [40, 36, 20]].map(([x, y, r]) => (
        <ellipse key={`${x}`} cx={x} cy={y} rx="10" ry="15" fill={f("almond")} transform={`rotate(${r} ${x} ${y})`} />
      ))}
      <Leaf d="M30 20 C 32 10, 42 6, 48 8 C 46 16, 38 21, 30 20 Z" />
    </>
  ),
  watermelon: () => (
    <>
      <Ground w={22} />
      <path d="M6 30 A 26 26 0 0 0 58 30 Z" fill={f("rind")} />
      <path d="M9.5 30 A 22.5 22.5 0 0 0 54.5 30 Z" fill="#F3FBE9" />
      <path d="M12 30 A 20 20 0 0 0 52 30 Z" fill={f("melon")} />
      {[[22, 36], [32, 40], [42, 36], [27, 44], [37, 44]].map(([x, y]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="1" ry="1.8" fill="#2A1A10" />
      ))}
    </>
  ),
  fig: () => (
    <>
      <Ground w={14} />
      <path d="M32 12 C 38 18, 50 28, 48 42 C 46 54, 18 54, 16 42 C 14 28, 26 18, 32 12 Z" fill={f("fig")} />
      <Stem d="M32 13 L33 6" w={2.4} />
      <path d="M32 16 C 30 30, 30 44, 32 53" stroke="#3E2050" strokeWidth="1" opacity="0.35" fill="none" />
      <Shine x={24} y={34} rx={3} ry={6} r={15} />
    </>
  ),
};

export const hasIllustration = (kind: string): boolean => kind in ILLUSTRATIONS;

export function ProduceIllustration({ kind, className, title }: { kind: string; className?: string; title?: string }) {
  const draw = ILLUSTRATIONS[kind];
  if (!draw) return null;
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {draw()}
    </svg>
  );
}
