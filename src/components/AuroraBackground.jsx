import { useMemo } from "react";

// Light-theme version — warm ivory base with two very subtle pastel
// glows (soft blue + soft lavender), instead of the previous dark
// navy base with cyan/purple aurora blobs. Kept as the same
// full-bleed fixed layer so the rest of the app doesn't need to know
// it changed.
function AuroraBackground({ starCount = 18 }) {
  const dots = useMemo(
    () =>
      Array.from({ length: Math.min(starCount, 14) }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() < 0.8 ? 3 : 4,
        delay: Math.random() * 4,
        duration: 3 + Math.random() * 3,
      })),
    [starCount]
  );

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[#faf6ee]" />

      {/* Two soft pastel glows — deliberately faint per the "very
          subtle" design direction, not a dark cyberpunk aurora. */}
      <div className="gi-aurora-blob gi-aurora-1" />
      <div className="gi-aurora-blob gi-aurora-2" />

      {/* Faint floating dust dots instead of bright stars — stars read
          as a night-sky motif, which doesn't fit a warm daytime cream
          theme. */}
      {dots.map((d) => (
        <span
          key={d.id}
          className="gi-star"
          style={{
            top: `${d.top}%`,
            left: `${d.left}%`,
            width: d.size,
            height: d.size,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
          }}
        />
      ))}

      {/* Subtle vignette so foreground content stays readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#f3ede0]/50" />
    </div>
  );
}

export default AuroraBackground;