import { motion } from "framer-motion";
import { Users, Languages, Timer, BookOpen, FileImage, Image as ImageIcon, Scissors, ChevronRight } from "lucide-react";

const CATEGORIES = [
  {
    title: "⚡ GI",
    actions: [
      { label: "GI Chat", icon: "✨", prompt: "Hello! What can you help me with today?", primary: true },
      { label: "GI Assistant", icon: "🤖", type: "assistant" },
      { label: "Study", icon: "👥", type: "tool", toolKey: "studyroom" },
      { label: "GI Talk", icon: "🌐", type: "tool", toolKey: "gitalk" },
      { label: "Focus", icon: "⏱️", type: "tool", toolKey: "focus" },
      { label: "Cards", icon: "📖", type: "tool", toolKey: "cards" },
      { label: "PDF", icon: "📄", type: "tool", toolKey: "pdf" },
      { label: "Resize", icon: "🖼️", type: "tool", toolKey: "resize" },
      { label: "BG Del", icon: "✂️", type: "tool", toolKey: "bgremove" },
    ]
  },
  {
    title: "🎓 Study & Learn",
    actions: [
      { label: "PDF Analysis", icon: "📄", prompt: "Help me summarize and analyze a document." },
      { label: "Smart Notes", icon: "🧠", prompt: "Help me create smart structured notes on a topic." },
      { label: "Code Help", icon: "💻", prompt: "I have a coding problem. Help me debug and fix it." },
      { label: "Study Plan", icon: "📅", prompt: "Create a focused study plan for today." },
      { label: "Quiz Me", icon: "🧪", prompt: "Create a 5-question quiz on a topic I choose." },
    ]
  },
  {
    title: "💼 Career & Growth",
    actions: [
      { label: "Resume Review", icon: "📝", prompt: "Help me improve my resume. I'll share the details." },
      { label: "Mock Interview", icon: "🎤", type: "interview" },
      { label: "Career Advice", icon: "💡", prompt: "Give me career guidance based on my skills and interests." },
      { label: "LinkedIn Bio", icon: "🔗", prompt: "Write a professional LinkedIn bio for me." },
    ]
  },
  {
    title: "💙 Wellbeing",
    actions: [
      { label: "Vent & Talk", icon: "💭", prompt: "I need someone to talk to. I'm going through something difficult." },
      { label: "Calm Me Down", icon: "🧘", prompt: "Help me calm down. Guide me through a quick breathing exercise." },
      { label: "Motivate Me", icon: "💪", prompt: "I'm feeling low. Give me a powerful motivational message." },
      { label: "Self Care Tips", icon: "❤️", prompt: "Give me 5 practical self-care tips for today." },
    ]
  },
  {
    title: "🏥 Health",
    actions: [
      { label: "Diet Plan", icon: "🍎", prompt: "Create a healthy Indian diet plan for the day." },
      { label: "Workout Plan", icon: "🏃", prompt: "Create a 20-minute home workout plan for me." },
      { label: "Sleep Tips", icon: "😴", prompt: "Give me science-backed tips to improve my sleep quality." },
      { label: "Symptom Info", icon: "🧬", prompt: "I want to understand some health symptoms. Please help me understand them (not as medical advice)." },
    ]
  },
];

function QuickActions({ onAction, onAssistant, onInterview, onOpenTool, hidden }) {
  if (hidden) return null;

  const handleClick = (a) => {
    if (a.type === "assistant") return onAssistant?.();
    if (a.type === "interview") return onInterview?.();
    if (a.type === "tool") return onOpenTool?.(a.toolKey);
    onAction(a.prompt);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="max-w-3xl mx-auto px-4 pb-8 w-full space-y-5"
    >
      {CATEGORIES.map((cat, ci) => (
        <div key={ci}>
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-2 px-1">{cat.title}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {cat.actions.map((a) => (
              <motion.button
                key={a.label}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleClick(a)}
                className={`group flex items-center justify-between gap-2 px-3.5 py-3 rounded-2xl text-sm transition-all duration-200 cursor-pointer text-left border ${
                  a.primary
                    ? "bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/25 hover:bg-blue-600"
                    : a.type === "assistant" || a.type === "interview" || a.type === "tool"
                    ? "bg-white text-[#1e2a3a] border-black/[0.06] shadow-sm hover:border-blue-300 hover:shadow-md"
                    : "bg-white text-[#1e2a3a] border-black/[0.06] shadow-sm hover:border-black/[0.12] hover:shadow-md"
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="text-base shrink-0">{a.icon}</span>
                  <span className="truncate font-medium">{a.label}</span>
                </span>
                <ChevronRight size={14} className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${a.primary ? "text-white/70" : "text-slate-300"}`} />
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

export default QuickActions;