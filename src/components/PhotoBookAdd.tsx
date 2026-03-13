import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Loader2, Check, X, BookOpenText, Library, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { UnifiedBook } from '@/data/bookTypes';
import { googleBookToUnified } from '@/data/bookTypes';
import { toast } from 'sonner';

interface PhotoBookAddProps {
  onAddBook: (book: UnifiedBook) => void;
  existingIds: Set<string>;
}

interface IdentifiedBook {
  id: string;
  title: string;
  author: string;
  description: string;
  thumbnail: string | null;
  language: string | null;
  publisher: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  categories: string[];
  isbn: string | null;
  confidence: string;
}

type ScanMode = 'single' | 'shelf';

export function PhotoBookAdd({ onAddBook, existingIds }: PhotoBookAddProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('single');
  // Single mode
  const [identifiedBook, setIdentifiedBook] = useState<IdentifiedBook | null>(null);
  // Shelf mode
  const [shelfBooks, setShelfBooks] = useState<IdentifiedBook[]>([]);
  const [addedFromShelf, setAddedFromShelf] = useState<Set<string>>(new Set());

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image too large. Please use a photo under 10MB.');
      return;
    }

    setIsProcessing(true);
    setIdentifiedBook(null);
    setShelfBooks([]);
    setAddedFromShelf(new Set());

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke('identify-book', {
        body: { imageBase64: base64, mimeType: file.type, mode: scanMode },
      });

      if (error) throw new Error(error.message);

      if (!data.success) {
        toast.error(data.error || 'Could not identify books.');
        setPreviewUrl(null);
        return;
      }

      if (scanMode === 'shelf') {
        setShelfBooks(data.books || []);
        const count = data.books?.length || 0;
        toast.success(`Found ${count} book${count !== 1 ? 's' : ''} on your shelf!`);
      } else {
        setIdentifiedBook(data.book);
      }
    } catch (err) {
      console.error('Photo identification error:', err);
      toast.error('Failed to identify book(s). Please try again.');
      setPreviewUrl(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
    e.target.value = '';
  };

  const toUnified = (book: IdentifiedBook): UnifiedBook => {
    return googleBookToUnified({
      id: book.id,
      title: book.title,
      author: book.author,
      description: book.description,
      thumbnail: book.thumbnail,
      language: book.language || 'en',
      publisher: book.publisher || '',
      publishedDate: book.publishedDate || '',
      pageCount: book.pageCount,
      categories: book.categories,
      isbn: book.isbn,
    });
  };

  const addSingleBook = () => {
    if (!identifiedBook) return;
    const bookId = `google-${identifiedBook.id}`;
    if (existingIds.has(bookId)) {
      toast.info('This book is already in your list!');
      return;
    }
    onAddBook(toUnified(identifiedBook));
    toast.success(`Added "${identifiedBook.title}"`);
    dismiss();
  };

  const addShelfBook = (book: IdentifiedBook) => {
    const bookId = `google-${book.id}`;
    if (existingIds.has(bookId) || addedFromShelf.has(book.id)) {
      toast.info(`"${book.title}" is already in your list!`);
      return;
    }
    onAddBook(toUnified(book));
    setAddedFromShelf(prev => new Set(prev).add(book.id));
    toast.success(`Added "${book.title}"`);
  };

  const addAllShelfBooks = () => {
    let added = 0;
    for (const book of shelfBooks) {
      const bookId = `google-${book.id}`;
      if (!existingIds.has(bookId) && !addedFromShelf.has(book.id)) {
        onAddBook(toUnified(book));
        setAddedFromShelf(prev => new Set(prev).add(book.id));
        added++;
      }
    }
    if (added > 0) toast.success(`Added ${added} book${added !== 1 ? 's' : ''} to your list!`);
    else toast.info('All books are already in your list!');
  };

  const dismiss = () => {
    setIdentifiedBook(null);
    setShelfBooks([]);
    setAddedFromShelf(new Set());
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const hasResults = identifiedBook || shelfBooks.length > 0;

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-1 justify-center bg-secondary/50 rounded-full p-1 max-w-xs mx-auto">
        <button
          onClick={() => { setScanMode('single'); dismiss(); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium transition-colors ${
            scanMode === 'single' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Single Book
        </button>
        <button
          onClick={() => { setScanMode('shelf'); dismiss(); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium transition-colors ${
            scanMode === 'shelf' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Library className="w-3.5 h-3.5" />
          Scan Shelf
        </button>
      </div>

      {/* Upload buttons */}
      <div className="flex gap-2 justify-center">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => cameraInputRef.current?.click()}
          disabled={isProcessing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-secondary text-foreground text-sm font-body font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          <Camera className="w-4 h-4" />
          Take Photo
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-secondary text-foreground text-sm font-body font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          Upload Photo
        </motion.button>
      </div>

      {scanMode === 'shelf' && !hasResults && !isProcessing && (
        <p className="text-xs text-muted-foreground text-center font-body">
          Take a photo of your bookshelf — we'll identify all the books we can see!
        </p>
      )}

      {/* Processing / Result card */}
      <AnimatePresence>
        {(isProcessing || hasResults) && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
              {isProcessing ? (
                <div className="flex items-center gap-3 justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <p className="font-body text-sm text-muted-foreground">
                    {scanMode === 'shelf' ? 'Scanning shelf for books…' : 'Identifying book…'}
                  </p>
                </div>
              ) : identifiedBook ? (
                <SingleBookResult
                  book={identifiedBook}
                  onAdd={addSingleBook}
                  onDismiss={dismiss}
                />
              ) : shelfBooks.length > 0 ? (
                <ShelfResults
                  books={shelfBooks}
                  addedIds={addedFromShelf}
                  existingIds={existingIds}
                  onAddBook={addShelfBook}
                  onAddAll={addAllShelfBooks}
                  onDismiss={dismiss}
                />
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SingleBookResult({ book, onAdd, onDismiss }: { book: IdentifiedBook; onAdd: () => void; onDismiss: () => void }) {
  return (
    <>
      <BookRow book={book} />
      <div className="flex gap-2 justify-end">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onDismiss}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
        >
          <X className="w-3 h-3" />
          Wrong book
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Check className="w-3 h-3" />
          Add to list
        </motion.button>
      </div>
    </>
  );
}

function ShelfResults({
  books, addedIds, existingIds, onAddBook, onAddAll, onDismiss,
}: {
  books: IdentifiedBook[];
  addedIds: Set<string>;
  existingIds: Set<string>;
  onAddBook: (book: IdentifiedBook) => void;
  onAddAll: () => void;
  onDismiss: () => void;
}) {
  const unadded = books.filter(b => !addedIds.has(b.id) && !existingIds.has(`google-${b.id}`));

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="font-body text-sm font-medium text-foreground">
          Found {books.length} book{books.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          {unadded.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onAddAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add all ({unadded.length})
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onDismiss}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
          >
            <X className="w-3 h-3" />
            Close
          </motion.button>
        </div>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {books.map((book) => {
          const isAdded = addedIds.has(book.id) || existingIds.has(`google-${book.id}`);
          return (
            <div key={book.id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <BookRow book={book} compact />
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onAddBook(book)}
                disabled={isAdded}
                className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-body font-medium transition-colors ${
                  isAdded
                    ? 'bg-primary/10 text-primary cursor-default'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                {isAdded ? 'Added' : 'Add'}
              </motion.button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function BookRow({ book, compact }: { book: IdentifiedBook; compact?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      {book.thumbnail ? (
        <img
          src={book.thumbnail}
          alt={book.title}
          className={`${compact ? 'w-10 h-14' : 'w-14 h-20'} object-cover rounded-md flex-shrink-0`}
        />
      ) : (
        <div className={`${compact ? 'w-10 h-14' : 'w-14 h-20'} rounded-md bg-secondary flex items-center justify-center flex-shrink-0`}>
          <BookOpenText className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-muted-foreground/40`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className={`font-display ${compact ? 'text-sm' : 'text-base'} font-semibold text-foreground leading-tight truncate`}>
          {book.title}
        </h4>
        <p className={`font-body ${compact ? 'text-xs' : 'text-sm'} text-muted-foreground truncate`}>
          {book.author}
        </p>
        {!compact && book.publishedDate && (
          <p className="font-body text-xs text-muted-foreground/70 mt-0.5">
            {book.publishedDate}
            {book.publisher ? ` · ${book.publisher}` : ''}
          </p>
        )}
        {!compact && book.isbn && (
          <p className="font-body text-xs text-muted-foreground/50 mt-0.5">
            ISBN: {book.isbn}
          </p>
        )}
      </div>
    </div>
  );
}
