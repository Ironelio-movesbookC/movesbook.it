import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveMessageDatabaseUserId } from '@/lib/messages/resolveMessageUserId';

/** DELETE - Delete a message. Only the sender can delete their own message. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    const decoded = verifyToken(authHeader.replace('Bearer ', ''));
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const myId = await resolveMessageDatabaseUserId(decoded.userId, decoded.userType);
    if (!myId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }
    const { id: conversationId, messageId } = await params;

    const conv = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conv || (conv.user1Id !== myId && conv.user2Id !== myId)) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const message = await prisma.chatMessage.findFirst({
      where: { id: messageId, conversationId },
    });
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    if (message.senderId !== myId) {
      return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 });
    }

    await prisma.chatMessage.delete({
      where: { id: messageId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Chat message DELETE:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
