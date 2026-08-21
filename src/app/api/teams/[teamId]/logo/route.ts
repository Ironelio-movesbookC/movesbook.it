import { NextRequest } from 'next/server';
import {
  handleEntityLogoDelete,
  handleEntityLogoPost,
} from '@/lib/entity/entityLogoRoute';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } },
) {
  return handleEntityLogoPost(request, 'team', params.teamId);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string } },
) {
  return handleEntityLogoDelete(request, 'team', params.teamId);
}
