import { useState, useCallback, useRef, useEffect } from "react";
import type { BookFormat, ReasonForAdding, UnifiedBook } from "@/data/bookTypes";
import { SlidersHorizontal, ChevronUp, ChevronLeft, ChevronRight, Plus, LogOut } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { books as curatedBooks, GENRES, MOODS, type Genre, type Mood } from "@/data/books";
import type { TBRBook } from "@/components/TBRList";
import { getAIRecommendations } from "@/lib/api/recommendations";
import { aiBookToUnified } from "@/data/bookTypes";
import { FilterChips } from "@/components/FilterChips";
import { LanguageFilter, type BookLanguage } from "@/components/LanguageFilter";
import { PullLever } from "@/components/PullLever";
import { BookCard } from "@/components/BookCard";
import { TBRList } from "@/components/TBRList";
import type { Mode } from "@/components/ModeToggle";
import { ModeToggle } from "@/components/ModeToggle";
import { BookSearch } from "@/components/BookSearch";
import { ManualEntry } from "@/components/ManualEntry";
import { Challenges } from "@/components/Challenges";
import { Home } from "@/components/Home";
import { ReasonPicker } from "@/components/ReasonPicker";
import { PhotoBookAdd } from "@/components/PhotoBookAdd";
import { Onboarding } from "@/components/Onboarding";
import { searchGoogleBooks } from "@/lib/api/googleBooks";
import { googleBookToUnified } from "@/data/bookTypes";
import { useAuth } from "@/contexts/AuthContext";
import { useBookSync } from "@/hooks/useBookSync";

// Convert curated books to UnifiedBook format
const curatedUnified: UnifiedBook[] = curatedBooks.map((b) => ({
  ...b,
  source: "curated" as const
}));

