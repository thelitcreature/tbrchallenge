import { motion, AnimatePresence } from 'framer-motion';
import type { UnifiedBook } from '@/data/bookTypes';
import { X, BookOpen, BookOpenText, Book, Headphones, Tablet } from 'lucide-react';

interface TBRListProps {
  books: UnifiedBook[];
  onRemove: (id: string) => void;
}

export function TBRList({ books, onRemove }: TBRListProps) {
  if (books.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto" />
        <p className="font-body text-muted-foreground text-sm">
          Your TBR is empty. Search for books above or add one manually!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full max-w-md mx-auto">
      <p className="font-body text-sm text-muted-foreground text-center">{books.length} book{books.length !== 1 ? 's' : ''}</p>
      <AnimatePresence mode="popLayout">
        {books.map((book) => (
          <motion.div
            key={book.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="bg-card rounded-xl p-4 shadow-card flex items-start gap-3"
          >
            {book.thumbnail ? (
              <img src={book.thumbnail} alt={book.title} className="w-10 h-14 object-cover rounded-md flex-shrink-0" />
            ) : (
              <div className="w-10 h-14 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                <BookOpenText className="w-4 h-4 text-muted-foreground/40" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-display text-base font-semibold text-foreground truncate">{book.title}</h4>
              <p className="font-body text-sm text-muted-foreground">{book.author}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {book.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-xs font-body">
                    {tag}
                  </span>
                ))}
                {book.source === 'manual' && (
                  <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-body font-medium">
                    Manual
                  </span>
                )}
                {book.format && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-body font-medium flex items-center gap-1">
                    {book.format === 'hardback' && <Book className="w-3 h-3" />}
                    {book.format === 'paperback' && <BookOpen className="w-3 h-3" />}
                    {book.format === 'ebook' && <Tablet className="w-3 h-3" />}
                    {book.format === 'audiobook' && <Headphones className="w-3 h-3" />}
                    {book.format.charAt(0).toUpperCase() + book.format.slice(1)}
                  </span>
                )}
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
