import { NextRequest, NextResponse } from 'next/server';
import {
  verifyOptionsFromRequest,
  verifySuperAdminPassword,
} from '@/lib/messages/verifySuperAdminPassword';

// Verify Super Admin password (used by Version history, tools save, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = typeof body.password === 'string' ? body.password : '';
    const username =
      typeof body.username === 'string'
        ? body.username
        : typeof body.identifier === 'string'
          ? body.identifier
          : null;

    if (!password) {
      return NextResponse.json(
        { success: false, valid: false, error: 'Password is required' },
        { status: 400 },
      );
    }

    const fromToken = verifyOptionsFromRequest(request);
    const valid = await verifySuperAdminPassword(password, {
      userId: fromToken.userId,
      username: username || fromToken.username,
    });

    if (valid) {
      return NextResponse.json({ success: true, valid: true });
    }

    return NextResponse.json(
      { success: false, valid: false, error: 'Invalid password' },
      { status: 401 },
    );
  } catch (error) {
    console.error('Error verifying Super Admin password:', error);
    return NextResponse.json(
      { success: false, valid: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
