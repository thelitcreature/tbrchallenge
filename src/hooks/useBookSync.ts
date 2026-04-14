import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TBRBook, BookStatus } from "@/components/TBRList";
import type { UnifiedBook, BookFormat, ReasonForAdding } from "@/data/bookTypes";
import type { Genre, Mood } from "@/data/books";

interface UseBookSyncOptions {
  userId: string | undefined;
  onBooksLoaded: (books: TBRBook[]) => void;
  onDismissedLoaded: (ids: Set<string>) => void;
}

function rowToTBRBook(row: any): TBRBook {
  return {
    id: row.book_id,
    title: row.title,
    author: row.author,
    description: row.description || "",
    tags: row.tags || [],
    genres: (row.genres || []) as Genre[],
    moods: (row.moods || []) as Mood[],
    year: row.year || 0,
    source: row.source as UnifiedBook["source"],
    thumbnail: row.thumbnail,
    language: row.language,
    publisher: row.publisher,
    isbn: row.isbn,
    whyTrending: row.why_trending,
    publishedDate: row.published_date,
    format: row.format as BookFormat | undefined,
    reasonForAdding: row.reason_for_adding as ReasonForAdding | undefined,
    dateAdded: row.date_added,
    isRead: row.is_read,
    status: (row.status as BookStatus) || (row.is_read ? 'read' : 'tbr'),
  };
}

export function useBookSync({ userId, onBooksLoaded, onDismissedLoaded }: UseBookSyncOptions) {
  const loadedRef = useRef(false);

  // Load books from DB
  useEffect(() => {
    if (!userId || loadedRef.current) return;
    loadedRef.current = true;

    const loadData = async () => {
      const [booksRes, dismissedRes] = await Promise.all([
        supabase.from("tbr_books").select("*").eq("user_id", userId),
        supabase.from("dismissed_books").select("book_id").eq("user_id", userId),
      ]);

      if (booksRes.data) {
        onBooksLoaded(booksRes.data.map(rowToTBRBook));
      }
      if (dismissedRes.data) {
        onDismissedLoaded(new Set(dismissedRes.data.map((d: any) => d.book_id)));
      }
    };

    loadData();
  }, [userId]);

  const addBook = useCallback(async (book: TBRBook) => {
    if (!userId) return;
    await supabase.from("tbr_books").upsert({
      user_id: userId,
      book_id: book.id,
      title: book.title,
      author: book.author,
      description: book.description,
      tags: book.tags,
      genres: book.genres,
      moods: book.moods,
      year: book.year,
      source: book.source,
      thumbnail: book.thumbnail,
      language: book.language,
      publisher: book.publisher,
      isbn: book.isbn,
      why_trending: book.whyTrending,
      published_date: book.publishedDate,
      format: book.format,
      reason_for_adding: book.reasonForAdding as any,
      date_added: book.dateAdded,
      is_read: book.isRead,
      status: book.status || (book.isRead ? 'read' : 'tbr'),
    }, { onConflict: "user_id,book_id" });
  }, [userId]);

  const removeBook = useCallback(async (bookId: string) => {
    if (!userId) return;
    await supabase.from("tbr_books").delete().eq("user_id", userId).eq("book_id", bookId);
  }, [userId]);

  const updateBook = useCallback(async (bookId: string, updates: Record<string, any>) => {
    if (!userId) return;
    await supabase.from("tbr_books").update(updates as any).eq("user_id", userId).eq("book_id", bookId);
  }, [userId]);

  const dismissBook = useCallback(async (bookId: string) => {
    if (!userId) return;
    await supabase.from("dismissed_books").upsert({
      user_id: userId,
      book_id: bookId,
    }, { onConflict: "user_id,book_id" });
  }, [userId]);

  return { addBook, removeBook, updateBook, dismissBook };
}
