import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, RotateCcw, Brain, Settings2 } from "lucide-react";

const PRESETS = [
  { label: "Focus", minutes: 25, emoji: "🧠" },
  { label: "Short Break", minutes: 5, emoji: "☕" },
  { label: "Long Break", minutes: 15, emoji: "🌿" },
];

const CUSTOM_QUICK_PICKS = [10, 20, 30, 45, 50, 60];
const ACCENT = "#6366f1";

function FocusMode({ isOpen, onClose, onAskGI }) {
  const [modeIdx, setModeIdx] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(PRESETS[0].minutes * 60);
  const [totalSeconds, setTotalSeconds] = useState(PRESETS[0].minutes * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [topic, setTopic] = useState("");
  const intervalRef = useRef(null);

  const activeMinutes = customMinutes ?? PRESETS[modeIdx].minutes;
  const activeEmoji = customMinutes ? "⏱️" : PRESETS[modeIdx].emoji;
  const activeLabel = customMinutes ? `${customMinutes} min` : PRESETS[modeIdx].label;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (modeIdx === 0 || customMinutes) setSessions((s) => s + 1);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, modeIdx, customMinutes]);

  const applyDuration = (minutes) => {
    const secs = minutes * 60;
    setTimeLeft(secs);
    setTotalSeconds(secs);
    setRunning(false);
  };

  const switchPreset = (idx) => {
    setModeIdx(idx);
    setCustomMinutes(null);
    applyDuration(PRESETS[idx].minutes);
  };

  const applyCustom = (minutes) => {
    if (!minutes || minutes <= 0) return;
    const capped = Math.min(minutes, 180);
    setCustomMinutes(capped);
    applyDuration(capped);
    setShowCustomPicker(false);
    setCustomInput("");
  };

  const reset = () => { applyDuration(activeMinutes); };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const progress = totalSeconds ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;
  const r = 54;
  const circ = 2 * Math.PI * r;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog" aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e2a3a]/25 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative rounded-3xl p-8 w-full max-w-sm mx-4 border shadow-2xl overflow-hidden"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${ACCENT}12 0%, #fffdf8 55%)`,
            borderColor: `${ACCENT}30`,
          }}
        >
          <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 p-2 rounded-xl hover:bg-black/5 text-slate-400 hover:text-[#1e2a3a] transition-colors">
            <X size={18} />
          </button>

          <div className="text-center mb-6">
            <h3 className="text-[#1e2a3a] font-bold text-xl mb-1">🎯 Focus Mode</h3>
            <p className="text-slate-500 text-xs">{sessions} sessions completed today</p>
          </div>

          <div className="flex gap-2 mb-3 p-1 bg-black/[0.03] rounded-xl">
            {PRESETS.map((m, i) => (
              <button key={m.label} onClick={() => switchPreset(i)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  !customMinutes && modeIdx === i ? "text-white" : "text-slate-500 hover:text-[#1e2a3a]"
                }`}
                style={!customMinutes && modeIdx === i ? { backgroundColor: ACCENT } : undefined}>
                {m.emoji} {m.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCustomPicker((p) => !p)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium mb-6 transition-all border"
            style={customMinutes
              ? { backgroundColor: `${ACCENT}18`, borderColor: `${ACCENT}45`, color: ACCENT }
              : { backgroundColor: "rgba(0,0,0,0.03)", borderColor: "rgba(0,0,0,0.08)", color: "#64748b" }}
          >
            <Settings2 size={13} />
            {customMinutes ? `Custom: ${customMinutes} min` : "Set custom time"}
          </button>

          <AnimatePresence>
            {showCustomPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden"
              >
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {CUSTOM_QUICK_PICKS.map((m) => (
                    <button key={m} onClick={() => applyCustom(m)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-black/[0.03] hover:bg-indigo-500/10 text-slate-600 hover:text-[#1e2a3a] border border-black/[0.08] hover:border-indigo-400/40 transition-all">
                      {m}m
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyCustom(parseInt(customInput, 10))}
                    placeholder="Minutes (1-180)"
                    className="flex-1 bg-black/[0.03] border border-black/[0.08] rounded-xl px-3 py-2 text-sm text-[#1e2a3a] placeholder-slate-400 outline-none focus:border-indigo-400/50"
                  />
                  <button
                    onClick={() => applyCustom(parseInt(customInput, 10))}
                    className="px-4 py-2 rounded-xl text-white text-xs font-medium transition-colors"
                    style={{ backgroundColor: ACCENT }}
                  >
                    Set
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-center mb-8">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="8" />
                <circle cx="60" cy="60" r={r} fill="none"
                  stroke={customMinutes ? "#06b6d4" : modeIdx === 0 ? "#6366f1" : modeIdx === 1 ? "#10b981" : "#a855f7"}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ - (circ * progress) / 100}
                  style={{ transition: "stroke-dashoffset 0.5s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[#1e2a3a] font-bold text-3xl tabular-nums">{fmt(timeLeft)}</span>
                <span className="text-slate-500 text-xs mt-1">{activeEmoji} {activeLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mb-6">
            <button onClick={reset} className="p-3 rounded-xl bg-black/[0.03] hover:bg-black/[0.06] text-slate-500 hover:text-[#1e2a3a] transition-all">
              <RotateCcw size={18} />
            </button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setRunning((r) => !r)}
              disabled={timeLeft === 0}
              className="px-8 py-3 rounded-2xl font-semibold text-white flex items-center gap-2 transition-all disabled:opacity-40"
              style={{ backgroundColor: running ? "#ef4444" : ACCENT }}>
              {running ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Start</>}
            </motion.button>
          </div>

          <div className="border-t border-black/[0.06] pt-5">
            <p className="text-slate-500 text-xs mb-2 text-center">What are you studying?</p>
            <div className="flex gap-2">
              <input value={topic} onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && topic.trim() && (onAskGI(`Create a focused ${activeMinutes}-minute study plan for: ${topic}`), onClose())}
                placeholder="e.g. React Hooks, Calculus..."
                className="flex-1 bg-black/[0.03] border border-black/[0.08] rounded-xl px-3 py-2 text-sm text-[#1e2a3a] placeholder-slate-400 outline-none focus:border-indigo-400/50 transition-colors" />
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => { if (topic.trim()) { onAskGI(`Create a focused ${activeMinutes}-minute study plan for: ${topic}`); onClose(); }}}
                className="px-3 py-2 rounded-xl text-white text-xs transition-colors"
                style={{ backgroundColor: ACCENT }}
              >
                <Brain size={15} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default FocusMode;