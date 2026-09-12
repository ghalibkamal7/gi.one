import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Trash2, Download, GripVertical, FileImage } from "lucide-react";
import { jsPDF } from "jspdf";

const ACCENT = "#7c6ff0";

function ImageToPDF({ isOpen, onClose }) {
  const [images, setImages] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [dragIndex, setDragIndex] = useState(null);
  const fileRef = useRef(null);

  const addFiles = (fileList) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    const items = files.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      url: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...items]);
    setError("");
  };

  const handleFileInput = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const removeImage = (id) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((i) => i.id !== id);
    });
  };

  const clearAll = () => {
    images.forEach((i) => URL.revokeObjectURL(i.url));
    setImages([]);
    setError("");
  };

  const onDragStart = (idx) => setDragIndex(idx);
  const onDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIndex(idx);
  };
  const onDragEnd = () => setDragIndex(null);

  const loadImageDimensions = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = url;
    });

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const generatePDF = async () => {
    if (!images.length || generating) return;
    setGenerating(true);
    setError("");
    try {
      const doc = new jsPDF({ unit: "pt" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 24;

      for (let i = 0; i < images.length; i++) {
        const { url, file } = images[i];
        const dims = await loadImageDimensions(url);

        const maxW = pageWidth - margin * 2;
        const maxH = pageHeight - margin * 2;
        const scale = Math.min(maxW / dims.width, maxH / dims.height);
        const w = dims.width * scale;
        const h = dims.height * scale;
        const x = (pageWidth - w) / 2;
        const y = (pageHeight - h) / 2;

        if (i > 0) doc.addPage();

        const format = file.type.includes("png") ? "PNG" : "JPEG";
        const dataUrl = await fileToDataUrl(file);
        doc.addImage(dataUrl, format, x, y, w, h, undefined, "FAST");
      }

      doc.save(`GI-images-${Date.now()}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setError("Couldn't create the PDF. Please try again with different images.");
    } finally {
      setGenerating(false);
    }
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
          className="rounded-3xl w-full max-w-lg border shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
          style={{ background: `radial-gradient(circle at 50% 0%, ${ACCENT}10 0%, #fffdf8 55%)`, borderColor: `${ACCENT}28` }}
        >
          <div className="flex items-center justify-between p-6 border-b border-black/[0.06] shrink-0">
            <div>
              <h3 className="text-[#1e2a3a] font-bold text-lg">📄 Images to PDF</h3>
              <p className="text-slate-500 text-xs mt-0.5">Combine photos into one PDF, in any order</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl hover:bg-black/5 text-slate-400 hover:text-[#1e2a3a] transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed border-black/15 hover:border-indigo-400/50 bg-black/[0.02] hover:bg-indigo-500/5 cursor-pointer transition-all mb-4"
            >
              <Upload size={22} className="text-slate-400" />
              <p className="text-slate-500 text-sm">Drag & drop images, or click to browse</p>
              <p className="text-slate-400 text-xs">JPG, PNG — any size</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileInput} className="hidden" />

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {error}
              </div>
            )}

            {images.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-500 text-xs">{images.length} image{images.length > 1 ? "s" : ""} · drag to reorder</p>
                  <button onClick={clearAll} className="text-xs text-red-500 hover:text-red-600 transition-colors">
                    Clear all
                  </button>
                </div>
                <div className="space-y-2 mb-4">
                  {images.map((img, idx) => (
                    <div
                      key={img.id}
                      draggable
                      onDragStart={() => onDragStart(idx)}
                      onDragOver={(e) => onDragOver(e, idx)}
                      onDragEnd={onDragEnd}
                      className={`flex items-center gap-3 p-2 rounded-xl bg-white border transition-colors ${
                        dragIndex === idx ? "border-indigo-400/60" : "border-black/[0.06]"
                      }`}
                    >
                      <GripVertical size={14} className="text-slate-400 cursor-grab shrink-0" />
                      <img src={img.url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-600 text-xs truncate">{img.file.name}</p>
                        <p className="text-slate-400 text-xs">{(img.file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <span className="text-slate-400 text-xs shrink-0">#{idx + 1}</span>
                      <button onClick={() => removeImage(img.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {images.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-sm">
                <FileImage size={24} className="mx-auto mb-2 opacity-40" />
                No images added yet
              </div>
            )}
          </div>

          <div className="p-6 border-t border-black/[0.06] shrink-0">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={generatePDF}
              disabled={!images.length || generating}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
              style={{ backgroundColor: ACCENT }}
            >
              <Download size={16} />
              {generating ? "Creating PDF..." : `Download PDF (${images.length} page${images.length === 1 ? "" : "s"})`}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ImageToPDF;