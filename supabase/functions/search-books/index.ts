const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, langRestrict, maxResults = 10 } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedQuery = query.trim().slice(0, 200);
    const clampedResults = Math.min(Math.max(1, maxResults), 40);

    const params = new URLSearchParams({
      q: sanitizedQuery,
      maxResults: String(clampedResults),
      printType: 'books',
    });

    if (langRestrict && /^[a-z]{2}$/.test(langRestrict)) {
      params.set('langRestrict', langRestrict);
    }

    const url = `https://www.googleapis.com/books/v1/volumes?${params}`;
    console.log('Fetching Google Books:', url);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error('Google Books API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error?.message || 'API request failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const books = (data.items || []).map((item: any) => {
      const info = item.volumeInfo || {};
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
