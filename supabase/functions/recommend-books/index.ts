const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { genres, moods, language, excludeIds } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isClassics = (genres || []).includes('Classics');
    const langLabel = language === 'cs' ? 'Czech' : language === 'sk' ? 'Slovak' : 'English';
    const langInstruction = language === 'cs' || language === 'sk'
      ? `Books should be available in ${langLabel} translation or originally written in ${langLabel}. Provide titles in ${langLabel} if a known translation exists, otherwise use the original title.`
      : 'Provide titles in English.';

    const yearConstraint = isClassics
      ? 'Focus on classic literature from any era.'
      : 'IMPORTANT: Only recommend books published after 2020. Focus on 2022-2026 releases. Prioritize books that are trending on BookTok (TikTok), Bookstagram (Instagram), recent bestseller lists (NYT, Sunday Times), and books that went viral on social media.';

    const genreText = (genres || []).length > 0
      ? `Genres: ${genres.join(', ')}.`
      : 'Any fiction genre.';

    const moodText = (moods || []).length > 0
      ? `The reader is in the mood for something: ${moods.join(', ')}.`
      : '';

    const excludeText = (excludeIds || []).length > 0
      ? `Do NOT include any of these books (already shown): ${excludeIds.join(', ')}.`
      : '';

    const prompt = `You are a book recommendation expert who stays up-to-date with BookTok trends, Bookstagram favorites, bestseller lists, and new releases from major publishers.

Recommend exactly 15 books based on these criteria:
${genreText}
${moodText}
${yearConstraint}
${langInstruction}
${excludeText}

For each book, provide a JSON array with objects containing:
- "title": the book title
- "author": the author's full name
- "year": publication year (number)
- "description": a compelling 2-3 sentence description that would make a reader want to pick it up (no spoilers)
- "genres": array of 1-3 genre tags
- "moods": array of 1-3 mood tags (e.g. "dark", "emotional", "lighthearted", "adventurous", "romantic", "thought-provoking")
- "whyTrending": one short sentence about why this book is popular (e.g. "BookTok sensation with 2M+ views", "NYT #1 Bestseller 2024", "Winner of Booker Prize 2023")

Respond ONLY with the JSON array, no markdown, no explanation.`;

    console.log('Requesting AI recommendations...');

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 1.0,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: `AI request failed: ${aiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from response (handle potential markdown wrapping)
    let books;
    try {
      const jsonStr = content.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
      books = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse recommendations' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(books)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid recommendation format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enrich with Google Books covers
    const enriched = await Promise.all(
      books.slice(0, 15).map(async (book: any) => {
        try {
          const q = encodeURIComponent(`intitle:${book.title} inauthor:${book.author}`);
          const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&printType=books`;
          const gbRes = await fetch(gbUrl);
          const gbData = await gbRes.json();
          const item = gbData.items?.[0];
          const info = item?.volumeInfo || {};

          return {
            id: item?.id || `ai-${book.title.replace(/\s+/g, '-').toLowerCase()}`,
            title: book.title,
            author: book.author,
            description: book.description,
            thumbnail: info.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
            year: book.year,
            genres: book.genres || [],
            moods: book.moods || [],
            whyTrending: book.whyTrending || '',
            publishedDate: info.publishedDate || String(book.year),
            pageCount: info.pageCount || null,
            categories: info.categories || [],
            isbn: ((info.industryIdentifiers || []).find((id: any) => id.type === 'ISBN_13') ||
                   (info.industryIdentifiers || []).find((id: any) => id.type === 'ISBN_10'))?.identifier || null,
          };
        } catch (err) {
          console.error(`Failed to enrich "${book.title}":`, err);
          return {
            id: `ai-${book.title.replace(/\s+/g, '-').toLowerCase()}`,
            title: book.title,
            author: book.author,
            description: book.description,
            thumbnail: null,
            year: book.year,
            genres: book.genres || [],
            moods: book.moods || [],
            whyTrending: book.whyTrending || '',
            publishedDate: String(book.year),
            pageCount: null,
            categories: [],
            isbn: null,
          };
        }
      })
    );

    console.log(`Returning ${enriched.length} AI recommendations`);

    return new Response(
      JSON.stringify({ success: true, books: enriched }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Recommendation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});