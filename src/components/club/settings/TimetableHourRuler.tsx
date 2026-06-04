import { TIMETABLE_HOURS } from '@/lib/timetableLayout';

/** Hour labels 0–24; each span is 4% wide (matches legacy CakePHP timescale-block). */
export default function TimetableHourRuler() {
  return (
    <div className="flex w-full select-none">
      {TIMETABLE_HOURS.map((hour) => (
        <span key={hour} className="w-[4%] text-center text-[11px] leading-none text-gray-500">
          {hour}
        </span>
      ))}
    </div>
  );
}
