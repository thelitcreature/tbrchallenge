import { motion } from 'framer-motion';
import type { UnifiedBook } from '@/data/bookTypes';
import { Heart, RotateCcw } from 'lucide-react';

interface BookCardProps {
  book: UnifiedBook;
  onPullAgain: () => void;
  onAddToTBR?: (book: UnifiedBook) => void;
  isInTBR?: boolean;
}

export function BookCard({ book, onPullAgain, onAddToTBR, isInTBR }: BookCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="w-full max-w-md bg-card rounded-2xl p-8 shadow-elevated text-center space-y-5"
    >
      {book.thumbnail && (
        <img
          src={book.thumbnail}
          alt={book.title}
          className="w-24 h-36 object-cover rounded-lg mx-auto shadow-card"
        />
      )}

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

      <div className="flex gap-3 justify-center pt-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onPullAgain}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary text-foreground text-sm font-body font-medium hover:bg-secondary/80 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Pull again
        </motion.button>
        {onAddToTBR && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onAddToTBR(book)}
            disabled={isInTBR}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-body font-medium transition-colors ${
              isInTBR
                ? 'bg-primary/10 text-primary cursor-default'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            <Heart className={`w-4 h-4 ${isInTBR ? 'fill-current' : ''}`} />
            {isInTBR ? 'In TBR' : 'Add to TBR'}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
