import type { Genre, Mood } from './books';

export interface GoogleBook {
  id: string;
  title: string;
  author: string;
  description: string;
  thumbnail: string | null;
  language: string;
  publisher: string;
  publishedDate: string;
  pageCount: number | null;
  categories: string[];
  isbn: string | null;
}

export interface UnifiedBook {
  id: string;
  title: string;
  author: string;
  description: string;
  tags: string[];
  genres: Genre[];
  moods: Mood[];
  year: number;
  source: 'curated' | 'google' | 'manual';
  thumbnail?: string | null;
  language?: string;
  publisher?: string;
  isbn?: string | null;
}

export function googleBookToUnified(gb: GoogleBook): UnifiedBook {
  const categoryTags = gb.categories?.slice(0, 3) || [];
  const langTag = gb.language === 'cs' ? 'Čeština' : gb.language === 'sk' ? 'Slovenčina' : gb.language === 'en' ? 'English' : gb.language;
  const tags = [...categoryTags, langTag].filter(Boolean);

  const yearMatch = gb.publishedDate?.match(/(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

  return {
    id: `google-${gb.id}`,
    title: gb.title,
    author: gb.author,
    description: gb.description?.slice(0, 300) || 'No description available.',
    tags,
    genres: mapCategoriesToGenres(gb.categories),
    moods: [],
    year,
    source: 'google',
    thumbnail: gb.thumbnail,
    language: gb.language,
    publisher: gb.publisher,
    isbn: gb.isbn,
  };
}

function mapCategoriesToGenres(categories: string[]): Genre[] {
  const genres: Genre[] = [];
  const catStr = (categories || []).join(' ').toLowerCase();
  if (catStr.includes('fiction') && !catStr.includes('science fiction')) genres.push('Literary Fiction');
  if (catStr.includes('science fiction') || catStr.includes('sci-fi')) genres.push('Sci-Fi');
  if (catStr.includes('romance')) genres.push('Romance');
  if (catStr.includes('thriller') || catStr.includes('suspense')) genres.push('Thriller');
  if (catStr.includes('fantasy')) genres.push('Fantasy');
  if (catStr.includes('horror')) genres.push('Horror');
  if (catStr.includes('mystery') || catStr.includes('detective')) genres.push('Mystery');
  if (catStr.includes('histor')) genres.push('Historical');
  return genres.length > 0 ? genres : ['Literary Fiction'];
}
