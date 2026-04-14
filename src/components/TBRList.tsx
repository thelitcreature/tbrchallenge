import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import type { UnifiedBook, BookFormat } from '@/data/bookTypes';
import {
  X, BookOpen, BookOpenText, Book, Headphones, Tablet,
  ChevronDown, Check, ArrowUpDown, CalendarIcon, BookMarked, Bookmark
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

const FORMATS: { value: BookFormat; label: string; icon: React.ReactNode }[] = [
  { value: 'paperback', label: 'Paperback', icon: <BookOpen className="w-3 h-3" /> },
  { value: 'hardback', label: 'Hardback', icon: <Book className="w-3 h-3" /> },
  { value: 'ebook', label: 'E-book', icon: <Tablet className="w-3 h-3" /> },
  { value: 'audiobook', label: 'Audiobook', icon: <Headphones className="w-3 h-3" /> },
];

type SortKey = 'dateAdded' | 'title' | 'author';
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'dateAdded', label: 'Date added' },
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
];

export interface TBRBook extends UnifiedBook {
  dateAdded: string; // ISO string
  isRead: boolean;
}

interface TBRListProps {
  books: TBRBook[];
  onRemove: (id: string) => void;
  onUpdateFormat?: (id: string, format: BookFormat | undefined) => void;
  onMarkAsRead?: (id: string) => void;
  onUpdateDateAdded?: (id: string, date: string) => void;
  nightstandIds?: Set<string>;
  onToggleNightstand?: (id: string) => void;
}

