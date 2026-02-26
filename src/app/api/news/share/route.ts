import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;
    const body = await request.json();
    const { article_id, share_option_id, selected_friends_id, is_reshare_disabled, is_comments_enabled } = body;

    if (!article_id || !share_option_id) {
      return NextResponse.json(
        { error: 'article_id and share_option_id are required' },
        { status: 400 }
      );
    }

    const shareOptionId = parseInt(share_option_id);
    const friendIds = selected_friends_id ? selected_friends_id.split(',').filter((id: string) => id.trim() !== '') : [];

    if (shareOptionId === 3 && friendIds.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one friend to share with' },
        { status: 400 }
      );
    }

    const results: { inserted: string[]; exists: string[] } = { inserted: [], exists: [] };

    if (shareOptionId === 3) {
      for (const friendId of friendIds) {
        const trimmedFriendId = friendId.trim();
        if (!trimmedFriendId) continue;

        const existing = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM news_share_post
          WHERE user_id = ${userId}
            AND news_id = ${article_id}
            AND share_option = ${shareOptionId}
            AND friends_user_id = ${trimmedFriendId}
        `;

        const exists = existing[0]?.count > 0;

        if (exists) {
          const friend = await prisma.user.findUnique({
            where: { id: trimmedFriendId },
            select: { username: true },
          });
          if (friend) {
            results.exists.push(friend.username);
          }
        } else {
          await prisma.$executeRaw`
            INSERT INTO news_share_post 
            (id, user_id, news_id, share_option, friends_user_id, is_reshare_disabled, is_comments_enabled, created)
            VALUES 
            (UUID(), ${userId}, ${article_id}, ${shareOptionId}, ${trimmedFriendId}, ${is_reshare_disabled || 0}, ${is_comments_enabled || 1}, NOW())
          `;

          const friend = await prisma.user.findUnique({
            where: { id: trimmedFriendId },
            select: { username: true },
          });
          if (friend) {
            results.inserted.push(friend.username);
          }
        }
      }

      const messages: string[] = [];
      if (results.inserted.length > 0) {
        messages.push(`Shared with: ${results.inserted.join(', ')}`);
      }
      if (results.exists.length > 0) {
        messages.push(`Already shared with: ${results.exists.join(', ')}`);
      }

      return NextResponse.json({
        status: 'success',
        message: messages.length > 0 ? `${messages.join('. ')}.` : 'No friends to share with.',
      });
    } else {
      const existing = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM news_share_post
        WHERE user_id = ${userId}
          AND news_id = ${article_id}
          AND share_option = ${shareOptionId}
      `;

      if (existing[0]?.count > 0) {
        return NextResponse.json({
          status: 'info',
          message: 'Post already shared.',
        });
      }

      await prisma.$executeRaw`
        INSERT INTO news_share_post 
        (id, user_id, news_id, share_option, created)
        VALUES 
        (UUID(), ${userId}, ${article_id}, ${shareOptionId}, NOW())
      `;

      return NextResponse.json({
        status: 'success',
        message: 'Post shared successfully.',
      });
    }
  } catch (error) {
    console.error('Error sharing post:', error);
    return NextResponse.json(
      { error: 'Failed to share post', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
