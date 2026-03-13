import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PullLeverProps {
  onPull: () => void;
  isRevealing: boolean;
}

const REEL_EMOJIS = ['📖', '📚', '📕', '📗', '📘', '📙', '🔮', '✨'];

export function PullLever({ onPull, isRevealing }: PullLeverProps) {
  const [pulled, setPulled] = useState(false);

  const handlePull = () => {
    setPulled(true);
    onPull();
    setTimeout(() => setPulled(false), 800);
  };

  return (
    <motion.div
      className="flex items-center gap-0"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* Machine body */}
      <div className="relative flex flex-col items-center">
        {/* Top label */}
        <div className="bg-primary/10 border border-primary/20 rounded-t-xl px-6 py-1.5 mb-0">
          <span className="font-display text-xs font-semibold text-primary tracking-widest uppercase">
            Plot Twist
          </span>
        </div>

        {/* Main frame */}
        <div className="w-52 bg-gradient-to-b from-card to-secondary/50 border-2 border-border rounded-2xl rounded-t-none shadow-elevated p-4 flex flex-col items-center gap-4">
          {/* Reel window */}
          <div className="w-full h-24 rounded-xl bg-background border border-border shadow-card overflow-hidden flex items-center justify-center relative">
            <AnimatePresence mode="wait">
              {isRevealing ? (
                <motion.div
                  key="spinning"
                  className="flex flex-col items-center gap-3"
                  animate={{ y: [0, -80, 60, -40, 20, 0] }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                >
                  {REEL_EMOJIS.slice(0, 3).map((emoji, i) => (
                    <span key={i} className="text-4xl">{emoji}</span>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center"
                >
                  <span className="text-4xl">📚</span>
                  <span className="font-body text-[10px] text-muted-foreground mt-1 tracking-wider uppercase">
                    Pull to discover
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Window shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-background/40 via-transparent to-transparent pointer-events-none rounded-xl" />
          </div>

          {/* Decorative lights */}
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-primary/50"
                animate={isRevealing ? {
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.2, 0.8],
                } : { opacity: 0.4 }}
                transition={{
                  duration: 0.4,
                  repeat: isRevealing ? Infinity : 0,
                  delay: i * 0.08,
                }}
              />
            ))}
          </div>

          {/* Pull button (mobile-friendly alternative) */}
          <motion.button
            onClick={handlePull}
            disabled={isRevealing}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-body text-sm font-semibold tracking-wide uppercase shadow-card hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isRevealing ? 'Finding your book…' : '🎰 Pull!'}
          </motion.button>
        </div>

        {/* Machine base */}
        <div className="w-44 h-2 bg-border rounded-b-xl" />
      </div>

      {/* Side lever */}
      <div className="flex flex-col items-center -ml-1 mt-4">
        {/* Lever shaft */}
        <motion.div
          className="flex flex-col items-center cursor-pointer"
          onClick={handlePull}
          animate={pulled ? { y: [0, 24, 0] } : {}}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          {/* Knob */}
          <motion.div
            className="w-7 h-7 rounded-full bg-primary shadow-elevated border-2 border-primary-foreground/20 hover:scale-110 transition-transform"
            whileHover={{ scale: 1.15 }}
          />
          {/* Shaft */}
          <div className="w-1.5 h-20 bg-gradient-to-b from-foreground/50 to-foreground/20 rounded-full" />
          {/* Base joint */}
          <div className="w-4 h-4 rounded-full bg-border border border-border" />
        </motion.div>
      </div>
    </motion.div>
  );
}
