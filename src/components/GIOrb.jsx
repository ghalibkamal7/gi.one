import { useRef, useState, useCallback, useEffect, memo } from "react";
import { motion } from "framer-motion";
import GILogo from "./GILogo";
import { onGesture } from "../utils/gestureEvents";

function GIOrb({ size = 220, thinking = false, speaking = false }) {
  const containerRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [gesturePulse, setGesturePulse] = useState(false);

  useEffect(() => {
    const unsubscribe = onGesture(() => {
      setGesturePulse(true);
      const t = setTimeout(() => setGesturePulse(false), 900);
      return () => clearTimeout(t);
    });
    return unsubscribe;
  }, []);

  const handlePointerMove = useCallback((e) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const py = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setTilt({ x: px * 10, y: py * -10 });
  }, []);

  const handlePointerLeave = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  const handleTouchMove = useCallback((e) => {
    const el = containerRef.current;
    if (!el || !e.touches[0]) return;
    const rect = el.getBoundingClientRect();
    const touch = e.touches[0];
    const px = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    const py = ((touch.clientY - rect.top) / rect.height) * 2 - 1;
    setTilt({ x: px * 8, y: py * -8 });
  }, []);

  const particleCount = 10;
  const particles = Array.from({ length: particleCount });
  const ringDuration = thinking ? 3 : speaking ? 5 : 9;

  return (
    <div
      ref={containerRef}
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handlePointerLeave}
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      {/* Glow halo — shifted to blue tones to match the light/cream
          theme's accent color instead of the old indigo/purple. */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.30) 0%, rgba(96,165,250,0.15) 45%, transparent 72%)",
        }}
        animate={{
          scale: gesturePulse ? [1, 1.22, 1] : thinking ? [1, 1.12, 1] : [1, 1.04, 1],
          opacity: gesturePulse ? [0.7, 1, 0.7] : thinking ? [0.7, 1, 0.7] : [0.5, 0.7, 0.5],
        }}
        transition={{ duration: gesturePulse ? 0.9 : thinking ? 1.2 : 3.2, repeat: gesturePulse ? 0 : Infinity, ease: "easeInOut" }}
      />

      <div
        className="absolute inset-0 gi-orb-ring"
        style={{ animationDuration: `${ringDuration}s` }}
      >
        {particles.map((_, i) => {
          const angle = (360 / particleCount) * i;
          const radius = size * 0.46;
          return (
            <span
              key={i}
              className="gi-orb-particle"
              style={{
                transform: `rotate(${angle}deg) translateX(${radius}px)`,
                animationDelay: `${(i % 5) * 0.3}s`,
              }}
            />
          );
        })}
      </div>

      <motion.div
        animate={{ rotateX: tilt.y, rotateY: tilt.x }}
        transition={{ type: "spring", stiffness: 120, damping: 12 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <GILogo size={size * 0.5} animate spinning={thinking} glow />
      </motion.div>
    </div>
  );
}

export default memo(GIOrb);