import { useEffect, useState, useCallback, useRef, lazy, Suspense } from "react";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import ChatHistory from "../components/ChatHistory";
import MessageInput from "../components/MessageInput";
import QuickActions from "../components/QuickActions";
import SmartSuggestions from "../components/SmartSuggestions";
import AuroraBackground from "../components/AuroraBackground";

import HinglishToggle, { HINGLISH_SYSTEM_PROMPT } from "../components/HinglishToggle";
import { detectMood, applyMoodTheme } from "../components/MoodTheme";
import {
  subscribeToChats, createChat,
  deleteChat as firestoreDeleteChat,
  renameChat as firestoreRenameChat,
  subscribeToMessages, addMessage, updateMessage, updateChatTitle,
} from "../services/firestore";
import { streamGeminiResponseWithTools } from "../services/gemini";
import { isGhalibQuery, getGhalibBio } from "../components/GhalibBio";
import { isGreeting, getGreetingReply } from "../components/GreetingReply";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Timer, BarChart2, BookOpen, Pin, Menu, FileImage, Droplet, Terminal, Briefcase, Image as ImageIcon, Scissors, Users, Languages, ChevronDown } from "lucide-react";
import GestureControl from "../components/GestureControl";

const JarvisDashboard = lazy(() => import("../components/JarvisDashboard"));
const ImageResizer      = lazy(() => import("../components/ImageResizer"));
const BackgroundRemover = lazy(() => import("../components/BackgroundRemover"));
const MockInterview     = lazy(() => import("../components/MockInterview"));
const LocalAgentPanel    = lazy(() => import("../components/LocalAgentPanel"));
const StudyRoom          = lazy(() => import("../components/StudyRoom"));
const GITalk              = lazy(() => import("../components/GITalk"));
const GI3DCore           = lazy(() => import("../components/GI3DCore"));
const FocusMode        = lazy(() => import("../components/FocusMode"));
const StudyAnalytics   = lazy(() => import("../components/StudyAnalytics"));
const Flashcards       = lazy(() => import("../components/Flashcards"));
const PinnedMessages   = lazy(() => import("../components/PinnedMessages"));
const ImageToPDF       = lazy(() => import("../components/ImageToPDF"));
const PeriodTracker    = lazy(() => import("../components/PeriodTracker"));

const VISIBLE_TOOLS = [
  { icon: <Droplet size={14} />,  label: "Periods", key: "cycle" },
  { icon: <Pin size={14} />,      label: "Pins",    key: "pins"  },
  { icon: <BarChart2 size={14} />,label: "Stats",   key: "stats" },
];

