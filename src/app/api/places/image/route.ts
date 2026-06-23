import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const photoName = searchParams.get('photo_name');

  if (!photoName) {
    return NextResponse.json({ error: 'photo_name is required' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key is missing' }, { status: 500 });
  }

  // Google Places API (New) Photo Media URL
  const googleUrl = `https://places.googleapis.com/v1/${photoName}/media?key=${apiKey}&maxWidthPx=600`;

  try {
    const res = await fetch(googleUrl, {
      redirect: 'follow',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image from Google: ${res.statusText}` },
        { status: res.status }
      );
    }

    const imageBuffer = await res.arrayBuffer();
    const contentType = res.headers.get('Content-Type') || 'image/jpeg';

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
