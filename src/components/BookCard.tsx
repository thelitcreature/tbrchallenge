import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UnifiedBook } from '@/data/bookTypes';
import { Heart, RotateCcw, BookCheck, BookOpenText, X, ThumbsDown, Info } from 'lucide-react';

interface SparkleProps {
  count?: number;
}

function Sparkles({ count = 14 }: SparkleProps) {
  const [particles] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      angle: (360 / count) * i + Math.random() * 20,
      distance: 80 + Math.random() * 60,
      size: 4 + Math.random() * 6,
      delay: Math.random() * 0.15,
      emoji: ['✨', '⭐', '🌟', '💫'][Math.floor(Math.random() * 4)],
    }))
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible flex items-center justify-center">
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const x = Math.cos(rad) * p.distance;
        const y = Math.sin(rad) * p.distance;
        return (
          <motion.span
            key={p.id}
            className="absolute text-sm"
            initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
            animate={{ opacity: [1, 1, 0], x, y, scale: [0, 1.2, 0.6] }}
            transition={{ duration: 0.7, delay: p.delay, ease: 'easeOut' }}
          >
            {p.emoji}
          </motion.span>
        );
      })}
    </div>
  );
}

interface BookCardProps {
  book: UnifiedBook;
  onPullAgain: () => void;
  onDismiss: () => void;
  onAddToWantToRead?: (book: UnifiedBook) => void;
  onMarkAsRead?: (book: UnifiedBook) => void;
  onNotInterested?: (book: UnifiedBook) => void;
  isInWantToRead?: boolean;
  isRead?: boolean;
}

export function BookCard({ book, onPullAgain, onDismiss, onAddToWantToRead, onMarkAsRead, onNotInterested, isInWantToRead, isRead }: BookCardProps) {
  const [showSparkles, setShowSparkles] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSparkles(false), 900);
    return () => clearTimeout(timer);
  }, [book.id]);

  useEffect(() => {
    setShowConfirm(false);
  }, [book.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="w-full max-w-md bg-card rounded-2xl p-8 shadow-elevated text-center space-y-5 relative overflow-visible"
    >
      {showSparkles && <Sparkles />}
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        title="Back to slot machine"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex justify-center">
        {book.thumbnail ? (
          <img
            src={book.thumbnail}
            alt={book.title}
            className="w-28 h-40 object-cover rounded-lg shadow-card"
          />
        ) : (
          <div className="w-28 h-40 rounded-lg bg-secondary flex items-center justify-center shadow-card">
            <BookOpenText className="w-10 h-10 text-muted-foreground/40" />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h2 className="font-display text-2xl font-bold text-foreground leading-tight">
          {book.title}
        </h2>
        <p className="font-body text-base text-muted-foreground">by {book.author}</p>
      </div>

      <p className="font-body text-sm text-foreground/80 leading-relaxed">
        {book.description}
      </p>

      <div className="flex flex-wrap gap-2 justify-center">
        {book.tags.map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-body font-medium"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 justify-center pt-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onPullAgain}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary text-foreground text-sm font-body font-medium hover:bg-secondary/80 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Pull again
        </motion.button>

        {onAddToWantToRead && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onAddToWantToRead(book)}
            disabled={isInWantToRead}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-body font-medium transition-colors ${
              isInWantToRead
                ? 'bg-primary/10 text-primary cursor-default'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            <Heart className={`w-4 h-4 ${isInWantToRead ? 'fill-current' : ''}`} />
            {isInWantToRead ? 'Saved' : 'Want to Read'}
          </motion.button>
        )}

        {onMarkAsRead && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onMarkAsRead(book)}
            disabled={isRead}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-body font-medium transition-colors ${
              isRead
                ? 'bg-green-500/10 text-green-600 cursor-default'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            <BookCheck className={`w-4 h-4 ${isRead ? 'text-green-600' : ''}`} />
            {isRead ? 'Read ✓' : 'Already Read'}
          </motion.button>
        )}

        {onNotInterested && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-body font-medium bg-secondary text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <ThumbsDown className="w-4 h-4" />
            Not interested
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-2 rounded-xl border border-border bg-secondary/50 p-4 space-y-3"
          >
            <div className="flex items-start gap-2 text-left">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="font-body text-xs text-muted-foreground leading-relaxed">
                This book will be permanently hidden from your recommendations. You won't see it again in future pulls.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowConfirm(false)}
                className="px-4 py-1.5 rounded-full text-xs font-body font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  onNotInterested?.(book);
                  setShowConfirm(false);
                }}
                className="px-4 py-1.5 rounded-full text-xs font-body font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Yes, hide forever
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}