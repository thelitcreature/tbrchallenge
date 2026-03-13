import { motion, AnimatePresence } from 'framer-motion';
import type { UnifiedBook } from '@/data/bookTypes';
import { X, Heart, BookOpenText, BookCheck } from 'lucide-react';

interface WishlistProps {
  wantToReadBooks: UnifiedBook[];
  readBooks: UnifiedBook[];
  onRemove: (id: string) => void;
  onMarkAsRead: (book: UnifiedBook) => void;
}

function BookRow({ book, onRemove, actions }: {
  book: UnifiedBook;
  onRemove: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <motion.div
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
        </div>
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        {actions}
        <button
          onClick={onRemove}
          className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export function Wishlist({ wantToReadBooks, readBooks, onRemove, onMarkAsRead }: WishlistProps) {
  const totalCount = wantToReadBooks.length + readBooks.length;

  if (totalCount === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Heart className="w-10 h-10 text-muted-foreground/40 mx-auto" />
        <p className="font-body text-muted-foreground text-sm">
          No books yet. Discover books and save them here!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-md mx-auto">
      {wantToReadBooks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            <h3 className="font-display text-lg font-semibold text-foreground">Want to Read</h3>
            <span className="ml-auto font-body text-xs text-muted-foreground">{wantToReadBooks.length}</span>
          </div>
          <AnimatePresence mode="popLayout">
            {wantToReadBooks.map((book) => (
              <BookRow
                key={book.id}
                book={book}
                onRemove={() => onRemove(book.id)}
                actions={
                  <button
                    onClick={() => onMarkAsRead(book)}
                    className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title="Mark as read"
                  >
                    <BookCheck className="w-4 h-4" />
                  </button>
                }
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {readBooks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BookCheck className="w-5 h-5 text-primary" />
            <h3 className="font-display text-lg font-semibold text-foreground">Already Read</h3>
            <span className="ml-auto font-body text-xs text-muted-foreground">{readBooks.length}</span>
          </div>
          <AnimatePresence mode="popLayout">
            {readBooks.map((book) => (
              <BookRow key={book.id} book={book} onRemove={() => onRemove(book.id)} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
