import { motion, AnimatePresence } from 'framer-motion';
import type { UnifiedBook } from '@/data/bookTypes';
import { X, BookOpen, BookOpenText, Heart, BookCheck } from 'lucide-react';

export type ShelfType = 'owned' | 'want-to-read' | 'read';

export interface ShelvedBook extends UnifiedBook {
  shelf: ShelfType;
}

interface TBRListProps {
  ownedBooks: ShelvedBook[];
  wantToReadBooks: ShelvedBook[];
  readBooks: ShelvedBook[];
  onRemove: (id: string) => void;
}

function ShelfSection({ title, icon, books, onRemove, emptyText }: {
  title: string;
  icon: React.ReactNode;
  books: ShelvedBook[];
  onRemove: (id: string) => void;
  emptyText: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
        <span className="ml-auto font-body text-xs text-muted-foreground">{books.length}</span>
      </div>
      {books.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground/60 pl-7">{emptyText}</p>
      ) : (
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
      )}
    </div>
  );
}

export function TBRList({ ownedBooks, wantToReadBooks, readBooks, onRemove }: TBRListProps) {
  const totalCount = ownedBooks.length + wantToReadBooks.length + readBooks.length;

  if (totalCount === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto" />
        <p className="font-body text-muted-foreground text-sm">
          Your shelves are empty. Search for books above or add one manually!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-md mx-auto">
      <ShelfSection
        title="My Books"
        icon={<BookOpen className="w-5 h-5 text-foreground" />}
        books={ownedBooks}
        onRemove={onRemove}
        emptyText="Add books you own via search or manual entry."
      />
      <ShelfSection
        title="Want to Read"
        icon={<Heart className="w-5 h-5 text-primary" />}
        books={wantToReadBooks}
        onRemove={onRemove}
        emptyText="Discover books and save them here."
      />
      <ShelfSection
        title="Already Read"
        icon={<BookCheck className="w-5 h-5 text-green-600" />}
        books={readBooks}
        onRemove={onRemove}
        emptyText="Mark books as read from the Discover page."
      />
    </div>
  );
}
