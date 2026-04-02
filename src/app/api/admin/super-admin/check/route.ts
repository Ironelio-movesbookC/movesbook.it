import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function GET() {
  try {
    const settings = await prisma.superAdminSettings.findFirst();
    
    return NextResponse.json({
      exists: !!settings
    });
  } catch (error) {
    console.error('Error checking Super Admin password:', error);
    return NextResponse.json({ exists: false });
  }
}

