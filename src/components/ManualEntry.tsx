import { useState } from 'react';
import { motion } from 'framer-motion';
import { PenLine } from 'lucide-react';
import type { UnifiedBook } from '@/data/bookTypes';
import { GENRES, MOODS, type Genre, type Mood } from '@/data/books';

interface ManualEntryProps {
  onAdd: (book: UnifiedBook) => void;
}

export function ManualEntry({ onAdd }: ManualEntryProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<Mood[]>([]);

  const handleSubmit = () => {
    if (!title.trim() || !author.trim()) return;
    const book: UnifiedBook = {
      id: `manual-${Date.now()}`,
      title: title.trim(),
      author: author.trim(),
      description: description.trim() || 'No description provided.',
      tags: [...selectedGenres.slice(0, 2), ...selectedMoods.slice(0, 2)],
      genres: selectedGenres.length > 0 ? selectedGenres : ['Literary Fiction'],
      moods: selectedMoods,
      year: new Date().getFullYear(),
      source: 'manual',
    };
    onAdd(book);
    setTitle('');
    setAuthor('');
    setDescription('');
    setSelectedGenres([]);
    setSelectedMoods([]);
    setOpen(false);
  };

  if (!open) {
    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-muted-foreground text-sm font-body font-medium hover:text-foreground transition-colors mx-auto"
      >
        <PenLine className="w-4 h-4" />
        Add manually
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="w-full max-w-md mx-auto bg-card rounded-xl p-5 shadow-card space-y-3"
    >
      <h3 className="font-display text-lg font-semibold text-foreground">Add a book manually</h3>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Book title *"
        maxLength={200}
        className="w-full px-3 py-2 rounded-lg bg-background border border-border font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
      />
      <input
        type="text"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="Author *"
        maxLength={100}
        className="w-full px-3 py-2 rounded-lg bg-background border border-border font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description (optional)"
        maxLength={500}
        rows={2}
        className="w-full px-3 py-2 rounded-lg bg-background border border-border font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
      />

      <div className="space-y-1">
        <p className="text-xs font-body text-muted-foreground">Genre (optional)</p>
        <div className="flex flex-wrap gap-1.5">
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g])}
              className={`px-2.5 py-1 rounded-full text-xs font-body transition-colors ${
                selectedGenres.includes(g)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          disabled={!title.trim() || !author.trim()}
          className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-body font-medium disabled:opacity-50"
        >
          Add to TBR
        </motion.button>
        <button
          onClick={() => setOpen(false)}
          className="px-5 py-2 rounded-full bg-secondary text-muted-foreground text-sm font-body font-medium"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}
