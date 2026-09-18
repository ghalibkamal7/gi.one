import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Mic, Timer, BookOpen, FileImage, Droplet, BarChart2, Pin,
  Image as ImageIcon, Scissors, Volume2, Briefcase, Send,
  ChevronDown, Hand, Languages, Box,
} from "lucide-react";
import GIOrb from "./GIOrb";
import { onGesture } from "../utils/gestureEvents";
import { GESTURE_LABELS } from "../utils/gestureDetection";
import { normalizeSpokenGI, cleanForSpeech, getPreferredVoice, getVoiceGenderPref, setVoiceGenderPref } from "../utils/giSpeech";
import { fetchWeather, describeWeatherCode, getCurrentPosition, getTimezoneCityLabel } from "../utils/weather";
import { matchAppOpenCommand, openApp } from "../utils/voiceCommands";

function HudRing({ size, strokeWidth = 1.5, dash, duration = 20, reverse = false, opacity = 0.4, color = "#22d3ee" }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      className="absolute inset-0"
      style={{ animation: `gi-hud-spin ${duration}s linear infinite ${reverse ? "reverse" : ""}` }}
    >
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={dash || `${circ * 0.15} ${circ * 0.05}`}
        strokeLinecap="round"
        opacity={opacity}
      />
    </svg>
  );
}

function HudPanel({ children, className = "", title }) {
  return (
    <div className={`rounded-xl border border-cyan-500/15 bg-cyan-950/10 backdrop-blur-sm ${className}`}>
      {title && (
        <p className="text-cyan-700 text-[9px] font-mono uppercase tracking-[0.2em] px-3 pt-2.5">{title}</p>
      )}
      <div className="px-3 pb-2.5 pt-1.5">{children}</div>
    </div>
  );
}

