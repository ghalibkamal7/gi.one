import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import GIOrb from "./GIOrb";

function Header({ greeting, messageCount }) {
  const { user } = useAuth();

  if (messageCount > 0) return null;

  const firstName = user?.displayName?.split(" ")[0] || "there";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-8 px-6 text-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-3"
      >
        <GIOrb size={160} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold text-gradient mb-2"
      >
        {greeting}, {firstName}!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-slate-500 text-sm max-w-sm mb-6"
      >
        Learn Smarter With GI
      </motion.p>
    </motion.div>
  );
}

export default Header;