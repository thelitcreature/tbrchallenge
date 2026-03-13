const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, langRestrict, maxResults = 10, startIndex = 0 } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedQuery = query.trim().slice(0, 200);
    const clampedResults = Math.min(Math.max(1, maxResults), 40);
    const clampedStart = Math.min(Math.max(0, startIndex), 100);

    const params = new URLSearchParams({
      q: sanitizedQuery,
      maxResults: String(clampedResults),
      startIndex: String(clampedStart),
      printType: 'books',
      orderBy: 'relevance',
    });

    if (langRestrict && /^[a-z]{2}$/.test(langRestrict)) {
      params.set('langRestrict', langRestrict);
    }

    const url = `https://www.googleapis.com/books/v1/volumes?${params.toString()}`;
    console.log('Fetching Google Books:', url);

    let response: Response | null = null;
    let data: any = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });
      data = await response.json();

      if (response.ok || response.status !== 503) break;

      // Retry on 503 with exponential backoff
      console.warn(`Google Books API 503, retry ${attempt + 1}/3`);
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }

    if (!response!.ok) {
      console.error('Google Books API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data?.error?.message || 'API request failed' }),
        { status: response!.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const books = (data.items || []).map((item: any) => {
      const info = item.volumeInfo || {};
      const sale = item.saleInfo || {};
      const isEbook = sale.isEbook === true;
      const printType = info.printType || '';

      // Detect format from available signals
      let format: string | null = null;
      if (isEbook) {
        format = 'ebook';
      } else if (printType === 'BOOK') {
        // Check description/title hints for binding type
        const allText = `${info.title || ''} ${info.subtitle || ''} ${info.description || ''}`.toLowerCase();
        if (allText.includes('hardcover') || allText.includes('hardback')) {
          format = 'hardback';
        } else if (allText.includes('paperback') || allText.includes('softcover')) {
          format = 'paperback';
        } else if (allText.includes('audiobook') || allText.includes('audio book')) {
          format = 'audiobook';
        }
      }

      return {
        id: item.id,
        title: info.title || 'Unknown Title',
        author: (info.authors || []).join(', ') || 'Unknown Author',
        description: info.description || '',
        thumbnail: info.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
        language: info.language || '',
        publisher: info.publisher || '',
        publishedDate: info.publishedDate || '',
        pageCount: info.pageCount || null,
        categories: info.categories || [],
        isbn: ((info.industryIdentifiers || []).find((id: any) => id.type === 'ISBN_13') ||
               (info.industryIdentifiers || []).find((id: any) => id.type === 'ISBN_10'))?.identifier || null,
        format,
      };
    });

    return new Response(
      JSON.stringify({ success: true, books, totalItems: data.totalItems || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error searching books:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
