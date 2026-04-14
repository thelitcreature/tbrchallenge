import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import type { UnifiedBook, BookFormat, ReasonForAdding } from '@/data/bookTypes';
import { READING_REASONS } from '@/data/bookTypes';
import type { Genre, Mood } from '@/data/books';
import {
  BookOpenText, Book, BookOpen, Headphones, Tablet,
  MoreHorizontal, Check, Bookmark, Trash2, BookMarked, ArrowUpDown,
  PlayCircle, Ban
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BookDetail } from '@/components/BookDetail';

const FORMATS: { value: BookFormat; label: string; icon: React.ReactNode }[] = [
  { value: 'paperback', label: 'Paperback', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { value: 'hardback', label: 'Hardback', icon: <Book className="w-3.5 h-3.5" /> },
  { value: 'ebook', label: 'E-book', icon: <Tablet className="w-3.5 h-3.5" /> },
  { value: 'audiobook', label: 'Audiobook', icon: <Headphones className="w-3.5 h-3.5" /> },
];

type SortKey = 'dateAdded' | 'title';

export type BookStatus = 'tbr' | 'currently_reading' | 'read' | 'dnf';

export interface TBRBook extends UnifiedBook {
  dateAdded: string;
  isRead: boolean;
  status?: BookStatus;
}

export function getBookStatus(book: TBRBook): BookStatus {
  if (book.status) return book.status;
  return book.isRead ? 'read' : 'tbr';
}

interface CustomList {
  id: string;
  name: string;
  bookIds: string[];
}

type TabValue = 'all' | 'nightstand' | 'currently_reading' | 'dnf' | 'read' | string;

interface TBRListProps {
  books: TBRBook[];
  onRemove: (id: string) => void;
  onUpdateFormat?: (id: string, format: BookFormat | undefined) => void;
  onMarkAsRead?: (id: string) => void;
  onUpdateStatus?: (id: string, status: BookStatus) => void;
  onUpdateDateAdded?: (id: string, date: string) => void;
  onUpdateGenres?: (id: string, genres: Genre[]) => void;
  onUpdateMoods?: (id: string, moods: Mood[]) => void;
  onUpdateReason?: (id: string, reason: ReasonForAdding) => void;
  nightstandIds?: Set<string>;
  onToggleNightstand?: (id: string) => void;
}

function loadCustomLists(): CustomList[] {
  try {
    const raw = localStorage.getItem('pt-custom-lists');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCustomLists(lists: CustomList[]) {
  localStorage.setItem('pt-custom-lists', JSON.stringify(lists));
}

export function TBRList({ books, onRemove, onUpdateFormat, onMarkAsRead, onUpdateStatus, onUpdateDateAdded, onUpdateGenres, onUpdateMoods, onUpdateReason, nightstandIds, onToggleNightstand }: TBRListProps) {
  const [sortBy, setSortBy] = useState<SortKey>('dateAdded');
  const [sortAsc, setSortAsc] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [customLists, setCustomLists] = useState<CustomList[]>(loadCustomLists);
  const [newListDialogOpen, setNewListDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [detailBook, setDetailBook] = useState<TBRBook | null>(null);

  useEffect(() => { saveCustomLists(customLists); }, [customLists]);

  const tbrBooks = books.filter(b => getBookStatus(b) === 'tbr');
  const currentlyReadingBooks = books.filter(b => getBookStatus(b) === 'currently_reading');
  const readBooks = books.filter(b => getBookStatus(b) === 'read');
  const dnfBooks = books.filter(b => getBookStatus(b) === 'dnf');
  const unreadBooks = books.filter(b => !b.isRead && getBookStatus(b) !== 'dnf');

  const oldestBook = useMemo(() => {
    if (tbrBooks.length === 0) return null;
    return tbrBooks.reduce((oldest, b) =>
      new Date(b.dateAdded) < new Date(oldest.dateAdded) ? b : oldest
    );
  }, [tbrBooks]);

  const filteredBooks = useMemo(() => {
    let source: TBRBook[];
    if (activeTab === 'all') source = [...currentlyReadingBooks, ...tbrBooks];
    else if (activeTab === 'nightstand') source = unreadBooks.filter(b => nightstandIds?.has(b.id));
    else if (activeTab === 'currently_reading') source = currentlyReadingBooks;
    else if (activeTab === 'dnf') source = dnfBooks;
    else if (activeTab === 'read') source = readBooks;
    else {
      const list = customLists.find(l => l.id === activeTab);
      source = list ? unreadBooks.filter(b => list.bookIds.includes(b.id)) : [];
    }

    const sorted = [...source].sort((a, b) => {
      if (sortBy === 'dateAdded') return new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
      return a.title.localeCompare(b.title);
    });
    return sortAsc ? sorted : sorted.reverse();
  }, [activeTab, tbrBooks, currentlyReadingBooks, readBooks, dnfBooks, unreadBooks, nightstandIds, customLists, sortBy, sortAsc]);

  const activeDetailBook = useMemo(() => {
    if (!detailBook) return null;
    return books.find(b => b.id === detailBook.id) || detailBook;
  }, [detailBook, books]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(prev => !prev);
    else { setSortBy(key); setSortAsc(key === 'title'); }
  };

  const createList = () => {
    if (!newListName.trim()) return;
    const list: CustomList = { id: `list-${Date.now()}`, name: newListName.trim(), bookIds: [] };
    setCustomLists(prev => [...prev, list]);
    setNewListName('');
    setNewListDialogOpen(false);
    setActiveTab(list.id);
  };

  const addBookToList = (bookId: string, listId: string) => {
    setCustomLists(prev => prev.map(l =>
      l.id === listId
        ? { ...l, bookIds: l.bookIds.includes(bookId) ? l.bookIds : [...l.bookIds, bookId] }
        : l
    ));
  };

  const removeBookFromList = (bookId: string, listId: string) => {
    setCustomLists(prev => prev.map(l =>
      l.id === listId ? { ...l, bookIds: l.bookIds.filter(id => id !== bookId) } : l
    ));
  };

  const tabs: { value: TabValue; label: string }[] = [
    { value: 'all', label: `All (${tbrBooks.length + currentlyReadingBooks.length})` },
    { value: 'nightstand', label: '🕯️ Nightstand' },
    { value: 'currently_reading', label: `📖 Reading (${currentlyReadingBooks.length})` },
    { value: 'dnf', label: `🚫 DNF (${dnfBooks.length})` },
    { value: 'read', label: `✓ Read (${readBooks.length})` },
    ...customLists.map(l => ({ value: l.id, label: l.name })),
  ];

  if (books.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mx-auto text-center py-16 px-6 space-y-5">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <BookOpenText className="w-10 h-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="font-display text-xl font-bold text-foreground">Your TBR is empty!</h3>
          <p className="font-body text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Every great reading journey starts with one book. Search for a title, snap a photo, or add one manually.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5 w-full max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-primary" />
          <span className="font-display text-sm font-semibold text-foreground">
            {tbrBooks.length + currentlyReadingBooks.length} book{(tbrBooks.length + currentlyReadingBooks.length) !== 1 ? 's' : ''} to read
          </span>
        </div>
        {oldestBook && (
          <span className="font-body text-[11px] text-muted-foreground truncate max-w-[180px]">
            Oldest: {format(new Date(oldestBook.dateAdded), 'MMM d')}
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-body font-medium transition-colors shrink-0",
              activeTab === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setNewListDialogOpen(true)}
          className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-body font-medium bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
        >
          + New List
        </button>
      </div>

      {/* Sort pills */}
      <div className="flex items-center justify-end gap-1.5">
        <ArrowUpDown className="w-3 h-3 text-muted-foreground/50" />
        {(['dateAdded', 'title'] as SortKey[]).map(key => (
          <button
            key={key}
            onClick={() => toggleSort(key)}
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-body font-medium transition-colors",
              sortBy === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {key === 'dateAdded' ? 'Date added' : 'Title'}
            {sortBy === key && <span className="ml-0.5">{sortAsc ? '↑' : '↓'}</span>}
          </button>
        ))}
      </div>

      {/* Book rows */}
      <div className="divide-y divide-border">
        <AnimatePresence mode="popLayout">
          {filteredBooks.length === 0 ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10 font-body text-sm text-muted-foreground">
              No books in this list yet.
            </motion.p>
          ) : filteredBooks.map(book => (
            <BookRow
              key={book.id}
              book={book}
              onRemove={onRemove}
              onUpdateFormat={onUpdateFormat}
              onMarkAsRead={onMarkAsRead}
              onUpdateStatus={onUpdateStatus}
              nightstandIds={nightstandIds}
              onToggleNightstand={onToggleNightstand}
              customLists={customLists}
              onAddToList={addBookToList}
              onRemoveFromList={removeBookFromList}
              activeTab={activeTab}
              onOpenDetail={setDetailBook}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Book Detail Sheet */}
      <BookDetail
        book={activeDetailBook}
        open={!!detailBook}
        onClose={() => setDetailBook(null)}
        onRemove={onRemove}
        onMarkAsRead={onMarkAsRead}
        onUpdateStatus={onUpdateStatus}
        onUpdateFormat={onUpdateFormat}
        onUpdateGenres={onUpdateGenres}
        onUpdateMoods={onUpdateMoods}
        nightstandIds={nightstandIds}
        onToggleNightstand={onToggleNightstand}
      />

      {/* New List Dialog */}
      <Dialog open={newListDialogOpen} onOpenChange={setNewListDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Create a new list</DialogTitle>
            <DialogDescription className="font-body text-sm text-muted-foreground">
              Give your list a name to organise your TBR.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
            placeholder="e.g. Beach reads, Book club..."
            className="font-body"
            onKeyDown={e => e.key === 'Enter' && createList()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewListDialogOpen(false)} className="font-body">Cancel</Button>
            <Button onClick={createList} disabled={!newListName.trim()} className="font-body">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Individual Book Row ── */

interface BookRowProps {
  book: TBRBook;
  onRemove: (id: string) => void;
  onUpdateFormat?: (id: string, format: BookFormat | undefined) => void;
  onMarkAsRead?: (id: string) => void;
  onUpdateStatus?: (id: string, status: BookStatus) => void;
  nightstandIds?: Set<string>;
  onToggleNightstand?: (id: string) => void;
  customLists: CustomList[];
  onAddToList: (bookId: string, listId: string) => void;
  onRemoveFromList: (bookId: string, listId: string) => void;
  activeTab: TabValue;
  onOpenDetail: (book: TBRBook) => void;
}

function BookRow({ book, onRemove, onUpdateFormat, onMarkAsRead, onUpdateStatus, nightstandIds, onToggleNightstand, customLists, onAddToList, onRemoveFromList, activeTab, onOpenDetail }: BookRowProps) {
  const isNightstand = nightstandIds?.has(book.id) ?? false;
  const status = getBookStatus(book);

  const reasonText = useMemo(() => {
    if (!book.reasonForAdding) return null;
    const r = book.reasonForAdding;
    return r.reason === 'Other' && r.customText ? r.customText : r.reason;
  }, [book.reasonForAdding]);

  const allTags = [...book.genres, ...book.moods];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn("flex items-center gap-3.5 py-3.5", (status === 'read' || status === 'dnf') && "opacity-50")}
    >
      {/* Clickable area */}
      <div
        className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer"
        onClick={() => onOpenDetail(book)}
      >
        {/* Cover */}
        {book.thumbnail ? (
          <img src={book.thumbnail} alt={book.title} className="w-[60px] h-[88px] object-cover rounded-lg shadow-sm flex-shrink-0" />
        ) : (
          <div className="w-[60px] h-[88px] rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
            <BookOpenText className="w-6 h-6 text-muted-foreground/30" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <h4 className="font-display text-[15px] font-semibold text-foreground leading-snug truncate">
              {book.title}
            </h4>
          </div>
          <p className="font-body text-sm text-muted-foreground truncate">{book.author}</p>
          <p className="font-body text-xs text-muted-foreground/70 leading-relaxed">
            Added {format(new Date(book.dateAdded), 'MMM d, yyyy')}
          </p>
          {reasonText && (
            <p className="font-body text-xs text-muted-foreground leading-relaxed truncate">
              Because: {reasonText}
            </p>
          )}
          {/* Status + tags row */}
          <div className="flex flex-wrap gap-1 mt-1">
            {status === 'currently_reading' && (
              <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-body font-medium">📖 Reading</span>
            )}
            {status === 'dnf' && (
              <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-body font-medium">🚫 DNF</span>
            )}
            {allTags.slice(0, 3).map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-body">{tag}</span>
            ))}
            {allTags.length > 3 && (
              <span className="px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground/60 text-[10px] font-body">+{allTags.length - 3}</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors flex-shrink-0">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 font-body">
          {status === 'tbr' && onUpdateStatus && (
            <DropdownMenuItem onClick={() => onUpdateStatus(book.id, 'currently_reading')}>
              <PlayCircle className="w-3.5 h-3.5 mr-2" /> Start reading
            </DropdownMenuItem>
          )}
          {status !== 'read' && onMarkAsRead && (
            <DropdownMenuItem onClick={() => onMarkAsRead(book.id)}>
              <Check className="w-3.5 h-3.5 mr-2" /> Mark as read
            </DropdownMenuItem>
          )}
          {status !== 'dnf' && status !== 'read' && onUpdateStatus && (
            <DropdownMenuItem onClick={() => onUpdateStatus(book.id, 'dnf')}>
              <Ban className="w-3.5 h-3.5 mr-2" /> Mark as DNF
            </DropdownMenuItem>
          )}
          {(status === 'read' || status === 'dnf' || status === 'currently_reading') && onUpdateStatus && (
            <DropdownMenuItem onClick={() => onUpdateStatus(book.id, 'tbr')}>
              <BookMarked className="w-3.5 h-3.5 mr-2" /> Move back to TBR
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {!book.isRead && onToggleNightstand && (
            <DropdownMenuItem onClick={() => onToggleNightstand(book.id)}>
              <Bookmark className="w-3.5 h-3.5 mr-2" />
              {isNightstand ? 'Remove from Nightstand' : 'Add to Nightstand'}
            </DropdownMenuItem>
          )}
          {onUpdateFormat && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <BookOpen className="w-3.5 h-3.5 mr-2" /> Set format
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="font-body">
                {FORMATS.map(f => (
                  <DropdownMenuItem key={f.value} onClick={() => onUpdateFormat(book.id, book.format === f.value ? undefined : f.value)}>
                    <span className="mr-2">{f.icon}</span>
                    {f.label}
                    {book.format === f.value && <Check className="w-3 h-3 ml-auto text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          {customLists.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <BookMarked className="w-3.5 h-3.5 mr-2" /> Add to list…
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="font-body">
                {customLists.map(list => {
                  const inList = list.bookIds.includes(book.id);
                  return (
                    <DropdownMenuItem key={list.id} onClick={() => inList ? onRemoveFromList(book.id, list.id) : onAddToList(book.id, list.id)}>
                      {list.name}
                      {inList && <Check className="w-3 h-3 ml-auto text-primary" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onRemove(book.id)} className="text-destructive focus:text-destructive">
            <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
