import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Plus, Trash2, Sparkles, AlertCircle, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { addReminder, subscribeToReminders, deleteReminder } from "../services/reminders";
import { generateGeminiResponse } from "../services/gemini";

const ACCENT = "#f59e0b";

function fmt(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return (sameDay ? "Today, " : d.toLocaleDateString([], { month: "short", day: "numeric" }) + ", ")
    + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Reminders({ isOpen, onClose }) {
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [nlInput, setNlInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [manualText, setManualText] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("");

  useEffect(() => {
    if (!isOpen || !user) return;
    return subscribeToReminders(user.uid, setReminders);
  }, [isOpen, user]);

  // Natural-language parsing follows the same "ask Gemini for strict
  // JSON" pattern already used by Flashcards/summaries elsewhere in
  // this app — not a new architecture, just applied here.
  const parseNaturalLanguage = async () => {
    const t = nlInput.trim();
    if (!t || parsing) return;
    setParsing(true);
    setError("");
    try {
      const now = new Date();
      const prompt = `The current date and time is ${now.toISOString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone}).
Parse this reminder request into a future date/time and task text: "${t}"
Return ONLY raw JSON, no markdown fences: {"isoDateTime": "<ISO 8601 datetime in the future>", "task": "<short task description>"}
If no clear future time is given, use one hour from now.`;
      const res = await generateGeminiResponse([{ role: "user", text: prompt }]);
      const clean = res.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const dueAt = new Date(parsed.isoDateTime);
      if (isNaN(dueAt.getTime()) || dueAt < now) {
        throw new Error("Couldn't figure out a valid future time from that.");
      }
      await addReminder(user.uid, { text: parsed.task || t, dueAt: dueAt.toISOString() });
      setNlInput("");
    } catch (err) {
      console.error("Reminder parse failed:", err);
      setError("Couldn't understand that — try the manual fields below, or rephrase.");
    } finally {
      setParsing(false);
    }
  };

  const addManual = async () => {
    if (!manualText.trim() || !manualDate || !manualTime) return;
    const dueAt = new Date(`${manualDate}T${manualTime}`);
    if (isNaN(dueAt.getTime()) || dueAt < new Date()) {
      setError("Please pick a future date and time.");
      return;
    }
    await addReminder(user.uid, { text: manualText.trim(), dueAt: dueAt.toISOString() });
    setManualText(""); setManualDate(""); setManualTime(""); setError("");
  };

  if (!isOpen) return null;

  const upcoming = reminders.filter((r) => !r.fired);
  const past = reminders.filter((r) => r.fired);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        role="dialog" aria-modal="true" aria-label="Reminders"
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e2a3a]/25 backdrop-blur-sm p-4"
        onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="rounded-3xl w-full max-w-md border shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
          style={{ background: `radial-gradient(circle at 50% 0%, ${ACCENT}10 0%, #fffdf8 55%)`, borderColor: `${ACCENT}28` }}>

          <div className="flex items-center justify-between p-6 border-b border-black/[0.06] shrink-0">
            <div className="flex items-center gap-2">
              <Bell size={18} style={{ color: ACCENT }} />
              <div>
                <h3 className="text-[#1e2a3a] font-bold text-lg">Reminders</h3>
                <p className="text-slate-500 text-xs mt-0.5">Works while GI.ONE is open in a tab — not a phone alarm</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl hover:bg-black/5 text-slate-400 hover:text-[#1e2a3a] transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            <div className="flex gap-2 mb-2">
              <input value={nlInput} onChange={(e) => setNlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && parseNaturalLanguage()}
                placeholder="e.g. remind me tomorrow at 9am to submit assignment"
                className="flex-1 bg-black/[0.03] border border-black/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#1e2a3a] placeholder-slate-400 outline-none focus:border-amber-400/50" />
              <button onClick={parseNaturalLanguage} disabled={parsing || !nlInput.trim()}
                className="px-4 py-2.5 rounded-xl disabled:opacity-40 text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
                style={{ backgroundColor: ACCENT }}>
                <Sparkles size={14} /> {parsing ? "..." : "Add"}
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-1.5 mb-3 text-red-500 text-xs">
                <AlertCircle size={13} className="shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <details className="mb-5">
              <summary className="text-slate-500 text-xs cursor-pointer hover:text-[#1e2a3a] transition-colors">Or set it manually</summary>
              <div className="mt-3 space-y-2">
                <input value={manualText} onChange={(e) => setManualText(e.target.value)}
                  placeholder="What's the reminder?"
                  className="w-full bg-black/[0.03] border border-black/[0.08] rounded-xl px-3 py-2 text-sm text-[#1e2a3a] placeholder-slate-400 outline-none focus:border-amber-400/50" />
                <div className="flex gap-2">
                  <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)}
                    className="flex-1 bg-black/[0.03] border border-black/[0.08] rounded-xl px-3 py-2 text-sm text-[#1e2a3a] outline-none focus:border-amber-400/50" />
                  <input type="time" value={manualTime} onChange={(e) => setManualTime(e.target.value)}
                    className="flex-1 bg-black/[0.03] border border-black/[0.08] rounded-xl px-3 py-2 text-sm text-[#1e2a3a] outline-none focus:border-amber-400/50" />
                </div>
                <button onClick={addManual} disabled={!manualText.trim() || !manualDate || !manualTime}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl disabled:opacity-40 text-white text-sm font-medium transition-colors"
                  style={{ backgroundColor: ACCENT }}>
                  <Plus size={14} /> Add Reminder
                </button>
              </div>
            </details>

            {upcoming.length > 0 && (
              <div className="mb-4">
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Upcoming</p>
                <div className="space-y-1.5">
                  {upcoming.map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white border border-black/[0.06] shadow-sm">
                      <div className="flex items-start gap-2 min-w-0">
                        <Clock size={13} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[#1e2a3a] text-sm truncate">{r.text}</p>
                          <p className="text-slate-400 text-xs">{fmt(r.dueAt)}</p>
                        </div>
                      </div>
                      <button onClick={() => deleteReminder(r.id)} className="p-1 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcoming.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-sm">
                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                No reminders set
              </div>
            )}

            {past.length > 0 && (
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Completed</p>
                <div className="space-y-1.5">
                  {past.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/[0.02] text-slate-400">
                      <p className="text-xs truncate line-through">{r.text}</p>
                      <button onClick={() => deleteReminder(r.id)} className="p-1 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors shrink-0">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default Reminders;