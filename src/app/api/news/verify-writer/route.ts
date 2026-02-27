import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, verifyPassword } from '@/lib/auth';

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
    let { username, password } = body;

    username = username?.trim();
    password = password?.trim();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    let verifiedUser: any = null;

    const superAdmin = await prisma.superAdmin.findFirst({
      where: {
        OR: [
          { email: username },
          { username: username },
          { email: username.toLowerCase() },
          { username: username.toLowerCase() },
        ],
        isActive: true,
      },
    });

    if (superAdmin) {
      const isValid = await verifyPassword(password, superAdmin.password);
      if (isValid) {
        verifiedUser = {
          id: superAdmin.id,
          username: superAdmin.username,
          type: 'Admin',
        };
      }
    }

    if (!verifiedUser) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: username.toLowerCase() },
            { email: username.toLowerCase() },
          ],
        },
      });

      if (user) {
        const isValid = await verifyPassword(password, user.password);
        if (isValid) {
          let userType = 'User';
          switch (user.userType) {
            case 'ADMIN':
              userType = 'Sub-Admin';
              break;
            case 'CLUB_TRAINER':
              userType = 'Operator';
              break;
            case 'ATHLETE':
              userType = 'Athlete';
              break;
            case 'COACH':
              userType = 'Coach';
              break;
          }

          verifiedUser = {
            id: user.id,
            username: user.username,
            type: userType,
          };
        }
      }
    }

    if (verifiedUser) {
      return NextResponse.json({
        success: true,
        verified: true,
        user: verifiedUser,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: 'Invalid credentials. Please check your username and password.',
        },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('Error verifying writer:', error);
    return NextResponse.json(
      { error: 'Failed to verify writer', details: error.message },
      { status: 500 }
    );
  }
}
