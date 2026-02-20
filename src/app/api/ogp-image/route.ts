import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxies OGP image URLs so they load in cards even when the source
 * blocks direct embedding (Referer, CORS, etc.). Use as: /api/ogp-image?url=<encoded-image-url>
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl || typeof imageUrl !== 'string') {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  // Next.js already decodes query params; use as-is to avoid corrupting URLs with % or &
  const absoluteUrl = imageUrl.trim();
  if (!absoluteUrl.startsWith('http://') && !absoluteUrl.startsWith('https://')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(absoluteUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Movesbook-OGP-Image/1.0 (https://movesbook.com)',
        Accept: 'image/*',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Image fetch failed: ${res.status}` },
        { status: 422 }
      );
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();
    const type = contentType.startsWith('image/') || contentType.includes('image')
      ? contentType
      : 'image/jpeg';
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return NextResponse.json(
      { error: isAbort ? 'Timeout' : 'Failed to fetch image' },
      { status: 422 }
    );
  }
}