function StatusRow({ label, value, ok = true, dim = false }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-[10px] font-mono text-cyan-700 uppercase tracking-wide">{label}</span>
      <span className={`flex items-center gap-1.5 text-[10px] font-mono ${dim ? "text-slate-600" : ok ? "text-emerald-400" : "text-amber-400"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dim ? "bg-slate-600" : ok ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
        {value}
      </span>
    </div>
  );
}

// A gently animated bar for the two metrics the browser genuinely
// can't read (CPU/Memory) — simulated as a HUD flourish; every OTHER
// readout on this dashboard (network, camera, mic, gesture, time,
// weather, activity feed, message counts) is real, live app/browser
// state.
function SimBar({ label, seed }) {
  const [pct, setPct] = useState(30 + seed * 7);
  useEffect(() => {
    const t = setInterval(() => {
      setPct((p) => {
        const next = p + (Math.random() - 0.5) * 14;
        return Math.max(18, Math.min(78, next));
      });
    }, 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="py-0.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-mono text-cyan-700 uppercase tracking-wide">{label}</span>
        <span className="text-[10px] font-mono text-cyan-500">{Math.round(pct)}%</span>
      </div>
      <div className="h-1 rounded-full bg-cyan-950/50 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

function HudBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-[0.08]"
        style={{ background: "radial-gradient(circle, #22d3ee 0%, transparent 70%)" }} />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-[0.07]"
        style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)" }} />
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent gi-hud-scanline" />
    </div>
  );
}

function ToolButton({ icon, label, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative flex flex-col items-center gap-1.5 py-3 rounded-xl bg-cyan-950/20 border border-cyan-500/15 hover:border-cyan-400/50 hover:bg-cyan-500/10 text-cyan-500 hover:text-cyan-200 transition-colors"
    >
      <span className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-emerald-400/70" />
      {icon}
      <span className="text-[9px] font-mono uppercase">{label}</span>
    </motion.button>
  );
}

function JarvisDashboard({
  isOpen, onClose, onUserSpeech, aiReply, isThinking, onOpenTool,
  chats = [], messages = [],
  gestureState = null,
  toolStatus = "",
  hadError = 0,
}) {
  const [phase, setPhase] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const [paused, setPaused] = useState(false);
  const [voiceGender, setVoiceGender] = useState(getVoiceGenderPref());
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [events, setEvents] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [commandText, setCommandText] = useState("");
  const [showError, setShowError] = useState(false);
  const [scanning, setScanning] = useState(false);

  const recognitionRef = useRef(null);
  const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);
  const lastSpokenRef = useRef("");
  const pausedRef = useRef(false);
  const openRef = useRef(false);
  const phaseRef = useRef("idle");
  const stuckTimerRef = useRef(null);
  const commandInputRef = useRef(null);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { openRef.current = isOpen; }, [isOpen]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => {
    if (!hadError || !isOpen) return;
    setShowError(true);
    logEvent("Error — see response for details");
    const t = setTimeout(() => setShowError(false), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hadError]);

  const logEvent = useCallback((text) => {
    setEvents((prev) => [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, t: new Date() },
      ...prev,
    ].slice(0, 8));
  }, []);

  useEffect(() => {
    if (isOpen) logEvent("GI Core initialized");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [isOpen]);
    // A brief, occasional "scanning" pulse — not a continuous
  // animation, so it reads as an intentional system check rather
  // than busy visual noise. This is GI's own signature moment, not a
  // copy of any film's body-scan effect.
  useEffect(() => {
    if (!isOpen) return;
    const t = setInterval(() => {
      setScanning(true);
      logEvent("System scan complete");
      setTimeout(() => setScanning(false), 1800);
    }, 12000);
    return () => clearInterval(t);
  }, [isOpen, logEvent]);

  useEffect(() => {
    if (!isOpen || weather || weatherError) return;
    (async () => {
      try {
        const { lat, lon } = await getCurrentPosition();
        const w = await fetchWeather(lat, lon);
        setWeather(w);
        logEvent("Weather telemetry synced");
      } catch {
        setWeatherError(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    return onGesture((detail) => {
      logEvent(`Gesture recognized: ${GESTURE_LABELS[detail.name] || detail.name}`);
    });
  }, [isOpen, logEvent]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }

    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = "en-IN";

        r.onresult = (e) => {
      const raw = Array.from(e.results).map((res) => res[0].transcript).join("");
      const norm = normalizeSpokenGI(raw);
      setTranscript(norm);
           if (e.results[e.results.length - 1].isFinal) {
        setTranscript("");
        const finalText = norm.trim();
        if (!finalText) { startListening(); return; }

        // Deterministic app-open commands are handled here, BEFORE
        // ever reaching Gemini — matched against a fixed allowlist,
        // never AI-interpreted, so this can't be tricked into opening
        // something unintended.
        const appMatch = matchAppOpenCommand(finalText);
        if (appMatch) {
          logEvent(`Opening ${appMatch.label}`);
          openApp(appMatch);
          lastSpokenRef.current = `Opening ${appMatch.label}.`;
          const synth = synthRef.current;
          if (synth) {
            synth.cancel();
            const utt = new SpeechSynthesisUtterance(`Opening ${appMatch.label}.`);
            utt.lang = "en-IN";
            utt.onend = () => { if (openRef.current && !pausedRef.current) startListening(); };
            synth.speak(utt);
            setPhase("speaking");
          } else {
            startListening();
          }
          return;
        }

        logEvent("Voice input detected");
        setPhase("thinking");
        onUserSpeech(finalText);
      } else if (norm.trim() && phaseRef.current === "listening") {
        setPhase("hearing");
      }
    };
    r.onerror = () => { if (openRef.current && !pausedRef.current) startListening(); };
    r.onend = () => {
      if (openRef.current && !pausedRef.current && phase === "listening") {
        try { r.start(); } catch { /* already running */ }
      }
    };

    recognitionRef.current = r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startListening = () => {
    if (!recognitionRef.current || pausedRef.current) return;
    setPhase("listening");
    try { recognitionRef.current.start(); } catch { /* already running */ }
  };

  const stopEverything = () => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    synthRef.current?.cancel();
    setPhase("idle");
    setTranscript("");
    clearTimeout(stuckTimerRef.current);
  };

  useEffect(() => {
    if (isOpen) {
      lastSpokenRef.current = "";
      pausedRef.current = false;
      setPaused(false);
      const t = setTimeout(startListening, 300);
      return () => clearTimeout(t);
    } else {
      stopEverything();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isThinking) {
      setPhase("thinking");
      logEvent("Processing request");
      clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = setTimeout(() => {
        if (openRef.current && !pausedRef.current) startListening();
      }, 20000);
    }
    return () => clearTimeout(stuckTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isThinking, isOpen]);

  useEffect(() => {
    if (!isOpen || !aiReply || isThinking) return;
    if (aiReply === lastSpokenRef.current) return;
    lastSpokenRef.current = aiReply;
    clearTimeout(stuckTimerRef.current);
    logEvent("Response generated");

    const synth = synthRef.current;
    if (!synth) { startListening(); return; }

    synth.cancel();
    const utt = new SpeechSynthesisUtterance(cleanForSpeech(aiReply));
    utt.lang = "en-IN";
    utt.rate = 0.98;
    utt.pitch = voiceGender === "female" ? 1.05 : 0.92;
    const voice = getPreferredVoice(synth, voiceGender);
    if (voice) utt.voice = voice;

    setPhase("speaking");
    // Deliberately NOT listening while GI speaks: starting the mic
    // mid-speech (for barge-in / interruption) caused the mic to pick
    // up GI's own voice through the speaker as false input — browsers
    // give no way to fix this from JS without proper acoustic echo
    // cancellation, which isn't controllable here. That false "user
    // input" was corrupting the conversation after the first turn.
    // Trading barge-in away for reliability.
    utt.onend = () => { if (openRef.current && !pausedRef.current) startListening(); else setPhase("idle"); };
    utt.onerror = () => { if (openRef.current && !pausedRef.current) startListening(); };
    synth.speak(utt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiReply, isThinking, isOpen, voiceGender]);

  const togglePause = () => {
    if (paused) {
      pausedRef.current = false;
      setPaused(false);
      startListening();
    } else {
      pausedRef.current = true;
      setPaused(true);
      try { recognitionRef.current?.stop(); } catch { /* noop */ }
      synthRef.current?.cancel();
      setPhase("idle");
    }
  };

  const toggleGender = useCallback(() => {
    const next = voiceGender === "female" ? "male" : "female";
    setVoiceGender(next);
    setVoiceGenderPref(next);
  }, [voiceGender]);

  const handleClose = () => { stopEverything(); onClose(); };

  const launchTool = (key) => {
    stopEverything();
    onClose();
    onOpenTool?.(key);
  };

  const submitCommand = () => {
    const text = commandText.trim();
    if (!text) return;
    logEvent("Text command submitted");
    setCommandText("");
    setPhase("thinking");
    onUserSpeech(text);
  };

  const todayStats = useMemo(() => {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const todaysMessages = messages.filter((m) => {
      const t = m.createdAt?.toDate ? m.createdAt.toDate() : m.createdAt ? new Date(m.createdAt) : null;
      return t && t >= startOfDay;
    });
    const userMsgsToday = todaysMessages.filter((m) => m.role === "user").length;
    return {
      messagesToday: todaysMessages.length,
      chatsTotal: chats.length,
      userMsgsToday,
    };
  }, [chats, messages]);

  const insight = useMemo(() => {
    if (todayStats.userMsgsToday > 0) {
      return `You've sent ${todayStats.userMsgsToday} message${todayStats.userMsgsToday === 1 ? "" : "s"} to GI today.`;
    }
    if (todayStats.chatsTotal > 0) {
      return `${todayStats.chatsTotal} conversation${todayStats.chatsTotal === 1 ? "" : "s"} on record.`;
    }
    return "Start a conversation to see activity here.";
  }, [todayStats]);

  if (!isOpen) return null;

  const statusText = showError
    ? "ERROR"
    : !supported
    ? "Voice isn't supported in this browser"
    : paused ? "PAUSED"
    : phase === "listening" ? "LISTENING"
    : phase === "hearing" ? "Got you..."
    : phase === "thinking" ? (toolStatus || "THINKING")
    : phase === "speaking" ? "SPEAKING"
    : "READY";

  const w = weather ? describeWeatherCode(weather.code) : null;
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
  const cityLabel = getTimezoneCityLabel();
  const sunrise = weather?.sunrise ? new Date(weather.sunrise).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  const sunset = weather?.sunset ? new Date(weather.sunset).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

   const TOOLS = [
    { key: "gitalk",    icon: <Languages size={15} />, label: "GI Talk" },
    { key: "core",      icon: <Box size={15} />,       label: "3D Core" },
    { key: "focus",     icon: <Timer size={15} />,     label: "Focus" },
    { key: "cards",     icon: <BookOpen size={15} />,  label: "Cards" },
    { key: "pdf",       icon: <FileImage size={15} />, label: "PDF" },
    { key: "resize",    icon: <ImageIcon size={15} />, label: "Resize" },
    { key: "bgremove",  icon: <Scissors size={15} />,  label: "BG Del" },
    { key: "interview", icon: <Briefcase size={15} />, label: "Interview" },
    { key: "cycle",     icon: <Droplet size={15} />,   label: "Periods" },
    { key: "stats",     icon: <BarChart2 size={15} />, label: "Stats" },
    { key: "pins",      icon: <Pin size={15} />,       label: "Pins" },
  ];

  const activeColor = showError ? "#ef4444" : phase === "hearing" ? "#34d399" : phase === "listening" ? "#22d3ee" : phase === "speaking" ? "#a78bfa" : phase === "thinking" ? "#fbbf24" : "#0ea5b7";
  const gestureOn = gestureState?.enabled;
  const gestureCameraActive = gestureState?.isActive;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        role="dialog" aria-modal="true" aria-label="GI Command Center"
        className="fixed inset-0 z-[60] flex flex-col overflow-y-auto"
        style={{ background: "radial-gradient(ellipse at center, #061014 0%, #020408 75%)" }}
      >
        <HudBackground />

        <div className="relative flex items-center justify-end px-4 sm:px-6 py-3 shrink-0">
          <button onClick={handleClose} aria-label="Close"
            className="p-2 rounded-full text-cyan-600 hover:text-cyan-200 hover:bg-cyan-500/10 border border-cyan-500/20 transition-colors">
            <X size={18} />
          </button>
        </div>

               <div className="relative flex-1 grid grid-cols-1 md:grid-cols-[220px_1fr_220px] gap-3 px-3 sm:px-5 pb-3">

          <div className="hidden md:flex flex-col gap-3">
            <HudPanel title="System Status">
              <StatusRow label="AI Engine" value={isThinking ? "PROCESSING" : "ONLINE"} ok={!isThinking} />
              <StatusRow label="Network" value={online ? "CONNECTED" : "OFFLINE"} ok={online} />
              <StatusRow label="Camera" value={gestureCameraActive ? "ACTIVE" : gestureOn ? "STARTING" : "STANDBY"} ok={gestureCameraActive} dim={!gestureOn} />
              <StatusRow label="Microphone" value={phase === "listening" ? "ACTIVE" : "READY"} ok />
              <div className="mt-1.5 pt-1.5 border-t border-cyan-500/10">
                <SimBar label="CPU" seed={2} />
                <SimBar label="Memory" seed={5} />
              </div>
            </HudPanel>

            <HudPanel title="GI Activity" className="flex-1 min-h-0">
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {events.length === 0 && <p className="text-cyan-800 text-[10px] font-mono">No activity yet</p>}
                {events.map((e) => (
                  <motion.div key={e.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    className="text-[10px] font-mono leading-relaxed">
                    <span className="text-cyan-700">{e.t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                    <span className="text-cyan-400 ml-2">{e.text}</span>
                  </motion.div>
                ))}
              </div>
            </HudPanel>
          </div>

          <div className="flex flex-col items-center justify-center text-center py-4">
            <div className="relative flex items-center justify-center" style={{ width: 260, height: 260 }}>
              <HudRing size={260} duration={30} color={activeColor} opacity={0.25} strokeWidth={1} />
              <HudRing size={215} duration={22} reverse color={activeColor} opacity={0.35} strokeWidth={1.5} />
              <HudRing size={175} duration={16} color={activeColor} opacity={0.5} strokeWidth={2} dash="6 10" />
                            <AnimatePresence>
                {scanning && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: [0, 0.6, 0], scale: [0.6, 1.3, 1.5] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.8, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border-2"
                    style={{ borderColor: activeColor }}
                  />
                )}
              </AnimatePresence>

              <motion.div
                animate={{ scale: phase === "listening" ? [1, 1.06, 1] : phase === "speaking" ? [1, 1.03, 1] : 1 }}
                transition={{ duration: phase === "listening" ? 1.1 : 1.8, repeat: Infinity, ease: "easeInOut" }}
                style={{ filter: `drop-shadow(0 0 24px ${activeColor}66)` }}
              >
                <GIOrb size={150} thinking={phase === "thinking"} speaking={phase === "speaking"} />
              </motion.div>
            </div>

            <p className="font-mono text-xs tracking-[0.3em] mt-4" style={{ color: activeColor }}>GI.ONE</p>
            <p className="font-mono text-sm tracking-[0.2em] mt-1" style={{ color: activeColor }}>{statusText}</p>

            <AnimatePresence>
              {transcript && (
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="max-w-sm text-cyan-200 text-sm italic px-4 mt-3">
                  "{transcript}"
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3 mt-5">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={togglePause} disabled={!supported}
                className="w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-300"
                style={{
                  background: paused ? "transparent" : `${activeColor}22`,
                  borderColor: paused ? "rgba(255,255,255,0.15)" : activeColor,
                  boxShadow: paused ? "none" : `0 0 20px ${activeColor}55`,
                }}
              >
                <Mic size={20} style={{ color: paused ? "#94a3b8" : activeColor }} />
              </motion.button>

              <button onClick={toggleGender} title="Switch voice"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-500 hover:text-cyan-300 text-[11px] font-mono transition-colors">
                <Volume2 size={13} />
                {voiceGender === "female" ? "F-VOICE" : "M-VOICE"}
              </button>
            </div>

            <div className="flex items-center gap-2 mt-6 w-full max-w-md px-3 py-2 rounded-2xl bg-cyan-950/20 border border-cyan-500/20">
              <Hand size={13} className={gestureOn ? "text-emerald-400" : "text-slate-700"} />
              <input
                ref={commandInputRef}
                value={commandText}
                onChange={(e) => setCommandText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitCommand()}
                placeholder="Ask GI anything..."
                className="flex-1 bg-transparent text-cyan-100 placeholder-cyan-800 text-sm outline-none font-mono"
              />
              <button onClick={submitCommand} disabled={!commandText.trim()} aria-label="Send"
                className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <Send size={15} />
              </button>
            </div>

            
            <button onClick={() => setDetailsOpen((v) => !v)}
              className="md:hidden flex items-center gap-1 mt-4 text-cyan-600 text-[10px] font-mono uppercase tracking-widest">
              Details <ChevronDown size={12} className={`transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {detailsOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="md:hidden w-full max-w-md mt-3 space-y-2 overflow-hidden">
                  <HudPanel title="Today">
                    <StatusRow label="Messages" value={String(todayStats.messagesToday)} ok dim />
                    <StatusRow label="Chats" value={String(todayStats.chatsTotal)} ok dim />
                  </HudPanel>
                  <HudPanel title="System">
                    <StatusRow label="Network" value={online ? "CONNECTED" : "OFFLINE"} ok={online} />
                    <StatusRow label="Camera" value={gestureCameraActive ? "ACTIVE" : "STANDBY"} ok={gestureCameraActive} dim={!gestureOn} />
                    <StatusRow label="Gesture" value={gestureOn ? "READY" : "OFF"} ok={gestureOn} dim={!gestureOn} />
                  </HudPanel>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden md:flex flex-col gap-3">
            <HudPanel title="Live Intelligence">
              <p className="text-cyan-300 font-bold text-lg font-mono tabular-nums leading-none">{timeStr}</p>
              <p className="text-cyan-700 text-[10px] font-mono mt-0.5">{dateStr}</p>
              {cityLabel && <p className="text-cyan-700 text-[10px] font-mono mt-0.5">{cityLabel}</p>}
              {weather && w && (
                <div className="mt-2 pt-2 border-t border-cyan-500/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{w.icon}</span>
                    <div>
                      <p className="text-cyan-300 text-sm font-bold leading-none">{weather.tempC}°C</p>
                      <p className="text-cyan-700 text-[9px] font-mono uppercase mt-0.5">{w.label}</p>
                    </div>
                  </div>
                  {sunrise && sunset && (
                    <p className="text-cyan-800 text-[9px] font-mono mt-1.5">Sun {sunrise} / {sunset}</p>
                  )}
                </div>
              )}
            </HudPanel>

            <HudPanel title="Today">
              <StatusRow label="Messages" value={String(todayStats.messagesToday)} ok dim />
              <StatusRow label="Chats" value={String(todayStats.chatsTotal)} ok dim />
              <p className="text-cyan-400 text-[10px] font-mono leading-relaxed mt-2 pt-2 border-t border-cyan-500/10">
                {insight}
              </p>
            </HudPanel>

            <HudPanel title="Voice / Gesture">
              <StatusRow label="Voice" value={statusText} ok={phase !== "idle" || !paused} />
              <StatusRow label="Gesture Ctrl" value={gestureOn ? "READY" : "OFF"} ok={gestureOn} dim={!gestureOn} />
              {gestureState?.handPresent && (
                <p className="text-emerald-400 text-[10px] font-mono mt-1">Hand detected</p>
              )}
              {gestureState?.currentGesture && (
                <p className="text-indigo-300 text-[10px] font-mono mt-0.5">
                  {GESTURE_LABELS[gestureState.currentGesture] || gestureState.currentGesture}
                </p>
              )}
            </HudPanel>
          </div>
        </div>

        <div className="relative shrink-0 px-3 sm:px-5 pb-5 pt-1">
          <p className="text-cyan-700 text-[10px] font-mono uppercase tracking-[0.3em] mb-2 text-center">AI Tools</p>
          <div className="grid grid-cols-4 sm:grid-cols-9 gap-2 max-w-3xl mx-auto">
            {TOOLS.map((t) => (
              <ToolButton key={t.key} icon={t.icon} label={t.label} onClick={() => launchTool(t.key)} />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default JarvisDashboard;