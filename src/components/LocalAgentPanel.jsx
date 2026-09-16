import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Terminal, Plug, PlugZap, Power, ShieldAlert, Check, AlertTriangle } from "lucide-react";
import {
  connectAgent, disconnectAgent, sendAgentAction, onAgentStateChange,
  getSavedToken, getSavedUrl, isAgentReady,
} from "../utils/localAgent";

// Every action this panel can trigger is a fixed, named button — the
// user always clicks something specific here. There is no text box
// that turns free-form input into a command; that's a deliberate
// safety boundary, not a missing feature.
const ACTIONS = [
  { key: "open_vscode",  label: "Open VS Code",       action: "open_app", payload: { app: "vscode" } },
  { key: "open_chrome",  label: "Open Chrome",         action: "open_app", payload: { app: "chrome" } },
  { key: "open_terminal",label: "Open Terminal",       action: "open_app", payload: { app: "terminal" } },
  { key: "open_project", label: "Open Project in VS Code", action: "open_project", payload: {} },
];

const NPM_SCRIPTS = ["install", "build", "test", "dev"];
const ACCENT = "#0891b2";

function LocalAgentPanel({ isOpen, onClose }) {
  const [connected, setConnected] = useState(false);
  const [paired, setPaired] = useState(false);
  const [projectPath, setProjectPath] = useState("");
  const [tokenInput, setTokenInput] = useState(getSavedToken());
  const [urlInput, setUrlInput] = useState(getSavedUrl());
  const [connecting, setConnecting] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { label, action, payload }
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return onAgentStateChange((state) => {
      setConnected(state.connected);
      setPaired(state.paired);
      setProjectPath(state.projectPath);
    });
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    const ok = await connectAgent(urlInput, tokenInput);
    setConnecting(false);
    if (!ok) {
      setLog((l) => [{ text: "Pairing failed — check the token and that the agent is running.", ok: false, t: Date.now() }, ...l]);
    }
  };

  const handleDisconnect = () => {
    disconnectAgent();
    setLog((l) => [{ text: "Disconnected from Local Agent.", ok: true, t: Date.now() }, ...l]);
  };

  // Preview → explicit approve → execute. Nothing runs on a single click.
  const requestAction = (item) => setPendingAction(item);

  const confirmAction = async () => {
    if (!pendingAction) return;
    setBusy(true);
    try {
      const result = await sendAgentAction(pendingAction.action, pendingAction.payload);
      setLog((l) => [{ text: `${pendingAction.label}: ${result.output || (result.ok ? "done" : "failed")}`, ok: result.ok, t: Date.now() }, ...l].slice(0, 20));
    } catch (err) {
      setLog((l) => [{ text: `${pendingAction.label}: ${err.message}`, ok: false, t: Date.now() }, ...l].slice(0, 20));
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  };

  const runNpmScript = (script) => requestAction({
    label: `Run "npm run ${script}"`,
    action: "run_npm_script",
    payload: { script },
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        role="dialog" aria-modal="true" aria-label="Local Agent"
               className="fixed inset-0 z-[65] flex items-center justify-center bg-[#1e2a3a]/25 backdrop-blur-sm p-4"
        onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="rounded-3xl w-full max-w-lg border shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
          style={{ background: `radial-gradient(circle at 50% 0%, ${ACCENT}10 0%, #fffdf8 55%)`, borderColor: `${ACCENT}28` }}>

          <div className="flex items-center justify-between p-6 border-b border-black/[0.06] shrink-0">
            <div className="flex items-center gap-2">
              <Terminal size={18} style={{ color: ACCENT }} />
              <div>
                <h3 className="text-[#1e2a3a] font-bold text-lg">Local Agent</h3>
                <p className="text-slate-500 text-xs mt-0.5">Optional — runs on your own computer</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close"
              className="p-2 rounded-xl hover:bg-black/5 text-slate-400 hover:text-[#1e2a3a] transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {/* Connection status */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-sm font-medium ${
              paired ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-600"
                     : "bg-black/[0.03] border border-black/[0.08] text-slate-500"
            }`}>
              {paired ? <PlugZap size={15} /> : <Plug size={15} />}
              {paired ? "GI LOCAL AGENT — CONNECTED" : "GI LOCAL AGENT — NOT CONNECTED"}
            </div>

            {!paired ? (
              <div className="mb-5">
                <label className="text-slate-500 text-xs block mb-1">Agent URL</label>
                <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-black/[0.03] border border-black/[0.08] rounded-lg px-3 py-2 text-sm text-[#1e2a3a] outline-none focus:border-cyan-400/50 mb-3" />
                <label className="text-slate-500 text-xs block mb-1">Pairing token (from the agent's terminal)</label>
                <input value={tokenInput} onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="paste token here"
                  className="w-full bg-black/[0.03] border border-black/[0.08] rounded-lg px-3 py-2 text-sm text-[#1e2a3a] placeholder-slate-400 outline-none focus:border-cyan-400/50 mb-3" />
                <button onClick={handleConnect} disabled={connecting || !tokenInput.trim()}
                  className="w-full py-2.5 rounded-xl disabled:opacity-40 text-white text-sm font-medium transition-colors"
                  style={{ backgroundColor: ACCENT }}>
                  {connecting ? "Connecting..." : "Connect"}
                </button>
                <p className="text-slate-500 text-xs mt-3">
                  Run the agent locally first — see <code className="text-slate-600">gi-agent/README.md</code> in your project for setup.
                </p>
              </div>
            ) : (
              <>
                <p className="text-slate-500 text-xs mb-4 font-mono truncate">Project: {projectPath}</p>

                <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Quick Actions</p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {ACTIONS.map((a) => (
                    <button key={a.key} onClick={() => requestAction(a)}
                      className="px-3 py-2.5 rounded-xl bg-white hover:bg-cyan-50 border border-black/[0.08] hover:border-cyan-300 text-slate-600 hover:text-[#1e2a3a] text-xs text-left shadow-sm transition-all">
                      {a.label}
                    </button>
                  ))}
                </div>

                <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">NPM Scripts</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {NPM_SCRIPTS.map((s) => (
                    <button key={s} onClick={() => runNpmScript(s)}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-cyan-50 border border-black/[0.08] text-slate-600 hover:text-[#1e2a3a] text-xs font-mono shadow-sm transition-all">
                      npm run {s}
                    </button>
                  ))}
                </div>

                <button onClick={handleDisconnect}
                  className="flex items-center gap-2 text-red-500 hover:text-red-600 text-xs mb-5">
                  <Power size={13} /> Disconnect Agent
                </button>
              </>
            )}

            {/* Activity log */}
            {log.length > 0 && (
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Activity Log</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {log.map((entry, i) => (
                    <div key={i} className={`flex items-start gap-2 text-xs ${entry.ok ? "text-emerald-600" : "text-red-500"}`}>
                      {entry.ok ? <Check size={12} className="mt-0.5 shrink-0" /> : <AlertTriangle size={12} className="mt-0.5 shrink-0" />}
                      <span className="text-slate-600">{entry.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Approval modal — every action stops here before it runs */}
        <AnimatePresence>
          {pendingAction && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                           className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1e2a3a]/45 backdrop-blur-sm p-4"
              onClick={(e) => e.stopPropagation()}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="bg-white rounded-2xl p-6 max-w-sm w-full border border-amber-400/40 shadow-2xl">
                <div className="flex items-center gap-2 mb-3 text-amber-600">
                  <ShieldAlert size={18} />
                  <p className="font-semibold text-sm">Confirm Action</p>
                </div>
                <p className="text-[#1e2a3a] text-sm mb-1">{pendingAction.label}</p>
                <p className="text-slate-500 text-xs mb-5">This will run on your computer via the Local Agent.</p>
                <div className="flex gap-2">
                  <button onClick={() => setPendingAction(null)} disabled={busy}
                    className="flex-1 py-2 rounded-xl bg-black/[0.04] hover:bg-black/[0.07] text-slate-600 text-sm transition-colors">
                    Cancel
                  </button>
                  <button onClick={confirmAction} disabled={busy}
                    className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                    {busy ? "Running..." : "Approve"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

export default LocalAgentPanel;