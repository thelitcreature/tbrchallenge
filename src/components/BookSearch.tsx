import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Loader2, Book, Headphones, Tablet, BookOpen } from 'lucide-react';
import { searchGoogleBooks } from '@/lib/api/googleBooks';
import { googleBookToUnified, type UnifiedBook, type GoogleBook, type BookFormat } from '@/data/bookTypes';

const ALLOWED_LANGS = new Set(['en', 'cs', 'sk']);

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
  const [searched, setSearched] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<Record<string, BookFormat>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setSearched(true);
      try {
        const { books } = await searchGoogleBooks(trimmed, undefined, 20);
        const filtered = books.filter(b => !b.language || ALLOWED_LANGS.has(b.language));
        setResults(filtered);
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleAdd = (book: GoogleBook) => {
    const unified = googleBookToUnified(book);
    const format = selectedFormats[book.id];
    if (format) unified.format = format;
    onAddBook(unified);
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
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {results.map((book) => {
              const unifiedId = `google-${book.id}`;
              const isAdded = existingIds.has(unifiedId);
              const chosenFormat = selectedFormats[book.id];
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
