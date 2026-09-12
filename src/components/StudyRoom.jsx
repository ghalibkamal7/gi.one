import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Copy, LogOut, Play, Pause, Check, Video, VideoOff, Mic, MicOff, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  createStudyRoom, joinStudyRoom, leaveStudyRoom,
  subscribeToRoom, sendHeartbeat, setRoomTimer,
} from "../services/studyRoom";
import { useMeshVideoCall } from "../hooks/useMeshVideoCall";

const ONLINE_WINDOW_MS = 40000;
const ACCENT = "#3b82f6";

function VideoTile({ stream, name, isLocal, camOn, connectionState }) {
  const videoRef = useRef(null);
  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-[#1e2a3a] border border-black/[0.08] aspect-video">
      {stream && camOn !== false ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? "-scale-x-100" : ""}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: ACCENT }}>
            {name?.[0] || "?"}
          </div>
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 px-2.5 py-1.5 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between">
        <span className="text-white text-xs font-medium truncate">{name}{isLocal ? " (you)" : ""}</span>
        {!isLocal && connectionState && connectionState !== "connected" && (
          <span className="text-amber-300 text-[10px] flex items-center gap-1 shrink-0">
            <AlertTriangle size={10} />
            {connectionState === "failed" ? "Connection failed" : "Connecting..."}
          </span>
        )}
      </div>
    </div>
  );
}

