import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Droplet, Plus, Trash2, Settings2, Info } from "lucide-react";

const STORAGE_KEY = "gi-cycle-data";
const ACCENT = "#e879a6";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { periods: [], cycleLength: 28, periodLength: 5 };
    const parsed = JSON.parse(raw);
    return {
      periods: parsed.periods || [],
      cycleLength: parsed.cycleLength || 28,
      periodLength: parsed.periodLength || 5,
    };
  } catch {
    return { periods: [], cycleLength: 28, periodLength: 5 };
  }
}

function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore quota errors */ }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const isoDate = (d) => new Date(d).toISOString().slice(0, 10);

function PeriodTracker({ isOpen, onClose }) {
  const [data, setData] = useState(loadData);
  const [showSettings, setShowSettings] = useState(false);
  const [newDate, setNewDate] = useState(isoDate(new Date()));

  useEffect(() => { if (isOpen) setData(loadData()); }, [isOpen]);
  useEffect(() => { saveData(data); }, [data]);

  const sortedPeriods = useMemo(
    () => [...data.periods].sort((a, b) => new Date(b) - new Date(a)),
    [data.periods]
  );

  const lastStart = sortedPeriods[0] ? new Date(sortedPeriods[0]) : null;

  const predictions = useMemo(() => {
    if (!lastStart) return null;
    const nextPeriod = new Date(lastStart.getTime() + data.cycleLength * DAY_MS);
    const ovulation = new Date(nextPeriod.getTime() - 14 * DAY_MS);
    const fertileStart = new Date(ovulation.getTime() - 4 * DAY_MS);
    const fertileEnd = new Date(ovulation.getTime() + 1 * DAY_MS);
    const today = new Date();
    const daysUntilNext = Math.round((nextPeriod - today) / DAY_MS);
    const cycleDay = Math.round((today - lastStart) / DAY_MS) + 1;
    return { nextPeriod, ovulation, fertileStart, fertileEnd, daysUntilNext, cycleDay };
  }, [lastStart, data.cycleLength]);

  const addPeriod = () => {
    if (!newDate) return;
    if (data.periods.includes(newDate)) return;
    setData((d) => ({ ...d, periods: [...d.periods, newDate] }));
  };

  const removePeriod = (date) => {
    setData((d) => ({ ...d, periods: d.periods.filter((p) => p !== date) }));
  };

  const updateSetting = (key, value) => {
    const n = parseInt(value, 10);
    if (!n || n < 1) return;
    setData((d) => ({ ...d, [key]: Math.min(n, key === "cycleLength" ? 60 : 15) }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        role="dialog" aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e2a3a]/25 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="rounded-3xl w-full max-w-md border shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
          style={{ background: `radial-gradient(circle at 50% 0%, ${ACCENT}10 0%, #fffdf8 55%)`, borderColor: `${ACCENT}28` }}
        >
          <div className="flex items-center justify-between p-6 border-b border-black/[0.06] shrink-0">
            <div className="flex items-center gap-2">
              <Droplet size={18} style={{ color: ACCENT }} />
              <div>
                <h3 className="text-[#1e2a3a] font-bold text-lg">Periods Tracker</h3>
                <p className="text-slate-500 text-xs mt-0.5">Private — stored only on this device</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowSettings((s) => !s)}
                className="p-2 rounded-xl hover:bg-black/5 text-slate-400 hover:text-[#1e2a3a] transition-colors">
                <Settings2 size={16} />
              </button>
              <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl hover:bg-black/5 text-slate-400 hover:text-[#1e2a3a] transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="mb-5 overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-black/[0.03] border border-black/[0.06]">
                    <div>
                      <label className="text-slate-500 text-xs block mb-1">Cycle length (days)</label>
                      <input type="number" min="15" max="60" value={data.cycleLength}
                        onChange={(e) => updateSetting("cycleLength", e.target.value)}
                        className="w-full bg-white border border-black/[0.08] rounded-lg px-2.5 py-1.5 text-sm text-[#1e2a3a] outline-none focus:border-pink-400/50" />
                    </div>
                    <div>
                      <label className="text-slate-500 text-xs block mb-1">Period length (days)</label>
                      <input type="number" min="1" max="15" value={data.periodLength}
                        onChange={(e) => updateSetting("periodLength", e.target.value)}
                        className="w-full bg-white border border-black/[0.08] rounded-lg px-2.5 py-1.5 text-sm text-[#1e2a3a] outline-none focus:border-pink-400/50" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {predictions ? (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-2xl p-4 bg-pink-500/10 border border-pink-300/30">
                  <p className="text-pink-600 text-xs mb-1">Next period in</p>
                  <p className="text-[#1e2a3a] font-bold text-2xl">
                    {predictions.daysUntilNext >= 0 ? predictions.daysUntilNext : 0} <span className="text-sm font-normal text-slate-400">days</span>
                  </p>
                  <p className="text-slate-500 text-xs mt-1">{fmt(predictions.nextPeriod)}</p>
                </div>
                <div className="rounded-2xl p-4 bg-purple-500/10 border border-purple-300/30">
                  <p className="text-purple-600 text-xs mb-1">Cycle day</p>
                  <p className="text-[#1e2a3a] font-bold text-2xl">{predictions.cycleDay}</p>
                  <p className="text-slate-500 text-xs mt-1">of {data.cycleLength}</p>
                </div>
                <div className="col-span-2 rounded-2xl p-4 bg-blue-500/10 border border-blue-300/30">
                  <p className="text-blue-600 text-xs mb-1">Estimated fertile window</p>
                  <p className="text-[#1e2a3a] text-sm font-medium">
                    {fmt(predictions.fertileStart)} – {fmt(predictions.fertileEnd)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 mb-4 text-slate-400 text-sm">
                <Droplet size={24} className="mx-auto mb-2 opacity-30" />
                Log your first period start date to see predictions
              </div>
            )}

            <div className="flex gap-2 mb-5">
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                max={isoDate(new Date())}
                className="flex-1 bg-black/[0.03] border border-black/[0.08] rounded-xl px-3 py-2.5 text-sm text-[#1e2a3a] outline-none focus:border-pink-400/50" />
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={addPeriod}
                className="px-4 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-1.5 transition-colors"
                style={{ backgroundColor: ACCENT }}>
                <Plus size={14} /> Log
              </motion.button>
            </div>

            {sortedPeriods.length > 0 && (
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-widest mb-2">History</p>
                <div className="space-y-1.5">
                  {sortedPeriods.map((date) => (
                    <div key={date} className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/[0.02] border border-black/[0.06]">
                      <span className="text-slate-600 text-sm flex items-center gap-2">
                        <Droplet size={12} style={{ color: ACCENT }} /> {fmt(date)}
                      </span>
                      <button onClick={() => removePeriod(date)}
                        className="p-1 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 mt-6 px-3 py-2.5 rounded-xl bg-black/[0.02] border border-black/[0.05] text-slate-500 text-xs">
              <Info size={13} className="shrink-0 mt-0.5" />
              <span>Estimates only, based on simple averages — not medical advice. Periods cycle vary naturally.</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default PeriodTracker;