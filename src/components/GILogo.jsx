import { memo, useId } from "react";

function GILogo({ size = 64, animate = true, spinning = false, glow = false }) {
  const s = size;
  const uid = useId();
  const flameGradId = `gi-flame-grad-${uid}`;
  const coreGradId = `gi-core-grad-${uid}`;

  const spinClass = animate ? (spinning ? "gi-spin-fast" : "gi-spin-slow") : "";
  const pulseClass = animate && !spinning ? "gi-pulse" : "";

  const glowStyle = glow
    ? {
        filter:
          "drop-shadow(0 0 6px rgba(59,130,246,0.45)) drop-shadow(0 0 14px rgba(59,130,246,0.25))",
      }
    : undefined;

  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "inline-block", flexShrink: 0, ...glowStyle }}
    >
      <defs>
        <linearGradient id={flameGradId} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="55%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#C6F4FF" />
        </linearGradient>
        <radialGradient id={coreGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#142035" />
          <stop offset="100%" stopColor="#060B16" />
        </radialGradient>
      </defs>

      {/* Outer dashed ring removed per redesign — it read as a
          redundant floating dot/ring around the logo. */}

      <g className={spinClass} style={{ transformOrigin: "50% 50%" }}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <path
            key={deg}
            d="M50 6
               C 53.2 13, 55.5 19, 55 25
               C 54.7 29.5, 52.6 32.5, 50 35
               C 47.4 32.5, 45.3 29.5, 45 25
               C 44.5 19, 46.8 13, 50 6 Z"
            fill={`url(#${flameGradId})`}
            opacity="0.92"
            transform={`rotate(${deg} 50 50)`}
          />
        ))}
      </g>

      <g className={pulseClass} style={{ transformOrigin: "50% 50%" }}>
        <circle cx="50" cy="50" r="21" fill={`url(#${coreGradId})`} stroke="#00D4FF" strokeWidth="1" strokeOpacity="0.55" />
        <text
          x="50" y="58"
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="800"
          fontSize="18"
          letterSpacing="-0.5"
          fill="#FFFFFF"
        >
          GI
        </text>
      </g>
    </svg>
  );
}

export default memo(GILogo);