import { prisma } from '@/lib/prisma';
import { findExistingTable } from '@/lib/club/legacyTableLookup';
import { fetchProcedureCustomerOptions } from './clubMembers';
import { fetchClubOperatorOptions } from './clubOperators';
import { listCompanies } from '@/lib/club/archives/clubArchiveService';
import type { ClubAuthContext } from './types';

const COURSE_TABLE_CANDIDATES = ['club_courses', 'courses', 'course'];
const INSTRUCTOR_TABLE_CANDIDATES = ['instructors', 'instructor'];

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export type CourseSubscriptionFormOptions = {
  courses: { id: string; name: string; cost: number }[];
  instructors: { id: string; name: string }[];
  members: { id: string; name: string }[];
  operators: { id: string; name: string }[];
  companies: { id: string; name: string }[];
  currentOperatorId: string | null;
};

export async function fetchCourseSubscriptionFormOptions(
  ctx: ClubAuthContext
): Promise<CourseSubscriptionFormOptions> {
  const courses: { id: string; name: string; cost: number }[] = [];
  const instructors: { id: string; name: string }[] = [];
  
  const courseTable = await findExistingTable(COURSE_TABLE_CANDIDATES);
  const instructorTable = await findExistingTable(INSTRUCTOR_TABLE_CANDIDATES);

  if (courseTable) {
    const rows = await prisma.$queryRawUnsafe<
      { id: bigint | number; course_name: string | null; cost: string | number | null }[]
    >(`SELECT id, course_name, cost FROM \`${courseTable}\` ORDER BY course_name ASC LIMIT 200`);
    for (const row of rows) {
      courses.push({
        id: String(row.id),
        name: text(row.course_name) || `Course ${row.id}`,
        cost: num(row.cost),
      });
    }
  }

  if (instructorTable) {
    const rows = await prisma.$queryRawUnsafe<{ id: bigint | number; name: string }[]>(
      `SELECT id, name FROM \`${instructorTable}\` ORDER BY name ASC`
    );
    for (const row of rows) {
      instructors.push({ id: String(row.id), name: text(row.name) });
    }
  }

  const [members, operators, companies] = await Promise.all([
    fetchProcedureCustomerOptions(ctx.club.id),
    fetchClubOperatorOptions(ctx.club.id),
    listCompanies(ctx),
  ]);

  return {
    courses,
    instructors,
    members,
    operators,
    companies,
    currentOperatorId: ctx.userId,
  };
}
