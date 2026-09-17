import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Server, Smartphone, Cloud, Trash2, Mail } from "lucide-react";

function Section({ icon, title, children }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-[#1e2a3a] font-bold text-lg">{title}</h2>
      </div>
      <div className="text-slate-600 text-sm leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2 border-b border-black/[0.05] last:border-0">
      <span className="text-[#1e2a3a] text-sm font-medium sm:w-40 shrink-0">{label}</span>
      <span className="text-slate-600 text-sm">{value}</span>
    </div>
  );
}

function Privacy() {
  return (
    <div className="min-h-screen bg-[#faf6ee] px-4 sm:px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-[#1e2a3a] text-sm mb-8 transition-colors">
          <ArrowLeft size={15} /> Back to GI.ONE
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Shield size={28} className="text-blue-500" />
          <h1 className="text-[#1e2a3a] font-bold text-3xl">Your Privacy Matters</h1>
        </div>
        <p className="text-slate-500 text-sm mb-10">
          This page describes exactly what GI.ONE actually does with your data — no vague promises,
          just what the app is genuinely built to do.
        </p>

        <Section icon={<Server size={18} className="text-blue-500" />} title="Where processing happens">
          <p>Different parts of GI.ONE process data in different places. Here's the honest breakdown:</p>
          <div className="rounded-2xl bg-white border border-black/[0.06] p-4 mt-2">
            <Row label="On your device" value="Hand-gesture detection (camera never leaves your browser), the 3D Core view, Period Tracker data, image compression before sending, and PDF text extraction." />
            <Row label="Firebase (Google)" value="Your account info (name, email, profile photo via Google Sign-In) and your chat history, including any attached images." />
            <Row label="Google Gemini API" value="The text of your messages, any attached images, and text extracted from attached PDFs — sent when GI needs to generate a reply, translate, or analyze something." />
            <Row label="Your browser's speech service" value="When you use voice input, your speech may be sent to your browser's own speech-recognition service (e.g. Google's, if you're using Chrome) to convert it to text. Text-to-speech (GI talking back) happens fully on your device." />
          </div>
        </Section>

        <Section icon={<Cloud size={18} className="text-blue-500" />} title="File uploads">
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong className="text-[#1e2a3a]">Images:</strong> compressed on your device, then stored as part of your chat message in Firestore (Google's database) so your history remains available across sessions.</li>
            <li><strong className="text-[#1e2a3a]">PDFs:</strong> read and text-extracted entirely on your device. Only the extracted text is sent to Gemini for that one reply — the PDF file itself is never uploaded anywhere. Only a short reference (filename and page count) is saved to your chat history, not the full document text.</li>
            <li><strong className="text-[#1e2a3a]">Study Room video:</strong> video/audio streams go directly between participants' browsers (peer-to-peer) — they never pass through GI.ONE's own servers. Firestore is only used briefly to help two browsers find each other.</li>
          </ul>
        </Section>

        <Section icon={<Cloud size={18} className="text-blue-500" />} title="AI processing">
          <p>
            Chat, GI Assistant, GI Talk, Flashcards, Mock Interview, and PDF analysis all send the relevant
            text (and images, where applicable) to Google's Gemini API to generate a response. This is
            required for these features to work — GI.ONE doesn't run its own AI models.
          </p>
        </Section>

        <Section icon={<Smartphone size={18} className="text-blue-500" />} title="What never leaves your device">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Hand-gesture/camera data for Gesture Control — processed with on-device MediaPipe, never uploaded.</li>
            <li>Period Tracker entries — stored only in your browser's local storage, never sent to any server.</li>
            <li>Text-to-speech playback.</li>
          </ul>
        </Section>

        <Section icon={<Trash2 size={18} className="text-blue-500" />} title="Your controls">
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong className="text-[#1e2a3a]">Delete a chat:</strong> removes that chat and every message in it (including embedded images) from Firestore, permanently.</li>
            <li><strong className="text-[#1e2a3a]">Period Tracker data:</strong> clear your browser's local storage for this site, or use the tracker's own history controls.</li>
            <li><strong className="text-[#1e2a3a]">Account deletion:</strong> full self-serve account deletion isn't built yet — email us (below) and we'll delete your account and associated chat data manually.</li>
            <li><strong className="text-[#1e2a3a]">Local Agent:</strong> entirely optional, runs on your own computer, and only acts after you explicitly approve each action. Disconnect it any time from its own panel.</li>
          </ul>
        </Section>

        <Section icon={<Shield size={18} className="text-blue-500" />} title="What we don't do">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>We don't sell your data.</li>
            <li>We don't share your chats with third parties beyond the AI providers necessary to generate responses (currently only Google Gemini).</li>
            <li>We don't upload your camera feed anywhere for Gesture Control.</li>
            <li>We don't store your PDF files — only the text needed for one reply, extracted on your device.</li>
          </ul>
        </Section>

        <Section icon={<Mail size={18} className="text-blue-500" />} title="Questions or requests">
          <p>
            For anything not covered here, or to request account/data deletion:{" "}
            <a href="mailto:ghalibkamal8@gmail.com" className="text-blue-500 hover:text-blue-600 underline">
              ghalibkamal8@gmail.com
            </a>
          </p>
        </Section>

        <p className="text-slate-400 text-xs mt-10">Last updated: September 2026</p>
      </div>
    </div>
  );
}

export default Privacy;