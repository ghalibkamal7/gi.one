import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Download, MessageSquare, PenLine, X, Search, Pin, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { exportChatToPDF, exportChatToText } from "../utils/exportChat";
import GILogo from "./GILogo";

const ChatItem = memo(function ChatItem({
  chat, isActive, isPinned, isMobile,
  isRenaming, renameValue, onRenameChange, onCommitRename, onCancelRename,
  isExportMenuOpen, onToggleExportMenu,
  onSelect, onTogglePin, onStartRename, onExportPDF, onExportTXT, onDelete,
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18 }}
      className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 ${
        isActive
          ? "bg-blue-500/10 border border-blue-500/25"
          : "hover:bg-black/[0.03] border border-transparent"
      }`}
      onClick={onSelect}
    >
      <MessageSquare size={13} className={`shrink-0 ${isActive ? "text-blue-600" : "text-slate-400"}`} />

      {isRenaming ? (
        <input autoFocus value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onBlur={onCommitRename}
          onKeyDown={(e) => { if (e.key === "Enter") onCommitRename(); if (e.key === "Escape") onCancelRename(); }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 bg-white rounded-lg px-2 py-0.5 text-[#1e2a3a] text-sm outline-none border border-blue-400/60 min-w-0"
        />
      ) : (
        <span className={`flex-1 text-sm truncate ${isActive ? "text-[#1e2a3a] font-medium" : "text-slate-500"}`}>
          {chat.title}
        </span>
      )}

      {isPinned && <Pin size={10} className="text-blue-500 shrink-0 opacity-70" />}

      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
        <button onClick={(e) => { e.stopPropagation(); onTogglePin(); }} aria-label="Pin chat"
          className="p-1 rounded-lg hover:bg-black/5 text-slate-400 hover:text-blue-500 transition-colors" title="Pin">
          <Pin size={11} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onStartRename(); }} aria-label="Rename chat"
          className="p-1 rounded-lg hover:bg-black/5 text-slate-400 hover:text-[#1e2a3a] transition-colors" title="Rename">
          <PenLine size={11} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onToggleExportMenu(); }} aria-label="Export chat"
          className="p-1 rounded-lg hover:bg-black/5 text-slate-400 hover:text-[#1e2a3a] transition-colors" title="Export">
          <Download size={11} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} aria-label="Delete chat"
          className="p-1 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
          <Trash2 size={11} />
        </button>
      </div>

      <AnimatePresence>
        {isExportMenuOpen && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-2 top-10 z-50 bg-white rounded-xl shadow-xl border border-black/[0.06] overflow-hidden min-w-[130px]"
            onClick={(e) => e.stopPropagation()}>
            <button onClick={onExportPDF}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-black/[0.04] transition-colors">📄 Export PDF</button>
            <button onClick={onExportTXT}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-black/[0.04] transition-colors">📝 Export TXT</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

function Sidebar({ chats, activeChatId, setActiveChatId, createNewChat, deleteChat, renameChat, onClose, isMobile }) {
  const { user, logout } = useAuth();
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [exportMenuId, setExportMenuId] = useState(null);
  const [search, setSearch] = useState("");
  const [pinnedIds, setPinnedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gi-pinned") || "[]"); } catch { return []; }
  });

  const togglePin = (id) => {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      localStorage.setItem("gi-pinned", JSON.stringify(next));
      return next;
    });
  };

  const filtered = chats.filter((c) => c.title?.toLowerCase().includes(search.toLowerCase()));
  const pinned = filtered.filter((c) => pinnedIds.includes(c.id));
  const recent = filtered.filter((c) => !pinnedIds.includes(c.id));

  const startRename = (chat) => {
    setRenamingId(chat.id);
    setRenameValue(chat.title);
  };

  const commitRename = (chatId) => {
    if (renameValue.trim()) renameChat(chatId, renameValue.trim());
    setRenamingId(null);
  };

  const renderChatItem = (chat) => (
    <ChatItem
      key={chat.id}
      chat={chat}
      isActive={chat.id === activeChatId}
      isPinned={pinnedIds.includes(chat.id)}
      isMobile={isMobile}
      isRenaming={renamingId === chat.id}
      renameValue={renameValue}
      onRenameChange={setRenameValue}
      onCommitRename={() => commitRename(chat.id)}
      onCancelRename={() => setRenamingId(null)}
      isExportMenuOpen={exportMenuId === chat.id}
      onToggleExportMenu={() => setExportMenuId(exportMenuId === chat.id ? null : chat.id)}
      onSelect={() => { setActiveChatId(chat.id); if (isMobile) onClose?.(); }}
      onTogglePin={() => togglePin(chat.id)}
      onStartRename={() => startRename(chat)}
      onExportPDF={() => { exportChatToPDF(chat); setExportMenuId(null); }}
      onExportTXT={() => { exportChatToText(chat); setExportMenuId(null); }}
      onDelete={() => deleteChat(chat.id)}
    />
  );

  return (
    <motion.div
      initial={{ x: -10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-[280px] h-full flex flex-col bg-[#faf6ee] border-r border-black/[0.06] shrink-0"
    >
      <div className="p-4 border-b border-black/[0.06]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <GILogo size={36} animate={false} />
            <div>
              <p className="text-[#1e2a3a] font-semibold text-sm leading-tight">GI.ONE</p>
              <p className="text-slate-500 text-xs">Learn Smarter With GI</p>
            </div>
          </div>
          {isMobile && (
            <button onClick={onClose} aria-label="Close sidebar" className="p-1.5 rounded-lg hover:bg-black/5 text-slate-400 hover:text-[#1e2a3a] transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={createNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors cursor-pointer shadow-md shadow-blue-500/20">
          <Plus size={15} /> New Chat
        </motion.button>
      </div>

      <div className="px-4 py-3 border-b border-black/[0.05]">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/[0.03] border border-black/[0.06] focus-within:border-blue-400/40 transition-colors">
          <Search size={13} className="text-slate-400 shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="flex-1 bg-transparent text-slate-600 text-xs outline-none placeholder-slate-400" />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search" className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5">
        {pinned.length > 0 && (
          <>
            <p className="text-slate-400 text-xs uppercase tracking-widest px-2 py-1.5">📌 Pinned</p>
            <AnimatePresence initial={false}>{pinned.map(renderChatItem)}</AnimatePresence>
            <div className="my-2 border-t border-black/[0.05]" />
          </>
        )}
        {recent.length > 0 && (
          <>
            <p className="text-slate-400 text-xs uppercase tracking-widest px-2 py-1.5">Recent</p>
            <AnimatePresence initial={false}>{recent.map(renderChatItem)}</AnimatePresence>
          </>
        )}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm">
            <MessageSquare size={26} className="mx-auto mb-2 opacity-30" />
            <p>{search ? "No chats found" : "No chats yet"}</p>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-black/[0.06]">
        <div className="flex items-center gap-3 px-2">
          <div className="relative shrink-0">
            <img src={user?.photoURL} alt={user?.displayName || "Profile"}
              className="w-8 h-8 rounded-full border border-black/10 object-cover" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#faf6ee]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#1e2a3a] text-xs font-medium truncate">{user?.displayName}</p>
            <p className="text-slate-400 text-xs truncate">{user?.email}</p>
          </div>
          <button onClick={logout} aria-label="Log out"
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors" title="Logout">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default Sidebar;