function AIChat() {
  const { user } = useAuth();
  const [chats, setChats]               = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages]         = useState([]);
  const [allMessages, setAllMessages]   = useState([]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  const [suggestions, setSuggestions]   = useState([]);
  const [lastAIMsg, setLastAIMsg]       = useState("");
  const [toolStatus, setToolStatus]     = useState("");
  const [hadError, setHadError]         = useState(0); // timestamp, so repeated errors still re-trigger the UI
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [cycleOpen, setCycleOpen]       = useState(false);
  const [gestureState, setGestureState] = useState(null);
  
  const [resizeOpen, setResizeOpen]     = useState(false);
  const [bgRemoveOpen, setBgRemoveOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [coreOpen, setCoreOpen] = useState(false);
  const [studyRoomOpen, setStudyRoomOpen] = useState(false);
  const [talkOpen, setTalkOpen] = useState(false);
  const [focusOpen, setFocusOpen]       = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [flashcardsOpen, setFlashcardsOpen] = useState(false);
  const [pdfOpen, setPdfOpen]           = useState(false);
  const [pinsOpen, setPinsOpen]         = useState(false);
  const [pins, setPins]                 = useState([]);
  const [hinglish, setHinglish]         = useState(false);
  const [currentMood, setCurrentMood]   = useState("focused");
  const [moodLabel, setMoodLabel]       = useState("");
  const [moodColor, setMoodColor]       = useState("#6366f1");
  const moodToastRef  = useRef(null);

  const lastUserMsg    = useRef("");
  const activeChatRef  = useRef(null);
  const messagesRef    = useRef([]);
  const hinglishRef    = useRef(false);
  const currentMoodRef = useRef("focused");
  const chatsRef       = useRef([]);
  const sendingRef     = useRef(false);

  useEffect(() => { activeChatRef.current = activeChatId; }, [activeChatId]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { hinglishRef.current = hinglish; }, [hinglish]);
  useEffect(() => { currentMoodRef.current = currentMood; }, [currentMood]);
  useEffect(() => { chatsRef.current = chats; }, [chats]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToChats(user.uid, (data) => {
      setChats(data);
      if (!activeChatRef.current && data.length > 0) setActiveChatId(data[0].id);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!activeChatId) { setMessages([]); return; }
    let cancelled = false;
    setMessages([]);
    const unsub = subscribeToMessages(activeChatId, (msgs) => {
      if (cancelled) return;
      setMessages(msgs);
      setAllMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        return [...prev, ...msgs.filter((m) => !ids.has(m.id))];
      });
    });
    return () => { cancelled = true; unsub(); };
  }, [activeChatId]);

  const resetComposerState = () => {
    setSuggestions([]);
    setLastAIMsg("");
    setStreamingText("");
  };

  const handleCreateNewChat = useCallback(async () => {
    const id = await createChat(user.uid, "New Chat");
    setMessages([]);
    setActiveChatId(id);
    resetComposerState();
  }, [user]);

  const handleSwitchChat = useCallback((id) => {
    if (id === activeChatRef.current) return;
    setMessages([]);
    setActiveChatId(id);
    resetComposerState();
  }, []);

  const handleDeleteChat = async (chatId) => {
    await firestoreDeleteChat(chatId);
    if (activeChatRef.current === chatId) {
      const rest = chatsRef.current.filter((c) => c.id !== chatId);
      if (rest.length > 0) handleSwitchChat(rest[0].id);
      else {
        const id = await createChat(user.uid, "New Chat");
        setMessages([]);
        setActiveChatId(id);
        resetComposerState();
      }
    }
  };

  const showMoodToast = (label, color) => {
    setMoodLabel(label); setMoodColor(color);
    clearTimeout(moodToastRef.current);
    moodToastRef.current = setTimeout(() => setMoodLabel(""), 2500);
  };

  const handlePin   = (msg) => setPins((p) => p.find((x) => x.text === msg.text) ? p : [...p, msg]);
  const handleUnpin = (idx) => setPins((p) => p.filter((_, i) => i !== idx));

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning 👋";
    if (h < 18) return "Good Afternoon ☀️";
    return "Good Evening 🌙";
  };

  const handleSend = useCallback(async (data) => {
    const hasImages = data?.images?.length > 0 || !!data?.image;
    if (!data || (!data.text?.trim() && !hasImages)) return;
    if (sendingRef.current) return;
    sendingRef.current = true;
    setLoading(true);

    try {
      let chatId = activeChatRef.current;
      let priorMessages = messagesRef.current;

      if (!chatId) {
        chatId = await createChat(user.uid, "New Chat");
        priorMessages = [];
        activeChatRef.current = chatId;
        setActiveChatId(chatId);
      }

      const userText   = data.text?.trim() || "";
      const userImages = data.images?.length ? data.images : data.image ? [data.image] : [];
      if (userText) lastUserMsg.current = userText;

      setInput("");
      setSuggestions([]);
      setStreamingText("");

      try {
        await addMessage(chatId, "user", userText, userImages);
      } catch (err) {
        console.error("Failed to save user message:", err);
        sendingRef.current = false;
        setLoading(false);
        // Surface it instead of leaving the composer looking "stuck" —
        // this is exactly the silent-fail scenario that made repeated
        // sends after a too-large image look like the whole chat broke.
        alert(
          err.message?.includes("longer than")
            ? "That image is too large to send, even after compression. Please try a smaller photo."
            : "Couldn't send your message — please check your connection and try again."
        );
        return;
      }

      const chat = chatsRef.current.find((c) => c.id === chatId);
      if ((!chat || chat.title === "New Chat") && userText) {
        await updateChatTitle(chatId, userText.slice(0, 42));
      }

      const aiMsgId = await addMessage(chatId, "assistant", "", null);

      let fullText = "";
      try {
        if (isGhalibQuery(userText)) {
          const bio = getGhalibBio();
          const words = bio.split(" ");
          let built = "";
          for (let i = 0; i < words.length; i++) {
            built += (i > 0 ? " " : "") + words[i];
            if (activeChatRef.current === chatId) setStreamingText(built);
            if (i % 6 === 0) await new Promise((r) => setTimeout(r, 12));
          }
          fullText = bio;
        } else if (isGreeting(userText)) {
          const reply = getGreetingReply(user?.displayName?.split(" ")[0]);
          const words = reply.split(" ");
          let built = "";
          for (let i = 0; i < words.length; i++) {
            built += (i > 0 ? " " : "") + words[i];
            if (activeChatRef.current === chatId) setStreamingText(built);
            if (i % 3 === 0) await new Promise((r) => setTimeout(r, 20));
          }
          fullText = reply;
        } else {
          const history = [
            ...priorMessages.map((m) => ({ role: m.role, text: m.text, images: m.images?.length ? m.images : m.image ? [m.image] : [] })),
            { role: "user", text: userText, images: userImages },
          ];

          const systemPrompt = hinglishRef.current ? HINGLISH_SYSTEM_PROMPT : null;

          fullText = await streamGeminiResponseWithTools(
            history, systemPrompt,
            (streamed) => { if (activeChatRef.current === chatId) setStreamingText(streamed); },
            (label) => { if (activeChatRef.current === chatId) setToolStatus(label); }
          );
          if (activeChatRef.current === chatId) setToolStatus("");
        }

        if (!fullText || !fullText.trim()) {
          fullText = "I couldn't generate a response for that. Could you try rephrasing your question?";
        }

        await updateMessage(chatId, aiMsgId, fullText);
        if (activeChatRef.current === chatId) {
          setStreamingText("");
          setLastAIMsg(fullText);
        }

        const mood = detectMood(fullText);
        if (mood !== currentMoodRef.current) {
          const theme = applyMoodTheme(mood);
          setCurrentMood(mood);
          showMoodToast(theme.label, theme.accent);
        }
      } catch (err) {
        console.error("GI response error:", err);

        const friendly = err?.message?.includes("API key")
          ? "⚠️ GI isn't configured correctly (missing or invalid API key). Please check the app setup."
          : err?.message?.includes("quota") || err?.message?.includes("429")
          ? "⚠️ GI has hit its usage limit for now. Please try again in a bit."
          : "⚠️ Something went wrong while getting a response. Please try again.";

        await updateMessage(chatId, aiMsgId, friendly);

        if (activeChatRef.current === chatId) {
          setStreamingText("");
          setToolStatus("");
          setHadError(Date.now());
        }

        // Critical: notify Jarvis Dashboard about the error response
        // so its voice loop doesn't remain stuck in "thinking".
        setLastAIMsg(friendly);
      }
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  }, [user]);

  const handleRegenerate = useCallback(async () => {
    if (!lastUserMsg.current || sendingRef.current) return;
    await handleSend({ text: lastUserMsg.current, image: null });
  }, [handleSend]);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") setMobileSidebar(false);
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); handleCreateNewChat(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "m") { e.preventDefault(); setAssistantOpen(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleCreateNewChat]);

    const openTool = (key) => {
    if (key === "focus")     setFocusOpen(true);
    if (key === "cards")     setFlashcardsOpen(true);
    if (key === "pdf")       setPdfOpen(true);
    if (key === "cycle")     setCycleOpen(true);
    if (key === "pins")      setPinsOpen(true);
    if (key === "stats")     setAnalyticsOpen(true);
    if (key === "resize")    setResizeOpen(true);
    if (key === "bgremove")  setBgRemoveOpen(true);
    if (key === "interview") setInterviewOpen(true);
    if (key === "core")      setCoreOpen(true);
    if (key === "studyroom") setStudyRoomOpen(true);
    if (key === "gitalk")    setTalkOpen(true);
  };

  const sidebarProps = {
    chats, activeChatId,
    setActiveChatId: handleSwitchChat,
    createNewChat: handleCreateNewChat,
    deleteChat: handleDeleteChat,
    renameChat: async (id, title) => { await firestoreRenameChat(id, title); },
  };

  const activeChat = chats.find((c) => c.id === activeChatId);

  const cleanMessages = messages.filter(
    (m) => !(m.role === "assistant" && !m.text)
  );

  const displayMessages = streamingText
    ? [
        ...cleanMessages,
        { id: "streaming", role: "assistant", text: streamingText, streaming: true },
      ]
    : cleanMessages;

  return (
    <div className="flex h-screen bg-transparent overflow-hidden relative">
      <AuroraBackground starCount={14} />

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.22 }}
            className="hidden md:flex shrink-0 overflow-hidden h-full">
            <Sidebar {...sidebarProps} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileSidebar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileSidebar(false)} />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-0 top-0 h-full z-50 md:hidden flex">
              <Sidebar {...sidebarProps} isMobile onClose={() => setMobileSidebar(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">

               <div className="flex sm:hidden items-center justify-between gap-1 px-2 py-2 border-b border-black/[0.06] bg-[#faf6ee]/95 backdrop-blur-sm overflow-x-auto shrink-0">
          <button onClick={() => setSidebarOpen((p) => !p)}
            className="hidden md:flex p-2 rounded-xl hover:bg-white/[0.06] text-slate-500 hover:text-white transition-colors shrink-0">
            <Menu size={17} />
          </button>
          <button onClick={() => setMobileSidebar(true)}
            className="flex md:hidden p-2 rounded-xl hover:bg-white/[0.06] text-slate-500 hover:text-white transition-colors shrink-0">
            <Menu size={17} />
          </button>

          <span className="text-[#1e2a3a] text-sm font-medium truncate flex-1 min-w-0">
            {activeChat?.title || "New Chat"}
          </span>

         <HinglishToggle enabled={hinglish} onToggle={() => setHinglish((h) => !h)} />
          <button onClick={() => setAgentOpen(true)} aria-label="Local Agent"
            className="p-1.5 rounded-lg text-slate-600 hover:text-white transition-colors">
            <Terminal size={14} />
          </button>

          <GestureControl
            onActivate={() => setTimeout(() => setAssistantOpen(true), 1300)}
            onOpenAssistant={() => setAssistantOpen(true)}
            onStop={() => { try { window.speechSynthesis?.cancel(); } catch { /* noop*/ } }}
            onConfirm={() => {}}
            onNext={() => {}}
            onSelect={() => {}}
            onStateChange={setGestureState}
          />

          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {VISIBLE_TOOLS.map(({ icon, label, key }) => (
              <motion.button key={key} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => openTool(key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                  key === "pins" && pins.length > 0
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.07] border border-transparent hover:border-white/10"
                }`}>
                {icon}
                <span>{label}</span>
                {key === "pins" && pins.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center font-bold">
                    {pins.length}
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="flex sm:hidden items-center justify-between gap-1 px-2 py-2 border-b border-white/[0.06] bg-[#0a0f1e]/95 backdrop-blur-sm overflow-x-auto shrink-0">
          {VISIBLE_TOOLS.map(({ icon, label, key }) => (
            <button key={key} onClick={() => openTool(key)}
              className={`relative flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl text-[10px] font-medium shrink-0 transition-all duration-200 ${
                key === "pins" && pins.length > 0
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-slate-400"
              }`}>
              {icon}
              <span className="leading-none whitespace-nowrap">{label}</span>
              {key === "pins" && pins.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-indigo-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {pins.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {displayMessages.length === 0 && !loading ? (
            <div className="flex-1 flex flex-col overflow-y-auto">
              <Header greeting={getGreeting()} messageCount={0} onAction={(t) => handleSend({ text: t })} />
                           <QuickActions
                onAction={(t) => handleSend({ text: t })}
                onAssistant={() => setAssistantOpen(true)}
                onInterview={() => setInterviewOpen(true)}
                onOpenTool={openTool}
                hidden={false}
              />
            </div>
          ) : (
            <ChatHistory
              messages={displayMessages}
              loading={loading && !streamingText}
              onPin={handlePin}
              onRegenerate={handleRegenerate}
            />
          )}
        </div>

        <SmartSuggestions
          suggestions={suggestions}
          onSelect={(s) => { setSuggestions([]); handleSend({ text: s }); }}
          visible={!loading && suggestions.length > 0}
        />

        <MessageInput
          value={input}
          setValue={setInput}
          onSend={handleSend}
          loading={loading}
          onVoiceOpen={() => setAssistantOpen(true)}
        />
      </div>

      <AnimatePresence>
        {moodLabel && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-28 left-1/2 z-50 px-4 py-2 rounded-full glass border border-white/10 text-xs text-slate-300 shadow-xl flex items-center gap-2 pointer-events-none"
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: moodColor }} />
            Mood → {moodLabel}
          </motion.div>
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
                <JarvisDashboard
          isOpen={assistantOpen}
          onClose={() => setAssistantOpen(false)}
          onUserSpeech={(t) => handleSend({ text: t })}
          aiReply={lastAIMsg}
          isThinking={loading}
          onOpenTool={openTool}
          chats={chats}
          messages={allMessages}
          gestureState={gestureState}
          toolStatus={toolStatus}
          hadError={hadError}
        />

        <FocusMode isOpen={focusOpen} onClose={() => setFocusOpen(false)} onAskGI={(t) => handleSend({ text: t })} />
        <StudyAnalytics isOpen={analyticsOpen} onClose={() => setAnalyticsOpen(false)} chats={chats} messages={allMessages} />
        <Flashcards isOpen={flashcardsOpen} onClose={() => setFlashcardsOpen(false)} />
        <ImageToPDF isOpen={pdfOpen} onClose={() => setPdfOpen(false)} />
        <PeriodTracker isOpen={cycleOpen} onClose={() => setCycleOpen(false)} />
        <ImageResizer isOpen={resizeOpen} onClose={() => setResizeOpen(false)} />
        <BackgroundRemover isOpen={bgRemoveOpen} onClose={() => setBgRemoveOpen(false)} />
        <MockInterview isOpen={interviewOpen} onClose={() => setInterviewOpen(false)} />
        <LocalAgentPanel isOpen={agentOpen} onClose={() => setAgentOpen(false)} />
        <GI3DCore isOpen={coreOpen} onClose={() => setCoreOpen(false)} />
        <StudyRoom isOpen={studyRoomOpen} onClose={() => setStudyRoomOpen(false)} />
        <GITalk isOpen={talkOpen} onClose={() => setTalkOpen(false)} />
        <PinnedMessages isOpen={pinsOpen} onClose={() => setPinsOpen(false)} pins={pins} onUnpin={handleUnpin} />
      </Suspense>
    </div>
  );
}

export default AIChat;