import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, Plus, Loader2 } from 'lucide-react';
import { searchGoogleBooks } from '@/lib/api/googleBooks';
import { googleBookToUnified, type UnifiedBook, type GoogleBook } from '@/data/bookTypes';

const LANGUAGES = [
  { code: '', label: 'All languages' },
  { code: 'en', label: 'English' },
  { code: 'cs', label: 'Čeština' },
  { code: 'sk', label: 'Slovenčina' },
];

interface BookSearchProps {
  onAddBook: (book: UnifiedBook) => void;
  existingIds: Set<string>;
}

export function BookSearch({ onAddBook, existingIds }: BookSearchProps) {
  const [query, setQuery] = useState('');
  const [lang, setLang] = useState('');
  const [results, setResults] = useState<GoogleBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    setResults([]);
    setSearched(false);
  }, [lang]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setSearched(true);
    try {
      const { books } = await searchGoogleBooks(query.trim(), lang || undefined, 12);
      setResults(books);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Language pills */}
      <div className="flex flex-wrap gap-2 justify-center">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className={`px-3 py-1.5 rounded-full text-xs font-body font-medium transition-colors flex items-center gap-1 ${
              lang === l.code
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Globe className="w-3 h-3" />
            {l.label}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Title, author, or ISBN…"
            maxLength={200}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSearch}
          disabled={isLoading || !query.trim()}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-body text-sm font-medium disabled:opacity-50 transition-opacity"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </motion.button>
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          </motion.div>
        ) : results.length > 0 ? (
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
        ) : searched ? (
          <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center font-body text-sm text-muted-foreground py-6">
            No books found. Try a different search.
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
