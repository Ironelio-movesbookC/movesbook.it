import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    sections: [
      {
        id: 'next-intro',
        title: 'Movesbook Next',
        body: 'Release notes for the Next.js app will appear here (replaces legacy “Why Movesbook” / version history).',
      },
    ],
  });
}
