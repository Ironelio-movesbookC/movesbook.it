import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getMemberRegistrationInfoForUser } from '@/lib/registration/memberRegistrationInfoService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const info = await getMemberRegistrationInfoForUser(decoded.userId);

    if (!info) {
      return NextResponse.json(
        { error: 'No subscription version found for this account.' },
        { status: 404 },
      );
    }

    return NextResponse.json(info);
  } catch (error) {
    console.error('Error fetching member registration info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member registration info' },
      { status: 500 },
    );
  }
}
