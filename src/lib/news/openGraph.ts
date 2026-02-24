/**
 * Open Graph utility functions for fetching OG tags from URLs
 */

export interface OpenGraphData {
  title?: string;
  type?: string;
  image?: string;
  url?: string;
  description?: string;
  siteName?: string;
}

/**
 * Fetch Open Graph tags from a URL
 */
export async function fetchOpenGraphTags(url: string): Promise<OpenGraphData> {
  try {
    // Validate URL
    const urlObj = new URL(url);
    
    // Fetch the HTML content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MovesbookBot/1.0)',
      },
      // Set timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();

    // Parse Open Graph tags
    const ogData: OpenGraphData = {};

    // Extract og:title
    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    if (titleMatch) {
      ogData.title = titleMatch[1];
    } else {
      // Fallback to regular title tag
      const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleTagMatch) {
        ogData.title = titleTagMatch[1];
      }
    }

    // Extract og:type
    const typeMatch = html.match(/<meta\s+property=["']og:type["']\s+content=["']([^"']+)["']/i);
    if (typeMatch) {
      ogData.type = typeMatch[1];
    }

    // Extract og:image
    const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (imageMatch) {
      // Handle relative URLs
      const imageUrl = imageMatch[1];
      ogData.image = imageUrl.startsWith('http') ? imageUrl : new URL(imageUrl, url).toString();
    }

    // Extract og:url
    const urlMatch = html.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i);
    if (urlMatch) {
      ogData.url = urlMatch[1];
    } else {
      ogData.url = url;
    }

    // Extract og:description
    const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    if (descMatch) {
      ogData.description = descMatch[1];
    } else {
      // Fallback to meta description
      const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
      if (metaDescMatch) {
        ogData.description = metaDescMatch[1];
      }
    }

    // Extract og:site_name
    const siteNameMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i);
    if (siteNameMatch) {
      ogData.siteName = siteNameMatch[1];
    }

    return ogData;
  } catch (error: any) {
    console.error('Error fetching Open Graph tags:', error);
    throw new Error(`Failed to fetch Open Graph data: ${error.message}`);
  }
}
