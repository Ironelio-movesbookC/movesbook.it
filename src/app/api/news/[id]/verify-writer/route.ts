import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, verifyPassword } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { writerType, username, password, clubTeamName } = body;

    if (!writerType || !username || !password) {
      return NextResponse.json(
        { error: 'Writer type, username, and password are required' },
        { status: 400 }
      );
    }

    let isValid = false;
    let verifiedUser: any = null;

    switch (writerType) {
      case 'Admin':
      case '1':
        const superAdmin = await prisma.superAdmin.findFirst({
          where: {
            OR: [
              { username: username.toLowerCase() },
              { email: username.toLowerCase() },
            ],
            isActive: true,
          },
        });

        if (superAdmin) {
          isValid = await verifyPassword(password, superAdmin.password);
          if (isValid) {
            verifiedUser = {
              id: superAdmin.id,
              username: superAdmin.username,
              type: 'Admin',
            };
          }
        }
        break;

      case 'Sub-Admin':
      case '2':
        const subAdmin = await prisma.user.findFirst({
          where: {
            OR: [
              { username: username.toLowerCase() },
              { email: username.toLowerCase() },
            ],
            userType: 'ADMIN',
          },
        });

        if (subAdmin) {
          isValid = await verifyPassword(password, subAdmin.password);
          if (isValid) {
            verifiedUser = {
              id: subAdmin.id,
              username: subAdmin.username,
              type: 'Sub-Admin',
            };
          }
        }
        break;

      case 'Operator':
      case '3':
        const operator = await prisma.user.findFirst({
          where: {
            OR: [
              { username: username.toLowerCase() },
              { email: username.toLowerCase() },
            ],
            userType: { in: ['ADMIN', 'CLUB_TRAINER'] },
          },
        });

        if (operator) {
          isValid = await verifyPassword(password, operator.password);
          if (isValid) {
            verifiedUser = {
              id: operator.id,
              username: operator.username,
              type: 'Operator',
            };
          }
        }
        break;

      case 'Athlete':
      case '5':
        const athlete = await prisma.user.findFirst({
          where: {
            OR: [
              { username: username.toLowerCase() },
              { email: username.toLowerCase() },
            ],
            userType: 'ATHLETE',
          },
        });

        if (athlete) {
          isValid = await verifyPassword(password, athlete.password);
          if (isValid) {
            verifiedUser = {
              id: athlete.id,
              username: athlete.username,
              type: 'Athlete',
            };
          }
        }
        break;

      case 'Coach':
      case '6':
        const coach = await prisma.user.findFirst({
          where: {
            OR: [
              { username: username.toLowerCase() },
              { email: username.toLowerCase() },
            ],
            userType: 'COACH',
          },
        });

        if (coach) {
          isValid = await verifyPassword(password, coach.password);
          if (isValid) {
            verifiedUser = {
              id: coach.id,
              username: coach.username,
              type: 'Coach',
            };
          }
        }
        break;

      case 'Team':
      case '7':
        if (!clubTeamName) {
          return NextResponse.json(
            { error: 'Team name is required for Team writer type' },
            { status: 400 }
          );
        }

        const team = await prisma.team.findFirst({
          where: {
            name: { contains: clubTeamName },
            admin: {
              OR: [
                { username: username.toLowerCase() },
                { email: username.toLowerCase() },
              ],
            },
          },
          include: {
            admin: true,
          },
        });

        if (team && team.admin) {
          isValid = await verifyPassword(password, team.admin.password);
          if (isValid) {
            verifiedUser = {
              id: team.id,
              username: team.admin.username,
              teamName: team.name,
              type: 'Team',
            };
          }
        }
        break;

      case 'Club':
      case '8':
        if (!clubTeamName) {
          return NextResponse.json(
            { error: 'Club name is required for Club writer type' },
            { status: 400 }
          );
        }

        const club = await prisma.club.findFirst({
          where: {
            name: { contains: clubTeamName },
            admin: {
              OR: [
                { username: username.toLowerCase() },
                { email: username.toLowerCase() },
              ],
            },
          },
          include: {
            admin: true,
          },
        });

        if (club && club.admin) {
          isValid = await verifyPassword(password, club.admin.password);
          if (isValid) {
            verifiedUser = {
              id: club.id,
              username: club.admin.username,
              clubName: club.name,
              type: 'Club',
            };
          }
        }
        break;

      case 'Group':
      case '9':
        const group = await prisma.group.findFirst({
          where: {
            name: { contains: clubTeamName || '' },
            admin: {
              OR: [
                { username: username.toLowerCase() },
                { email: username.toLowerCase() },
              ],
            },
          },
          include: {
            admin: true,
          },
        });

        if (group && group.admin) {
          isValid = await verifyPassword(password, group.admin.password);
          if (isValid) {
            verifiedUser = {
              id: group.id,
              username: group.admin.username,
              groupName: group.name,
              type: 'Group',
            };
          }
        }
        break;

      case 'External':
      case '10':
        return NextResponse.json(
          { error: 'External writers not yet implemented' },
          { status: 501 }
        );

      default:
        return NextResponse.json(
          { error: 'Invalid writer type' },
          { status: 400 }
        );
    }

    if (isValid && verifiedUser) {
      await prisma.news.update({
        where: { id },
        data: {
          writerUsername: username,
          writerClubTeamName: clubTeamName || null,
          writerVerified: true,
          authorType: writerType,
        },
      });

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
          error: 'Invalid credentials',
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
