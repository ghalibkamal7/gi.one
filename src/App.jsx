import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import AIChat from "./pages/AIChat";
import Privacy from "./pages/Privacy";
import GILogo from "./components/GILogo";
import BootScreen from "./components/BootScreen";

const BOOT_SESSION_KEY = "gi-booted";

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#faf6ee]">
      <div className="flex flex-col items-center gap-5">
        <GILogo size={72} animate={true} spinning={true} glow />
        <p className="text-slate-500 text-sm tracking-wide">Loading GI...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return !user ? children : <Navigate to="/" replace />;
}

function PageTransition({ children }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  const { user } = useAuth();
  const [showBoot, setShowBoot] = useState(() => {
    try { return sessionStorage.getItem(BOOT_SESSION_KEY) !== "1"; } catch { return true; }
  });

  useEffect(() => {
    if (!showBoot) return;
    try { sessionStorage.setItem(BOOT_SESSION_KEY, "1"); } catch { /* ignore */ }
  }, [showBoot]);

  if (showBoot) {
    return (
      <BootScreen
        userName={user?.displayName?.split(" ")[0]}
        onDone={() => setShowBoot(false)}
      />
    );
  }

  return (
    <PageTransition>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        {/* Not wrapped in ProtectedRoute/PublicRoute on purpose — a
            privacy policy needs to be readable by anyone, logged in
            or not, including someone deciding whether to sign up. */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PageTransition>
  );
}

export default App;