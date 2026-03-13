const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface IdentifiedInfo {
  title: string;
  author: string;
  isbn?: string | null;
  edition?: string | null;
  publisher?: string | null;
  confidence: string;
}

async function lookupGoogleBooks(identified: IdentifiedInfo) {
  let googleBook = null;

  // Try ISBN first if available
  if (identified.isbn) {
    try {
      const isbnQuery = encodeURIComponent(`isbn:${identified.isbn}`);
      const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${isbnQuery}&maxResults=1&printType=books`);
      const gbData = await gbRes.json();
      if (gbData.items?.length > 0) googleBook = gbData.items[0];
    } catch (err) {
      console.error('ISBN lookup failed:', err);
    }
  }

  // Fallback to title+author search
  if (!googleBook) {
    try {
      const q = encodeURIComponent(`intitle:${identified.title}${identified.author && identified.author !== 'Unknown' ? ` inauthor:${identified.author}` : ''}`);
      const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3&printType=books`);
      const gbData = await gbRes.json();
      if (gbData.items?.length > 0) googleBook = gbData.items[0];
    } catch (err) {
      console.error('Title/author lookup failed:', err);
    }
  }

  const info = googleBook?.volumeInfo || {};
  const identifiers = info.industryIdentifiers || [];
  const isbn = (identifiers.find((id: any) => id.type === 'ISBN_13') ||
                identifiers.find((id: any) => id.type === 'ISBN_10'))?.identifier || identified.isbn || null;

  return {
    id: googleBook?.id || `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: info.title || identified.title,
    author: (info.authors || []).join(', ') || identified.author || 'Unknown Author',
    description: info.description?.slice(0, 300) || 'No description available.',
    thumbnail: info.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
    language: info.language || null,
    publisher: info.publisher || identified.publisher || null,
    publishedDate: info.publishedDate || null,
    pageCount: info.pageCount || null,
    categories: info.categories || [],
    isbn,
    confidence: identified.confidence || 'medium',
    aiIdentified: {
      title: identified.title,
      author: identified.author,
      isbn: identified.isbn,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType, mode } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isShelfMode = mode === 'shelf';

    const prompt = isShelfMode
      ? `Look at this photo of a bookshelf or stack of books. Identify ALL visible book titles and their authors. For each book you can see (even partially), provide the title and author.

Return ONLY a JSON array of objects, each with:
- "title": the book title (required)
- "author": the author name (required, use "Unknown" if not visible)
- "isbn": ISBN if visible (optional, null if not found)
- "publisher": publisher name if visible (optional, null if not found)
- "confidence": "high", "medium", or "low"

Example: [{"title":"...","author":"...","isbn":null,"publisher":null,"confidence":"high"}]

Respond ONLY with the JSON array, no markdown, no explanation. If you can't identify any books, return an empty array [].`
      : `Look at this book photo. Identify the book title, author, and ISBN if visible on the cover or barcode. If you can see a barcode, try to read the ISBN from it.

Return ONLY a JSON object with these fields:
- "title": the book title (required)
- "author": the author name (required, use "Unknown" if not visible)
- "isbn": ISBN-13 or ISBN-10 if visible (optional, null if not found)
- "edition": any edition info visible (optional, null if not found)
- "publisher": publisher name if visible (optional, null if not found)
- "confidence": "high", "medium", or "low" based on how confident you are

Respond ONLY with the JSON object, no markdown, no explanation.`;

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.2,
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

    let parsed;
    try {
      const jsonStr = content.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'Could not identify books from this image. Try a clearer photo.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (isShelfMode) {
      // Multi-book mode
      const identifiedList: IdentifiedInfo[] = Array.isArray(parsed) ? parsed : [];

      if (identifiedList.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'No books detected in this image. Try a clearer photo of the spines.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`AI identified ${identifiedList.length} books from shelf`);

      // Look up all books in parallel (limit to 20 to avoid excessive calls)
      const lookups = identifiedList.slice(0, 20).map(b => lookupGoogleBooks(b));
      const books = await Promise.all(lookups);

      return new Response(
        JSON.stringify({ success: true, books, count: books.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Single book mode
      const identified = parsed as IdentifiedInfo;

      if (!identified.title) {
        return new Response(
          JSON.stringify({ success: false, error: 'Could not identify a book in this image.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('AI identified book:', identified);
      const result = await lookupGoogleBooks(identified);

      return new Response(
        JSON.stringify({ success: true, book: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Identify book error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
