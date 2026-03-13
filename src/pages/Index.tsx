import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { books as curatedBooks, GENRES, MOODS, type Genre, type Mood } from '@/data/books';
import type { UnifiedBook } from '@/data/bookTypes';
import { FilterChips } from '@/components/FilterChips';
import { PullLever } from '@/components/PullLever';
import { BookCard } from '@/components/BookCard';
import { TBRList } from '@/components/TBRList';
import { ModeToggle } from '@/components/ModeToggle';
import { BookSearch } from '@/components/BookSearch';
import { ManualEntry } from '@/components/ManualEntry';

// Convert curated books to UnifiedBook format
const curatedUnified: UnifiedBook[] = curatedBooks.map((b) => ({
  ...b,
  source: 'curated' as const,
}));

const Index = () => {
  const [mode, setMode] = useState<'discover' | 'tbr'>('discover');
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<Mood[]>([]);
  const [revealedBook, setRevealedBook] = useState<UnifiedBook | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [tbrBooks, setTbrBooks] = useState<UnifiedBook[]>([]);
  const [tbrMode, setTbrMode] = useState(false);

  const toggleGenre = (g: Genre) =>
    setSelectedGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const toggleMood = (m: Mood) =>
    setSelectedMoods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const getFilteredBooks = useCallback(() => {
    const source = tbrMode ? tbrBooks : curatedUnified;
    return source.filter((book) => {
      const genreMatch = selectedGenres.length === 0 || book.genres.some((g) => selectedGenres.includes(g));
      const moodMatch = selectedMoods.length === 0 || book.moods.some((m) => selectedMoods.includes(m));
      return genreMatch && moodMatch;
    });
  }, [selectedGenres, selectedMoods, tbrMode, tbrBooks]);

  const pullBook = () => {
    const filtered = getFilteredBooks();
    if (filtered.length === 0) return;
    setIsRevealing(true);
    setRevealedBook(null);
    setTimeout(() => {
      const randomBook = filtered[Math.floor(Math.random() * filtered.length)];
      setRevealedBook(randomBook);
      setIsRevealing(false);
    }, 600);
  };

  const addToTBR = (book: UnifiedBook) => {
    if (!tbrBooks.find((b) => b.id === book.id)) {
      setTbrBooks((prev) => [...prev, book]);
    }
  };

  const removeFromTBR = (id: string) => {
    setTbrBooks((prev) => prev.filter((b) => b.id !== id));
  };

  const tbrIds = new Set(tbrBooks.map((b) => b.id));

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-10 sm:py-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="font-display text-5xl sm:text-6xl font-bold text-foreground tracking-tight">
          Plot Twist
        </h1>
        <p className="font-body text-base text-muted-foreground mt-2">
          One pull. One book. No regrets.
        </p>
      </motion.div>

      {/* Mode Toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-8"
      >
        <ModeToggle mode={mode} onModeChange={setMode} tbrCount={tbrBooks.length} />
      </motion.div>

      {mode === 'discover' ? (
        <motion.div
          key="discover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center w-full max-w-lg space-y-6"
        >
          {/* TBR-only toggle */}
          {tbrBooks.length > 0 && (
            <label className="flex items-center gap-2 font-body text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={tbrMode}
                onChange={(e) => { setTbrMode(e.target.checked); setRevealedBook(null); }}
                className="w-4 h-4 accent-primary rounded"
              />
              Pick from My TBR only
            </label>
          )}

          {/* Filters */}
          <FilterChips label="Genres" options={GENRES} selected={selectedGenres} onToggle={toggleGenre} />
          <FilterChips label="I'm in the mood for something…" options={MOODS} selected={selectedMoods} onToggle={toggleMood} />

          {/* Main interaction */}
          <div className="py-8 flex flex-col items-center min-h-[280px] justify-center">
            <AnimatePresence mode="wait">
              {revealedBook && !isRevealing ? (
                <BookCard
                  key={revealedBook.id}
                  book={revealedBook}
                  onPullAgain={pullBook}
                  onAddToTBR={addToTBR}
                  isInTBR={tbrIds.has(revealedBook.id)}
                />
              ) : (
                <motion.div key="lever" exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }}>
                  <PullLever onPull={pullBook} isRevealing={isRevealing} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="tbr"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full max-w-lg space-y-6"
        >
          {/* Search to add */}
          <BookSearch onAddBook={addToTBR} existingIds={tbrIds} />

          {/* Manual entry */}
          <ManualEntry onAdd={addToTBR} />

          {/* TBR list */}
          <TBRList books={tbrBooks} onRemove={removeFromTBR} />
        </motion.div>
      )}
    </div>
  );
};

export default Index;