function StudyRoom({ isOpen, onClose }) {
  const { user } = useAuth();
  const [roomCode, setRoomCode] = useState(null);
  const [joinInput, setJoinInput] = useState("");
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [videoEnabled, setVideoEnabled] = useState(false);
  const heartbeatRef = useRef(null);
  const tickRef = useRef(null);

  const participantUids = useMemo(
    () => room?.participants?.map((p) => p.uid) || [],
    [room]
  );

  const {
    localStream, remoteStreams, connectionState, cameraError,
    camOn, micOn, toggleCamera, toggleMic,
  } = useMeshVideoCall({
    roomCode: roomCode || "",
    myUid: user?.uid || "",
    participantUids,
    enabled: videoEnabled && !!roomCode,
  });

  useEffect(() => {
    if (!isOpen) {
      setRoomCode(null);
      setRoom(null);
      setError("");
      setJoinInput("");
      setVideoEnabled(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!roomCode) return;
    const unsub = subscribeToRoom(roomCode, setRoom);
    return unsub;
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode || !user) return;
    sendHeartbeat(roomCode, user);
    heartbeatRef.current = setInterval(() => sendHeartbeat(roomCode, user), 20000);
    return () => clearInterval(heartbeatRef.current);
  }, [roomCode, user]);

  useEffect(() => {
    if (!room?.timer?.running) return;
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tickRef.current);
  }, [room?.timer?.running]);

  const handleCreate = async () => {
    setBusy(true);
    setError("");
    try {
      const code = await createStudyRoom(user);
      setRoomCode(code);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!joinInput.trim()) return;
    setBusy(true);
    setError("");
    try {
      const code = await joinStudyRoom(joinInput.trim(), user);
      setRoomCode(code);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    setVideoEnabled(false);
    if (roomCode) await leaveStudyRoom(roomCode, user);
    setRoomCode(null);
    setRoom(null);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleRoomTimer = () => {
    if (!room) return;
    setRoomTimer(roomCode, {
      running: !room.timer.running,
      durationMinutes: room.timer.durationMinutes,
      label: room.timer.label,
    });
  };

  const isHost = room?.hostId === user?.uid;
  const onlineCount = room?.participants?.filter(
    (p) => now - (p.lastSeen?.toMillis?.() || 0) < ONLINE_WINDOW_MS
  ).length || 0;

  const secondsLeft = room?.timer?.running && room.timer.endsAt
    ? Math.max(0, Math.round((room.timer.endsAt.toMillis() - now) / 1000))
    : room?.timer?.durationMinutes * 60 || 0;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  if (!isOpen) return null;

  const otherParticipants = room?.participants?.filter((p) => p.uid !== user?.uid) || [];

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        role="dialog" aria-modal="true" aria-label="Study Together"
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e2a3a]/25 backdrop-blur-sm p-4"
        onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`rounded-3xl w-full border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${
            roomCode ? "max-w-3xl" : "max-w-md"
          }`}
          style={{ background: `radial-gradient(circle at 50% 0%, ${ACCENT}10 0%, #fffdf8 55%)`, borderColor: `${ACCENT}28` }}>

          <div className="flex items-center justify-between p-6 border-b border-black/[0.06] shrink-0">
            <div className="flex items-center gap-2">
              <Users size={18} style={{ color: ACCENT }} />
              <div>
                <h3 className="text-[#1e2a3a] font-bold text-lg">Study Together</h3>
                <p className="text-slate-500 text-xs mt-0.5">Focus with friends, in real time</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Close"
              className="p-2 rounded-xl hover:bg-black/5 text-slate-400 hover:text-[#1e2a3a] transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {!roomCode ? (
              <div>
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={handleCreate} disabled={busy}
                  className="w-full py-3 rounded-2xl disabled:opacity-50 text-white font-medium text-sm transition-colors mb-5"
                  style={{ backgroundColor: ACCENT }}>
                  {busy ? "Creating..." : "Create a Room"}
                </motion.button>

                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-black/[0.08]" />
                  <span className="text-slate-400 text-xs">OR</span>
                  <div className="flex-1 h-px bg-black/[0.08]" />
                </div>

                <label className="text-slate-500 text-xs block mb-2">Join with a code</label>
                <div className="flex gap-2">
                  <input value={joinInput} onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    placeholder="e.g. AB3XQ7" maxLength={6}
                    className="flex-1 bg-black/[0.03] border border-black/[0.08] rounded-xl px-4 py-2.5 text-sm text-[#1e2a3a] placeholder-slate-400 outline-none focus:border-blue-400/50 tracking-widest font-mono" />
                  <button onClick={handleJoin} disabled={busy || !joinInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-black/[0.03] hover:bg-black/[0.06] border border-black/[0.08] disabled:opacity-40 text-[#1e2a3a] text-sm font-medium transition-colors">
                    Join
                  </button>
                </div>

                {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-5 px-4 py-3 rounded-2xl bg-blue-500/10 border border-blue-300/30">
                  <div>
                    <p className="text-slate-500 text-xs">Room code</p>
                    <p className="text-[#1e2a3a] font-bold text-2xl font-mono tracking-widest">{roomCode}</p>
                  </div>
                  <button onClick={copyCode}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-black/[0.03] border border-black/[0.08] text-slate-600 text-xs transition-colors">
                    {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                {!videoEnabled ? (
                  <button onClick={() => setVideoEnabled(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors mb-6">
                    <Video size={16} /> Turn On Camera
                  </button>
                ) : (
                  <>
                    {cameraError && (
                      <p className="text-red-500 text-xs mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                        {cameraError}
                      </p>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                      <VideoTile stream={localStream} name={user?.displayName || "You"} isLocal camOn={camOn} />
                      {otherParticipants.map((p) => (
                        <VideoTile
                          key={p.uid}
                          stream={remoteStreams[p.uid]}
                          name={p.name}
                          connectionState={connectionState[p.uid]}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-center gap-2 mb-6">
                      <button onClick={toggleMic}
                        className={`p-2.5 rounded-xl transition-colors ${micOn ? "bg-black/[0.05] text-[#1e2a3a]" : "bg-red-500/15 text-red-500"}`}>
                        {micOn ? <Mic size={16} /> : <MicOff size={16} />}
                      </button>
                      <button onClick={toggleCamera}
                        className={`p-2.5 rounded-xl transition-colors ${camOn ? "bg-black/[0.05] text-[#1e2a3a]" : "bg-red-500/15 text-red-500"}`}>
                        {camOn ? <Video size={16} /> : <VideoOff size={16} />}
                      </button>
                      <button onClick={() => setVideoEnabled(false)}
                        className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors">
                        Turn Off Camera
                      </button>
                    </div>
                  </>
                )}

                <p className="text-slate-500 text-xs uppercase tracking-widest mb-2">
                  {onlineCount} online
                </p>
                <div className="space-y-2 mb-6">
                  {room?.participants?.map((p) => {
                    const online = now - (p.lastSeen?.toMillis?.() || 0) < ONLINE_WINDOW_MS;
                    return (
                      <div key={p.uid} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-black/[0.06] shadow-sm">
                        <div className="relative shrink-0">
                          {p.photoURL ? (
                            <img src={p.photoURL} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: ACCENT }}>
                              {p.name?.[0] || "?"}
                            </div>
                          )}
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? "bg-emerald-400" : "bg-slate-300"}`} />
                        </div>
                        <span className="text-slate-600 text-sm truncate">{p.name}{p.uid === room.hostId ? " (host)" : ""}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="text-center mb-6">
                  <p className="text-slate-500 text-xs uppercase tracking-widest mb-2">
                    Shared {room?.timer?.label || "Focus"} Timer
                  </p>
                  <p className="text-[#1e2a3a] font-bold text-4xl font-mono tabular-nums mb-4">{mm}:{ss}</p>
                  {isHost ? (
                    <button onClick={toggleRoomTimer}
                      className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-2xl text-white text-sm font-medium transition-colors"
                      style={{ backgroundColor: room?.timer?.running ? "#ef4444" : ACCENT }}>
                      {room?.timer?.running ? <><Pause size={15} /> Pause for everyone</> : <><Play size={15} /> Start for everyone</>}
                    </button>
                  ) : (
                    <p className="text-slate-400 text-xs">Only the host can control the timer</p>
                  )}
                </div>

                <button onClick={handleLeave}
                  className="flex items-center gap-2 mx-auto text-red-500 hover:text-red-600 text-xs transition-colors">
                  <LogOut size={13} /> Leave Room
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default StudyRoom;