import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * GET - Get user's Telegram account
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const userId = decoded.userId;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramAccount: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ telegramAccount: user.telegramAccount });
  } catch (error) {
    console.error('Error fetching Telegram account:', error);
    return NextResponse.json({ error: 'Failed to fetch Telegram account' }, { status: 500 });
  }
}

/**
 * POST/PUT - Save or update user's Telegram account
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const userId = decoded.userId;
    const body = await request.json();
    const { telegramAccount } = body;
    
    // Validate Telegram account format (should start with @)
    if (telegramAccount && !telegramAccount.startsWith('@')) {
      return NextResponse.json({ 
        error: 'Telegram account must start with @ symbol',
        success: false 
      }, { status: 400 });
    }
    
    // Update user's Telegram account
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { telegramAccount: telegramAccount || null },
      select: { id: true, telegramAccount: true }
    });
    
    return NextResponse.json({ 
      success: true, 
      telegramAccount: updatedUser.telegramAccount 
    });
  } catch (error) {
    console.error('Error saving Telegram account:', error);
    return NextResponse.json({ 
      error: 'Failed to save Telegram account',
      success: false 
    }, { status: 500 });
  }
}
