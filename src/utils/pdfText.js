// Extracts text from a PDF entirely in the browser — the file never
// leaves the device for this step. pdfjs-dist is lazy-imported so it
// never adds to the bundle size for people who never attach a PDF.
const MAX_CHARS = 30000; // keeps the Gemini prompt (and cost) reasonable per message

export async function extractPdfText(file) {
  const pdfjsLib = await import("pdfjs-dist");
  // The worker script version must match the library version exactly —
  // this is the single most common pdf.js runtime failure, so it's
  // derived from pdfjsLib.version rather than hardcoded.
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  } catch (err) {
    if (err?.name === "PasswordException") {
      throw new Error("This PDF is password-protected and can't be read.");
    }
    throw new Error("Couldn't read this PDF file — it may be corrupted.");
  }

  let text = "";
  const pageCount = pdf.numPages;
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(" ") + "\n\n";
    if (text.length > MAX_CHARS) break;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("No selectable text found — this may be a scanned PDF without a text layer.");
  }

  const truncated = trimmed.length > MAX_CHARS;
  return {
    text: truncated ? trimmed.slice(0, MAX_CHARS) : trimmed,
    pageCount,
    truncated,
  };
}