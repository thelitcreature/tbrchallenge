import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Shuffle, Check, X, ShoppingCart, Ban, BookOpen, Clock, Flame } from 'lucide-react';
import type { TBRBook } from '@/components/TBRList';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ChallengesProps {
  books: TBRBook[];
  readBooks: TBRBook[];
}

// localStorage helpers
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function saveJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

const cardAnim = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

// ---------- Guilt Meter ----------
function GuiltMeter({ books }: { books: TBRBook[] }) {
  const oldest = useMemo(() => {
    if (books.length === 0) return null;
    return books.reduce((a, b) => (a.dateAdded < b.dateAdded ? a : b));
  }, [books]);

  const daysSince = oldest
    ? Math.floor((Date.now() - new Date(oldest.dateAdded).getTime()) / 86400000)
    : 0;

  return (
    <motion.div {...cardAnim} className="bg-card rounded-xl shadow-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Flame className="w-5 h-5 text-primary" />
        <h3 className="font-display text-base font-semibold text-foreground">TBR Guilt Meter</h3>
      </div>
      <div className="flex justify-between font-body text-sm text-muted-foreground">
        <span>📚 {books.length} unread {books.length === 1 ? 'book' : 'books'}</span>
        {oldest && <span>⏳ Oldest waiting {daysSince}d</span>}
      </div>
      <Progress value={Math.min(books.length * 5, 100)} className="h-2" />
    </motion.div>
  );
}

// ---------- Shop Your Shelf ----------
interface ShelfChallenge {
  bookId: string;
  startDate: string;
  deadline: string;
}

function formatReasonText(book: TBRBook): string | null {
  if (!book.reasonForAdding) return null;
  const reason = typeof book.reasonForAdding === 'object' && 'reason' in (book.reasonForAdding as any)
    ? (book.reasonForAdding as any).reason
    : null;
  if (!reason) return null;
  const daysAgo = Math.floor((Date.now() - new Date(book.dateAdded).getTime()) / 86400000);
  return `Added because: ${reason} • ${daysAgo}d ago`;
}

interface CompletedChallenge {
  bookId: string;
  bookTitle: string;
}

