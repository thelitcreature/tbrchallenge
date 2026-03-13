import { useState, useCallback, useRef, useEffect } from "react";
import { SlidersHorizontal, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { books as curatedBooks, GENRES, MOODS, type Genre, type Mood } from "@/data/books";
import type { UnifiedBook } from "@/data/bookTypes";
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
  const [discoverLang, setDiscoverLang] = useState<BookLanguage>("en");
  const [showFilters, setShowFilters] = useState(false);
  const [hasPulled, setHasPulled] = useState(false);
  const [filterChangeKey, setFilterChangeKey] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("plottwist-dismissed");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [bookHistory, setBookHistory] = useState<UnifiedBook[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [aiPool, setAiPool] = useState<UnifiedBook[]>([]);
  const [aiPoolIndex, setAiPoolIndex] = useState(0);

  const ownedBooks = shelvedBooks.filter((b) => b.shelf === "owned");
  const wantToReadBooks = shelvedBooks.filter((b) => b.shelf === "want-to-read");
  const readBooks = shelvedBooks.filter((b) => b.shelf === "read");

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
        const lang = discoverLang;
        const isNonFiction = selectedGenres.includes("Non-Fiction");
        
        // Build query based on language
        const isLocalLang = lang === "cs" || lang === "sk";
        
        const trendingTermsEn = ["bestseller", "booktok", "bookstagram", "trending", "new release", "2024", "2025", "2026"];
        const trendingTermsCs = ["bestseller", "román", "novinka", "kniha", "oblíbená", "populární"];
        const trendingTermsSk = ["bestseller", "román", "novinka", "kniha", "obľúbená", "populárna"];
        const trendingTerms = lang === "cs" ? trendingTermsCs : lang === "sk" ? trendingTermsSk : trendingTermsEn;
        const trendBoost = trendingTerms[Math.floor(Math.random() * trendingTerms.length)];
        
        const genreMapEn: Record<string, string> = {
          "Contemporary": "contemporary fiction",
          "Literary Fiction": "literary fiction",
          "Romance": "romance",
          "Romantasy": "romantasy fantasy romance",
          "Fantasy": "fantasy",
          "Sci-Fi": "science fiction",
          "Historical": "historical fiction",
          "Thriller": "thriller suspense",
          "Horror": "horror fiction",
          "Crime": "crime mystery detective",
          "Humor": "comedy humor fiction",
          "Classics": "classic literature",
          "Young Adult": "young adult YA",
          "Non-Fiction": "popular nonfiction",
        };
        
        const genreMapCs: Record<string, string> = {
          "Contemporary": "současná próza",
          "Literary Fiction": "literární fikce",
          "Romance": "romantika láska",
          "Romantasy": "romantasy fantasy",
          "Fantasy": "fantasy",
          "Sci-Fi": "sci-fi vědeckofantastický",
          "Historical": "historický román",
          "Thriller": "thriller",
          "Horror": "horor",
          "Crime": "krimi detektivka",
          "Humor": "humor satira",
          "Classics": "klasika světová literatura",
          "Young Adult": "pro mládež",
          "Non-Fiction": "literatura faktu",
        };
        
        const genreMapSk: Record<string, string> = {
          "Contemporary": "súčasná próza",
          "Literary Fiction": "literárna fikcia",
          "Romance": "romantika láska",
          "Romantasy": "romantasy fantasy",
          "Fantasy": "fantasy",
          "Sci-Fi": "sci-fi vedeckofantastický",
          "Historical": "historický román",
          "Thriller": "thriller",
          "Horror": "horor",
          "Crime": "krimi detektívka",
          "Humor": "humor satira",
          "Classics": "klasika svetová literatúra",
          "Young Adult": "pre mládež",
          "Non-Fiction": "literatúra faktu",
        };
        
        const genreMap = lang === "cs" ? genreMapCs : lang === "sk" ? genreMapSk : genreMapEn;
        
        let query: string;
        if (selectedGenres.length > 0) {
          const mapped = selectedGenres.map((g) => genreMap[g] || g.toLowerCase()).join(" ");
          query = isLocalLang ? `${mapped} ${trendBoost}` : (isNonFiction ? `${mapped} ${trendBoost}` : `subject:fiction ${mapped} ${trendBoost}`);
        } else {
          query = isLocalLang ? `${trendBoost} román beletrie` : `subject:fiction popular novels ${trendBoost}`;
        }
        
        if (selectedMoods.length > 0) {
          query += ` ${selectedMoods[0].toLowerCase()}`;
        }
        
        const startIndex = Math.floor(Math.random() * 10);
        let { books } = await searchGoogleBooks(query, lang, 40, startIndex);
        
        // Fallback for cs/sk: retry with simpler query if no results
        if (books.length === 0 && isLocalLang) {
          const fallbackQueries = [
            selectedGenres.length > 0 ? selectedGenres.map((g) => genreMap[g] || g.toLowerCase()).join(" ") : "román",
            "kniha fiction",
            "bestseller",
          ];
          for (const fq of fallbackQueries) {
            const fallback = await searchGoogleBooks(fq, lang, 40, 0);
            if (fallback.books.length > 0) { books = fallback.books; break; }
          }
          // Last resort: search without language restriction
          if (books.length === 0) {
            const lastResort = await searchGoogleBooks(query.replace(trendBoost, "").trim(), "en", 40, 0);
            books = lastResort.books;
          }
        }
        
        // Filter: prefer standalone novels, known authors, recent books
        const NON_FICTION_CATS = ["periodicals", "education", "history", "science", "business", "reference", "law", "mathematics", "technology", "medical", "computers"];
        const TITLE_BLACKLIST = ["best american", "anthology", "collected stories", "selected stories", "complete stories", "complete works", "collected poems", "encyclopedia", "handbook", "guide to", "introduction to", "textbook", "workbook", "study guide", "short stories", "year's best", "best of the year", "books 1-", "books 2-", "books 3-", "books 4-", "books 5-", "boxed set", "box set", "collection:", "bundle:", "omnibus", "3-in-1", "4-in-1", "2-in-1", "writer's market", "writers market", "how to write", "writing guide", "market guide", "masterclass", "for dummies", "for beginners"];
        const filtered = (isNonFiction ? books : books.filter((b) => {
          if (dismissedIds.has(b.id)) return false;
          const cats = (b.categories || []).join(" ").toLowerCase();
          const titleLower = b.title.toLowerCase();
          const isBlacklisted = TITLE_BLACKLIST.some((bl) => titleLower.includes(bl));
          return !isBlacklisted && !NON_FICTION_CATS.some((nf) => cats.includes(nf)) && b.author !== "Unknown Author" && (b.description?.length || 0) > 20;
        }));
        
        // Sort by recency — newer books first
        const sorted = [...filtered].sort((a, b) => {
          const yearA = parseInt(a.publishedDate?.match(/(\d{4})/)?.[1] || "0");
          const yearB = parseInt(b.publishedDate?.match(/(\d{4})/)?.[1] || "0");
          return yearB - yearA;
        });
        
        // Weight toward newer books: pick from top half more often
        const pool = sorted.length > 0 ? sorted : books;
        if (pool.length > 0) {
          const weightedIndex = Math.floor(Math.pow(Math.random(), 1.5) * pool.length);
          const picked = pool[weightedIndex];
          revealNewBook(googleBookToUnified(picked));
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
      revealNewBook(randomBook);
      setIsRevealing(false);
    }, 600);
  };

  // Auto-pull when filters change after the user has already pulled
  const pullBookRef = useRef(pullBook);
  pullBookRef.current = pullBook;
  
  useEffect(() => {
    if (filterChangeKey > 0) {
      // Defer to ensure state updates (genre/mood) have been committed
      const timer = setTimeout(() => pullBookRef.current(), 50);
      return () => clearTimeout(timer);
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

  const dismissBook = (book: UnifiedBook) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(book.id);
      localStorage.setItem("plottwist-dismissed", JSON.stringify([...next]));
      return next;
    });
    // Auto-pull next book
    pullBook();
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
            {(selectedGenres.length > 0 || selectedMoods.length > 0 || discoverLang !== "en") &&
          <span className="bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                {selectedGenres.length + selectedMoods.length + (discoverLang !== "en" ? 1 : 0)}
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
                  if (hasPulled) setFilterChangeKey((k) => k + 1);
                  else setRevealedBook(null);
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
          <div className="py-8 flex items-center min-h-[280px] justify-center w-full gap-2">
            {/* Left arrow - go back */}
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
                onAddToWantToRead={addToWantToRead}
                onMarkAsRead={markAsRead}
                onNotInterested={dismissBook}
                isInWantToRead={wantToReadIds.has(revealedBook.id)}
                isRead={readIds.has(revealedBook.id)} /> :

              <motion.div key="lever" exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }}>
                    <PullLever onPull={pullBook} isRevealing={isRevealing} />
                  </motion.div>
              }
              </AnimatePresence>
            </div>

            {/* Right arrow - next / pull new */}
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