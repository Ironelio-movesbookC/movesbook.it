import { NextRequest } from 'next/server';
import {
  handleEntityLogoDelete,
  handleEntityLogoPost,
} from '@/lib/entity/entityLogoRoute';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { clubId: string } },
) {
  return handleEntityLogoPost(request, 'club', params.clubId);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { clubId: string } },
) {
  return handleEntityLogoDelete(request, 'club', params.clubId);
}