export function TBRList({ books, onRemove, onUpdateFormat, onMarkAsRead, onUpdateDateAdded, nightstandIds, onToggleNightstand }: TBRListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('dateAdded');
  const [sortAsc, setSortAsc] = useState(false);

  const unreadBooks = books.filter(b => !b.isRead);
  const readBooks = books.filter(b => b.isRead);

  const sortedUnread = useMemo(() => {
    const sorted = [...unreadBooks].sort((a, b) => {
      if (sortBy === 'dateAdded') {
        return new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
      }
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return a.author.localeCompare(b.author);
    });
    return sortAsc ? sorted : sorted.reverse();
  }, [unreadBooks, sortBy, sortAsc]);

  const oldestBook = useMemo(() => {
    if (unreadBooks.length === 0) return null;
    return unreadBooks.reduce((oldest, b) =>
      new Date(b.dateAdded) < new Date(oldest.dateAdded) ? b : oldest
    );
  }, [unreadBooks]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(prev => !prev);
    else { setSortBy(key); setSortAsc(key === 'title' || key === 'author'); }
  };

  if (books.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto text-center py-16 px-6 space-y-5"
      >
        <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <BookOpenText className="w-10 h-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="font-display text-xl font-bold text-foreground">Your TBR is empty!</h3>
          <p className="font-body text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Every great reading journey starts with one book. Search for a title, snap a photo of your shelf, or add one manually to get started.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <span className="px-3 py-1.5 rounded-full bg-secondary text-muted-foreground text-xs font-body">🔍 Search</span>
          <span className="px-3 py-1.5 rounded-full bg-secondary text-muted-foreground text-xs font-body">📸 Photo</span>
          <span className="px-3 py-1.5 rounded-full bg-secondary text-muted-foreground text-xs font-body">✏️ Manual</span>
        </div>
      </motion.div>
    );
  }

  const renderBook = (book: TBRBook) => {
    const isEditing = editingId === book.id;
    return (
      <motion.div
        key={book.id}
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20, scale: 0.9 }}
        className={cn(
          "bg-card rounded-xl p-4 shadow-card space-y-2",
          book.isRead && "opacity-60"
        )}
      >
        <div className="flex items-start gap-3">
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

            {/* Date added */}
            <div className="flex items-center gap-1 mt-1">
              <CalendarIcon className="w-3 h-3 text-muted-foreground/60" />
              <Popover>
                <PopoverTrigger asChild>
                  <button className="font-body text-[11px] text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline">
                    On TBR since {format(new Date(book.dateAdded), 'MMM d, yyyy')}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={new Date(book.dateAdded)}
                    onSelect={(date) => {
                      if (date && onUpdateDateAdded) {
                        onUpdateDateAdded(book.id, date.toISOString());
                      }
                    }}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

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
              {book.reasonForAdding && (
                <span
                  className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-body"
                  title={book.reasonForAdding.customText || book.reasonForAdding.reason}
                >
                  {book.reasonForAdding.reason === 'Other' && book.reasonForAdding.customText
                    ? book.reasonForAdding.customText
                    : book.reasonForAdding.reason}
                </span>
              )}
              {book.isRead && (
                <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-body font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> Read
                </span>
              )}
              {/* Format badge */}
              <button
                onClick={() => setEditingId(isEditing ? null : book.id)}
                className={`px-2 py-0.5 rounded-full text-xs font-body font-medium flex items-center gap-1 transition-colors ${
                  book.format
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                }`}
              >
                {book.format === 'hardback' && <Book className="w-3 h-3" />}
                {book.format === 'paperback' && <BookOpen className="w-3 h-3" />}
                {book.format === 'ebook' && <Tablet className="w-3 h-3" />}
                {book.format === 'audiobook' && <Headphones className="w-3 h-3" />}
                {book.format ? book.format.charAt(0).toUpperCase() + book.format.slice(1) : 'Set format'}
                <ChevronDown className={`w-3 h-3 transition-transform ${isEditing ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            {!book.isRead && onToggleNightstand && (
              <button
                onClick={() => onToggleNightstand(book.id)}
                className={`p-1.5 rounded-full transition-colors ${
                  nightstandIds?.has(book.id)
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
                title={nightstandIds?.has(book.id) ? 'Remove from Nightstand' : 'Add to Nightstand'}
              >
                <Bookmark className="w-4 h-4" />
              </button>
            )}
            {!book.isRead && onMarkAsRead && (
              <button
                onClick={() => onMarkAsRead(book.id)}
                className="p-1.5 rounded-full hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors"
                title="Mark as read"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onRemove(book.id)}
              className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Format picker */}
        <AnimatePresence>
          {isEditing && onUpdateFormat && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-1.5 flex-wrap pt-1 pl-[52px]">
                {FORMATS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => {
                      onUpdateFormat(book.id, book.format === f.value ? undefined : f.value);
                      setEditingId(null);
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-body font-medium transition-colors ${
                      book.format === f.value
                        ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                        : 'bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    {f.icon}
                    {f.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4 w-full max-w-md mx-auto">
      {/* Stats bar */}
      <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-primary" />
            <span className="font-body text-sm font-medium text-foreground">
              {unreadBooks.length} to read
            </span>
            {readBooks.length > 0 && (
              <span className="font-body text-xs text-muted-foreground">
                · {readBooks.length} read
              </span>
            )}
          </div>
          {oldestBook && (
            <span className="font-body text-[11px] text-muted-foreground truncate" title={`Oldest: ${oldestBook.title}`}>
              Oldest: <span className="font-medium text-foreground">{format(new Date(oldestBook.dateAdded), 'MMM d')}</span> — {oldestBook.title}
            </span>
          )}
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-1.5 justify-center">
        <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => toggleSort(opt.value)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-body font-medium transition-colors",
              sortBy === opt.value
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            {opt.label}
            {sortBy === opt.value && (
              <span className="ml-0.5">{sortAsc ? '↑' : '↓'}</span>
            )}
          </button>
        ))}
      </div>

      {/* Unread books */}
      <AnimatePresence mode="popLayout">
        {sortedUnread.map(renderBook)}
      </AnimatePresence>

      {/* Read section */}
      {readBooks.length > 0 && (
        <div className="space-y-3 pt-4">
          <p className="font-body text-xs text-muted-foreground text-center uppercase tracking-wider">
            ✓ Already read
          </p>
          <AnimatePresence mode="popLayout">
            {readBooks.map(renderBook)}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
