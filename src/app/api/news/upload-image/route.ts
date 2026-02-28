import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { verifyToken } from '@/lib/auth';

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

    const contentType = request.headers.get('content-type') || '';
    let buffer: Buffer;
    let fileExtension = 'jpg';
    let type: string;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const imageUrl = body.url;
      type = body.type;

      if (!imageUrl) {
        return NextResponse.json({ error: 'No image URL provided' }, { status: 400 });
      }

      if (!type || (type !== 'picture' && type !== 'banner' && type !== 'content')) {
        return NextResponse.json({ error: 'Invalid type. Must be "picture", "banner", or "content"' }, { status: 400 });
      }

      try {
        const imageRes = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (!imageRes.ok) {
          return NextResponse.json({ error: 'Failed to download image from URL' }, { status: 400 });
        }

        const contentType = imageRes.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
          return NextResponse.json({ error: 'URL does not point to an image' }, { status: 400 });
        }

        const arrayBuffer = await imageRes.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);

        if (buffer.length > 5 * 1024 * 1024) {
          return NextResponse.json({ error: 'Image size exceeds 5MB limit' }, { status: 400 });
        }

        const extMatch = contentType.match(/\/(jpeg|jpg|png|gif|webp)/);
        if (extMatch) {
          fileExtension = extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1];
        } else {
          const urlExt = imageUrl.split('.').pop()?.toLowerCase();
          if (urlExt && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(urlExt)) {
            fileExtension = urlExt === 'jpeg' ? 'jpg' : urlExt;
          }
        }
      } catch (error: any) {
        return NextResponse.json({ error: 'Failed to fetch image from URL', details: error.message }, { status: 400 });
      }
    } else {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      type = formData.get('type') as string;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      if (!type || (type !== 'picture' && type !== 'banner' && type !== 'content')) {
        return NextResponse.json({ error: 'Invalid type. Must be "picture", "banner", or "content"' }, { status: 400 });
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: 'Invalid file type. Only images are allowed' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      fileExtension = file.name.split('.').pop() || 'jpg';
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileName = `${type}_${timestamp}_${randomString}.${fileExtension}`;

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'news');
    
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const publicPath = `/uploads/news/${fileName}`;

    return NextResponse.json({
      success: true,
      path: publicPath,
      fileName: fileName,
    });
  } catch (error: any) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image', details: error.message },
      { status: 500 }
    );
  }
}
