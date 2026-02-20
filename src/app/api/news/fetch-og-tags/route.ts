import { NextRequest, NextResponse } from 'next/server';

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ');
}

async function fetchWithProxy(url: string): Promise<string> {
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  ];

  for (const proxyUrl of proxies) {
    try {
      const response = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        const text = await response.text();
        if (text && text.length > 100) {
          return text;
        }
      }
    } catch (error) {
      continue;
    }
  }

  throw new Error('All proxy attempts failed');
}

async function fetchDirect(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0',
      'Referer': url,
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.text();
}

function parseOGTags(html: string): Record<string, string> {
  const ogData: Record<string, string> = {};

  const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+property=["']og:title["']\s+content=[""]([^""]+)[""]/i);
  const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+property=["']og:description["']\s+content=[""]([^""]+)[""]/i);
  const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
    html.match(/<meta\s+property=["']og:image["']\s+content=[""]([^""]+)[""]/i);

  if (ogTitleMatch && ogTitleMatch[1]) {
    ogData.title = decodeHtmlEntities(ogTitleMatch[1].trim());
  }
  if (ogDescMatch && ogDescMatch[1]) {
    ogData.description = decodeHtmlEntities(ogDescMatch[1].trim());
  }
  if (ogImageMatch && ogImageMatch[1]) {
    ogData.image = ogImageMatch[1].trim();
  }

  if (!ogData.title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      ogData.title = decodeHtmlEntities(titleMatch[1].trim());
    }
  }

  if (!ogData.description) {
    const metaDescTag = html.match(/<meta\s+name=["']description["'][^>]*>/i);
    if (metaDescTag) {
      const tagContent = metaDescTag[0];
      
      let desc = '';
      
      const doubleQuoteMatch = tagContent.match(/content\s*=\s*"([^"]*)"?/i);
      if (doubleQuoteMatch && doubleQuoteMatch[1] !== undefined && doubleQuoteMatch[1] !== '') {
        desc = doubleQuoteMatch[1];
      } else {
        const singleQuoteMatch = tagContent.match(/content\s*=\s*'([^']*)'?/i);
        if (singleQuoteMatch && singleQuoteMatch[1] !== undefined && singleQuoteMatch[1] !== '') {
          desc = singleQuoteMatch[1];
        } else {
          const unquotedMatch = tagContent.match(/content\s*=\s*([^\s>]+)/i);
          if (unquotedMatch && unquotedMatch[1] !== undefined && unquotedMatch[1] !== '') {
            desc = unquotedMatch[1];
          }
        }
      }
      
      if (desc) {
        desc = desc.trim();
        desc = desc.replace(/^["']|["']$/g, '');
        if (desc) {
          ogData.description = decodeHtmlEntities(desc);
        }
      }
    }
  }

  return ogData;
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, message: 'URL is required' },
        { status: 400 }
      );
    }

    let fetchUrl = url.trim();
    if (!fetchUrl.match(/^https?:\/\//i)) {
      fetchUrl = 'https://' + fetchUrl;
    }

    let html = '';
    let fetchMethod = '';

    try {
      html = await fetchDirect(fetchUrl);
      fetchMethod = 'direct';
    } catch (directError: any) {
      try {
        html = await fetchWithProxy(fetchUrl);
        fetchMethod = 'proxy';
      } catch (proxyError: any) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Failed to fetch URL. Direct fetch failed: ${directError.message}. Proxy attempts also failed.` 
          },
          { status: 500 }
        );
      }
    }

    const ogData = parseOGTags(html);

    if (Object.keys(ogData).length > 0) {
      return NextResponse.json({
        success: true,
        og_data: ogData,
        method: fetchMethod,
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'No OG tags or meta tags found on this page' },
        { status: 404 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Error fetching OG tags' },
      { status: 500 }
    );
  }
}
