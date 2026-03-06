import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, verifyPassword } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const comments = await prisma.newsComment.findMany({
      where: {
        newsId: id,
        parentId: null,
      },
      include: {
        replies: {
          include: {
            replies: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const allUserIds = new Set<string>();
    comments.forEach((comment) => {
      if (comment.userId) allUserIds.add(comment.userId);
      const collectUserIds = (replies: any[]) => {
        replies.forEach((reply) => {
          if (reply.userId) allUserIds.add(reply.userId);
          if (reply.replies) collectUserIds(reply.replies);
        });
      };
      if (comment.replies) collectUserIds(comment.replies);
    });

    let usersMap = new Map<string, {
      id: string;
      username: string;
      image: string | null;
      firstname: string | null;
      surname: string | null;
    }>();

    if (allUserIds.size > 0) {
      try {
        const userIdsArray = Array.from(allUserIds);
        const placeholders = userIdsArray.map(() => '?').join(',');
        
        let userData: Array<{
          id: string;
          username: string;
          image: string | null;
          firstname: string | null;
          surname: string | null;
        }> = [];

        try {
          userData = await prisma.$queryRawUnsafe<Array<{
            id: string;
            username: string;
            image: string | null;
            firstname: string | null;
            surname: string | null;
          }>>(
            `SELECT id, username, firstname, surname FROM users_new WHERE id IN (${placeholders})`,
            ...userIdsArray
          );
          userData = userData.map(u => ({ ...u, image: null }));
        } catch (err) {
          console.error('Error fetching users:', err);
          userData = [];
        }

        userData.forEach((user) => {
          usersMap.set(user.id, {
            id: user.id,
            username: user.username,
            image: user.image || null,
            firstname: user.firstname,
            surname: user.surname,
          });
        });

        const notFoundIds = userIdsArray.filter(id => !usersMap.has(id));
        if (notFoundIds.length > 0) {
          const superAdminPlaceholders = notFoundIds.map(() => '?').join(',');
          const superAdminData = await prisma.$queryRawUnsafe<Array<{
            id: string;
            username: string;
            name: string | null;
            email: string;
          }>>(
            `SELECT id, username, name, email FROM super_admins WHERE id IN (${superAdminPlaceholders}) AND isActive = 1`,
            ...notFoundIds
          );
          superAdminData.forEach((admin) => {
            usersMap.set(admin.id, {
              id: admin.id,
              username: admin.username,
              image: null,
              firstname: admin.name || null,
              surname: null,
            });
          });
        }
      } catch (error) {
        console.error('Error fetching users for comments:', error);
      }
    }

    const formatReplies = (replies: any[]): any[] => {
      return replies.map((reply) => {
        let replyUser = null;
        if (reply.userId && usersMap.has(reply.userId)) {
          const userData = usersMap.get(reply.userId)!;
          replyUser = {
            id: userData.id,
            username: userData.username || reply.username || 'Anonymous',
            image: userData.image,
            firstname: userData.firstname,
            surname: userData.surname,
          };
        } else if (reply.username) {
          replyUser = { id: '', username: reply.username, image: null };
        }
        return {
          ...reply,
          user: replyUser,
          replies: reply.replies ? formatReplies(reply.replies) : [],
        };
      });
    };

    const formattedComments = comments.map((comment) => {
      let user = null;
      if (comment.userId && usersMap.has(comment.userId)) {
        const userData = usersMap.get(comment.userId)!;
        user = {
          id: userData.id,
          username: userData.username || comment.username || 'Anonymous',
          image: userData.image,
          firstname: userData.firstname,
          surname: userData.surname,
        };
      } else if (comment.username) {
        user = { id: '', username: comment.username, image: null };
      }

      return {
        ...comment,
        user: user,
        replies: comment.replies ? formatReplies(comment.replies) : [],
      };
    });

    return NextResponse.json({ comments: formattedComments });
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments', details: error.message },
      { status: 500 }
    );
  }
}

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
    const { comment, parentId, username, email, authorType, entityUsername, entityPassword } = body;

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment is required' },
        { status: 400 }
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

    let commentUserId = decoded.userId;
    let commentUsername = username || null;
    let commentEmail = email || null;

    if (!commentUsername && commentUserId && authorType !== 'entity') {
      try {
        const user = await prisma.user.findUnique({
          where: { id: commentUserId },
          select: { username: true, email: true },
        });
        if (user) {
          commentUsername = commentUsername || user.username;
          commentEmail = commentEmail || user.email;
        } else {
          const superAdmin = await prisma.superAdmin.findUnique({
            where: { id: commentUserId },
            select: { username: true, email: true },
          });
          if (superAdmin) {
            commentUsername = commentUsername || superAdmin.username;
            commentEmail = commentEmail || superAdmin.email;
          }
        }
      } catch (error) {
        console.error('Error fetching user info for comment:', error);
      }
    }

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

      commentUserId = verifiedEntity.id;
      commentUsername = verifiedEntity.username;
    }

    const newComment = await prisma.newsComment.create({
      data: {
        newsId: id,
        userId: commentUserId,
        username: commentUsername,
        email: commentEmail,
        comment,
        parentId: parentId || null,
        isApproved: false,
      },
    });

    const createdComment = await prisma.newsComment.findUnique({
      where: { id: newComment.id },
    });

    let userData = null;
    if (createdComment?.userId) {
      try {
        let userResult: Array<{
          id: string;
          username: string;
          image?: string | null;
          firstname: string | null;
          surname: string | null;
        }> = [];

        try {
          userResult = await prisma.$queryRawUnsafe<Array<{
            id: string;
            username: string;
            image: string | null;
            firstname: string | null;
            surname: string | null;
          }>>(
            `SELECT id, username, firstname, surname FROM users_new WHERE id = ? LIMIT 1`,
            createdComment.userId
          );
          userResult = userResult.map(u => ({ ...u, image: null }));
        } catch (err) {
          console.error('Error fetching user:', err);
        }

        if (userResult && userResult.length > 0) {
          const user = userResult[0];
          userData = {
            id: user.id,
            username: user.username,
            image: user.image || null,
            firstname: user.firstname,
            surname: user.surname,
          };
        } else {
          const superAdmin = await prisma.superAdmin.findUnique({
            where: { id: createdComment.userId },
            select: { id: true, username: true, name: true },
          });
          if (superAdmin) {
            userData = {
              id: superAdmin.id,
              username: superAdmin.username,
              image: null,
              firstname: superAdmin.name,
              surname: null,
            };
          }
        }
      } catch (error) {
        console.error('Error fetching user data for created comment:', error);
      }
    }

    if (!userData && createdComment?.username) {
      userData = {
        id: createdComment.userId || '',
        username: createdComment.username,
        image: null,
        firstname: null,
        surname: null,
      };
    }

    return NextResponse.json({
      ...createdComment,
      user: userData,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment', details: error.message },
      { status: 500 }
    );
  }
}
