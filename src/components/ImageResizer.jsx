import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Download, Lock, Unlock, AlertCircle } from "lucide-react";

const ACCENT = "#06b6d4";

function ImageResizer({ isOpen, onClose }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [origDims, setOrigDims] = useState(null);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [lockRatio, setLockRatio] = useState(true);
  const [quality, setQuality] = useState(0.9);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const ratioRef = useRef(4 / 3);

  const loadFile = (f) => {
    if (!f || !f.type.startsWith("image/")) return;
    setError("");
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      setOrigDims({ width: img.naturalWidth, height: img.naturalHeight });
      setWidth(img.naturalWidth);
      setHeight(img.naturalHeight);
      ratioRef.current = img.naturalWidth / img.naturalHeight;
      setPreviewUrl(url);
    };
    img.onerror = () => setError("Couldn't read that image file.");
    img.src = url;
  };

  const handleFileInput = (e) => { loadFile(e.target.files[0]); e.target.value = ""; };
  const handleDrop = (e) => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); };

  const updateWidth = (v) => {
    const w = Math.max(1, parseInt(v, 10) || 0);
    setWidth(w);
    if (lockRatio) setHeight(Math.max(1, Math.round(w / ratioRef.current)));
  };

  const updateHeight = (v) => {
    const h = Math.max(1, parseInt(v, 10) || 0);
    setHeight(h);
    if (lockRatio) setWidth(Math.max(1, Math.round(h * ratioRef.current)));
  };

  const applyPreset = (percent) => {
    if (!origDims) return;
    setWidth(Math.max(1, Math.round(origDims.width * percent)));
    setHeight(Math.max(1, Math.round(origDims.height * percent)));
  };

  const downloadResized = useCallback(() => {
    if (!previewUrl || !width || !height) return;
    setProcessing(true);
    setError("");

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            setProcessing(false);
            if (!blob) {
              setError("Couldn't generate the resized image. Try a smaller size.");
              return;
            }
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `GI-resized-${width}x${height}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 4000);
          },
          "image/jpeg",
          quality
        );
      } catch (err) {
        console.error("Resize failed:", err);
        setError("Something went wrong while resizing. Try a different image or size.");
        setProcessing(false);
      }
    };
    img.onerror = () => {
      setError("Couldn't reload the image for processing.");
      setProcessing(false);
    };
    img.src = previewUrl;
  }, [previewUrl, width, height, quality]);

  const reset = () => { setPreviewUrl(null); setOrigDims(null); setError(""); };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        role="dialog" aria-modal="true" aria-label="Image Resize"
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e2a3a]/25 backdrop-blur-sm p-4"
        onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="rounded-3xl w-full max-w-md border shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
          style={{ background: `radial-gradient(circle at 50% 0%, ${ACCENT}10 0%, #fffdf8 55%)`, borderColor: `${ACCENT}28` }}>

          <div className="flex items-center justify-between p-6 border-b border-black/[0.06] shrink-0">
            <div>
              <h3 className="text-[#1e2a3a] font-bold text-lg">🖼️ Image Resize</h3>
              <p className="text-slate-500 text-xs mt-0.5">Resize & compress, entirely on-device</p>
            </div>
            <button onClick={onClose} aria-label="Close"
              className="p-2 rounded-xl hover:bg-black/5 text-slate-400 hover:text-[#1e2a3a] transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {error && (
              <div className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!previewUrl ? (
              <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 py-10 rounded-2xl border-2 border-dashed border-black/15 hover:border-cyan-400/50 bg-black/[0.02] hover:bg-cyan-500/5 cursor-pointer transition-all">
                <Upload size={22} className="text-slate-400" />
                <p className="text-slate-500 text-sm">Drag & drop an image, or click to browse</p>
              </div>
            ) : (
              <>
                <img src={previewUrl} alt="Preview" className="w-full h-40 object-contain rounded-xl bg-black/[0.04] mb-4" />
                <p className="text-slate-500 text-xs mb-4 text-center">
                  Original: {origDims?.width} × {origDims?.height}px
                </p>

                <div className="flex gap-2 mb-4">
                  {[0.25, 0.5, 0.75, 1].map((p) => (
                    <button key={p} onClick={() => applyPreset(p)}
                      className="flex-1 py-1.5 rounded-lg text-xs bg-black/[0.03] hover:bg-cyan-500/10 text-slate-600 hover:text-[#1e2a3a] border border-black/[0.08] transition-all">
                      {Math.round(p * 100)}%
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1">
                    <label className="text-slate-500 text-xs block mb-1">Width</label>
                    <input type="number" min="1" value={width} onChange={(e) => updateWidth(e.target.value)}
                      className="w-full bg-black/[0.03] border border-black/[0.08] rounded-lg px-3 py-2 text-sm text-[#1e2a3a] outline-none focus:border-cyan-400/50" />
                  </div>
                  <button onClick={() => setLockRatio((v) => !v)} aria-label={lockRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}
                    className="mt-5 p-2 rounded-lg bg-black/[0.03] border border-black/[0.08] text-slate-500 hover:text-[#1e2a3a] transition-colors">
                    {lockRatio ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                  <div className="flex-1">
                    <label className="text-slate-500 text-xs block mb-1">Height</label>
                    <input type="number" min="1" value={height} onChange={(e) => updateHeight(e.target.value)}
                      className="w-full bg-black/[0.03] border border-black/[0.08] rounded-lg px-3 py-2 text-sm text-[#1e2a3a] outline-none focus:border-cyan-400/50" />
                  </div>
                </div>

                <div className="mb-2">
                  <label className="text-slate-500 text-xs block mb-1">Quality: {Math.round(quality * 100)}%</label>
                  <input type="range" min="0.3" max="1" step="0.05" value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500" />
                </div>

                <button onClick={reset} className="text-xs text-slate-500 hover:text-[#1e2a3a] transition-colors mt-2">
                  ← Choose a different image
                </button>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden" />
          </div>

          {previewUrl && (
            <div className="p-6 border-t border-black/[0.06] shrink-0">
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={downloadResized} disabled={processing || !width || !height}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl disabled:opacity-50 text-white font-medium text-sm transition-colors"
                style={{ backgroundColor: ACCENT }}>
                <Download size={16} />
                {processing ? "Processing..." : `Download (${width}×${height})`}
              </motion.button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ImageResizer;