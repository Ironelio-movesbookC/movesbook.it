import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminPanel, requireStaffSelfOrAdminPanel } from '@/lib/panelAuth';

export const dynamic = 'force-dynamic';

/** Operator profile URLs load both operators and co-admins from `staff_accounts`. */
const PROFILE_KINDS = ['OPERATOR', 'CO_ADMIN'] as const;

function getIdFromRequest(request: NextRequest): string {
  const url = new URL(request.url);
  return url.pathname.split('/').filter(Boolean).pop() || '';
}

function normalizeEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeUsername(value: unknown): string {
  return String(value ?? '').trim();
}

export async function GET(request: NextRequest) {
  const id = getIdFromRequest(request);
  const auth = await requireStaffSelfOrAdminPanel(request, id);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!id) {
    return NextResponse.json({ error: 'Operator id is required' }, { status: 400 });
  }

  const operator = await prisma.staffAccount.findFirst({
    where: { id, kind: { in: [...PROFILE_KINDS] } },
    select: {
      id: true,
      kind: true,
      username: true,
      name: true,
      surname: true,
      email: true,
      alternateEmail: true,
      phonePrefix: true,
      phoneNumber: true,
      cellularPrefix: true,
      cellularNumber: true,
      country: true,
      operatorLanguage: true,
      idCardCode: true,
      commissionPct: true,
      commissionAutoAssign: true,
      regions: true,
      roleLabel: true,
      facebook: true,
      twitter: true,
      website: true,
      blogsite: true,
      otherSite: true,
      otherInfos: true,
      imageUrl: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
      alternatePassword: true,
      alternatePasswordOneAccessOnly: true,
    },
  });

  if (!operator) {
    return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
  }

  const { alternatePassword, ...rest } = operator;
  return NextResponse.json({
    operator: {
      ...rest,
      hasAlternatePassword: Boolean(alternatePassword),
    },
  });
}

export async function PUT(request: NextRequest) {
  const id = getIdFromRequest(request);
  const auth = await requireStaffSelfOrAdminPanel(request, id);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!id) {
    return NextResponse.json({ error: 'Operator id is required' }, { status: 400 });
  }

  const existing = await prisma.staffAccount.findFirst({
    where: { id, kind: { in: [...PROFILE_KINDS] } },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  const username = normalizeUsername(body.username);
  const email = normalizeEmail(body.email);
  const name = String(body.name ?? '').trim();
  const surname = String(body.surname ?? '').trim();

  if (!username || !email || !name || !surname) {
    return NextResponse.json(
      { error: 'username, email, name and surname are required' },
      { status: 400 },
    );
  }

  const dup = await prisma.staffAccount.findFirst({
    where: {
      AND: [
        { id: { not: id } },
        { OR: [{ username }, { email }] },
      ],
    },
    select: { id: true },
  });
  if (dup) {
    return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
  }

  const isStaffSelf = auth.ok && auth.role === 'staff';
  const updateData = isStaffSelf
    ? {
        username,
        email,
        name,
        surname,
        country: body.country ? String(body.country).trim() : null,
        regions: body.regions ? String(body.regions).trim() : null,
        alternateEmail: body.alternateEmail ? normalizeEmail(body.alternateEmail) : null,
        phonePrefix: body.phonePrefix ? String(body.phonePrefix).trim() : null,
        phoneNumber: body.phoneNumber ? String(body.phoneNumber).trim() : null,
        cellularPrefix: body.cellularPrefix ? String(body.cellularPrefix).trim() : null,
        cellularNumber: body.cellularNumber ? String(body.cellularNumber).trim() : null,
        facebook: body.facebook ? String(body.facebook).trim() : null,
        twitter: body.twitter ? String(body.twitter).trim() : null,
        website: body.website ? String(body.website).trim() : null,
        blogsite: body.blogsite ? String(body.blogsite).trim() : null,
        otherSite: body.otherSite ? String(body.otherSite).trim() : null,
        otherInfos: body.otherInfos ? String(body.otherInfos) : null,
      }
    : {
        username,
        email,
        name,
        surname,
        country: body.country ? String(body.country).trim() : null,
        operatorLanguage:
          body.operatorLanguage !== undefined
            ? String(body.operatorLanguage ?? '').trim() || null
            : undefined,
        idCardCode:
          body.idCardCode !== undefined ? String(body.idCardCode ?? '').trim() || null : undefined,
        commissionPct:
          body.commissionPct !== undefined
            ? String(body.commissionPct ?? '').trim() || null
            : undefined,
        commissionAutoAssign:
          body.commissionAutoAssign !== undefined ? Boolean(body.commissionAutoAssign) : undefined,
        regions: body.regions ? String(body.regions).trim() : null,
        alternateEmail: body.alternateEmail ? normalizeEmail(body.alternateEmail) : null,
        phonePrefix: body.phonePrefix ? String(body.phonePrefix).trim() : null,
        phoneNumber: body.phoneNumber ? String(body.phoneNumber).trim() : null,
        cellularPrefix: body.cellularPrefix ? String(body.cellularPrefix).trim() : null,
        cellularNumber: body.cellularNumber ? String(body.cellularNumber).trim() : null,
        facebook: body.facebook ? String(body.facebook).trim() : null,
        twitter: body.twitter ? String(body.twitter).trim() : null,
        website: body.website ? String(body.website).trim() : null,
        blogsite: body.blogsite ? String(body.blogsite).trim() : null,
        otherSite: body.otherSite ? String(body.otherSite).trim() : null,
        otherInfos: body.otherInfos ? String(body.otherInfos) : null,
        roleLabel: body.roleLabel ? String(body.roleLabel).trim() : null,
      };

  const updated = await prisma.staffAccount.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      surname: true,
      country: true,
      operatorLanguage: true,
      idCardCode: true,
      commissionPct: true,
      commissionAutoAssign: true,
      regions: true,
      alternateEmail: true,
      phonePrefix: true,
      phoneNumber: true,
      cellularPrefix: true,
      cellularNumber: true,
      facebook: true,
      twitter: true,
      website: true,
      blogsite: true,
      otherSite: true,
      otherInfos: true,
      roleLabel: true,
      imageUrl: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ success: true, operator: updated });
}

export async function DELETE(request: NextRequest) {
  const id = getIdFromRequest(request);
  const auth = await requireAdminPanel(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!id) {
    return NextResponse.json({ error: 'Operator id is required' }, { status: 400 });
  }

  const existing = await prisma.staffAccount.findFirst({
    where: { id, kind: { in: [...PROFILE_KINDS] } },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
  }

  await prisma.staffAccount.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

