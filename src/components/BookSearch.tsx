import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Loader2, Book, Headphones, Tablet, BookOpen } from 'lucide-react';
import { searchGoogleBooks } from '@/lib/api/googleBooks';
import { googleBookToUnified, type UnifiedBook, type GoogleBook, type BookFormat } from '@/data/bookTypes';

const ALLOWED_LANGS = new Set(['en', 'cs', 'sk']);
const PAGE_SIZE = 12;

const FORMATS: { value: BookFormat; label: string; icon: React.ReactNode }[] = [
  { value: 'paperback', label: 'Paperback', icon: <BookOpen className="w-3 h-3" /> },
  { value: 'hardback', label: 'Hardback', icon: <Book className="w-3 h-3" /> },
  { value: 'ebook', label: 'E-book', icon: <Tablet className="w-3 h-3" /> },
  { value: 'audiobook', label: 'Audiobook', icon: <Headphones className="w-3 h-3" /> },
];

interface BookSearchProps {
  onAddBook: (book: UnifiedBook) => void;
  existingIds: Set<string>;
}

export function BookSearch({ onAddBook, existingIds }: BookSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GoogleBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<Record<string, BookFormat>>({});
  const [totalItems, setTotalItems] = useState(0);
  const [startIndex, setStartIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeQueryRef = useRef('');

  // Initial search on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 3) {
      setResults([]);
      setSearched(false);
      setTotalItems(0);
      setStartIndex(0);
      activeQueryRef.current = '';
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setSearched(true);
      setStartIndex(0);
      activeQueryRef.current = trimmed;
      try {
        const { books, totalItems: total } = await searchGoogleBooks(trimmed, undefined, PAGE_SIZE, 0);
        const filtered = books.filter(b => b.language && ALLOWED_LANGS.has(b.language));
        setResults(filtered);
        setTotalItems(total);
        setStartIndex(PAGE_SIZE);
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
        setTotalItems(0);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const hasMore = startIndex < totalItems && startIndex < 100;

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !activeQueryRef.current) return;
    setIsLoadingMore(true);
    try {
      const { books } = await searchGoogleBooks(activeQueryRef.current, undefined, PAGE_SIZE, startIndex);
      const filtered = books.filter(b => b.language && ALLOWED_LANGS.has(b.language));
      setResults(prev => {
        const existingIds = new Set(prev.map(b => b.id));
        const newBooks = filtered.filter(b => !existingIds.has(b.id));
        return [...prev, ...newBooks];
      });
      setStartIndex(prev => prev + PAGE_SIZE);
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, startIndex]);

  // Infinite scroll observer
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { root: scrollRef.current, threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  const handleAdd = (book: GoogleBook) => {
    const unified = googleBookToUnified(book);
    const format = selectedFormats[book.id] || (book.format as BookFormat | undefined);
    if (format) unified.format = format;
    onAddBook(unified);
    setQuery('');
    setResults([]);
    setSearched(false);
    setSelectedFormats({});
    setTotalItems(0);
    setStartIndex(0);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Search input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, author, or ISBN…"
            maxLength={200}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          disabled={isLoading || !query.trim()}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-body text-sm font-medium disabled:opacity-50 transition-opacity"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </motion.button>
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {results.length > 0 ? (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            ref={scrollRef}
            className="space-y-2 max-h-[400px] overflow-y-auto pr-1"
          >
            {results.map((book) => {
              const unifiedId = `google-${book.id}`;
              const isAdded = existingIds.has(unifiedId);
              const chosenFormat = selectedFormats[book.id] || (book.format as BookFormat | undefined);
              return (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-xl p-3 shadow-card space-y-2"
                >
                  <div className="flex gap-3 items-start">
                    {book.thumbnail && (
                      <img
                        src={book.thumbnail}
                        alt={book.title}
                        className="w-12 h-16 object-cover rounded-md flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display text-sm font-semibold text-foreground truncate">{book.title}</h4>
                      <p className="font-body text-xs text-muted-foreground">{book.author}</p>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {book.language && (
                          <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-body">
                            {book.language === 'cs' ? '🇨🇿' : book.language === 'sk' ? '🇸🇰' : book.language === 'en' ? '🇬🇧' : book.language}
                          </span>
                        )}
                        {book.isbn && (
                          <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-body">
                            ISBN: {book.isbn}
                          </span>
                        )}
                        {book.publisher && (
                          <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-body truncate max-w-[120px]">
                            {book.publisher}
                          </span>
                        )}
                        {book.format && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-body font-medium">
                            {book.format === 'ebook' ? 'E-book' : book.format === 'audiobook' ? 'Audiobook' : book.format === 'hardback' ? 'Hardback' : 'Paperback'}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAdd(book)}
                      disabled={isAdded}
                      className={`p-2 rounded-full flex-shrink-0 transition-colors ${
                        isAdded
                          ? 'bg-primary/10 text-primary cursor-default'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                    >
                      <Plus className={`w-4 h-4 ${isAdded ? 'rotate-45' : ''}`} />
                    </button>
                  </div>
                  {/* Format selector */}
                  {!isAdded && (
                    <div className="flex gap-1.5 flex-wrap pl-0.5">
                      {FORMATS.map((f) => (
                        <button
                          key={f.value}
                          onClick={() => setSelectedFormats(prev => ({
                            ...prev,
                            [book.id]: prev[book.id] === f.value ? undefined as any : f.value,
                          }))}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-body font-medium transition-colors ${
                            chosenFormat === f.value
                              ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                              : 'bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary'
                          }`}
                        >
                          {f.icon}
                          {f.label}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-2 flex justify-center">
              {isLoadingMore && (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              )}
              {!hasMore && results.length > PAGE_SIZE && (
                <p className="font-body text-xs text-muted-foreground">No more results</p>
              )}
            </div>
          </motion.div>
        ) : searched && !isLoading ? (
          <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center font-body text-sm text-muted-foreground py-6">
            No books found. Try a different search.
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
