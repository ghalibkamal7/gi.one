import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, MessageSquare, Flame } from "lucide-react";

const ACCENT = "#0891b2";

function StudyAnalytics({ isOpen, onClose, chats, messages }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!isOpen || !chats || !messages) return;
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return d.toDateString();
    });
    const msgsByDay = days.map((day) => ({
      label: new Date(day).toLocaleDateString("en", { weekday: "short" }),
      count: messages.filter((m) => {
        const d = m.createdAt?.toDate?.();
        return d && d.toDateString() === day;
      }).length,
    }));
    const totalMsgs = messages.length;
    const userMsgs = messages.filter((m) => m.role === "user").length;
    const topics = messages
      .filter((m) => m.role === "user" && m.text?.length > 5)
      .slice(-20)
      .map((m) => m.text.split(" ").slice(0, 3).join(" "));
    setStats({ msgsByDay, totalMsgs, userMsgs, totalChats: chats.length, topics });
  }, [isOpen, chats, messages]);

  if (!isOpen) return null;

  const maxCount = Math.max(...(stats?.msgsByDay?.map((d) => d.count) || [1]), 1);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        role="dialog" aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e2a3a]/25 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative rounded-3xl p-7 w-full max-w-md mx-4 border shadow-2xl max-h-[90vh] overflow-y-auto"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 0%, ${ACCENT}10 0%, #fffdf8 55%), linear-gradient(rgba(8,145,178,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(8,145,178,0.04) 1px, transparent 1px)`,
            backgroundSize: "auto, 28px 28px, 28px 28px",
            borderColor: `${ACCENT}28`,
          }}
        >
          <button onClick={onClose} aria-label="Close" className="absolute top-5 right-5 p-2 rounded-xl hover:bg-black/5 text-slate-400 hover:text-[#1e2a3a] transition-colors">
            <X size={18} />
          </button>
          <h3 className="text-[#1e2a3a] font-bold text-xl mb-1">📊 Study Analytics</h3>
          <p className="text-slate-500 text-xs mb-6">Your learning activity this week</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: <MessageSquare size={16} />, label: "Total Chats", value: stats?.totalChats || 0, color: "#0891b2" },
              { icon: <TrendingUp size={16} />, label: "Questions", value: stats?.userMsgs || 0, color: "#7c3aed" },
              { icon: <Flame size={16} />, label: "AI Replies", value: (stats?.totalMsgs || 0) - (stats?.userMsgs || 0), color: "#059669" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-3 border border-black/[0.06] shadow-sm text-center">
                <div className="flex justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
                <p className="text-[#1e2a3a] font-bold text-xl">{s.value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <p className="text-slate-400 text-xs uppercase tracking-widest mb-3">Messages This Week</p>
            <div className="flex items-end gap-2 h-28">
              {stats?.msgsByDay?.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.round((d.count / maxCount) * 100)}%` }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                    className="w-full rounded-t-lg min-h-[4px]"
                    style={{ background: `linear-gradient(to top, ${ACCENT}, #67e8f9)` }}
                  />
                  <span className="text-slate-400 text-xs">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          {stats?.topics?.length > 0 && (
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-widest mb-3">Recent Topics</p>
              <div className="flex flex-wrap gap-2">
                {[...new Set(stats.topics)].slice(0, 8).map((t, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-xs text-slate-600 bg-white border border-black/[0.08]">
                    {t}...
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default StudyAnalytics;