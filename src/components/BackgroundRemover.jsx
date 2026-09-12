import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Download, Info, Wand2 } from "lucide-react";

const ACCENT = "#8b5cf6";

function BackgroundRemover({ isOpen, onClose }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [tolerance, setTolerance] = useState(32);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const origFileRef = useRef(null);

  const loadFile = (f) => {
    if (!f || !f.type.startsWith("image/")) return;
    origFileRef.current = f;
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    setResultUrl(null);
    setError("");
  };

  const handleFileInput = (e) => { loadFile(e.target.files[0]); e.target.value = ""; };
  const handleDrop = (e) => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); };

  const removeBackground = () => {
    if (!previewUrl) return;
    setProcessing(true);
    setError("");

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const { width, height } = canvas;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const total = width * height;

        const sampleIdx = [
          0,
          (width - 1) * 4,
          (height - 1) * width * 4,
          ((height - 1) * width + width - 1) * 4,
        ];
        let sr = 0, sg = 0, sb = 0;
        for (const i of sampleIdx) { sr += data[i]; sg += data[i+1]; sb += data[i+2]; }
        sr /= 4; sg /= 4; sb /= 4;

        const visited = new Uint8Array(total);
        const stack = new Int32Array(total);
        let head = 0, tail = 0;

        for (let x = 0; x < width; x++) {
          stack[tail++ % total] = x;
          stack[tail++ % total] = (height - 1) * width + x;
        }
        for (let y = 1; y < height - 1; y++) {
          stack[tail++ % total] = y * width;
          stack[tail++ % total] = y * width + (width - 1);
        }

        const tol = tolerance;
        while (head < tail) {
          const p = stack[head++ % total];
          if (p < 0 || p >= total || visited[p]) continue;
          visited[p] = 1;
          const idx = p * 4;
          const dr = data[idx]   - sr;
          const dg = data[idx+1] - sg;
          const db = data[idx+2] - sb;
          if (Math.sqrt(dr*dr + dg*dg + db*db) >= tol) continue;
          data[idx+3] = 0;
          const x = p % width, y = Math.floor(p / width);
          if (x > 0)         stack[tail++ % total] = p - 1;
          if (x < width - 1) stack[tail++ % total] = p + 1;
          if (y > 0)         stack[tail++ % total] = p - width;
          if (y < height -1) stack[tail++ % total] = p + width;
        }

        ctx.putImageData(imageData, 0, 0);
        setResultUrl(canvas.toDataURL("image/png"));
      } catch (err) {
        setError("Processing failed — try a smaller image.");
        console.error(err);
      } finally {
        setProcessing(false);
      }
    };
    img.onerror = () => { setError("Could not load image."); setProcessing(false); };
    img.src = previewUrl;
  };

  const download = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `GI-no-bg-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const reset = () => { setPreviewUrl(null); setResultUrl(null); setError(""); };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        role="dialog" aria-modal="true" aria-label="Background Remover"
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e2a3a]/25 backdrop-blur-sm p-4"
        onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="rounded-3xl w-full max-w-md border shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
          style={{ background: `radial-gradient(circle at 50% 0%, ${ACCENT}10 0%, #fffdf8 55%)`, borderColor: `${ACCENT}28` }}>

          <div className="flex items-center justify-between p-6 border-b border-black/[0.06] shrink-0">
            <div>
              <h3 className="text-[#1e2a3a] font-bold text-lg">✂️ Background Remover</h3>
              <p className="text-slate-500 text-xs mt-0.5">Best on plain / solid backgrounds</p>
            </div>
            <button onClick={onClose} aria-label="Close"
              className="p-2 rounded-xl hover:bg-black/5 text-slate-400 hover:text-[#1e2a3a] transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {!previewUrl ? (
              <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 py-10 rounded-2xl border-2 border-dashed border-black/15 hover:border-violet-400/50 bg-black/[0.02] hover:bg-violet-500/5 cursor-pointer transition-all">
                <Upload size={22} className="text-slate-400" />
                <p className="text-slate-500 text-sm">Drag & drop an image, or click to browse</p>
                <p className="text-slate-400 text-xs">JPG, PNG · works best on solid backgrounds</p>
              </div>
            ) : (
              <>
                <div className="w-full h-48 rounded-xl mb-4 flex items-center justify-center"
                  style={{
                    backgroundImage: "linear-gradient(45deg,#e5e0d8 25%,transparent 25%),linear-gradient(-45deg,#e5e0d8 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e0d8 75%),linear-gradient(-45deg,transparent 75%,#e5e0d8 75%)",
                    backgroundSize: "16px 16px",
                    backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
                    backgroundColor: "#fffdf8",
                  }}>
                  <img src={resultUrl || previewUrl} alt="Preview"
                    className="max-h-full max-w-full object-contain rounded-lg" />
                </div>

                {error && (
                  <p className="text-red-500 text-xs mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                    {error}
                  </p>
                )}

                <div className="mb-4">
                  <label className="text-slate-500 text-xs block mb-1">
                    Sensitivity: {tolerance}
                    <span className="text-slate-400 ml-2">— higher removes more edge shades</span>
                  </label>
                  <input type="range" min="8" max="80" value={tolerance}
                    onChange={(e) => { setTolerance(parseInt(e.target.value, 10)); setResultUrl(null); }}
                    className="w-full accent-violet-500" />
                </div>

                <button onClick={reset} className="text-xs text-slate-500 hover:text-[#1e2a3a] transition-colors">
                  ← Choose a different image
                </button>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden" />

            <div className="flex items-start gap-2 mt-5 px-3 py-2.5 rounded-xl bg-black/[0.02] border border-black/[0.05] text-slate-500 text-xs">
              <Info size={13} className="shrink-0 mt-0.5" />
              <span>Edge-flood algorithm — great for ID photos and product shots on plain backgrounds. Adjust sensitivity if too much or too little is removed.</span>
            </div>
          </div>

          {previewUrl && (
            <div className="p-6 border-t border-black/[0.06] shrink-0 flex gap-2">
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={removeBackground} disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl disabled:opacity-50 text-white font-medium text-sm transition-colors"
                style={{ backgroundColor: ACCENT }}>
                <Wand2 size={16} />
                {processing ? "Processing..." : "Remove Background"}
              </motion.button>
              {resultUrl && (
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={download} aria-label="Download result"
                  className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors">
                  <Download size={16} />
                </motion.button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default BackgroundRemover;