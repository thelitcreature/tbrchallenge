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
  source: 'curated' | 'google' | 'manual' | 'ai';
  thumbnail?: string | null;
  language?: string;
  publisher?: string;
  isbn?: string | null;
  whyTrending?: string;
  publishedDate?: string;
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

export interface AIBook {
  id: string;
  title: string;
  author: string;
  description: string;
  thumbnail: string | null;
  year: number;
  genres: string[];
  moods: string[];
  whyTrending: string;
  publishedDate: string;
  pageCount: number | null;
  categories: string[];
  isbn: string | null;
}

export function aiBookToUnified(ab: AIBook): UnifiedBook {
  const tags = [...(ab.genres || []).slice(0, 2)];
  if (ab.whyTrending) tags.push(ab.whyTrending);

  return {
    id: ab.id.startsWith('ai-') || ab.id.startsWith('google-') ? ab.id : `ai-${ab.id}`,
    title: ab.title,
    author: ab.author,
    description: ab.description?.slice(0, 300) || 'No description available.',
    tags,
    genres: (ab.genres || []).filter((g): g is Genre => VALID_GENRES.includes(g as Genre)) as Genre[],
    moods: (ab.moods || []).filter((m): m is Mood => VALID_MOODS.includes(m as Mood)) as Mood[],
    year: ab.year || new Date().getFullYear(),
    source: 'ai',
    thumbnail: ab.thumbnail,
    isbn: ab.isbn,
    whyTrending: ab.whyTrending,
    publishedDate: ab.publishedDate,
  };
}

const VALID_GENRES: string[] = ['Contemporary', 'Literary Fiction', 'Romance', 'Romantasy', 'Fantasy', 'Sci-Fi', 'Historical', 'Thriller', 'Horror', 'Crime', 'Humor', 'Classics', 'Young Adult', 'Non-Fiction'];
const VALID_MOODS: string[] = ['Lighthearted', 'Emotional', 'Dark', 'Adventurous', 'Thought-provoking', 'Romantic', 'Mysterious', 'Funny', 'Inspiring'];

function mapCategoriesToGenres(categories: string[]): Genre[] {
  const genres: Genre[] = [];
  const catStr = (categories || []).join(' ').toLowerCase();
  if (catStr.includes('science fiction') || catStr.includes('sci-fi')) genres.push('Sci-Fi');
  if (catStr.includes('romance') && catStr.includes('fantasy')) genres.push('Romantasy');
  else if (catStr.includes('romance')) genres.push('Romance');
  if (catStr.includes('thriller') || catStr.includes('suspense')) genres.push('Thriller');
  if (catStr.includes('fantasy') && !catStr.includes('romance')) genres.push('Fantasy');
  if (catStr.includes('horror')) genres.push('Horror');
  if (catStr.includes('mystery') || catStr.includes('detective') || catStr.includes('crime')) genres.push('Crime');
  if (catStr.includes('histor')) genres.push('Historical');
  if (catStr.includes('humor') || catStr.includes('comedy')) genres.push('Humor');
  if (catStr.includes('young adult') || catStr.includes('ya ')) genres.push('Young Adult');
  if (catStr.includes('classic')) genres.push('Classics');
  if (catStr.includes('contemporary')) genres.push('Contemporary');
  if (catStr.includes('nonfiction') || catStr.includes('non-fiction') || catStr.includes('science') || catStr.includes('business') || catStr.includes('psychology') || catStr.includes('philosophy') || catStr.includes('self-help') || catStr.includes('biography') || catStr.includes('memoir')) genres.push('Non-Fiction');
  if (catStr.includes('fiction') && !catStr.includes('science fiction') && !catStr.includes('nonfiction') && !catStr.includes('non-fiction')) genres.push('Literary Fiction');
  return genres.length > 0 ? genres : ['Literary Fiction'];
}
