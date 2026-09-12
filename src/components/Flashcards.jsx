import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Shuffle, Sparkles, AlertCircle } from "lucide-react";
import { generateGeminiResponse } from "../services/gemini";

const ACCENT = "#d97706";

function Flashcards({ isOpen, onClose }) {
  const [topic, setTopic] = useState("");
  const [cards, setCards] = useState([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mastered, setMastered] = useState([]);

  const generate = async () => {
    const t = topic.trim();
    if (!t || loading) return;

    setLoading(true);
    setError("");
    setCards([]);
    setCurrent(0);
    setFlipped(false);
    setMastered([]);

    try {
      const prompt = `Create exactly 8 flashcards about "${t}".
Return ONLY a raw JSON array, nothing else — no markdown fences, no explanation.
Each item must be an object like {"front": "question here", "back": "answer here, max 2 sentences"}.`;

      const res = await generateGeminiResponse([{ role: "user", text: prompt }]);
      const clean = res.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("empty");
      }
      setCards(parsed);
    } catch (err) {
      console.error("Flashcard generation failed:", err);
      setError("Couldn't generate cards for that topic. Please try again or rephrase it.");
    } finally {
      setLoading(false);
    }
  };

  const shuffle = () => { setCards((p) => [...p].sort(() => Math.random() - 0.5)); setCurrent(0); setFlipped(false); };
  const next = () => { setFlipped(false); setTimeout(() => setCurrent((c) => (c + 1) % cards.length), 150); };
  const prev = () => { setFlipped(false); setTimeout(() => setCurrent((c) => (c - 1 + cards.length) % cards.length), 150); };
  const markMastered = () => { setMastered((m) => [...m, current]); if (current < cards.length - 1) next(); };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      role="dialog" aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e2a3a]/25 backdrop-blur-sm p-4"
        onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="rounded-3xl w-full max-w-lg border shadow-2xl overflow-hidden"
          style={{ background: `radial-gradient(circle at 50% 0%, ${ACCENT}10 0%, #fffdf8 55%)`, borderColor: `${ACCENT}28` }}>

          <div className="flex items-center justify-between p-6 border-b border-black/[0.06]">
            <div>
              <h3 className="text-[#1e2a3a] font-bold text-lg">🃏 Flashcards</h3>
              <p className="text-slate-500 text-xs mt-0.5">AI-generated study cards</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl hover:bg-black/5 text-slate-400 hover:text-[#1e2a3a] transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-6">
            <div className="flex gap-2 mb-4">
              <input value={topic} onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generate()}
                placeholder="Enter a topic (e.g. Photosynthesis, React Hooks...)"
                disabled={loading}
                className="flex-1 bg-black/[0.03] border border-black/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#1e2a3a] placeholder-slate-400 outline-none focus:border-amber-500/50 disabled:opacity-60" />
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={generate} disabled={loading || !topic.trim()}
                className="px-4 py-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium flex items-center gap-1.5 shrink-0 transition-colors"
                style={{ backgroundColor: ACCENT }}>
                <Sparkles size={14} /> {loading ? "Generating..." : "Generate"}
              </motion.button>
            </div>

            {error && (
              <div className="flex items-start gap-2 mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {loading && (
              <div className="space-y-3">
                {[1,2,3].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-black/[0.04] animate-pulse" />
                ))}
              </div>
            )}

            {cards.length > 0 && !loading && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-500 text-xs">{current + 1} / {cards.length}</span>
                  <span className="text-emerald-600 text-xs">{mastered.length} mastered</span>
                  <button onClick={shuffle} className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#1e2a3a] transition-colors">
                    <Shuffle size={12} /> Shuffle
                  </button>
                </div>

                <div className="h-1 bg-black/[0.06] rounded-full mb-5 overflow-hidden">
                  <motion.div animate={{ width: `${((current + 1) / cards.length) * 100}%` }}
                    className="h-full rounded-full transition-all duration-300"
                    style={{ background: `linear-gradient(90deg, ${ACCENT}, #f59e0b)` }} />
                </div>

                <div className="flashcard h-44 mb-5 cursor-pointer" onClick={() => setFlipped((f) => !f)}>
                  <div className={`flashcard-inner ${flipped ? "flipped" : ""}`}>
                    <div className="flashcard-front bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300/40">
                      <div className="text-center">
                        <p className="text-xs mb-2 uppercase tracking-widest" style={{ color: ACCENT }}>Question</p>
                        <p className="text-[#1e2a3a] font-medium text-base leading-relaxed">{cards[current]?.front}</p>
                        <p className="text-slate-400 text-xs mt-3">Tap to reveal answer</p>
                      </div>
                    </div>
                    <div className="flashcard-back bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-300/40">
                      <div className="text-center">
                        <p className="text-xs text-emerald-600 mb-2 uppercase tracking-widest">Answer</p>
                        <p className="text-[#1e2a3a] text-sm leading-relaxed">{cards[current]?.back}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button onClick={prev} className="p-2.5 rounded-xl bg-black/[0.03] hover:bg-black/[0.06] text-slate-500 hover:text-[#1e2a3a] transition-all">
                    <ChevronLeft size={18} />
                  </button>

                  <div className="flex gap-2">
                    <button onClick={() => { setFlipped(false); next(); }}
                      className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/15 text-red-500 text-sm transition-all">
                      Again
                    </button>
                    <button onClick={markMastered}
                      className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-600 text-sm transition-all">
                      ✓ Got it
                    </button>
                  </div>

                  <button onClick={next} className="p-2.5 rounded-xl bg-black/[0.03] hover:bg-black/[0.06] text-slate-500 hover:text-[#1e2a3a] transition-all">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default Flashcards;