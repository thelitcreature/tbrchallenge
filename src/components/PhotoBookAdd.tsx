import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Loader2, Check, X, BookOpenText } from 'lucide-react';
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

export function PhotoBookAdd({ onAddBook, existingIds }: PhotoBookAddProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [identifiedBook, setIdentifiedBook] = useState<IdentifiedBook | null>(null);
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

    // Show preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      // Convert to base64
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke('identify-book', {
        body: { imageBase64: base64, mimeType: file.type },
      });

      if (error) throw new Error(error.message);

      if (!data.success) {
        toast.error(data.error || 'Could not identify the book.');
        setPreviewUrl(null);
        return;
      }

      setIdentifiedBook(data.book);
    } catch (err) {
      console.error('Photo identification error:', err);
      toast.error('Failed to identify book. Please try again.');
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

  const addIdentifiedBook = () => {
    if (!identifiedBook) return;

    const bookId = `google-${identifiedBook.id}`;
    if (existingIds.has(bookId)) {
      toast.info('This book is already in your list!');
      return;
    }

    const unified = googleBookToUnified({
      id: identifiedBook.id,
      title: identifiedBook.title,
      author: identifiedBook.author,
      description: identifiedBook.description,
      thumbnail: identifiedBook.thumbnail,
      language: identifiedBook.language || 'en',
      publisher: identifiedBook.publisher || '',
      publishedDate: identifiedBook.publishedDate || '',
      pageCount: identifiedBook.pageCount,
      categories: identifiedBook.categories,
      isbn: identifiedBook.isbn,
    });

    onAddBook(unified);
    toast.success(`Added "${identifiedBook.title}" to your list!`);
    dismiss();
  };

  const dismiss = () => {
    setIdentifiedBook(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <div className="space-y-3">
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

      {/* Processing / Result card */}
      <AnimatePresence>
        {(isProcessing || identifiedBook) && (
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
                  <p className="font-body text-sm text-muted-foreground">Identifying book…</p>
                </div>
              ) : identifiedBook ? (
                <>
                  <div className="flex items-start gap-3">
                    {identifiedBook.thumbnail ? (
                      <img
                        src={identifiedBook.thumbnail}
                        alt={identifiedBook.title}
                        className="w-14 h-20 object-cover rounded-md flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-20 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                        <BookOpenText className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display text-base font-semibold text-foreground leading-tight">
                        {identifiedBook.title}
                      </h4>
                      <p className="font-body text-sm text-muted-foreground">
                        {identifiedBook.author}
                      </p>
                      {identifiedBook.publishedDate && (
                        <p className="font-body text-xs text-muted-foreground/70 mt-0.5">
                          {identifiedBook.publishedDate}
                          {identifiedBook.publisher ? ` · ${identifiedBook.publisher}` : ''}
                        </p>
                      )}
                      {identifiedBook.isbn && (
                        <p className="font-body text-xs text-muted-foreground/50 mt-0.5">
                          ISBN: {identifiedBook.isbn}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={dismiss}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Wrong book
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={addIdentifiedBook}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      Add to list
                    </motion.button>
                  </div>
                </>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
