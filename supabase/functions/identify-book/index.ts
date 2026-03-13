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
    const { imageBase64, mimeType } = await req.json();

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

    // Step 1: Use AI vision to identify the book
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
              {
                type: 'text',
                text: `Look at this book photo. Identify the book title, author, and ISBN if visible on the cover or barcode. If you can see a barcode, try to read the ISBN from it.

Return ONLY a JSON object with these fields:
- "title": the book title (required)
- "author": the author name (required, use "Unknown" if not visible)
- "isbn": ISBN-13 or ISBN-10 if visible (optional, null if not found)
- "edition": any edition info visible (optional, null if not found)
- "publisher": publisher name if visible (optional, null if not found)
- "confidence": "high", "medium", or "low" based on how confident you are

Respond ONLY with the JSON object, no markdown, no explanation.`
              },
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

    let identified;
    try {
      const jsonStr = content.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();
      identified = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ success: false, error: 'Could not identify the book from this image. Try a clearer photo of the cover.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!identified.title) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not identify a book in this image.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI identified book:', identified);

    // Step 2: Look up on Google Books to get full metadata and cover
    let googleBook = null;

    // Try ISBN first if available
    if (identified.isbn) {
      try {
        const isbnQuery = encodeURIComponent(`isbn:${identified.isbn}`);
        const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${isbnQuery}&maxResults=1&printType=books`);
        const gbData = await gbRes.json();
        if (gbData.items?.length > 0) {
          googleBook = gbData.items[0];
        }
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
        if (gbData.items?.length > 0) {
          googleBook = gbData.items[0];
        }
      } catch (err) {
        console.error('Title/author lookup failed:', err);
      }
    }

    const info = googleBook?.volumeInfo || {};
    const identifiers = info.industryIdentifiers || [];
    const isbn = (identifiers.find((id: any) => id.type === 'ISBN_13') ||
                  identifiers.find((id: any) => id.type === 'ISBN_10'))?.identifier || identified.isbn || null;

    const result = {
      id: googleBook?.id || `photo-${Date.now()}`,
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

    return new Response(
      JSON.stringify({ success: true, book: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Identify book error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
