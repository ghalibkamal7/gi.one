import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase";
import { motion, AnimatePresence } from "framer-motion";
import GILogo from "../components/GILogo";
import AuroraBackground from "../components/AuroraBackground";
import LampLogin from "../components/LampLogin";
import MagneticButton from "../components/MagneticButton";

function Login() {
  const [lampOn, setLampOn] = useState(false);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed:", err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-center justify-center relative overflow-hidden bg-[#05060f]">
      <AuroraBackground starCount={20} />

      <div className="w-full md:w-2/5 h-40 md:h-full flex items-center justify-center relative z-10">
        <LampLogin on={lampOn} onToggle={() => setLampOn((v) => !v)} />
      </div>

      <div className="w-full md:w-3/5 flex items-center justify-center px-4 py-10 relative z-10">
        <AnimatePresence mode="wait">
          {lampOn ? (
            <motion.div
              key="card-on"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="w-full max-w-md"
            >
              <div className="glass-strong rounded-3xl p-10 text-center shadow-2xl">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="flex justify-center mb-6"
                >
                  <GILogo size={100} animate={true} spinning={false} glow />
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl font-bold text-gradient mb-2"
                >
                  GI.ONE
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-slate-400 text-sm mb-10 leading-relaxed"
                >
                  Learn Smarter With GI
                </motion.p>

                <MagneticButton
                  onClick={handleLogin}
                  className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-white text-gray-800 font-semibold text-base shadow-lg cursor-pointer"
                >
                  <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                    <path d="M47.532 24.552c0-1.636-.138-3.2-.395-4.692H24.48v8.87h12.984c-.56 3.016-2.26 5.572-4.814 7.284v6.053h7.794c4.558-4.2 7.088-10.384 7.088-17.515z" fill="#4285F4"/>
                    <path d="M24.48 48c6.52 0 11.988-2.162 15.984-5.86l-7.794-6.053c-2.162 1.45-4.928 2.306-8.19 2.306-6.302 0-11.638-4.254-13.546-9.972H2.9v6.248C6.878 42.818 15.088 48 24.48 48z" fill="#34A853"/>
                    <path d="M10.934 28.421A14.434 14.434 0 0 1 10.1 24c0-1.53.264-3.016.834-4.421v-6.248H2.9A23.963 23.963 0 0 0 .48 24c0 3.866.926 7.528 2.42 10.669l8.034-6.248z" fill="#FBBC05"/>
                    <path d="M24.48 9.608c3.554 0 6.738 1.222 9.248 3.624l6.938-6.938C36.462 2.378 30.994 0 24.48 0 15.088 0 6.878 5.182 2.9 13.331l8.034 6.248c1.908-5.718 7.244-9.97 13.546-9.97z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </MagneticButton>

                <p className="mt-6 text-xs text-slate-500">
                  By signing in, you agree to use GI responsibly.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Contact us: <a href="mailto:ghalibkamal8@gmail.com" className="text-blue-500 hover:text-blue-600 transition-colors">ghalibkamal8@gmail.com</a>
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.p
              key="card-off"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-slate-700 text-sm"
            >
              Pull the light on to sign in.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Login;