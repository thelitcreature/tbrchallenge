import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Loader2 } from 'lucide-react';
import { searchGoogleBooks } from '@/lib/api/googleBooks';
import { googleBookToUnified, type UnifiedBook, type GoogleBook } from '@/data/bookTypes';

const ALLOWED_LANGS = new Set(['en', 'cs', 'sk']);

interface BookSearchProps {
  onAddBook: (book: UnifiedBook) => void;
  existingIds: Set<string>;
}

export function BookSearch({ onAddBook, existingIds }: BookSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GoogleBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
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
        // Filter to only English, Czech, Slovak
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

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Title, author, or ISBN…"
          maxLength={200}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {results.length > 0 ? (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {results.map((book) => {
              const unifiedId = `google-${book.id}`;
              const isAdded = existingIds.has(unifiedId);
              return (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-xl p-3 shadow-card flex gap-3 items-start"
                >
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
                    onClick={() => onAddBook(googleBookToUnified(book))}
                    disabled={isAdded}
                    className={`p-2 rounded-full flex-shrink-0 transition-colors ${
                      isAdded
                        ? 'bg-primary/10 text-primary cursor-default'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    <Plus className={`w-4 h-4 ${isAdded ? 'rotate-45' : ''}`} />
                  </button>
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
