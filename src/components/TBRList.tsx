import { motion, AnimatePresence } from 'framer-motion';
import type { Book } from '@/data/books';
import { X, BookOpen } from 'lucide-react';

interface TBRListProps {
  books: Book[];
  onRemove: (id: string) => void;
}

export function TBRList({ books, onRemove }: TBRListProps) {
  if (books.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto" />
        <p className="font-body text-muted-foreground text-sm">
          Your TBR is empty. Discover books and add them here!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full max-w-md mx-auto">
      <AnimatePresence mode="popLayout">
        {books.map((book) => (
          <motion.div
            key={book.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="bg-card rounded-xl p-4 shadow-card flex items-start gap-4"
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base font-semibold text-foreground truncate">{book.title}</h3>
              <p className="font-body text-sm text-muted-foreground">{book.author}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {book.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-xs font-body">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => onRemove(book.id)}
              className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
