const GI_SPOKEN_VARIANTS = [
  /\bgee\s*eye\b/gi,
  /\bji\s+ai\b/gi,
  /\bg\s*\.?\s*i\s*\.?\b/gi,
  // "GI One" / "GI.ONE" spoken alias — recognized as another way of
  // saying "GI", not a different assistant.
  /\bgee\s*eye\s*one\b/gi,
  /\bgi\s+one\b/gi,
];

export function normalizeSpokenGI(text) {
  let out = text;
  for (const pattern of GI_SPOKEN_VARIANTS) {
    out = out.replace(pattern, "GI");
  }
  out = out.replace(/\b(hello|hey|hi|namaste)\s+ji\b/gi, "$1 GI");
  // "GI One" is easy for browser speech recognition to mishear as a
  // single merged word, especially with an Indian accent — "Jivan"
  // and "Jeevan" are the most common mishearings observed. Scoped to
  // right after a greeting word so this never overrides someone
  // actually talking about a person named Jivan in any other context.
  out = out.replace(/\b(hello|hey|hi|namaste)\s+(jivan|jeevan|jivaan)\b/gi, "$1 GI");
  return out;
}

export function forSpeech(text) {
  // "GI.ONE" needs to be intercepted BEFORE the generic GI→"Gee Eye"
  // rule below — otherwise it becomes "Gee Eye.ONE", and the leftover
  // period makes most TTS engines pause between each fragment,
  // exactly the "G... I... ONE..." choppy delivery being reported.
  // Replacing the whole brand name with plain "G One" text lets it
  // come out as one smooth two-word phrase instead.
  let out = text.replace(/\bGI\.?\s*ONE\b/gi, "G One");
  out = out.replace(/\bGI\b/g, "Gee Eye");
  return out;
}

export function cleanForSpeech(text, maxLen = 600) {
  const stripped = (text || "").replace(/[#*`_~\[\]]/g, "").slice(0, maxLen);
  return forSpeech(stripped);
}

const VOICE_GENDER_KEY = "gi-voice-gender";

export function getVoiceGenderPref() {
  try { return localStorage.getItem(VOICE_GENDER_KEY) || "female"; } catch { return "female"; }
}

export function setVoiceGenderPref(gender) {
  try { localStorage.setItem(VOICE_GENDER_KEY, gender); } catch { /* ignore */ }
}

// Google's network-backed voices sound noticeably more natural than
// each OS's offline default voice — prioritized first.
const FEMALE_HINTS = ["google uk english female", "google us english", "samantha", "victoria", "zira", "moira", "tessa", "veena", "female"];
const MALE_HINTS = ["google uk english male", "daniel", "alex", "fred", "david", "rishi", "aaron", "male"];
export function getPreferredVoice(synth, gender = getVoiceGenderPref()) {
  const voices = synth.getVoices();
  if (!voices.length) return null;
  const enVoices = voices.filter((v) => v.lang.startsWith("en"));
  const pool = enVoices.length ? enVoices : voices;

  // Narrow to the best-matching LOCALE first (same strategy GI Talk's
  // ttsSpeak.js uses, which is why that voice sounds better) — this
  // avoids a name-hint like "female" accidentally matching a low-
  // quality generic local Android voice before a proper en-IN/en-GB
  // network voice ever gets a chance to be considered.
  const localeTier =
    pool.filter((v) => v.lang.includes("en-IN")).length ? pool.filter((v) => v.lang.includes("en-IN")) :
    pool.filter((v) => v.lang.includes("en-GB")).length ? pool.filter((v) => v.lang.includes("en-GB")) :
    pool.filter((v) => v.lang.includes("en-US")).length ? pool.filter((v) => v.lang.includes("en-US")) :
    pool;

  // Gender hint is now only a tie-breaker WITHIN the correct locale,
  // not the primary selector.
  const hints = gender === "male" ? MALE_HINTS : FEMALE_HINTS;
  for (const hint of hints) {
    const match = localeTier.find((v) => v.name.toLowerCase().includes(hint));
    if (match) return match;
  }
  return localeTier[0];
}