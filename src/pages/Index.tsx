import { useState, useCallback, useRef, useEffect } from "react";
import { SlidersHorizontal, ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { books as curatedBooks, GENRES, MOODS, type Genre, type Mood } from "@/data/books";
import type { UnifiedBook } from "@/data/bookTypes";
import { FilterChips } from "@/components/FilterChips";
import { LanguageFilter, type BookLanguage } from "@/components/LanguageFilter";
import { PullLever } from "@/components/PullLever";
import { BookCard } from "@/components/BookCard";
import { TBRList } from "@/components/TBRList";
import type { Mode } from "@/components/ModeToggle";
import { ModeToggle } from "@/components/ModeToggle";
import { BookSearch } from "@/components/BookSearch";
import { ManualEntry } from "@/components/ManualEntry";
import { Wishlist } from "@/components/Wishlist";
import { searchGoogleBooks } from "@/lib/api/googleBooks";
import { googleBookToUnified } from "@/data/bookTypes";

// Convert curated books to UnifiedBook format
const curatedUnified: UnifiedBook[] = curatedBooks.map((b) => ({
  ...b,
  source: "curated" as const
}));

const Index = () => {
  const [mode, setMode] = useState<Mode>("discover");
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<Mood[]>([]);
  const [revealedBook, setRevealedBook] = useState<UnifiedBook | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [shelvedBooks, setShelvedBooks] = useState<(UnifiedBook & {shelf: 'owned' | 'want-to-read' | 'read';})[]>([]);
  const [tbrMode, setTbrMode] = useState(false);
  const [discoverLang, setDiscoverLang] = useState<BookLanguage>("");
  const [showFilters, setShowFilters] = useState(false);
  const [hasPulled, setHasPulled] = useState(false);
  const [filterChangeKey, setFilterChangeKey] = useState(0);

  const ownedBooks = shelvedBooks.filter((b) => b.shelf === "owned");
  const wantToReadBooks = shelvedBooks.filter((b) => b.shelf === "want-to-read");
  const readBooks = shelvedBooks.filter((b) => b.shelf === "read");

  const toggleGenre = (g: Genre) => {
    setSelectedGenres((prev) => prev.includes(g) ? [] : [g]);
    if (hasPulled) setFilterChangeKey((k) => k + 1);
    else setRevealedBook(null);
  };

  const toggleMood = (m: Mood) => {
    setSelectedMoods((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
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
        const lang = discoverLang || "en";
        const isNonFiction = selectedGenres.includes("Non-Fiction");
        
        // Build a reader-friendly query
        const genreMap: Record<string, string> = {
          "Contemporary": "contemporary fiction novels",
          "Literary Fiction": "literary fiction novels",
          "Romance": "romance novels",
          "Romantasy": "romantasy fantasy romance novels",
          "Fantasy": "fantasy novels",
          "Sci-Fi": "science fiction novels",
          "Historical": "historical fiction novels",
          "Thriller": "thriller suspense novels",
          "Horror": "horror fiction novels",
          "Crime": "crime mystery detective novels",
          "Humor": "comedy humor fiction novels",
          "Classics": "classic literature novels",
          "Young Adult": "young adult YA novels",
          "Non-Fiction": "popular nonfiction bestseller",
        };
        
        let query: string;
        if (selectedGenres.length > 0) {
          const mapped = selectedGenres.map((g) => genreMap[g] || g.toLowerCase()).join(" ");
          query = isNonFiction ? mapped : `subject:fiction ${mapped}`;
        } else {
          query = lang === "en" ? "subject:fiction popular novels" : "subject:fiction romány";
        }
        
        if (selectedMoods.length > 0) {
          query += ` ${selectedMoods[0].toLowerCase()}`;
        }
        
        const startIndex = Math.floor(Math.random() * 10);
        const { books } = await searchGoogleBooks(query, lang, 40, startIndex);
        
        // Filter out non-fiction results unless user wants non-fiction
        const NON_FICTION_CATS = ["periodicals", "education", "history", "science", "business", "reference", "law", "mathematics", "technology", "medical", "computers"];
        const filtered = isNonFiction
          ? books
          : books.filter((b) => {
              const cats = (b.categories || []).join(" ").toLowerCase();
              return !NON_FICTION_CATS.some((nf) => cats.includes(nf)) && b.author !== "Unknown Author" && (b.description?.length || 0) > 20;
            });
        
        const pool = filtered.length > 0 ? filtered : books;
        if (pool.length > 0) {
          const randomBook = pool[Math.floor(Math.random() * pool.length)];
          setRevealedBook(googleBookToUnified(randomBook));
        }
      } catch (err) {
        console.error("Discovery fetch error:", err);
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
      setRevealedBook(randomBook);
      setIsRevealing(false);
    }, 600);
  };

  // Auto-pull when filters change after the user has already pulled
  const pullBookRef = useRef(pullBook);
  pullBookRef.current = pullBook;
  
  useEffect(() => {
    if (filterChangeKey > 0) {
      pullBookRef.current();
    }
  }, [filterChangeKey]);

  const addToOwned = (book: UnifiedBook) => {
    if (!shelvedBooks.find((b) => b.id === book.id)) {
      setShelvedBooks((prev) => [...prev, { ...book, shelf: "owned" }]);
    }
  };

  const addToWantToRead = (book: UnifiedBook) => {
    if (!shelvedBooks.find((b) => b.id === book.id)) {
      setShelvedBooks((prev) => [...prev, { ...book, shelf: "want-to-read" }]);
    }
  };

  const markAsRead = (book: UnifiedBook) => {
    setShelvedBooks((prev) => {
      const existing = prev.find((b) => b.id === book.id);
      if (existing) {
        return prev.map((b) => b.id === book.id ? { ...b, shelf: "read" as const } : b);
      }
      return [...prev, { ...book, shelf: "read" as const }];
    });
  };

  const removeFromShelves = (id: string) => {
    setShelvedBooks((prev) => prev.filter((b) => b.id !== id));
  };

  const shelvedIds = new Set(shelvedBooks.map((b) => b.id));
  const wantToReadIds = new Set(wantToReadBooks.map((b) => b.id));
  const readIds = new Set(readBooks.map((b) => b.id));

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-10 sm:py-16">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 flex-col flex items-center justify-center gap-[10px]">
        <h1 className="font-display text-5xl sm:text-6xl font-bold text-foreground tracking-tight">Plot Twist</h1>
        <p className="font-body text-sm text-muted-foreground mt-2 uppercase w-full" style={{ letterSpacing: '0.65em', paddingRight: '0.65em' }}>Let the book choose you</p>
      </motion.div>

      {/* Mode Toggle */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-8 mt-4">
        <ModeToggle mode={mode} onModeChange={setMode} tbrCount={ownedBooks.length} wishlistCount={wantToReadBooks.length + readBooks.length} />
      </motion.div>

      {mode === "discover" ?
      <motion.div
        key="discover"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center w-full max-w-lg space-y-6 relative z-50">
        
          {/* TBR-only toggle */}
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

          {/* Filter toggle */}
          <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 font-body text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <SlidersHorizontal className="w-4 h-4" />}
            {showFilters ? "Hide filters" : "Add filters"}
            {(selectedGenres.length > 0 || selectedMoods.length > 0 || discoverLang) &&
          <span className="bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                {selectedGenres.length + selectedMoods.length + (discoverLang ? 1 : 0)}
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
            
                {/* Language filter */}
                {!tbrMode &&
            <div className="space-y-2 w-full">
                    <p className="text-sm font-body font-medium text-muted-foreground text-center">Book Language</p>
                    <LanguageFilter
                selected={discoverLang}
                onChange={(l) => {
                  setDiscoverLang(l);
                  setRevealedBook(null);
                }} />
              
                  </div>
            }

                <FilterChips label="Genres" options={GENRES} selected={selectedGenres} onToggle={toggleGenre} />
                <FilterChips
              label="I'm in the mood for something…"
              options={MOODS}
              selected={selectedMoods}
              onToggle={toggleMood} />
            
              </motion.div>
          }
          </AnimatePresence>

          {/* Main interaction */}
          {revealedBook && !isRevealing && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setRevealedBook(null)}
            />
          )}
          <div
          className="py-8 flex flex-col items-center min-h-[280px] justify-center w-full">
          
            <AnimatePresence mode="wait">
              {revealedBook && !isRevealing ?
            <BookCard
              key={revealedBook.id}
              book={revealedBook}
              onPullAgain={pullBook}
              onDismiss={() => setRevealedBook(null)}
              onAddToWantToRead={addToWantToRead}
              onMarkAsRead={markAsRead}
              isInWantToRead={wantToReadIds.has(revealedBook.id)}
              isRead={readIds.has(revealedBook.id)} /> :


            <motion.div key="lever" exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }}>
                  <PullLever onPull={pullBook} isRevealing={isRevealing} />
                </motion.div>
            }
            </AnimatePresence>
          </div>
        </motion.div> :
      mode === "tbr" ?
      <motion.div
        key="tbr"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="w-full max-w-lg space-y-6">
        
          <BookSearch onAddBook={addToOwned} existingIds={shelvedIds} />
          <ManualEntry onAdd={addToOwned} />
          <TBRList books={ownedBooks} onRemove={removeFromShelves} />
        </motion.div> :

      <motion.div
        key="wishlist"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="w-full max-w-lg space-y-6">
        
          <Wishlist
          wantToReadBooks={wantToReadBooks}
          readBooks={readBooks}
          onRemove={removeFromShelves}
          onMarkAsRead={markAsRead} />
        
        </motion.div>
      }
    </div>);

};

export default Index;