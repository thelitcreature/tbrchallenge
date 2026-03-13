import { motion } from 'framer-motion';

interface PullLeverProps {
  onPull: () => void;
  isRevealing: boolean;
}

export function PullLever({ onPull, isRevealing }: PullLeverProps) {
  return (
    <motion.div
      className="flex flex-col items-center gap-6"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* Slot machine frame */}
      <div className="relative">
        {/* Outer frame */}
        <div className="w-44 h-44 rounded-2xl bg-gradient-to-b from-muted to-secondary border-2 border-border shadow-elevated flex items-center justify-center">
          {/* Inner window */}
          <div className="w-32 h-32 rounded-xl bg-card border border-border shadow-card flex items-center justify-center overflow-hidden">
            <motion.div
              animate={isRevealing ? { y: [0, -20, 20, -10, 10, 0] } : {}}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="text-center"
            >
              <span className="font-display text-4xl">📚</span>
              <p className="font-display text-xs text-muted-foreground mt-1 tracking-wide">???</p>
            </motion.div>
          </div>
        </div>

        {/* Lever arm */}
        <motion.button
          onClick={onPull}
          disabled={isRevealing}
          className="absolute -right-8 top-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer focus:outline-none group"
          whileTap={{ y: 30 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        >
          {/* Lever stick */}
          <div className="w-2 h-16 bg-gradient-to-b from-foreground/60 to-foreground/30 rounded-full" />
          {/* Lever knob */}
          <motion.div
            className="w-8 h-8 rounded-full bg-primary shadow-elevated border-2 border-primary-foreground/20 group-hover:scale-110 transition-transform"
            animate={isRevealing ? { scale: [1, 0.8, 1] } : {}}
            transition={{ duration: 0.3 }}
          />
        </motion.button>

        {/* Decorative dots */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary/60" />
          <div className="w-2 h-2 rounded-full bg-primary/40" />
          <div className="w-2 h-2 rounded-full bg-primary/60" />
        </div>
      </div>

      {/* Label */}
      <motion.span
        className="font-body text-sm font-medium text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Pull the lever!
      </motion.span>
    </motion.div>
  );
}
