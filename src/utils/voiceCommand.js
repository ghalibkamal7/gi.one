// Fixed, deterministic pattern-matching — NOT free-form AI
// interpretation. Same safety philosophy as the Local Agent: a small,
// explicit allowlist of actions, never "let the model decide what to
// execute." Each entry only opens a URL scheme the target app itself
// registered with the OS — this can never launch an arbitrary app.
const APP_COMMANDS = [
  { patterns: [/open whatsapp/i, /whatsapp khol/i], url: "https://wa.me/", label: "WhatsApp" },
  { patterns: [/open (google )?maps/i, /maps khol/i], url: "https://maps.google.com/", label: "Google Maps" },
  { patterns: [/open spotify/i, /spotify khol/i], url: "https://open.spotify.com/", label: "Spotify" },
  { patterns: [/open (the )?dialer/i, /open phone/i, /call app khol/i], url: "tel:", label: "Phone" },
  { patterns: [/open (email|gmail)/i, /email khol/i], url: "mailto:", label: "Email" },
  { patterns: [/open (sms|messages)/i, /message app khol/i, /sms khol/i], url: "sms:", label: "Messages" },
  { patterns: [/open youtube/i, /youtube khol/i], url: "https://youtube.com", label: "YouTube" },
];

export function matchAppOpenCommand(text) {
  const lower = text.toLowerCase().trim();
  for (const entry of APP_COMMANDS) {
    if (entry.patterns.some((p) => p.test(lower))) return entry;
  }
  return null;
}

export function openApp(entry) {
  window.open(entry.url, "_blank", "noopener,noreferrer");
}