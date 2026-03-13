import { supabase } from '@/integrations/supabase/client';
import type { AIBook } from '@/data/bookTypes';

export async function getAIRecommendations(
  genres: string[],
  moods: string[],
  languages: string[],
  excludeIds: string[] = []
): Promise<{ books: AIBook[] }> {
  const { data, error } = await supabase.functions.invoke('recommend-books', {
    body: { genres, moods, languages, excludeIds },
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Recommendation failed');
  return { books: data.books };
}