function ShopYourShelf({ books, readBooks }: ChallengesProps) {
  const [challenge, setChallenge] = useState<ShelfChallenge | null>(() => loadJSON('pt-shelf-challenge', null));
  const [pickedBook, setPickedBook] = useState<TBRBook | null>(null);
  const [earned, setEarned] = useState(() => loadJSON<string[]>('pt-shelf-badges', []));
  const [completed, setCompleted] = useState<CompletedChallenge | null>(null);

  const pickRandom = useCallback(() => {
    if (books.length === 0) return;
    const b = books[Math.floor(Math.random() * books.length)];
    setPickedBook(b);
  }, [books]);

  useEffect(() => {
    if (!pickedBook && !challenge && !completed && books.length > 0) pickRandom();
  }, [books.length]);

  const accept = () => {
    if (!pickedBook) return;
    const now = new Date();
    const deadline = new Date(now.getTime() + 14 * 86400000);
    const c: ShelfChallenge = { bookId: pickedBook.id, startDate: now.toISOString(), deadline: deadline.toISOString() };
    setChallenge(c);
    saveJSON('pt-shelf-challenge', c);
  };

  // Check completion — show completion state instead of auto-clearing
  useEffect(() => {
    if (!challenge) return;
    const isRead = readBooks.some(b => b.id === challenge.bookId);
    const inTime = new Date() <= new Date(challenge.deadline);
    if (isRead) {
      const book = readBooks.find(b => b.id === challenge.bookId);
      if (inTime) {
        setEarned(prev => {
          const next = [...new Set([...prev, challenge.bookId])];
          saveJSON('pt-shelf-badges', next);
          return next;
        });
        setCompleted({ bookId: challenge.bookId, bookTitle: book?.title || 'Unknown' });
      }
      setChallenge(null);
      localStorage.removeItem('pt-shelf-challenge');
    } else if (!inTime) {
      setChallenge(null);
      localStorage.removeItem('pt-shelf-challenge');
    }
  }, [challenge, readBooks]);

  const startNew = () => {
    setCompleted(null);
    pickRandom();
  };

  const challengeBook = challenge ? books.find(b => b.id === challenge.bookId) || readBooks.find(b => b.id === challenge.bookId) : null;
  const daysLeft = challenge ? Math.max(0, Math.ceil((new Date(challenge.deadline).getTime() - Date.now()) / 86400000)) : 0;

  const reasonText = pickedBook ? formatReasonText(pickedBook) : null;

  return (
    <motion.div {...cardAnim} transition={{ ...cardAnim.transition, delay: 0.1 }}>
      <Card className="rounded-xl shadow-card border-0 overflow-hidden">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="font-display text-base font-semibold text-foreground">Shop Your Shelf</h3>
            {earned.length > 0 && <Badge variant="secondary" className="text-xs">🏆 ×{earned.length}</Badge>}
          </div>
          <p className="font-body text-sm text-muted-foreground">Read a random book from your TBR in 14 days.</p>

          {completed ? (
            <div className="bg-secondary/50 rounded-lg p-3 text-center space-y-2">
              <p className="font-display text-lg font-semibold text-foreground">🏆 Challenge completed!</p>
              <p className="font-body text-sm text-muted-foreground">You read <span className="font-semibold text-foreground">{completed.bookTitle}</span></p>
              <Button size="sm" onClick={startNew}>Start new challenge</Button>
            </div>
          ) : challenge && challengeBook ? (
            <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
              <p className="font-body text-sm font-medium text-foreground">📖 {challengeBook.title}</p>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-body text-sm text-primary font-semibold">{daysLeft} days remaining</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => { setChallenge(null); localStorage.removeItem('pt-shelf-challenge'); }}>
                Cancel challenge
              </Button>
            </div>
          ) : pickedBook ? (
            <div className="space-y-3">
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="font-body text-sm font-medium text-foreground">{pickedBook.title}</p>
                <p className="font-body text-xs text-muted-foreground">{pickedBook.author}</p>
                {reasonText && (
                  <p className="font-body text-xs text-muted-foreground/70 mt-1 italic">{reasonText}</p>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={accept} className="gap-1"><Check className="w-3.5 h-3.5" /> Accept</Button>
                <Button size="sm" variant="outline" onClick={pickRandom} className="gap-1"><Shuffle className="w-3.5 h-3.5" /> Another</Button>
                <Button size="sm" variant="ghost" onClick={() => setPickedBook(null)} className="gap-1"><X className="w-3.5 h-3.5" /> Dismiss</Button>
              </div>
            </div>
          ) : books.length > 0 ? (
            <Button size="sm" onClick={pickRandom}>Pick a book</Button>
          ) : (
            <p className="font-body text-sm text-muted-foreground italic">Add unread books to your TBR first.</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------- Read Before You Buy ----------
type RatioMode = '1:1' | '2:1' | '3:1';

function ReadBeforeYouBuy({ readBooks }: { readBooks: TBRBook[] }) {
  const [ratio, setRatio] = useState<RatioMode>(() => loadJSON('pt-ratio-mode', '1:1'));

  const divisor = ratio === '3:1' ? 3 : ratio === '2:1' ? 2 : 1;
  const canBuy = Math.floor(readBooks.length / divisor);

  useEffect(() => { saveJSON('pt-ratio-mode', ratio); }, [ratio]);

  return (
    <motion.div {...cardAnim} transition={{ ...cardAnim.transition, delay: 0.2 }}>
      <Card className="rounded-xl shadow-card border-0 overflow-hidden">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h3 className="font-display text-base font-semibold text-foreground">Read Before You Buy</h3>
          </div>
          <p className="font-body text-sm text-muted-foreground">Track your read-to-buy ratio and earn shopping credits.</p>

          <div className="flex gap-2">
            {(['1:1', '2:1', '3:1'] as RatioMode[]).map(r => (
              <Button
                key={r}
                size="sm"
                variant={ratio === r ? 'default' : 'outline'}
                onClick={() => setRatio(r)}
                className="text-xs"
              >
                {r} {r === '3:1' && '🔥'}
              </Button>
            ))}
          </div>

          <div className="bg-secondary/50 rounded-lg p-3 space-y-1">
            <p className="font-body text-sm text-foreground">📚 Read from TBR: <span className="font-semibold text-primary">{readBooks.length}</span></p>
            <p className="font-body text-sm text-foreground">🛒 You can buy: <span className="font-semibold text-primary">{canBuy} {canBuy === 1 ? 'book' : 'books'}</span></p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------- Book Buying Ban ----------
interface BanData {
  startDate: string;
  duration: number; // days
}

function BookBuyingBan({ readBooks }: { readBooks: TBRBook[] }) {
  const [ban, setBan] = useState<BanData | null>(() => loadJSON('pt-buying-ban', null));
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const activate = (days: number) => {
    const b: BanData = { startDate: new Date().toISOString(), duration: days };
    setBan(b);
    saveJSON('pt-buying-ban', b);
  };

  const endDate = ban ? new Date(new Date(ban.startDate).getTime() + ban.duration * 86400000) : null;
  const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - now) / 86400000)) : 0;
  const isActive = ban && daysLeft > 0;

  // Books read during the ban
  const booksReadDuringBan = ban
    ? readBooks.filter(b => {
        const readDate = new Date(b.dateAdded).getTime();
        const banStart = new Date(ban.startDate).getTime();
        return readDate >= banStart;
      }).length
    : 0;

  const survived = ban && daysLeft === 0;

  return (
    <motion.div {...cardAnim} transition={{ ...cardAnim.transition, delay: 0.3 }}>
      <Card className="rounded-xl shadow-card border-0 overflow-hidden">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-primary" />
            <h3 className="font-display text-base font-semibold text-foreground">Book Buying Ban</h3>
          </div>
          <p className="font-body text-sm text-muted-foreground">Challenge yourself to stop buying and start reading.</p>

          {survived ? (
            <div className="bg-secondary/50 rounded-lg p-3 text-center space-y-1">
              <p className="font-display text-lg font-semibold text-foreground">Ban survived! 🏆</p>
              <p className="font-body text-sm text-muted-foreground">You read {booksReadDuringBan} {booksReadDuringBan === 1 ? 'book' : 'books'} during the ban.</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => { setBan(null); localStorage.removeItem('pt-buying-ban'); }}>
                Start new ban
              </Button>
            </div>
          ) : isActive ? (
            <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
              <p className="font-body text-sm font-semibold text-foreground">🚫 {daysLeft} {daysLeft === 1 ? 'day' : 'days'} remaining</p>
              {booksReadDuringBan > 0 && (
                <p className="font-body text-xs text-muted-foreground">📖 Read {booksReadDuringBan} book{booksReadDuringBan !== 1 ? 's' : ''} so far — keep going!</p>
              )}
              <p className="font-body text-xs text-muted-foreground italic">💡 Read a book from your TBR to make the ban worthwhile.</p>
              <Button size="sm" variant="ghost" onClick={() => { setBan(null); localStorage.removeItem('pt-buying-ban'); }}>
                Break ban
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {[7, 14, 21, 30].map(d => (
                <Button key={d} size="sm" variant="outline" onClick={() => activate(d)}>
                  {d} days
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------- Main ----------
export function Challenges({ books, readBooks }: ChallengesProps) {
  return (
    <div className="space-y-4">
      <GuiltMeter books={books} />
      <ShopYourShelf books={books} readBooks={readBooks} />
      <ReadBeforeYouBuy readBooks={readBooks} />
      <BookBuyingBan readBooks={readBooks} />
    </div>
  );
}
