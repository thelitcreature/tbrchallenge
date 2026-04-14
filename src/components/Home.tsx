import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpenText, Clock, Trophy } from 'lucide-react';
import type { TBRBook } from '@/components/TBRList';
import { getBookStatus } from '@/components/TBRList';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ShelfChallenge {
  bookId: string;
  startDate: string;
  deadline: string;
}

interface BanData {
  startDate: string;
  duration: number;
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

interface HomeProps {
  ownedBooks: TBRBook[];
  readBooks: TBRBook[];
  allBooks: TBRBook[];
  onMarkAsRead: (id: string) => void;
  onSwitchToChallenges: () => void;
  nightstandIds: Set<string>;
  onToggleNightstand: (id: string) => void;
}

const anim = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay },
});

// ---------- Currently Reading ----------
function CurrentlyReading({ allBooks, onMarkAsRead }: { allBooks: TBRBook[]; onMarkAsRead: (id: string) => void }) {
  const readingBooks = useMemo(
    () => allBooks.filter(b => getBookStatus(b) === 'currently_reading'),
    [allBooks]
  );

  if (readingBooks.length === 0) {
    return (
      <motion.div {...anim(0)}>
        <Card className="rounded-xl shadow-card border-0">
          <CardContent className="p-5">
            <h2 className="font-display text-base font-semibold text-foreground mb-2">📖 Currently Reading</h2>
            <p className="font-body text-sm text-muted-foreground">No books currently being read. Start reading one from your TBR!</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div {...anim(0)}>
      <Card className="rounded-xl shadow-card border-0 overflow-hidden">
        <CardContent className="p-5 space-y-3">
          <h2 className="font-display text-base font-semibold text-foreground">📖 Currently Reading</h2>
          {readingBooks.map(book => {
            const daysAgo = Math.floor((Date.now() - new Date(book.dateAdded).getTime()) / 86400000);
            return (
              <div key={book.id} className="flex gap-3">
                {book.thumbnail ? (
                  <img src={book.thumbnail} alt={book.title} className="w-14 h-20 object-cover rounded-lg flex-shrink-0 shadow-sm" />
                ) : (
                  <div className="w-14 h-20 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <BookOpenText className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-display text-sm font-semibold text-foreground truncate">{book.title}</p>
                  <p className="font-body text-xs text-muted-foreground">{book.author}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span className="font-body text-xs text-primary font-semibold">Started {daysAgo} day{daysAgo !== 1 ? 's' : ''} ago</span>
                  </div>
                  <Button size="sm" className="mt-2 h-7 text-xs" onClick={() => onMarkAsRead(book.id)}>
                    Mark as read
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------- Stats ----------
function MonthlyStats({ readBooks, ownedCount }: { readBooks: TBRBook[]; ownedCount: number }) {
  const readThisMonth = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return readBooks.filter(b => {
      const d = new Date(b.dateAdded);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;
  }, [readBooks]);

  return (
    <motion.div {...anim(0.1)}>
      <Card className="rounded-xl shadow-card border-0">
        <CardContent className="p-5">
          <h2 className="font-display text-base font-semibold text-foreground mb-3">📊 My Stats this month</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="font-display text-3xl font-bold text-primary">{readThisMonth}</p>
              <p className="font-body text-xs text-muted-foreground">Read this month</p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl font-bold text-foreground">{ownedCount}</p>
              <p className="font-body text-xs text-muted-foreground">On TBR</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------- Active Challenges Summary ----------
function ActiveChallenges({ onSwitchToChallenges }: { onSwitchToChallenges: () => void }) {
  const challenges: { emoji: string; label: string; daysLeft: number }[] = [];

  const shelf = loadJSON<ShelfChallenge | null>('pt-shelf-challenge', null);
  if (shelf) {
    const d = Math.max(0, Math.ceil((new Date(shelf.deadline).getTime() - Date.now()) / 86400000));
    if (d > 0) challenges.push({ emoji: '📚', label: 'Shop Your Shelf', daysLeft: d });
  }

  const ban = loadJSON<BanData | null>('pt-buying-ban', null);
  if (ban) {
    const end = new Date(new Date(ban.startDate).getTime() + ban.duration * 86400000);
    const d = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
    if (d > 0) challenges.push({ emoji: '🚫', label: 'Book Buying Ban', daysLeft: d });
  }

  if (challenges.length === 0) return null;

  return (
    <motion.div {...anim(0.15)}>
      <h2 className="font-display text-base font-semibold text-foreground mb-2">🏆 Active Challenges</h2>
      <div className="flex gap-2 flex-wrap">
        {challenges.map(c => (
          <button
            key={c.label}
            onClick={onSwitchToChallenges}
            className="bg-card rounded-xl shadow-card px-4 py-3 flex items-center gap-2 hover:bg-secondary/50 transition-colors text-left"
          >
            <span className="text-lg">{c.emoji}</span>
            <div>
              <p className="font-body text-xs font-semibold text-foreground">{c.label}</p>
              <p className="font-body text-[11px] text-primary font-medium">{c.daysLeft} days left</p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ---------- Nightstand ----------
function Nightstand({ ownedBooks, nightstandIds }: { ownedBooks: TBRBook[]; nightstandIds: Set<string> }) {
  const nightstandBooks = useMemo(
    () => ownedBooks.filter(b => nightstandIds.has(b.id)).slice(0, 5),
    [ownedBooks, nightstandIds]
  );

  if (nightstandBooks.length === 0) return null;

  return (
    <motion.div {...anim(0.2)}>
      <h2 className="font-display text-base font-semibold text-foreground mb-2">🕯️ Nightstand</h2>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-2">
          {nightstandBooks.map(book => (
            <div key={book.id} className="flex-shrink-0 w-20 space-y-1">
              {book.thumbnail ? (
                <img src={book.thumbnail} alt={book.title} className="w-20 h-28 object-cover rounded-lg shadow-sm" />
              ) : (
                <div className="w-20 h-28 rounded-lg bg-secondary flex items-center justify-center">
                  <BookOpenText className="w-6 h-6 text-muted-foreground/40" />
                </div>
              )}
              <p className="font-body text-[10px] text-foreground truncate text-center">{book.title}</p>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </motion.div>
  );
}

// ---------- TBR Intervention ----------
function TBRIntervention({ count }: { count: number }) {
  if (count <= 20) return null;
  return (
    <motion.div {...anim(0.25)}>
      <p className="font-body text-xs text-muted-foreground text-center italic px-4">
        Your TBR has {count} books. Maybe today is not the day to buy another one. 📚
      </p>
    </motion.div>
  );
}

// ---------- Main ----------
export function Home({ ownedBooks, readBooks, allBooks, onMarkAsRead, onSwitchToChallenges, nightstandIds, onToggleNightstand }: HomeProps) {
  return (
    <div className="space-y-5">
      <CurrentlyReading allBooks={allBooks} onMarkAsRead={onMarkAsRead} />
      <MonthlyStats readBooks={readBooks} ownedCount={ownedBooks.length} />
      <ActiveChallenges onSwitchToChallenges={onSwitchToChallenges} />
      <Nightstand ownedBooks={ownedBooks} nightstandIds={nightstandIds} />
      <TBRIntervention count={ownedBooks.length} />
    </div>
  );
}
