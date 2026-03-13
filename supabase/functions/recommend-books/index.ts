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
    const { genres, moods, languages, excludeIds } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const langs: string[] = languages || ['en'];
    const isClassics = (genres || []).includes('Classics');

    // Build language instruction
    const hasCzech = langs.includes('cs');
    const hasSlovak = langs.includes('sk');
    const hasEnglish = langs.includes('en');

    let langInstruction = '';
    if (hasCzech && hasSlovak && hasEnglish) {
      langInstruction = 'Include a mix of: English-language books, books by Czech authors, books by Slovak authors, and books that have been translated to Czech or Slovak. Provide titles in their original language.';
    } else if (hasCzech && hasSlovak) {
      langInstruction = 'Focus on books by Czech and Slovak authors, and books that have been translated to Czech or Slovak. Include both Czech and Slovak literature. Provide titles in Czech or Slovak if a known translation exists, otherwise use the original title.';
    } else if (hasCzech && hasEnglish) {
      langInstruction = 'Include a mix of English-language books and books by Czech authors or books translated to Czech. Provide titles in Czech if a known translation exists, otherwise use the original English title.';
    } else if (hasSlovak && hasEnglish) {
      langInstruction = 'Include a mix of English-language books and books by Slovak authors or books translated to Slovak. Provide titles in Slovak if a known translation exists, otherwise use the original English title.';
    } else if (hasCzech) {
      langInstruction = 'Focus on books by Czech authors and books available in Czech translation. Provide titles in Czech if a known translation exists, otherwise use the original title.';
    } else if (hasSlovak) {
      langInstruction = 'Focus on books by Slovak authors and books available in Slovak translation. Provide titles in Slovak if a known translation exists, otherwise use the original title.';
    } else {
      langInstruction = 'Provide titles in English.';
    }

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

Recommend exactly 8 books based on these criteria:
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
- "whyTrending": one short sentence about why this book is popular

Respond ONLY with the JSON array, no markdown, no explanation.`;

    console.log('Requesting AI recommendations...');

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 1.0,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded, please try again shortly.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Payment required.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: `AI request failed: ${aiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

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

    // Enrich with Google Books covers - all in parallel
    const enriched = await Promise.all(
      books.slice(0, 8).map(async (book: any) => {
        try {
          const q = encodeURIComponent(`intitle:${book.title} inauthor:${book.author}`);
          const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1&printType=books&fields=items(id,volumeInfo(imageLinks,publishedDate,pageCount,categories,industryIdentifiers))`;
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
