import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { READING_REASONS, type ReadingReason, type ReasonForAdding, type UnifiedBook } from '@/data/bookTypes';

interface ReasonPickerProps {
  book: UnifiedBook;
  onConfirm: (book: UnifiedBook, reason: ReasonForAdding) => void;
  onSkip: (book: UnifiedBook) => void;
  onCancel: () => void;
}

export function ReasonPicker({ book, onConfirm, onSkip, onCancel }: ReasonPickerProps) {
  const [selected, setSelected] = useState<ReadingReason | null>(null);
  const [customText, setCustomText] = useState('');

  const handleConfirm = () => {
    if (!selected) return;
    const reason: ReasonForAdding = { reason: selected };
    if (selected === 'Other' && customText.trim()) {
      reason.customText = customText.trim();
    }
    onConfirm(book, reason);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="relative w-full max-w-md bg-card rounded-t-2xl sm:rounded-2xl p-6 shadow-elevated space-y-4 z-10"
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Book preview */}
        <div className="flex items-center gap-3">
          {book.thumbnail ? (
            <img src={book.thumbnail} alt={book.title} className="w-10 h-14 object-cover rounded-md flex-shrink-0" />
          ) : (
            <div className="w-10 h-14 rounded-md bg-secondary flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-foreground truncate">{book.title}</p>
            <p className="font-body text-xs text-muted-foreground">{book.author}</p>
          </div>
        </div>

        <p className="font-body text-sm text-foreground font-medium">
          Why do you want to read this book?
        </p>

        {/* Reason chips */}
        <div className="flex flex-wrap gap-2">
          {READING_REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => setSelected(reason)}
              className={`px-3 py-1.5 rounded-full text-xs font-body font-medium transition-colors ${
                selected === reason
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
            >
              {reason}
            </button>
          ))}
        </div>

        {/* Custom text for "Other" */}
        <AnimatePresence>
          {selected === 'Other' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Tell us more…"
                maxLength={100}
                autoFocus
                className="w-full px-3 py-2 rounded-lg bg-background border border-border font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleConfirm}
            disabled={!selected}
            className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-body font-medium disabled:opacity-40 transition-opacity"
          >
            Add to TBR
          </motion.button>
          <button
            onClick={() => onSkip(book)}
            className="px-5 py-2 rounded-full bg-secondary text-muted-foreground text-sm font-body font-medium hover:text-foreground transition-colors"
          >
            Skip
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
