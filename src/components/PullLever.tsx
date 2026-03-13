import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';

interface PullLeverProps {
  onPull: () => void;
  isRevealing: boolean;
}

export function PullLever({ onPull, isRevealing }: PullLeverProps) {
  return (
    <motion.div
      className="flex flex-col items-center gap-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.button
        onClick={onPull}
        disabled={isRevealing}
        className="relative w-40 h-40 rounded-full flex items-center justify-center cursor-pointer focus:outline-none focus:ring-4 focus:ring-ring/20 group"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 group-hover:border-primary/40 transition-colors duration-300" />
        
        {/* Subtle pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-full border border-primary/10"
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Inner circle */}
        <div className="w-32 h-32 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors duration-300 flex items-center justify-center">
          <motion.div
            animate={isRevealing ? { rotateY: [0, 180, 360] } : {}}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          >
            <BookOpen className="w-10 h-10 text-primary/70 group-hover:text-primary transition-colors duration-300" strokeWidth={1.5} />
          </motion.div>
        </div>
      </motion.button>

      <motion.p
        className="font-body text-sm text-muted-foreground tracking-wide"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {isRevealing ? 'Finding your next read…' : 'Tap to discover'}
      </motion.p>
    </motion.div>
  );
}
