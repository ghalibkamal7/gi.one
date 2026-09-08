import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ImagePlus, X, Mic, MicOff, AlertCircle } from "lucide-react";
import { normalizeSpokenGI } from "../utils/giSpeech";

const MAX_IMAGES = 4;

function MessageInput({ value, setValue, onSend, loading, onVoiceOpen }) {
  const [images, setImages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const fileRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const valueRef = useRef(value);
  const imagesRef = useRef(images);

  useEffect(() => { valueRef.current = value; }, [value]);
  useEffect(() => { imagesRef.current = images; }, [images]);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = "en-IN";
    r.onresult = (e) => {
      const raw = e.results[0][0].transcript;
      const t = normalizeSpokenGI(raw);
      setValue((prev) => prev + (prev ? " " : "") + t);
      setIsListening(false);
    };
    r.onend = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    recognitionRef.current = r;
  }, []);

  const compressImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1280;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          const scale = MAX_DIM / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.82;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length > 750000 && quality > 0.35) {
          quality -= 0.12;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        if (dataUrl.length > 750000) {
          reject(new Error("Image is too large even after compression. Try a smaller photo."));
          return;
        }
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Couldn't read that image file."));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });

  const [imageError, setImageError] = useState("");

  const addFiles = async (files) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    setImageError("");

    const room = MAX_IMAGES - imagesRef.current.length;
    if (room <= 0) {
      setImageError(`You can attach up to ${MAX_IMAGES} images at once.`);
      return;
    }
    const toAdd = imageFiles.slice(0, room);
    if (imageFiles.length > toAdd.length) {
      setImageError(`Only added ${toAdd.length} — max ${MAX_IMAGES} images per message.`);
    }

    const results = await Promise.allSettled(toAdd.map(compressImage));
    const succeeded = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
    const failed = results.some((r) => r.status === "rejected");
    if (failed && !imageError) {
      setImageError("One or more images couldn't be processed and were skipped.");
    }
    if (succeeded.length) {
      setImages((prev) => [...prev, ...succeeded]);
    }
    textareaRef.current?.focus();
  };

  const handleImage = async (e) => {
    const fileList = Array.from(e.target.files || []);
    e.target.value = "";
    if (!fileList.length) return;
    await addFiles(fileList);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    if (!e.dataTransfer.files?.length) return;
    await addFiles(e.dataTransfer.files);
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const sendingRef = useRef(false);

  const handleSend = () => {
    const text = valueRef.current;
    const imgs = imagesRef.current;
    if (!text.trim() && !imgs.length) return;
    if (sendingRef.current) return;
    sendingRef.current = true;
    onSend({ text, images: imgs });
    setValue("");
    setImages([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px";
    }
    setTimeout(() => { sendingRef.current = false; }, 300);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) { onVoiceOpen?.(); return; }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const resizeTextarea = (e) => {
    setValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  return (
    <div
      className="border-t border-black/[0.06] bg-[#faf6ee]/95 backdrop-blur-md px-3 sm:px-4 py-3 sm:py-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="max-w-3xl mx-auto">
        {imageError && (
          <div className="flex items-start gap-1.5 mb-2 px-1 text-red-500 text-xs">
            <AlertCircle size={13} className="shrink-0 mt-0.5" /> {imageError}
          </div>
        )}
        {images.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            <AnimatePresence>
              {images.map((img, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative inline-block"
                >
                  <img src={img} alt={`Preview ${i + 1}`}
                    className="h-20 rounded-xl border border-black/[0.08] object-cover shadow-sm" />
                  <button onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-md transition-colors">
                    <X size={10} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className={`flex items-end gap-2 bg-white rounded-2xl px-3 sm:px-4 py-3 transition-all duration-200 shadow-sm ${
          loading ? "border-black/[0.06]" : "border-black/[0.08] focus-within:border-blue-400/50"
        } border`}>
          <button onClick={() => fileRef.current?.click()}
            title="Attach image (or drag & drop)"
            className="p-1.5 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-all shrink-0 mb-0.5 tooltip"
            data-tip="Attach image">
            <ImagePlus size={17} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImage} className="hidden" />

          <textarea
            ref={textareaRef}
            value={value}
            onChange={resizeTextarea}
            onKeyDown={handleKey}
            placeholder={loading ? "GI is thinking..." : "Ask GI anything... (Enter to send)"}
            disabled={loading}
            rows={1}
            className="flex-1 bg-transparent text-[#1e2a3a] placeholder-slate-400 resize-none outline-none text-sm leading-relaxed max-h-40 overflow-y-auto disabled:opacity-50"
            style={{ height: "24px" }}
          />

          <button onClick={toggleMic}
            title={isListening ? "Stop listening" : "Voice input"}
            className={`p-1.5 rounded-xl transition-all shrink-0 mb-0.5 ${
              isListening
                ? "text-red-500 bg-red-500/10 animate-pulse"
                : "text-slate-400 hover:text-blue-500 hover:bg-blue-500/10"
            }`}>
            {isListening ? <MicOff size={17} /> : <Mic size={17} />}
          </button>

          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={handleSend}
            disabled={loading || (!value.trim() && !images.length)}
            className="p-2 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all shrink-0 mb-0.5 shadow-md shadow-blue-500/20"
          >
            <Send size={15} />
          </motion.button>
        </div>

        <p className="text-center text-slate-400 text-xs mt-2 hidden sm:block">
          Enter to send · Shift+Enter for newline · Drag & drop images
        </p>
      </div>
    </div>
  );
}

export default MessageInput;