'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ClubSettingsTypologyTabs from '@/components/club/settings/ClubSettingsTypologyTabs';
import {
  COURSE_TIMETABLE_DAY_INDEXES,
  COURSE_TIMETABLE_DAY_NAMES,
  CourseTimetableRow
} from '@/lib/clubCourseTimetable';

const TIMETABLE_PATH = '/club/settings/typology_subscription/timetable';

export default function ClubCourseTimetablePage() {
  const [rows, setRows] = useState<CourseTimetableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        const response = await fetch('/api/club/settings/course-timetable', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || 'Unable to load course timetable.');
        }
        if (!cancelled) {
          setRows(Array.isArray(data.rows) ? data.rows : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load course timetable.');
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-3">
        <Link
          href={TIMETABLE_PATH}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to timetable
        </Link>
      </div>

      <section className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
        <ClubSettingsTypologyTabs />

        <div className="px-4 py-6 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Timetable by course</h1>
        </div>

        <div className="px-4 pb-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading…
            </div>
          ) : error ? (
            <p className="py-12 text-center text-sm text-red-600">{error}</p>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">
              No course timetables configured yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="course-table mx-auto w-full max-w-6xl border-separate border-spacing-0 overflow-hidden rounded-xl bg-white text-sm shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                <thead>
                  <tr className="bg-[#484c70] text-white">
                    <th className="border-r border-white/20 px-3 py-3 text-left font-semibold uppercase tracking-wide">
                      Course
                    </th>
                    {COURSE_TIMETABLE_DAY_NAMES.map((day) => (
                      <th
                        key={day}
                        className="border-r border-white/20 px-3 py-3 text-center font-semibold uppercase tracking-wide last:border-r-0"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.courseName}>
                      <td
                        className="border border-gray-200 px-3 py-3 text-center text-sm font-semibold uppercase tracking-wide text-white shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)]"
                        style={{ backgroundColor: row.color }}
                      >
                        {row.courseName}
                      </td>
                      {COURSE_TIMETABLE_DAY_INDEXES.map((dayIndex) => {
                        const times = row.days[dayIndex] ?? [];
                        return (
                          <td
                            key={`${row.courseName}-${dayIndex}`}
                            className="border border-gray-200 px-2 py-3 text-center align-middle"
                          >
                            {times.length === 0 ? (
                              <span className="inline-block rounded-md border border-dashed border-gray-300 bg-gray-100 px-2 py-1 text-xs italic text-gray-400">
                                -
                              </span>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                {times.map((time) => (
                                  <span
                                    key={`${row.courseName}-${dayIndex}-${time}`}
                                    className="inline-block min-w-[80px] rounded-lg px-2 py-1 text-xs font-semibold text-white shadow-[0_3px_6px_rgba(0,0,0,0.15)]"
                                    style={{ backgroundColor: row.color }}
                                  >
                                    {time}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
