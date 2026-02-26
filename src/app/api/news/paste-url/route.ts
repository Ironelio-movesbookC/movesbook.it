import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { fetchOpenGraphTags } from '@/lib/news/openGraph';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const ogData = await fetchOpenGraphTags(url);

    return NextResponse.json({
      success: true,
      data: ogData,
    });
  } catch (error: any) {
    console.error('Error fetching Open Graph data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch Open Graph data',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
