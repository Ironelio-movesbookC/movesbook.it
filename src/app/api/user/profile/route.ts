import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';


export async function GET(request: NextRequest) {
  try {
    // Get token from header
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    // Fetch user data (MIGRATED DATA!)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        userType: true,
        createdAt: true,
        telegramAccount: true,
        
        // Include related data from migration
        settings: true,
        periods: {
          select: {
            id: true,
            name: true,
            color: true,
            description: true
          }
        },
        sections: {
          select: {
            id: true,
            name: true,
            color: true,
            description: true
          }
        },
        
        // If you migrated clubs
        clubMemberships: {
          include: {
            club: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        },
        
        // If you migrated coach relationships
        coaches: {
          include: {
            coach: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        
        // If you migrated athlete relationships
        athletes: {
          include: {
            athlete: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        
        // Workout stats
        _count: {
          select: {
            workoutPlans: true,
            workoutTemplates: true,
            clubMemberships: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

