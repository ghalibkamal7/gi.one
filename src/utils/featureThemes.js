// Centralized design tokens for the "one product, many premium
// environments" system — each feature gets a distinct accent, but all
// share the same cream/ivory foundation, card style, and radius so the
// app still feels like one product, not several.
export const FEATURE_THEMES = {
  study:     { accent: "#3b82f6", accentSoft: "rgba(59,130,246,0.10)",  accentBorder: "rgba(59,130,246,0.25)",  glow: "rgba(59,130,246,0.18)" },
  focus:     { accent: "#6366f1", accentSoft: "rgba(99,102,241,0.10)",  accentBorder: "rgba(99,102,241,0.25)",  glow: "rgba(99,102,241,0.18)" },
  cards:     { accent: "#d97706", accentSoft: "rgba(217,119,6,0.10)",   accentBorder: "rgba(217,119,6,0.22)",   glow: "rgba(217,119,6,0.15)" },
  pdf:       { accent: "#7c6ff0", accentSoft: "rgba(124,111,240,0.10)", accentBorder: "rgba(124,111,240,0.22)", glow: "rgba(124,111,240,0.15)" },
  periods:   { accent: "#e879a6", accentSoft: "rgba(232,121,166,0.10)", accentBorder: "rgba(232,121,166,0.22)", glow: "rgba(232,121,166,0.15)" },
  pins:      { accent: "#c08a1e", accentSoft: "rgba(192,138,30,0.10)",  accentBorder: "rgba(192,138,30,0.22)",  glow: "rgba(192,138,30,0.15)" },
  stats:     { accent: "#0891b2", accentSoft: "rgba(8,145,178,0.10)",   accentBorder: "rgba(8,145,178,0.22)",   glow: "rgba(8,145,178,0.15)" },
  resize:    { accent: "#06b6d4", accentSoft: "rgba(6,182,212,0.10)",   accentBorder: "rgba(6,182,212,0.22)",   glow: "rgba(6,182,212,0.15)" },
  bgremove:  { accent: "#8b5cf6", accentSoft: "rgba(139,92,246,0.10)",  accentBorder: "rgba(139,92,246,0.22)",  glow: "rgba(139,92,246,0.15)" },
  gitalk:    { accent: "#0d9488", accentSoft: "rgba(13,148,136,0.10)",  accentBorder: "rgba(13,148,136,0.22)",  glow: "rgba(13,148,136,0.15)" },
};

// Shared card/overlay shell classes — every feature modal uses these
// so the *structure* stays identical; only the accent varies.
export const MODAL_OVERLAY = "fixed inset-0 z-50 flex items-center justify-center bg-[#1e2a3a]/25 backdrop-blur-sm p-4";
export const MODAL_CARD = "bg-[#fffdf8] rounded-3xl border shadow-2xl overflow-hidden";
export const MODAL_TEXT_PRIMARY = "text-[#1e2a3a]";
export const MODAL_TEXT_SECONDARY = "text-slate-500";
export const MODAL_INPUT = "bg-black/[0.03] border-black/[0.08] text-[#1e2a3a] placeholder-slate-400";