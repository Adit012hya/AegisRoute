import { useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Shield, MapPin } from "lucide-react";

export function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/app");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="size-full flex items-center justify-center relative overflow-hidden">
      {/* Radial Gradient Background */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at center, #1e1b4b 0%, #0f172a 100%)",
        }}
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-8"
      >
        {/* Logo with Shield + Location Pin */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative"
        >
          {/* Green Glow Effect */}
          <div
            className="absolute inset-0 blur-3xl opacity-60"
            style={{
              background: "radial-gradient(circle, #22c55e 0%, transparent 70%)",
              transform: "scale(1.5)",
            }}
          />

          {/* Logo Container */}
          <div className="relative size-32 flex items-center justify-center">
            {/* Shield */}
            <Shield className="size-28 text-emerald-500 absolute" strokeWidth={1.5} />
            {/* Location Pin */}
            <MapPin className="size-14 text-emerald-400 relative z-10" strokeWidth={2} fill="#22c55e" />
          </div>
        </motion.div>

        {/* Brand Name */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-center space-y-3"
        >
          <h1 className="text-5xl font-bold text-white tracking-tight">
            AegisRoute
          </h1>
          <p className="text-slate-400 text-lg font-medium">
            Safer paths, not just shorter ones
          </p>
        </motion.div>

        {/* Loading Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex gap-2 mt-4"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-emerald-500"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
