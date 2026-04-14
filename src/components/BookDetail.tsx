import { useState } from 'react';
import { format } from 'date-fns';
import type { BookFormat } from '@/data/bookTypes';
import type { TBRBook, BookStatus } from '@/components/TBRList';
import { getBookStatus } from '@/components/TBRList';
import { GENRES, MOODS, type Genre, type Mood } from '@/data/books';
import {
  ArrowLeft, BookOpen, Book, Headphones, Tablet,
  BookOpenText, Check, Bookmark, Trash2, X, Plus, PlayCircle, Ban, BookMarked,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

const FORMATS: { value: BookFormat; label: string; icon: React.ReactNode }[] = [
  { value: 'paperback', label: 'Paperback', icon: <BookOpen className="w-4 h-4" /> },
  { value: 'hardback', label: 'Hardback', icon: <Book className="w-4 h-4" /> },
  { value: 'ebook', label: 'E-book', icon: <Tablet className="w-4 h-4" /> },
  { value: 'audiobook', label: 'Audiobook', icon: <Headphones className="w-4 h-4" /> },
];

const STATUS_LABELS: Record<BookStatus, { label: string; emoji: string; className: string }> = {
  tbr: { label: 'TBR', emoji: '📚', className: 'bg-secondary text-muted-foreground' },
  currently_reading: { label: 'Reading', emoji: '📖', className: 'bg-primary/15 text-primary' },
  read: { label: 'Read', emoji: '✓', className: 'bg-accent/15 text-accent' },
  dnf: { label: 'DNF', emoji: '🚫', className: 'bg-destructive/10 text-destructive' },
};

interface BookDetailProps {
  book: TBRBook | null;
  open: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
  onUpdateStatus?: (id: string, status: BookStatus) => void;
  onUpdateFormat?: (id: string, format: BookFormat | undefined) => void;
  onUpdateGenres?: (id: string, genres: Genre[]) => void;
  onUpdateMoods?: (id: string, moods: Mood[]) => void;
  nightstandIds?: Set<string>;
  onToggleNightstand?: (id: string) => void;
}

export function BookDetail({
  book, open, onClose, onRemove, onMarkAsRead, onUpdateStatus,
  onUpdateFormat, onUpdateGenres, onUpdateMoods,
  nightstandIds, onToggleNightstand,
}: BookDetailProps) {
  if (!book) return null;

  const status = getBookStatus(book);
  const statusInfo = STATUS_LABELS[status];
  const isNightstand = nightstandIds?.has(book.id) ?? false;
  const reasonText = book.reasonForAdding
    ? (book.reasonForAdding.reason === 'Other' && book.reasonForAdding.customText
      ? book.reasonForAdding.customText
      : book.reasonForAdding.reason)
    : null;

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-hidden border-l">
        <ScrollArea className="h-full">
          {/* Cover hero */}
          <div className="relative w-full aspect-[3/2] bg-secondary overflow-hidden">
            {book.thumbnail ? (
              <img src={book.thumbnail} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpenText className="w-16 h-16 text-muted-foreground/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            {/* Back button */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-2 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background transition-colors z-10"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            {/* Status pill */}
            <div className="absolute top-4 right-4 z-10">
              <span className={cn("px-2.5 py-1 rounded-full text-xs font-body font-medium", statusInfo.className)}>
                {statusInfo.emoji} {statusInfo.label}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 pb-8 -mt-12 relative z-10 space-y-5">
            {/* Title & Author */}
            <div className="space-y-1">
              <h2 className="font-display text-2xl font-bold text-foreground leading-tight">{book.title}</h2>
              <p className="font-body text-base text-muted-foreground">{book.author}</p>
              <p className="font-body text-xs text-muted-foreground/70">
                Added {format(new Date(book.dateAdded), 'MMM d, yyyy')}
                {reasonText && <> · Because: {reasonText}</>}
              </p>
            </div>

            {/* Genre tags */}
            <TagSection
              label="Genres"
              tags={book.genres}
              allOptions={GENRES}
              onUpdate={onUpdateGenres ? (tags) => onUpdateGenres(book.id, tags as Genre[]) : undefined}
            />

            {/* Mood tags */}
            <TagSection
              label="Moods"
              tags={book.moods}
              allOptions={MOODS}
              onUpdate={onUpdateMoods ? (tags) => onUpdateMoods(book.id, tags as Mood[]) : undefined}
            />

            {/* Format selector */}
            <div className="space-y-2">
              <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Format</p>
              <div className="flex gap-2 flex-wrap">
                {FORMATS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => onUpdateFormat?.(book.id, book.format === f.value ? undefined : f.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium transition-colors",
                      book.format === f.value
                        ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                        : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                    )}
                  >
                    {f.icon}
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            {book.description && (
              <div className="space-y-2">
                <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">About</p>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{book.description}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              {status === 'tbr' && onUpdateStatus && (
                <button
                  onClick={() => onUpdateStatus(book.id, 'currently_reading')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-body text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <PlayCircle className="w-4 h-4" /> Start reading
                </button>
              )}
              {status !== 'read' && onMarkAsRead && (
                <button
                  onClick={() => { onMarkAsRead(book.id); onClose(); }}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-body text-sm font-medium transition-colors",
                    status === 'tbr'
                      ? "bg-secondary text-foreground hover:bg-secondary/80"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  <Check className="w-4 h-4" /> Mark as read
                </button>
              )}
              {status !== 'dnf' && status !== 'read' && onUpdateStatus && (
                <button
                  onClick={() => { onUpdateStatus(book.id, 'dnf'); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary text-muted-foreground font-body text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  <Ban className="w-4 h-4" /> Mark as DNF
                </button>
              )}
              {(status === 'read' || status === 'dnf' || status === 'currently_reading') && onUpdateStatus && (
                <button
                  onClick={() => onUpdateStatus(book.id, 'tbr')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary text-foreground font-body text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  <BookMarked className="w-4 h-4" /> Move back to TBR
                </button>
              )}
              {!book.isRead && onToggleNightstand && (
                <button
                  onClick={() => onToggleNightstand(book.id)}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-body text-sm font-medium transition-colors",
                    isNightstand
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  )}
                >
                  <Bookmark className="w-4 h-4" />
                  {isNightstand ? 'Remove from Nightstand' : 'Add to Nightstand'}
                </button>
              )}
              <button
                onClick={() => { onRemove(book.id); onClose(); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-destructive/10 text-destructive font-body text-sm font-medium hover:bg-destructive/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Remove from TBR
              </button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

/* ── Tag Section with add/remove ── */

function TagSection({ label, tags, allOptions, onUpdate }: {
  label: string;
  tags: string[];
  allOptions: readonly string[];
  onUpdate?: (tags: string[]) => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const available = allOptions.filter(o => !tags.includes(o));

  return (
    <div className="space-y-1.5">
      <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <button
            key={tag}
            onClick={() => onUpdate?.(tags.filter(t => t !== tag))}
            className="group flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-body font-medium hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            {tag}
            {onUpdate && <X className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
          </button>
        ))}
        {onUpdate && available.length > 0 && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/50 text-muted-foreground/70 text-xs font-body hover:bg-secondary hover:text-foreground transition-colors">
                <Plus className="w-3 h-3" /> Add
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <ScrollArea className="max-h-48">
                <div className="flex flex-wrap gap-1">
                  {available.map(opt => (
                    <button
                      key={opt}
                      onClick={() => {
                        onUpdate([...tags, opt]);
                        setPopoverOpen(false);
                      }}
                      className="px-2.5 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-body hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        )}
        {tags.length === 0 && !onUpdate && (
          <span className="font-body text-xs text-muted-foreground/50 italic">None</span>
        )}
      </div>
    </div>
  );
}
