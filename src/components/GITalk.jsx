import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Mic, ArrowLeftRight, Copy, Check, Volume2, RotateCcw,
  Trash2, Languages, MessageSquare, AlertCircle,
} from "lucide-react";
import { LANGUAGES, getLanguageLabel, getLanguage } from "../utils/languages";
import { translateText, translateForConversation } from "../services/translation";
import { useSpeechToText } from "../hooks/useSpeechToText";
import { speakInLanguage, stopSpeaking } from "../utils/ttsSpeak";

const ACCENT = "#0d9488";

function LanguageSelect({ value, onChange, includeAuto, label }) {
  return (
    <div className="flex-1 min-w-0">
      {label && <label className="text-slate-500 text-xs block mb-1">{label}</label>}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black/[0.03] border border-black/[0.08] rounded-xl px-3 py-2 text-sm text-[#1e2a3a] outline-none focus:border-teal-400/50 appearance-none cursor-pointer">
        {includeAuto && <option value="auto">Auto Detect</option>}
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </div>
  );
}

function VoiceStatePill({ state }) {
  const map = {
    idle: { text: "Tap to speak", color: "text-slate-400" },
    listening: { text: "Listening...", color: "text-emerald-600" },
    processing: { text: "Translating...", color: "text-amber-600" },
    speaking: { text: "Speaking...", color: "text-teal-600" },
    error: { text: "Error", color: "text-red-500" },
  };
  const s = map[state] || map.idle;
  return <span className={`text-xs font-medium ${s.color}`}>{s.text}</span>;
}

function TranslateMode() {
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("en");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [detectedLang, setDetectedLang] = useState(null);
  const [voiceState, setVoiceState] = useState("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const stt = useSpeechToText();

  const runTranslate = useCallback(async (text) => {
    if (!text.trim()) return;
    setVoiceState("processing");
    setError("");
    try {
      const result = await translateText(text, sourceLang, targetLang);
      setTranslatedText(result.translation);
      setDetectedLang(result.detectedLanguageCode);
      setVoiceState("idle");
    } catch (err) {
      setError(err.message || "Translation failed.");
      setVoiceState("error");
    }
  }, [sourceLang, targetLang]);

  const toggleMic = () => {
    if (stt.isListening) { stt.stop(); setVoiceState("idle"); return; }
    const bcp47 = sourceLang === "auto" ? "en-US" : getLanguage(sourceLang)?.bcp47 || "en-US";
    setVoiceState("listening");
    setError("");
    stt.start(bcp47, (finalText) => {
      setSourceText(finalText);
      runTranslate(finalText);
    });
  };

  useEffect(() => {
    if (stt.error) { setError(stt.error); setVoiceState("error"); }
  }, [stt.error]);

  const handleSwap = () => {
    if (sourceLang === "auto") return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleSpeak = () => {
    if (!translatedText) return;
    const bcp47 = getLanguage(targetLang)?.bcp47 || "en-US";
    setVoiceState("speaking");
    speakInLanguage(translatedText, bcp47, {
      onEnd: () => setVoiceState("idle"),
      onError: (msg) => { setError(msg); setVoiceState("idle"); },
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleClear = () => {
    setSourceText(""); setTranslatedText(""); setDetectedLang(null); setError("");
    stopSpeaking();
    setVoiceState("idle");
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 sm:p-5 overflow-y-auto">
      <div className="flex-1 bg-white rounded-3xl border border-black/[0.06] shadow-sm p-5 flex flex-col min-h-[280px]">
        <div className="flex items-center gap-2 mb-3">
          <LanguageSelect value={sourceLang} onChange={setSourceLang} includeAuto label="Source" />
        </div>
        {detectedLang && sourceLang === "auto" && (
          <p className="text-teal-600 text-xs mb-2">Detected: {getLanguageLabel(detectedLang)}</p>
        )}
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runTranslate(sourceText); }}
          placeholder="Type or tap the mic to speak..."
          className="flex-1 bg-transparent text-[#1e2a3a] placeholder-slate-400 text-base outline-none resize-none min-h-[100px]"
        />
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/[0.06]">
          <VoiceStatePill state={stt.isListening ? "listening" : voiceState === "processing" ? "processing" : "idle"} />
          <div className="flex items-center gap-2">
            {sourceText && (
              <button onClick={handleClear} aria-label="Clear" className="p-2 rounded-xl text-slate-400 hover:text-[#1e2a3a] hover:bg-black/5 transition-colors">
                <Trash2 size={15} />
              </button>
            )}
            <button onClick={() => runTranslate(sourceText)} disabled={!sourceText.trim()}
              className="px-4 py-2 rounded-xl disabled:opacity-30 text-white text-sm font-medium transition-colors"
              style={{ backgroundColor: ACCENT }}>
              Translate
            </button>
            <button onClick={toggleMic} disabled={!stt.isSupported}
              className={`p-2.5 rounded-full transition-colors text-white disabled:opacity-30 ${stt.isListening ? "bg-red-500 animate-pulse" : ""}`}
              style={!stt.isListening ? { backgroundColor: ACCENT } : undefined}>
              <Mic size={16} />
            </button>
          </div>
        </div>
        {stt.interimTranscript && (
          <p className="text-slate-400 text-sm italic mt-2">{stt.interimTranscript}</p>
        )}
      </div>

      <div className="flex lg:flex-col items-center justify-center shrink-0">
        <button onClick={handleSwap} disabled={sourceLang === "auto"} aria-label="Swap languages"
          className="p-3 rounded-full bg-white hover:bg-teal-50 border border-black/[0.08] hover:border-teal-300 text-slate-400 hover:text-teal-600 disabled:opacity-30 shadow-sm transition-all">
          <ArrowLeftRight size={18} className="rotate-90 lg:rotate-0" />
        </button>
      </div>

      <div className="flex-1 bg-white rounded-3xl border border-black/[0.06] shadow-sm p-5 flex flex-col min-h-[280px]">
        <div className="flex items-center gap-2 mb-3">
          <LanguageSelect value={targetLang} onChange={setTargetLang} label="Target" />
        </div>

        {error && (
          <div className="flex items-start gap-2 mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="flex-1 text-[#1e2a3a] text-base leading-relaxed">
          {translatedText || <span className="text-slate-400">Translation will appear here...</span>}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/[0.06]">
          <VoiceStatePill state={voiceState} />
          <div className="flex items-center gap-2">
            <button onClick={handleCopy} disabled={!translatedText}
              className="p-2 rounded-xl text-slate-400 hover:text-[#1e2a3a] hover:bg-black/5 disabled:opacity-30 transition-colors">
              {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
            </button>
            <button onClick={handleSpeak} disabled={!translatedText}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl disabled:opacity-30 text-white text-sm font-medium transition-colors"
              style={{ backgroundColor: ACCENT }}>
              <Volume2 size={15} /> Speak
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TalkMode() {
  const [lang1, setLang1] = useState("hi");
  const [lang2, setLang2] = useState("en");
  const [history, setHistory] = useState([]);
  const [voiceState, setVoiceState] = useState("idle");
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState("");
  const [conversationActive, setConversationActive] = useState(false);
  // Which language we expect NEXT — improves recognition accuracy by
  // telling the browser's speech engine which phonetics to listen for,
  // since it can only target one language at a time. Alternates after
  // each successful exchange; this is a heuristic, not mind-reading —
  // if someone speaks out of turn, translateForConversation() still
  // correctly detects and routes it, just with slightly lower speech
  // recognition accuracy for that one utterance.
  const [expectedLang, setExpectedLang] = useState("hi");
  const bottomRef = useRef(null);
  const activeRef = useRef(false);
  const expectedLangRef = useRef("hi");

  const stt = useSpeechToText();

  useEffect(() => { activeRef.current = conversationActive; }, [conversationActive]);
  useEffect(() => { expectedLangRef.current = expectedLang; }, [expectedLang]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  useEffect(() => {
    setExpectedLang(lang1);
  }, [lang1, lang2]);

  const startListening = useCallback(() => {
    if (!activeRef.current) return;
    const bcp47 = getLanguage(expectedLangRef.current)?.bcp47 || "en-US";
    setVoiceState("listening");
    stt.start(bcp47, (finalText) => processUtteranceRef.current(finalText));
  }, [stt]);

  const processUtterance = useCallback(async (text) => {
    if (!text.trim()) { if (activeRef.current) startListening(); return; }
    setVoiceState("processing");
    setError("");
    try {
      const result = await translateForConversation(text, lang1, lang2);
      setHistory((prev) => [...prev, {
        id: Date.now(),
        originalText: text,
        originalLang: result.detectedLanguageCode,
        translatedText: result.translation,
        translatedLang: result.targetLanguageCode,
      }]);
      // Next turn, we expect a reply IN the language we just translated
      // TO — that's whoever's about to respond.
      setExpectedLang(result.targetLanguageCode);

      if (!activeRef.current) return; // stopped while translating
      setVoiceState("speaking");
      const bcp47 = getLanguage(result.targetLanguageCode)?.bcp47 || "en-US";
      speakInLanguage(result.translation, bcp47, {
        onEnd: () => { if (activeRef.current) startListening(); else setVoiceState("idle"); },
        onError: () => { if (activeRef.current) startListening(); else setVoiceState("idle"); },
      });
    } catch (err) {
      setError(err.message || "Translation failed.");
      if (activeRef.current) startListening(); else setVoiceState("idle");
    }
  }, [lang1, lang2, startListening]);

  // A ref indirection so startListening's closure always calls the
  // LATEST processUtterance (which itself depends on lang1/lang2)
  // without needing to reconstruct the SpeechRecognition instance
  // every time either language changes.
  const processUtteranceRef = useRef(processUtterance);
  useEffect(() => { processUtteranceRef.current = processUtterance; }, [processUtterance]);

  useEffect(() => {
    if (stt.error) {
      setError(stt.error);
      if (activeRef.current) {
        // Transient recognition errors (e.g. brief silence timeout)
        // shouldn't kill the whole conversation — retry shortly.
        setTimeout(() => { if (activeRef.current) startListening(); }, 600);
      } else {
        setVoiceState("idle");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stt.error]);

  const toggleConversation = () => {
    if (conversationActive) {
      setConversationActive(false);
      activeRef.current = false;
      stt.stop();
      stopSpeaking();
      setVoiceState("idle");
    } else {
      setConversationActive(true);
      activeRef.current = true;
      setError("");
      startListening();
    }
  };

  const sendText = () => {
    if (!textInput.trim()) return;
    processUtterance(textInput.trim());
    setTextInput("");
  };

  const handleSwap = () => { setLang1(lang2); setLang2(lang1); };
  const handleClearHistory = () => { setHistory([]); stopSpeaking(); };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 p-3 sm:p-4 border-b border-black/[0.06] bg-white">
        <LanguageSelect value={lang1} onChange={setLang1} />
        <button onClick={handleSwap} aria-label="Swap languages"
          className="p-2 rounded-full bg-black/[0.03] hover:bg-teal-50 border border-black/[0.08] text-slate-400 hover:text-teal-600 transition-all shrink-0">
          <ArrowLeftRight size={16} />
        </button>
        <LanguageSelect value={lang2} onChange={setLang2} />
        {history.length > 0 && (
          <button onClick={handleClearHistory} aria-label="Clear conversation"
            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-3">
        {history.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
            <MessageSquare size={32} className="mb-3 opacity-40" />
            <p className="text-sm">Tap "Start Conversation" and just talk — GI listens for both sides</p>
          </div>
        )}
        {history.map((entry) => {
          const isLang1Speaker = entry.originalLang === lang1;
          return (
            <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${isLang1Speaker ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] sm:max-w-md rounded-2xl px-4 py-3 shadow-sm ${
                isLang1Speaker ? "bg-white border border-black/[0.08]" : "bg-teal-50 border border-teal-200/60"
              }`}>
                <p className="text-slate-400 text-xs mb-1">{getLanguageLabel(entry.originalLang)}</p>
                <p className="text-[#1e2a3a] text-sm mb-2">{entry.originalText}</p>
                <div className="pt-2 border-t border-black/[0.08]">
                  <p className="text-slate-400 text-xs mb-1">{getLanguageLabel(entry.translatedLang)}</p>
                  <p className="text-slate-600 text-sm">{entry.translatedText}</p>
                </div>
                <button
                  onClick={() => speakInLanguage(entry.translatedText, getLanguage(entry.translatedLang)?.bcp47 || "en-US")}
                  aria-label="Replay"
                  className="mt-2 flex items-center gap-1 text-teal-600 hover:text-teal-700 text-xs transition-colors">
                  <RotateCcw size={11} /> Replay
                </button>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mx-3 sm:mx-5 mb-2 flex items-start gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
          <AlertCircle size={13} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <div className="p-3 sm:p-4 border-t border-black/[0.06] bg-white">
        <div className="flex items-center gap-2 mb-4">
          <input value={textInput} onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendText()}
            placeholder="Or type instead of speaking..."
            className="flex-1 bg-black/[0.03] border border-black/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#1e2a3a] placeholder-slate-400 outline-none focus:border-teal-400/50" />
          <button onClick={sendText} disabled={!textInput.trim()}
            className="px-4 py-2.5 rounded-xl disabled:opacity-30 text-white text-sm font-medium transition-colors"
            style={{ backgroundColor: ACCENT }}>
            Send
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={toggleConversation}
            disabled={!stt.isSupported}
            className={`flex items-center gap-2 px-8 py-4 rounded-full text-white font-medium shadow-lg transition-all disabled:opacity-40 ${
              conversationActive ? "bg-red-500 hover:bg-red-600" : ""
            }`}
            style={!conversationActive ? { backgroundColor: ACCENT } : undefined}>
            <Mic size={18} className={voiceState === "listening" ? "animate-pulse" : ""} />
            {conversationActive ? "Stop Conversation" : "Start Conversation"}
          </motion.button>
          <VoiceStatePill state={voiceState} />
          {conversationActive && (
            <p className="text-slate-400 text-xs">
              Expecting {getLanguageLabel(expectedLang)} next — either person can just speak
            </p>
          )}
        </div>

        {!stt.isSupported && (
          <p className="text-amber-600 text-xs text-center mt-3">
            Voice input isn't supported in this browser — use the text box above instead.
          </p>
        )}
      </div>
    </div>
  );
}

function GITalk({ isOpen, onClose }) {
  const [mode, setMode] = useState("translate");

  useEffect(() => {
    if (!isOpen) stopSpeaking();
  }, [isOpen]);

  const handleClose = () => { stopSpeaking(); onClose(); };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        role="dialog" aria-modal="true" aria-label="GI Talk"
        className="fixed inset-0 z-50 flex flex-col"
        style={{ background: `radial-gradient(circle at 50% 0%, ${ACCENT}12 0%, #faf6ee 45%)` }}>

        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-black/[0.06] shrink-0 bg-white/60 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Languages size={18} style={{ color: ACCENT }} />
            <h2 className="text-[#1e2a3a] font-bold text-lg">GI Talk</h2>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/[0.04] border border-black/[0.06]">
            <button onClick={() => setMode("translate")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === "translate" ? "text-white" : "text-slate-500 hover:text-[#1e2a3a]"
              }`}
              style={mode === "translate" ? { backgroundColor: ACCENT } : undefined}>
              Translate
            </button>
            <button onClick={() => setMode("talk")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === "talk" ? "text-white" : "text-slate-500 hover:text-[#1e2a3a]"
              }`}
              style={mode === "talk" ? { backgroundColor: ACCENT } : undefined}>
              Talk
            </button>
          </div>

          <button onClick={handleClose} aria-label="Close GI Talk"
            className="p-2 rounded-full text-slate-400 hover:text-[#1e2a3a] hover:bg-black/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {mode === "translate" ? <TranslateMode /> : <TalkMode />}
      </motion.div>
    </AnimatePresence>
  );
}

export default GITalk;