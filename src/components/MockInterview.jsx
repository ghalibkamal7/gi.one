import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, Award, Loader2, Briefcase, Mic, MicOff } from "lucide-react";
import { generateGeminiResponse } from "../services/gemini";
import { normalizeSpokenGI, cleanForSpeech, getPreferredVoice } from "../utils/giSpeech";

const ROLE_PRESETS = [
  "Frontend Developer", "Backend Developer", "Data Scientist",
  "Product Manager", "UI/UX Designer", "College Admission",
];
const TOTAL_QUESTIONS = 5;
const ACCENT = "#3b82f6";

function MockInterview({ isOpen, onClose }) {
  const [phase, setPhase] = useState("setup");
  const [role, setRole] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState("");
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [paused, setPaused] = useState(false);
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef(null);
  const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);
  const pausedRef = useRef(false);
  const openRef = useRef(false);
  const questionsRef = useRef([]);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { openRef.current = isOpen; }, [isOpen]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

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
      if (e.results[e.results.length - 1].isFinal && norm.trim()) {
        setTranscript("");
        handleAnswer(norm.trim());
      }
    };
    r.onerror = () => {
      if (openRef.current && !pausedRef.current) startListening();
    };
    recognitionRef.current = r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startListening = () => {
    if (!recognitionRef.current || pausedRef.current || !openRef.current) return;
    setPhase("listening");
    try { recognitionRef.current.start(); } catch { /* already running */ }
  };

  const stopAll = () => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    synthRef.current?.cancel();
  };

  const speak = (text, onDone) => {
    const synth = synthRef.current;
    if (!synth) { onDone?.(); return; }
    synth.cancel();
    const utt = new SpeechSynthesisUtterance(cleanForSpeech(text));
    utt.lang = "en-IN";
    utt.rate = 0.98;
    const voice = getPreferredVoice(synth);
    if (voice) utt.voice = voice;
    setPhase("speaking");
    utt.onend = () => { if (openRef.current && !pausedRef.current) onDone?.(); };
    utt.onerror = () => { if (openRef.current && !pausedRef.current) onDone?.(); };
    synth.speak(utt);
  };

  const askNextQuestion = async (history) => {
    setPhase("thinking");
    setError("");
    try {
      const askedSoFar = history.map((h, i) => `Q${i + 1}: ${h.q}\nCandidate's answer: ${h.answer}`).join("\n\n");
      const prompt = `You are conducting a SPOKEN mock interview for the role "${role}" at ${difficulty} difficulty.
${history.length === 0
  ? "Greet the candidate briefly (one short sentence) and then ask the FIRST interview question."
  : `So far:\n${askedSoFar}\n\nBriefly (one short sentence) acknowledge the last answer, then ask the NEXT interview question (question ${history.length + 1} of ${TOTAL_QUESTIONS}).`}
Since this will be spoken aloud, keep it conversational and natural — no markdown, no labels, no "Question X:" prefix, just what an interviewer would actually say out loud.`;

      const res = await generateGeminiResponse([{ role: "user", text: prompt }]);
      const q = res.trim();
      setCurrentQ(q);
      speak(q, startListening);
    } catch (err) {
      console.error("Mock interview question generation failed:", err);
      setError("Couldn't reach GI for the next question. Tap the mic to retry.");
      setPhase("idle");
    }
  };

  const handleAnswer = async (answerText) => {
    const entry = { q: currentQ, answer: answerText };
    const nextHistory = [...questionsRef.current, entry];
    setQuestions(nextHistory);
    setCurrentQ("");

    if (nextHistory.length >= TOTAL_QUESTIONS) {
      await finishInterview(nextHistory);
    } else {
      await askNextQuestion(nextHistory);
    }
  };

  const finishInterview = async (history) => {
    setPhase("thinking");
    setError("");
    try {
      const transcriptText = history.map((h, i) => `Q${i + 1}: ${h.q}\nA${i + 1}: ${h.answer}`).join("\n\n");
      const prompt = `You just finished a spoken mock interview for the role "${role}" (${difficulty} difficulty). Transcript:

${transcriptText}

Give brief, encouraging spoken feedback (under 100 words, conversational, no markdown): 2 strengths and 1-2 areas to improve, ending on a positive note.`;
      const res = await generateGeminiResponse([{ role: "user", text: prompt }]);
      const fb = res.trim();
      setSummary(fb);
      setPhase("finished");
      speak(fb, () => {});
    } catch (err) {
      console.error("Mock interview summary failed:", err);
      setSummary("Great effort completing the interview! (Couldn't generate detailed feedback this time.)");
      setPhase("finished");
    }
  };

  const startInterview = async () => {
    if (!role.trim()) return;
    setQuestions([]);
    setSummary("");
    setError("");
    await askNextQuestion([]);
  };

  const togglePause = () => {
    if (paused) { setPaused(false); startListening(); }
    else {
      setPaused(true);
      stopAll();
      setPhase("idle");
    }
  };

  const restart = () => {
    stopAll();
    setPhase("setup");
    setRole("");
    setQuestions([]);
    setCurrentQ("");
    setSummary("");
    setError("");
    setPaused(false);
  };

  const handleClose = () => {
    stopAll();
    restart();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const statusText = !supported
    ? "Voice isn't supported in this browser"
    : paused ? "Paused — tap mic to resume"
    : phase === "speaking" ? "GI is asking..."
    : phase === "listening" ? "Listening for your answer..."
    : phase === "thinking" ? "GI is thinking..."
    : phase === "finished" ? "Interview complete"
    : "Ready when you are";

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        role="dialog" aria-modal="true" aria-label="Mock Interview"
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e2a3a]/25 backdrop-blur-sm p-4"
        onClick={phase === "setup" ? onClose : undefined}>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="rounded-3xl w-full max-w-lg border shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
          style={{ background: `radial-gradient(circle at 50% 0%, ${ACCENT}10 0%, #fffdf8 55%)`, borderColor: `${ACCENT}28` }}>

          <div className="flex items-center justify-between p-6 border-b border-black/[0.06] shrink-0">
            <div className="flex items-center gap-2">
              <Briefcase size={18} style={{ color: ACCENT }} />
              <div>
                <h3 className="text-[#1e2a3a] font-bold text-lg">Mock Interview</h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  {phase === "setup" ? "Live voice interview practice" : `Question ${Math.min(questions.length + 1, TOTAL_QUESTIONS)} of ${TOTAL_QUESTIONS}`}
                </p>
              </div>
            </div>
                       <button onClick={handleClose} aria-label="Close"
              className="p-2 rounded-xl hover:bg-black/5 text-slate-400 hover:text-[#1e2a3a] transition-colors">
              <X size={18} />
            </button>
          </div>

          {phase !== "setup" && phase !== "finished" && (
            <div className="h-1 bg-black/[0.05] shrink-0">
              <motion.div animate={{ width: `${(questions.length / TOTAL_QUESTIONS) * 100}%` }}
                className="h-full transition-all duration-300"
                style={{ background: `linear-gradient(90deg, ${ACCENT}, #60a5fa)` }} />
            </div>
          )}

          <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center text-center">
            {phase === "setup" && (
              <div className="w-full">
                <label className="text-slate-500 text-xs block mb-2 text-left">What role are you interviewing for?</label>
                <input value={role} onChange={(e) => setRole(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startInterview()}
                  placeholder="e.g. Frontend Developer, MBA Admission..."
                                   className="w-full bg-black/[0.03] border border-black/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#1e2a3a] placeholder-slate-400 outline-none focus:border-blue-400/50 mb-3"/>

                <div className="flex flex-wrap gap-1.5 mb-5">
                  {ROLE_PRESETS.map((r) => (
                    <button key={r} onClick={() => setRole(r)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-black/[0.03] hover:bg-blue-500/10 text-slate-600 hover:text-[#1e2a3a] border border-black/[0.08] transition-all">
                      {r}
                    </button>
                  ))}
                </div>

                <label className="text-slate-500 text-xs block mb-2 text-left">Difficulty</label>
                <div className="flex gap-2 mb-6">
                  {["Easy", "Medium", "Hard"].map((d) => (
                    <button key={d} onClick={() => setDifficulty(d)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                        difficulty === d ? "text-white" : "bg-black/[0.03] text-slate-500 hover:text-[#1e2a3a]"
                      }`}
                      style={difficulty === d ? { backgroundColor: ACCENT } : undefined}>
                      {d}
                    </button>
                  ))}
                </div>

                {!supported && (
                  <p className="text-amber-600 text-xs mb-4">Voice isn't supported in this browser — try Chrome.</p>
                )}

                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={startInterview} disabled={!role.trim() || !supported}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl disabled:opacity-40 text-white font-medium text-sm transition-colors"
                  style={{ backgroundColor: ACCENT }}>
                  <Mic size={16} /> Start Speaking Interview
                </motion.button>
              </div>
            )}

            {(phase === "speaking" || phase === "listening" || phase === "thinking" || phase === "idle") && (
              <div className="flex flex-col items-center py-4">
                <motion.div
                  animate={
                    phase === "listening" ? { scale: [1, 1.08, 1] } :
                    phase === "speaking" ? { scale: [1, 1.04, 1] } : { scale: 1 }
                  }
                  transition={{ duration: phase === "listening" ? 1.1 : 1.6, repeat: Infinity, ease: "easeInOut" }}
                  className={`w-24 h-24 rounded-full flex items-center justify-center mb-5 ${
                    phase === "listening" ? "bg-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.35)]" :
                    phase === "speaking" ? "bg-violet-500 shadow-[0_0_40px_rgba(139,92,246,0.3)]" :
                    "bg-black/[0.06]"
                  }`}
                >
                  {phase === "thinking" ? <Loader2 size={30} className="text-slate-500 animate-spin" /> : <Mic size={30} className={phase === "idle" ? "text-slate-500" : "text-white"} />}
                </motion.div>

                <p className="text-[#1e2a3a] font-medium text-sm mb-1">{statusText}</p>
                {currentQ && (phase === "listening" || phase === "speaking") && (
                  <p className="text-slate-500 text-sm max-w-sm mt-3 italic">"{currentQ}"</p>
                )}
                <AnimatePresence>
                  {transcript && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="text-blue-600 text-sm mt-3 max-w-sm">
                      You're saying: "{transcript}"
                    </motion.p>
                  )}
                </AnimatePresence>
                {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

                <button onClick={togglePause}
                  className={`mt-6 flex items-center gap-2 px-4 py-2 rounded-xl text-xs border transition-colors ${
                    paused ? "bg-blue-500/10 border-blue-400/40 text-blue-600" : "bg-black/[0.03] border-black/[0.08] text-slate-500 hover:text-[#1e2a3a]"
                  }`}>
                  {paused ? <Mic size={13} /> : <MicOff size={13} />}
                  {paused ? "Resume" : "Pause"}
                </button>

                {questions.length > 0 && (
                  <div className="w-full text-left mt-8 space-y-2">
                    <p className="text-slate-400 text-xs uppercase tracking-widest">Answered so far</p>
                    {questions.map((q, i) => (
                      <p key={i} className="text-slate-500 text-xs">✓ Q{i + 1}: {q.q.slice(0, 60)}{q.q.length > 60 ? "..." : ""}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {phase === "finished" && (
              <div className="w-full text-left">
                <div className="flex flex-col items-center mb-5">
                  <Award size={32} className="text-amber-500 mb-2" />
                  <h4 className="text-[#1e2a3a] font-bold">Interview Complete!</h4>
                </div>
                {summary && (
                  <div className="px-4 py-3 rounded-2xl bg-blue-50 border border-blue-200/60 text-[#1e2a3a] text-sm leading-relaxed mb-5">
                    {summary}
                  </div>
                )}
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Transcript</p>
                <div className="space-y-3 mb-2">
                  {questions.map((q, i) => (
                    <div key={i}>
                      <p className="text-blue-600 text-xs font-medium mb-1">Q{i + 1}: {q.q}</p>
                      <p className="text-slate-500 text-xs pl-3 border-l-2 border-black/[0.08]">{q.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {phase === "finished" && (
                        <div className="p-6 border-t border-black/[0.06] shrink-0">
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={restart}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-black/[0.03] hover:bg-black/[0.06] border border-black/[0.08] text-[#1e2a3a] font-medium text-sm transition-colors">
                <RotateCcw size={15} /> Practice Again
              </motion.button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default MockInterview;