import { NextRequest, NextResponse } from 'next/server';

/**
 * Fetches Open Graph Protocol (ogp.me) metadata from a given URL.
 * Parses og:title, og:image, og:description, og:url from the page's meta tags.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url || typeof url !== 'string') {
    return NextResponse.json(
      { error: 'Missing or invalid url query parameter' },
      { status: 400 }
    );
  }

  // Basic URL validation
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Only http and https URLs are allowed' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    // 25s timeout so slower news/media sites can respond
    const timeoutMs = 25000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${res.status} ${res.statusText}` },
        { status: 422 }
      );
    }

    const html = await res.text();
    const meta: Record<string, string> = {};

    // Parse og:* meta tags (property="og:title" content="...")
    const propertyRegex = /<meta\s+[^>]*property\s*=\s*["'](og:[^"']+)["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/gi;
    let m;
    while ((m = propertyRegex.exec(html)) !== null) {
      const key = m[1].toLowerCase();
      const value = (m[2] || '').trim();
      if (value && !meta[key]) meta[key] = value;
    }

    // Also match content before property (some sites use content first)
    const contentFirstRegex = /<meta\s+[^>]*content\s*=\s*["']([^"']*)["'][^>]*property\s*=\s*["'](og:[^"']+)["'][^>]*>/gi;
    while ((m = contentFirstRegex.exec(html)) !== null) {
      const key = m[2].toLowerCase();
      const value = (m[1] || '').trim();
      if (value && !meta[key]) meta[key] = value;
    }

    // Twitter Card meta (property or name): twitter:image, twitter:title, etc.
    const twitterPropertyRegex = /<meta\s+[^>]*property\s*=\s*["'](twitter:[^"']+)["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/gi;
    while ((m = twitterPropertyRegex.exec(html)) !== null) {
      const key = m[1].toLowerCase();
      const value = (m[2] || '').trim();
      if (value && !meta[key]) meta[key] = value;
    }
    const twitterNameRegex = /<meta\s+[^>]*name\s*=\s*["'](twitter:[^"']+)["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/gi;
    while ((m = twitterNameRegex.exec(html)) !== null) {
      const key = m[1].toLowerCase();
      const value = (m[2] || '').trim();
      if (value && !meta[key]) meta[key] = value;
    }

    const title = meta['og:title'] || meta['twitter:title'] || null;
    let image = meta['og:image'] || meta['twitter:image'] || null;
    const description = meta['og:description'] || meta['twitter:description'] || null;
    const canonicalUrl = meta['og:url'] || url;
    // Resolve relative image URLs (e.g. "/img/og.jpg") to absolute so they load in the client
    if (image && !image.startsWith('http://') && !image.startsWith('https://')) {
      try {
        image = new URL(image, url).href;
      } catch {
        image = null;
      }
    }

    return NextResponse.json({
      title,
      image,
      description,
      url: canonicalUrl,
      siteName: meta['og:site_name'] || null,
      type: meta['og:type'] || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch URL';
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return NextResponse.json(
      { error: isAbort ? 'Request timeout' : message },
      { status: 422 }
    );
  }
}
