import { motion } from 'framer-motion';
import { Shuffle } from 'lucide-react';

interface PullLeverProps {
  onPull: () => void;
  isRevealing: boolean;
}

export function PullLever({ onPull, isRevealing }: PullLeverProps) {
  return (
    <motion.button
      onClick={onPull}
      disabled={isRevealing}
      className="group relative w-36 h-36 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-elevated cursor-pointer focus:outline-none focus:ring-4 focus:ring-ring/30"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <motion.div
        animate={isRevealing ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        <Shuffle className="w-12 h-12" strokeWidth={1.5} />
      </motion.div>
      <motion.span
        className="absolute -bottom-10 font-body text-sm font-medium text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Pull for a book
      </motion.span>
    </motion.button>
  );
}
