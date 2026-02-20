import { NextRequest, NextResponse } from 'next/server';
import { UserType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userTypes = Object.values(UserType)
      .filter(type => type !== 'ADMIN' && type !== 'TEAM_MANAGER')
      .map(type => ({
        id: type,
        name: type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ')
      }));

    return NextResponse.json(userTypes);
  } catch (error) {
    console.error('Error fetching user types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user types' },
      { status: 500 }
    );
  }
}
