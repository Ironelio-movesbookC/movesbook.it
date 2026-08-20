import { NextRequest } from 'next/server';
import {
  handleEntityLogoDelete,
  handleEntityLogoPost,
} from '@/lib/entity/entityLogoRoute';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } },
) {
  return handleEntityLogoPost(request, 'coach', params.groupId);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string } },
) {
  return handleEntityLogoDelete(request, 'coach', params.groupId);
}
