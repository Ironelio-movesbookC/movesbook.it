'use client';

import {
  CardTimetableForm,
  FROM_START_OPTIONS,
  TIMETABLE_DAY_FULL_NAMES,
  TIMETABLE_DAY_KEYS,
  TimetableDayKey,
  TimetableOperator,
  TimetableSlot,
  PayableValue
} from '@/lib/clubCardTimetable';

type TimetableBookingPropertiesTableProps = {
  form: CardTimetableForm;
  operators: TimetableOperator[];
  onChange: (form: CardTimetableForm) => void;
};

function updateSlotAtIndex(
  form: CardTimetableForm,
  dayKey: TimetableDayKey,
  slotIndex: number,
  patch: Partial<TimetableSlot>
): CardTimetableForm {
  const day = form.days[dayKey];
  const slots = day.slots.map((slot, index) => (index === slotIndex ? { ...slot, ...patch } : slot));
  return {
    ...form,
    days: {
      ...form.days,
      [dayKey]: { ...day, slots }
    }
  };
}

function rowBackground(dayKey: TimetableDayKey): string {
  return dayKey === 'tues' || dayKey === 'thurs' || dayKey === 'sat' ? '#cbd5d2' : 'white';
}

export default function TimetableBookingPropertiesTable({
  form,
  operators,
  onChange
}: TimetableBookingPropertiesTableProps) {
  const rows: { dayKey: TimetableDayKey; slotIndex: number; slot: TimetableSlot }[] = [];

  TIMETABLE_DAY_KEYS.forEach((dayKey) => {
    const day = form.days[dayKey];
    if (!day.enabled) return;
    day.slots.forEach((slot, slotIndex) => {
      if (slot.rangeEnd <= slot.rangeStart) return;
      rows.push({ dayKey, slotIndex, slot });
    });
  });

  return (
    <div className="overflow-hidden rounded-md border border-gray-300">
      <div className="bg-gray-700 px-4 py-2 text-sm font-semibold text-white">
        Proprieties of the lesson set for this course
      </div>

      <div className="flex flex-wrap items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!form.bookingSettings.enabledForBooking}
            onChange={(event) =>
              onChange({
                ...form,
                bookingSettings: {
                  ...form.bookingSettings,
                  enabledForBooking: !event.target.checked
                }
              })
            }
            className="h-4 w-4 accent-gray-900"
          />
          Disable to booking
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.bookingSettings.paymentPostecipedOrCreditCard}
            onChange={(event) =>
              onChange({
                ...form,
                bookingSettings: {
                  ...form.bookingSettings,
                  paymentPostecipedOrCreditCard: event.target.checked
                }
              })
            }
            className="h-4 w-4 accent-gray-900"
          />
          Accept Payment posteciped else Credit card
        </label>
        <label className="flex items-center gap-2">
          Payment within these days
          <input
            type="text"
            value={form.bookingSettings.payWithinDays}
            onChange={(event) =>
              onChange({
                ...form,
                bookingSettings: { ...form.bookingSettings, payWithinDays: event.target.value }
              })
            }
            className="h-8 w-14 rounded border border-gray-300 px-2"
          />
        </label>
        <label className="flex items-center gap-2">
          Cost
          <input
            type="text"
            value={form.bookingSettings.cost}
            onChange={(event) =>
              onChange({
                ...form,
                bookingSettings: { ...form.bookingSettings, cost: event.target.value }
              })
            }
            className="h-8 w-16 rounded border border-gray-300 px-2"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#43aabf] text-white">
              <th className="border border-gray-700 px-2 py-2 font-normal">Date</th>
              <th className="border border-gray-700 px-2 py-2 font-normal">From</th>
              <th className="border border-gray-700 px-2 py-2 font-normal">Until to</th>
              <th className="border border-gray-700 px-2 py-2 font-normal">Booking available</th>
              <th className="border border-gray-700 px-2 py-2 font-normal">Within min from starting</th>
              <th className="border border-gray-700 px-2 py-2 font-normal">Bookable</th>
              <th className="border border-gray-700 px-2 py-2 font-normal">Pay Y\N</th>
              <th className="border border-gray-700 px-2 py-2 font-normal">Instructor</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Enable at least one day with a time range to configure booking properties.
                </td>
              </tr>
            ) : (
              rows.map(({ dayKey, slotIndex, slot }) => {
                const dayName = TIMETABLE_DAY_FULL_NAMES[dayKey];
                return (
                  <tr key={`${dayKey}-${slotIndex}`} style={{ backgroundColor: rowBackground(dayKey) }}>
                    <td className="border border-gray-400 px-2 py-2 text-left">{dayName}</td>
                    <td className="whitespace-nowrap border border-gray-400 px-2 py-2">{slot.amTime}</td>
                    <td className="whitespace-nowrap border border-gray-400 px-2 py-2">{slot.pmTime}</td>
                    <td className="border border-gray-400 px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={slot.bookabled}
                        onChange={(event) =>
                          onChange(
                            updateSlotAtIndex(form, dayKey, slotIndex, {
                              bookabled: event.target.checked,
                              payable: event.target.checked ? '1' : '0'
                            })
                          )
                        }
                        className="h-4 w-4 accent-gray-900"
                      />
                    </td>
                    <td className="border border-gray-400 px-2 py-2">
                      <select
                        value={slot.fromStart}
                        onChange={(event) =>
                          onChange(updateSlotAtIndex(form, dayKey, slotIndex, { fromStart: event.target.value }))
                        }
                        className="h-8 w-full rounded border border-gray-300 bg-white px-1"
                      >
                        {FROM_START_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border border-gray-400 px-2 py-2">
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={slot.maxNumber}
                        onChange={(event) =>
                          onChange(updateSlotAtIndex(form, dayKey, slotIndex, { maxNumber: event.target.value }))
                        }
                        className="h-8 w-16 rounded border border-gray-300 px-2"
                      />
                    </td>
                    <td className="border border-gray-400 px-2 py-2">
                      <select
                        value={slot.payable}
                        onChange={(event) =>
                          onChange(
                            updateSlotAtIndex(form, dayKey, slotIndex, {
                              payable: event.target.value as PayableValue
                            })
                          )
                        }
                        className="h-8 w-full rounded border border-gray-300 bg-white px-1"
                      >
                        <option value="1">Yes</option>
                        <option value="0">No</option>
                        <option value="2">Setting Mode</option>
                      </select>
                    </td>
                    <td className="border border-gray-400 px-2 py-2">
                      <select
                        value={slot.instructor}
                        onChange={(event) =>
                          onChange(updateSlotAtIndex(form, dayKey, slotIndex, { instructor: event.target.value }))
                        }
                        className="h-8 w-full rounded border border-gray-300 bg-white px-1"
                      >
                        <option value="">—</option>
                        {operators.map((operator) => (
                          <option key={operator.id} value={operator.id}>
                            {operator.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
