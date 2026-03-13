import { supabase } from '@/integrations/supabase/client';
import type { AIBook } from '@/data/bookTypes';

export async function getAIRecommendations(
  genres: string[],
  moods: string[],
  language: string,
  excludeIds: string[] = []
): Promise<{ books: AIBook[] }> {
  const { data, error } = await supabase.functions.invoke('recommend-books', {
    body: { genres, moods, language, excludeIds },
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Recommendation failed');
  return { books: data.books };
}
