import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Pin, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";
import MarkdownMessage from "./MarkdownMessage";
import GILogo from "./GILogo";
import { useAuth } from "../context/AuthContext";

function ThinkingRow() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-2 mb-6"
    >
      <GILogo size={22} animate spinning glow />
      <span className="text-slate-400 text-xs animate-pulse">GI is thinking...</span>
    </motion.div>
  );
}

function MessageBubble({ msg, index, onPin, onRegenerate, isLast }) {
  const { user } = useAuth();
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.text || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const images = msg.images?.length ? msg.images : msg.image ? [msg.image] : [];

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 24 : -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.01, 0.12), ease: "easeOut" }}
      className={`mb-6 ${isUser ? "flex flex-col items-end" : "flex flex-col items-start"}`}
    >
      <div className={`flex items-center gap-2 mb-1.5 px-1 ${isUser ? "flex-row-reverse" : ""}`}>
        {isUser ? (
          <img src={user?.photoURL} alt="You"
            className="w-6 h-6 rounded-full border border-blue-400/40 object-cover shrink-0" />
        ) : (
          <GILogo size={22} animate={msg.streaming} spinning={msg.streaming} />
        )}
        <span className="text-xs text-slate-400 font-medium">{isUser ? "You" : "GI"}</span>
        {msg.streaming && (
          <span className="text-xs text-blue-500 animate-pulse">● Thinking</span>
        )}
      </div>

      <div className={`group max-w-[85%] sm:max-w-[78%] flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
        {images.length > 0 && (
          <div className={`flex flex-wrap gap-1.5 mb-1 ${isUser ? "justify-end" : "justify-start"}`}>
            {images.map((src, i) => (
              <img key={i} src={src} alt={`Uploaded ${i + 1}`}
                className="max-w-[45%] sm:max-w-xs rounded-2xl border border-black/[0.08] shadow-sm" />
            ))}
          </div>
        )}

        {msg.text ? (
          <div className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm transition-shadow duration-300 ${
            isUser
              ? "bg-blue-50 text-[#1e2a3a] rounded-tr-sm border border-blue-200/60"
              : `bg-white text-[#1e2a3a] rounded-tl-sm border border-black/[0.06] shadow-sm ${
                  msg.streaming ? "shadow-[0_0_16px_rgba(59,130,246,0.12)]" : ""
                }`
          }`}>
            {isUser
              ? <p className="whitespace-pre-wrap">{msg.text}</p>
              : <div className={msg.streaming ? "streaming-cursor" : ""}>
                  <MarkdownMessage text={msg.text} />
                </div>
            }
          </div>
        ) : null}

        {!isUser && msg.text && !msg.streaming && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 px-1">
            <button onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-700 hover:bg-black/[0.04] transition-all">
              {copied ? <><Check size={11} className="text-emerald-500" /> Copied</> : <><Copy size={11} /> Copy</>}
            </button>
            <button onClick={() => onPin?.(msg)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-all">
              <Pin size={11} /> Pin
            </button>
            {isLast && (
              <button onClick={() => onRegenerate?.()}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-purple-500 hover:bg-purple-500/10 transition-all">
                <RotateCcw size={11} /> Retry
              </button>
            )}
            <div className="flex items-center gap-0.5 ml-1">
              <button onClick={() => setLiked(true)}
                className={`p-1 rounded-lg transition-all ${liked === true ? "text-emerald-500" : "text-slate-400 hover:text-emerald-500"}`}>
                <ThumbsUp size={11} />
              </button>
              <button onClick={() => setLiked(false)}
                className={`p-1 rounded-lg transition-all ${liked === false ? "text-red-500" : "text-slate-400 hover:text-red-500"}`}>
                <ThumbsDown size={11} />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ChatHistory({ messages, loading, onPin, onRegenerate }) {
  const bottomRef    = useRef(null);
  const containerRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
  };

  return (
    <div className="relative flex-1 overflow-hidden">
      <div ref={containerRef} onScroll={handleScroll}
        className="h-full overflow-y-auto px-3 sm:px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id || i}
                msg={msg}
                index={i}
                onPin={onPin}
                onRegenerate={i === messages.length - 1 && msg.role === "assistant" ? onRegenerate : null}
                isLast={i === messages.length - 1 && msg.role === "assistant"}
              />
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {loading && !messages.some((m) => m.streaming) && (
              <ThinkingRow key="thinking" />
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </div>

      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="absolute bottom-4 right-4 p-2.5 rounded-full bg-white border border-black/[0.08] text-slate-500 hover:text-slate-800 shadow-lg transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6,9 12,15 18,9"/>
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ChatHistory;