import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const defaultSettings = {
      sectorId: null,
      duration: null,
      reshare: 'Y',
      functions: {
        commentOption: true,
        likeButton: true,
        shareButton: true,
        printButton: true,
        pdfButton: true,
      },
      sports: [],
      roles: [],
      languages: [],
      countries: [],
    };

    return NextResponse.json(defaultSettings);
  } catch (error: any) {
    console.error('Error fetching default settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch default settings', details: error.message },
      { status: 500 }
    );
  }
}
