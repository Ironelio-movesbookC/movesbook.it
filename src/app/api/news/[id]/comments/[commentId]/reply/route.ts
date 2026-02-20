import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, verifyPassword } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
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

    const { id, commentId } = await params;
    const body = await request.json();
    const { comment, username, email, authorType, entityUsername, entityPassword } = body;

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment is required' },
        { status: 400 }
      );
    }

    const parentComment = await prisma.newsComment.findUnique({
      where: { id: commentId },
    });

    if (!parentComment) {
      return NextResponse.json(
        { error: 'Parent comment not found' },
        { status: 404 }
      );
    }

    const news = await prisma.news.findUnique({
      where: { id },
      include: {
        settings: {
          select: {
            functions: true,
          },
        },
      },
    });

    if (!news) {
      return NextResponse.json({ error: 'News not found' }, { status: 404 });
    }

    const settings = news.settings && news.settings.length > 0 ? news.settings[0] : null;
    const functions = settings?.functions ? (typeof settings.functions === 'string' ? JSON.parse(settings.functions) : settings.functions) : {};
    const commentOption = functions.commentOption || 'N';

    if (commentOption !== 'Y') {
      return NextResponse.json(
        { error: 'Comments are disabled for this article' },
        { status: 403 }
      );
    }

    let replyUserId = decoded.userId;
    let replyUsername = username || null;
    let replyEmail = email || null;

    if (authorType === 'entity' && entityUsername && entityPassword) {
      let verifiedEntity: any = null;

      const superAdmin = await prisma.superAdmin.findFirst({
        where: {
          OR: [
            { email: entityUsername },
            { username: entityUsername },
            { email: entityUsername.toLowerCase() },
            { username: entityUsername.toLowerCase() },
          ],
          isActive: true,
        },
      });

      if (superAdmin) {
        const isValid = await verifyPassword(entityPassword, superAdmin.password);
        if (isValid) {
          verifiedEntity = {
            id: superAdmin.id,
            username: superAdmin.username,
            type: 'Admin',
          };
        }
      }

      if (!verifiedEntity) {
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { username: entityUsername.toLowerCase() },
              { email: entityUsername.toLowerCase() },
            ],
          },
        });

        if (user) {
          const isValid = await verifyPassword(entityPassword, user.password);
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
              case 'CLUB':
                userType = 'Club';
                break;
              case 'TEAM':
                userType = 'Team';
                break;
            }

            verifiedEntity = {
              id: user.id,
              username: user.username,
              type: userType,
            };
          }
        }
      }

      if (!verifiedEntity) {
        return NextResponse.json(
          { error: 'Invalid entity credentials. Please verify your username and password.' },
          { status: 401 }
        );
      }

      replyUserId = verifiedEntity.id;
      replyUsername = verifiedEntity.username;
    }

    const reply = await prisma.newsComment.create({
      data: {
        newsId: id,
        userId: replyUserId,
        username: replyUsername,
        email: replyEmail,
        comment,
        parentId: commentId,
        isApproved: false,
      },
    });

    const createdReply = await prisma.newsComment.findUnique({
      where: { id: reply.id },
    });

    return NextResponse.json(createdReply, { status: 201 });
  } catch (error: any) {
    console.error('Error creating reply:', error);
    return NextResponse.json(
      { error: 'Failed to create reply', details: error.message },
      { status: 500 }
    );
  }
}