const Index = () => {
  const { user, signOut } = useAuth();
  const [hasOnboarded, setHasOnboarded] = useState(() => localStorage.getItem('plottwist-onboarded') === '1');
  const [showAddTools, setShowAddTools] = useState(false);
  const [mode, setMode] = useState<Mode>("home");
  const [nightstandIds, setNightstandIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('pt-nightstand');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<Mood[]>([]);
  const [revealedBook, setRevealedBook] = useState<UnifiedBook | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [shelvedBooks, setShelvedBooks] = useState<TBRBook[]>([]);
  const [tbrMode, setTbrMode] = useState(false);
  const [discoverLangs, setDiscoverLangs] = useState<BookLanguage[]>(["en"]);
  const [showFilters, setShowFilters] = useState(false);
  const [hasPulled, setHasPulled] = useState(false);
  const [filterChangeKey, setFilterChangeKey] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [bookHistory, setBookHistory] = useState<UnifiedBook[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [pendingBook, setPendingBook] = useState<UnifiedBook | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [aiPool, setAiPool] = useState<UnifiedBook[]>([]);
  const [aiPoolIndex, setAiPoolIndex] = useState(0);
  const prefetchingRef = useRef(false);

  // Database sync
  const { addBook, removeBook, updateBook, dismissBook: dismissBookDb } = useBookSync({
    userId: user?.id,
    onBooksLoaded: (books) => {
      setShelvedBooks(books);
      setDataLoaded(true);
    },
    onDismissedLoaded: (ids) => setDismissedIds(ids),
  });

  // Pre-fetch next batch when pool is running low
  const prefetchIfNeeded = useCallback(async (currentPool: UnifiedBook[], currentIndex: number) => {
    const remaining = currentPool.filter((b) => !dismissedIds.has(b.id)).length - currentIndex;
    if (remaining <= 2 && !prefetchingRef.current) {
      prefetchingRef.current = true;
      try {
        const shownIds = bookHistory.map((b) => b.title);
        const { books: aiBooks } = await getAIRecommendations(
          selectedGenres, selectedMoods, discoverLangs, shownIds
        );
        const unified = aiBooks.map(aiBookToUnified).filter((b) => !dismissedIds.has(b.id));
        if (unified.length > 0) setAiPool((prev) => [...prev, ...unified]);
      } catch (err) {
        console.error("Prefetch error:", err);
      } finally {
        prefetchingRef.current = false;
      }
    }
  }, [bookHistory, selectedGenres, selectedMoods, discoverLangs, dismissedIds]);

  const ownedBooks = shelvedBooks.filter((b) => !b.isRead);
  const readBooks = shelvedBooks.filter((b) => b.isRead);

  const revealNewBook = (book: UnifiedBook) => {
    setBookHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, book];
    });
    setHistoryIndex((prev) => prev + 1);
    setRevealedBook(book);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setRevealedBook(bookHistory[newIndex]);
    }
  };

  const goForward = () => {
    if (historyIndex < bookHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setRevealedBook(bookHistory[newIndex]);
    } else {
      pullBook();
    }
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < bookHistory.length - 1;

  const toggleGenre = (g: Genre) => {
    setSelectedGenres((prev) => prev.includes(g) ? [] : [g]);
    setAiPool([]); setAiPoolIndex(0);
    if (hasPulled) setFilterChangeKey((k) => k + 1);
    else setRevealedBook(null);
  };

  const toggleMood = (m: Mood) => {
    setSelectedMoods((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
    setAiPool([]); setAiPoolIndex(0);
    if (hasPulled) setFilterChangeKey((k) => k + 1);
    else setRevealedBook(null);
  };

  const getFilteredBooks = useCallback(() => {
    const source = tbrMode ? ownedBooks : curatedUnified;
    return source.filter((book) => {
      const genreMatch = selectedGenres.length === 0 || book.genres.some((g) => selectedGenres.includes(g));
      const moodMatch = selectedMoods.length === 0 || book.moods.some((m) => selectedMoods.includes(m));
      return genreMatch && moodMatch;
    });
  }, [selectedGenres, selectedMoods, tbrMode, ownedBooks]);

  const pullBook = async () => {
    setHasPulled(true);
    if (!tbrMode) {
      setIsRevealing(true);
      setRevealedBook(null);
      try {
        const remainingPool = aiPool.filter((b) => !dismissedIds.has(b.id));
        if (remainingPool.length > aiPoolIndex && aiPoolIndex < remainingPool.length) {
          const picked = remainingPool[aiPoolIndex];
          setAiPoolIndex((prev) => prev + 1);
          revealNewBook(picked);
          setIsRevealing(false);
          prefetchIfNeeded(remainingPool, aiPoolIndex + 1);
          return;
        }

        const shownIds = bookHistory.map((b) => b.title);
        const { books: aiBooks } = await getAIRecommendations(
          selectedGenres, selectedMoods, discoverLangs, shownIds
        );
        const unified = aiBooks.map(aiBookToUnified).filter((b) => !dismissedIds.has(b.id));

        if (unified.length > 0) {
          setAiPool(unified);
          setAiPoolIndex(1);
          revealNewBook(unified[0]);
        } else {
          const { books } = await searchGoogleBooks("subject:fiction bestseller 2024", discoverLangs[0] || "en", 40, 0);
          if (books.length > 0) {
            const picked = books[Math.floor(Math.random() * books.length)];
            revealNewBook(googleBookToUnified(picked));
          }
        }
      } catch (err) {
        console.error("Discovery fetch error:", err);
        try {
          const { books } = await searchGoogleBooks("subject:fiction popular novels bestseller", discoverLangs[0] || "en", 40, Math.floor(Math.random() * 10));
          const filtered = books.filter((b) => !dismissedIds.has(`google-${b.id}`) && b.author !== "Unknown Author" && (b.description?.length || 0) > 20);
          if (filtered.length > 0) {
            const picked = filtered[Math.floor(Math.random() * filtered.length)];
            revealNewBook(googleBookToUnified(picked));
          }
        } catch (fallbackErr) {
          console.error("Fallback fetch error:", fallbackErr);
        }
      } finally {
        setIsRevealing(false);
      }
      return;
    }

    const filtered = getFilteredBooks();
    if (filtered.length === 0) return;
    setIsRevealing(true);
    setRevealedBook(null);
    setTimeout(() => {
      const randomBook = filtered[Math.floor(Math.random() * filtered.length)];
      revealNewBook(randomBook);
      setIsRevealing(false);
    }, 600);
  };

  const pullBookRef = useRef(pullBook);
  pullBookRef.current = pullBook;

  useEffect(() => {
    if (filterChangeKey > 0) {
      const timer = setTimeout(() => pullBookRef.current(), 50);
      return () => clearTimeout(timer);
    }
  }, [filterChangeKey]);

  const addToOwned = (book: UnifiedBook) => {
    if (!shelvedBooks.find((b) => b.id === book.id)) {
      setPendingBook(book);
    }
  };

  const confirmAddWithReason = (book: UnifiedBook, reason: ReasonForAdding) => {
    const tbrBook: TBRBook = { ...book, reasonForAdding: reason, dateAdded: new Date().toISOString(), isRead: false };
    setShelvedBooks((prev) => [...prev, tbrBook]);
    addBook(tbrBook);
    setPendingBook(null);
  };

  const skipReason = (book: UnifiedBook) => {
    const tbrBook: TBRBook = { ...book, dateAdded: new Date().toISOString(), isRead: false };
    setShelvedBooks((prev) => [...prev, tbrBook]);
    addBook(tbrBook);
    setPendingBook(null);
  };

  const markAsRead = (book: UnifiedBook) => {
    setShelvedBooks((prev) => {
      const existing = prev.find((b) => b.id === book.id);
      if (existing) {
        return prev.map((b) => b.id === book.id ? { ...b, isRead: true } : b);
      }
      return [...prev, { ...book, dateAdded: new Date().toISOString(), isRead: true }];
    });
    updateBook(book.id, { is_read: true });
  };

  const markAsReadById = (id: string) => {
    setShelvedBooks((prev) => prev.map((b) => b.id === id ? { ...b, isRead: true } : b));
    updateBook(id, { is_read: true });
  };

  const updateDateAdded = (id: string, date: string) => {
    setShelvedBooks((prev) => prev.map((b) => b.id === id ? { ...b, dateAdded: date } : b));
    updateBook(id, { date_added: date });
  };

  const removeFromShelves = (id: string) => {
    setShelvedBooks((prev) => prev.filter((b) => b.id !== id));
    removeBook(id);
  };

  const updateBookFormat = (id: string, format: BookFormat | undefined) => {
    setShelvedBooks((prev) => prev.map((b) => b.id === id ? { ...b, format } : b));
    updateBook(id, { format: format || null });
  };

  const updateBookGenres = (id: string, genres: Genre[]) => {
    setShelvedBooks((prev) => prev.map((b) => b.id === id ? { ...b, genres } : b));
    updateBook(id, { genres });
  };

  const updateBookMoods = (id: string, moods: Mood[]) => {
    setShelvedBooks((prev) => prev.map((b) => b.id === id ? { ...b, moods } : b));
    updateBook(id, { moods });
  };

  const handleDismissBook = (book: UnifiedBook) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(book.id);
      return next;
    });
    dismissBookDb(book.id);
    pullBook();
  };

  const toggleNightstand = (id: string) => {
    setNightstandIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('pt-nightstand', JSON.stringify([...next]));
      return next;
    });
  };

  const shelvedIds = new Set(shelvedBooks.map((b) => b.id));
  const readIds = new Set(readBooks.map((b) => b.id));

  if (!hasOnboarded) {
    return (
      <Onboarding onComplete={() => {
        setHasOnboarded(true);
        setShowAddTools(true);
      }} />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-3 sm:px-4 py-6 sm:py-16">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6 sm:mb-8 flex-col flex items-center justify-center gap-[10px] relative w-full max-w-lg">
        <button
          onClick={signOut}
          className="absolute right-0 top-0 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
        <h1 className="font-display text-4xl sm:text-6xl font-bold text-foreground tracking-tight">Plot Twist</h1>
        <p className="font-body text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2 uppercase w-full" style={{ letterSpacing: '0.45em', paddingRight: '0.45em' }}>Let the book choose you</p>
      </motion.div>

      {/* Mode Toggle */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-8 mt-4 w-full max-w-lg px-2">
        <ModeToggle mode={mode} onModeChange={setMode} tbrCount={shelvedBooks.filter(b => !b.isRead).length} />
      </motion.div>

      {mode === "home" ?
      <motion.div
        key="home"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="w-full max-w-lg space-y-6">
          <Home
            ownedBooks={ownedBooks}
            readBooks={readBooks}
            allBooks={shelvedBooks}
            onMarkAsRead={markAsReadById}
            onSwitchToChallenges={() => setMode('challenges')}
            nightstandIds={nightstandIds}
            onToggleNightstand={toggleNightstand}
          />
        </motion.div> :
      mode === "discover" ?
      <motion.div
        key="discover"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center w-full max-w-lg space-y-6 relative z-50">
        
          {ownedBooks.length > 0 &&
        <label className="flex items-center gap-2 font-body text-sm text-muted-foreground cursor-pointer select-none">
              <input
            type="checkbox"
            checked={tbrMode}
            onChange={(e) => {
              setTbrMode(e.target.checked);
              setRevealedBook(null);
            }}
            className="w-4 h-4 accent-primary rounded" />
              Pick from My Books only
            </label>
        }

          <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 font-body text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <SlidersHorizontal className="w-4 h-4" />}
            {showFilters ? "Hide filters" : "Add filters"}
            {(selectedGenres.length > 0 || selectedMoods.length > 0 || discoverLangs.length > 1 || !discoverLangs.includes("en")) &&
          <span className="bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                {selectedGenres.length + selectedMoods.length + (discoverLangs.length > 1 || !discoverLangs.includes("en") ? 1 : 0)}
              </span>
          }
          </button>

          <AnimatePresence>
            {showFilters &&
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden w-full space-y-6">
                {!tbrMode &&
            <div className="space-y-2 w-full">
                    <p className="text-sm font-body font-medium text-muted-foreground text-center">Book Language</p>
                    <LanguageFilter
                selected={discoverLangs}
                onChange={(langs) => {
                  setDiscoverLangs(langs);
                  setAiPool([]); setAiPoolIndex(0);
                  if (hasPulled) setFilterChangeKey((k) => k + 1);
                  else setRevealedBook(null);
                }} />
                  </div>
            }
                <FilterChips label="I want to read..." options={GENRES} selected={selectedGenres} onToggle={toggleGenre} />
                <FilterChips
              label="I'm in the mood for something…"
              options={MOODS}
              selected={selectedMoods}
              onToggle={toggleMood} />
              </motion.div>
          }
          </AnimatePresence>

          <div
            className="py-8 flex items-center min-h-[280px] justify-center w-full gap-2"
            onClick={(e) => {
              if (revealedBook && e.target === e.currentTarget) setRevealedBook(null);
            }}
          >
            {revealedBook && !isRevealing && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: canGoBack ? 1 : 0.25 }}
                whileTap={canGoBack ? { scale: 0.9 } : {}}
                onClick={goBack}
                disabled={!canGoBack}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0 disabled:cursor-default"
                aria-label="Previous book"
              >
                <ChevronLeft className="w-6 h-6" />
              </motion.button>
            )}

            <div className="flex flex-col items-center justify-center flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {revealedBook && !isRevealing ?
              <BookCard
                key={revealedBook.id}
                book={revealedBook}
                onPullAgain={pullBook}
                onDismiss={() => setRevealedBook(null)}
                onMarkAsRead={markAsRead}
                onNotInterested={handleDismissBook}
                isRead={readIds.has(revealedBook.id)} /> :
              <motion.div key="lever" exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }}>
                    <PullLever onPull={pullBook} isRevealing={isRevealing} />
                  </motion.div>
              }
              </AnimatePresence>
            </div>

            {revealedBook && !isRevealing && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={goForward}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
                aria-label={canGoForward ? "Next book" : "Pull new book"}
              >
                <ChevronRight className="w-6 h-6" />
              </motion.button>
            )}
          </div>
        </motion.div> :
      mode === "tbr" ?
      <motion.div
        key="tbr"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="w-full max-w-lg space-y-6">
          <div className="flex justify-center">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddTools(!showAddTools)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-body font-medium transition-colors ${
                showAddTools
                  ? 'bg-secondary text-foreground'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              <Plus className={`w-4 h-4 transition-transform ${showAddTools ? 'rotate-45' : ''}`} />
              {showAddTools ? 'Close' : 'Add books'}
            </motion.button>
          </div>
          <AnimatePresence>
            {showAddTools && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-6"
              >
                <BookSearch onAddBook={addToOwned} existingIds={shelvedIds} />
                <PhotoBookAdd onAddBook={addToOwned} existingIds={shelvedIds} />
                <ManualEntry onAdd={addToOwned} />
              </motion.div>
            )}
          </AnimatePresence>
          <TBRList books={shelvedBooks} onRemove={removeFromShelves} onUpdateFormat={updateBookFormat} onMarkAsRead={markAsReadById} onUpdateDateAdded={updateDateAdded} nightstandIds={nightstandIds} onToggleNightstand={toggleNightstand} />
        </motion.div> :

      <motion.div
        key="challenges"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="w-full max-w-lg space-y-6">
          <Challenges books={ownedBooks} readBooks={readBooks} />
        </motion.div>
      }

      <AnimatePresence>
        {pendingBook && (
          <ReasonPicker
            book={pendingBook}
            onConfirm={confirmAddWithReason}
            onSkip={skipReason}
            onCancel={() => setPendingBook(null)}
          />
        )}
      </AnimatePresence>
    </div>);
};

export default Index;
