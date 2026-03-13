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
        {/* Outer ring - slow breathe */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-accent/20 group-hover:border-accent/40 transition-colors duration-300"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        {/* Middle pulse ring */}
        <motion.div
          className="absolute inset-2 rounded-full border border-accent/10"
          animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.15, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        />

        {/* Inner circle - counter breathe */}
        <motion.div
          className="w-32 h-32 rounded-full bg-accent/5 group-hover:bg-accent/10 transition-colors duration-300 flex items-center justify-center"
          animate={{ scale: [1, 0.97, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
        >
          <motion.div
            animate={isRevealing ? { rotateY: [0, 180, 360] } : { scale: [1, 1.06, 1] }}
            transition={isRevealing ? { duration: 0.7, ease: 'easeInOut' } : { duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
          >
            <BookOpen className="w-10 h-10 text-accent/70 group-hover:text-accent transition-colors duration-300" strokeWidth={1.5} />
          </motion.div>
        </motion.div>
      </motion.button>

      <motion.p
        className="font-body text-sm text-muted-foreground tracking-wide"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {isRevealing ? 'The pages are turning…' : 'Tap to meet your next obsession'}
      </motion.p>
    </motion.div>
  );
}
