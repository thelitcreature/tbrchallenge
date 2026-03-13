import { supabase } from '@/integrations/supabase/client';
import type { GoogleBook } from '@/data/bookTypes';

export async function searchGoogleBooks(
  query: string,
  langRestrict?: string,
  maxResults = 10
): Promise<{ books: GoogleBook[]; totalItems: number }> {
  const { data, error } = await supabase.functions.invoke('search-books', {
    body: { query, langRestrict, maxResults },
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Search failed');
  return { books: data.books, totalItems: data.totalItems };
}
