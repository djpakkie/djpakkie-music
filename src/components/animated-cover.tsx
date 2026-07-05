import { useMemo } from "react";

/**
 * Deterministic animated cover art for a track that has no real cover image.
 *
 * Given a stable seed (e.g. track id), it produces a unique pair of hues,
 * gradient angle, and orb positions, then renders two slow-moving radial
 * blobs over a diagonal gradient. Pure CSS animations — no JS per frame.
 */

// Tiny deterministic string hash → 32-bit unsigned int.
function hash(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function pick(seed: string, salt: string, min: number, max: number): number {
  const h = hash(seed + ":" + salt);
  return min + ((h % 10_000) / 10_000) * (max - min);
}

type Props = {
  seed: string;
  /** Optional letter shown in the center (e.g. first letter of title). */
  label?: string;
  className?: string;
};

type CoverStyle = React.CSSProperties & Record<`--cover-${string}`, string>;

export function AnimatedCover({ seed, label, className }: Props) {
  const style = useMemo<CoverStyle>(() => {
    const hue1 = Math.floor(pick(seed, "h1", 0, 360));
    const hue2 = Math.floor((hue1 + pick(seed, "h2", 60, 200)) % 360);
    const angle = Math.floor(pick(seed, "ang", 0, 360));
    // Orb positions (in %), durations and delays for variety.
    const ax = Math.floor(pick(seed, "ax", 10, 90));
    const ay = Math.floor(pick(seed, "ay", 10, 90));
    const bx = Math.floor(pick(seed, "bx", 10, 90));
    const by = Math.floor(pick(seed, "by", 10, 90));
    const dur = (8 + pick(seed, "dur", 0, 8)).toFixed(2) + "s";
    const delay = "-" + pick(seed, "del", 0, 10).toFixed(2) + "s";
    return {
      background: `linear-gradient(${angle}deg, oklch(0.45 0.18 ${hue1}), oklch(0.32 0.15 ${hue2}))`,
      "--cover-orb-a": `radial-gradient(circle at ${ax}% ${ay}%, oklch(0.85 0.18 ${hue1} / 0.85), transparent 55%)`,
      "--cover-orb-b": `radial-gradient(circle at ${bx}% ${by}%, oklch(0.78 0.2 ${hue2} / 0.75), transparent 60%)`,
      "--cover-dur": dur,
      "--cover-delay": delay,
    };
  }, [seed]);

  return (
    <div
      aria-hidden
      className={"animated-cover relative overflow-hidden " + (className ?? "h-14 w-14 rounded-sm")}
      style={style}
    >
      <div className="animated-cover__orb animated-cover__orb--a absolute inset-0" />
      <div className="animated-cover__orb animated-cover__orb--b absolute inset-0" />
      {label && (
        <span className="absolute inset-0 flex items-center justify-center font-display text-xl text-white/80 mix-blend-overlay">
          {label}
        </span>
      )}
    </div>
  );
}
