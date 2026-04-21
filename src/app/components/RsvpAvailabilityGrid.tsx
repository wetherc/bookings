"use client";

import { memo } from "react";

interface RsvpAvailabilityGridProps {
  dates: string[];
  timeSlots: string[];
  dateToTimeMap: Map<string, Set<string>>;
  selectedSlots: string[];
  isSubmitting: boolean;
  onSlotSelection: (slot: string) => void;
  onSelectAllForDate: (date: string) => void;
}



function RsvpAvailabilityGridComponent({
  dates,
  timeSlots,
  dateToTimeMap,
  selectedSlots,
  isSubmitting,
  onSlotSelection,
  onSelectAllForDate,
}: RsvpAvailabilityGridProps) {
  return (
    <div style={{ overflow: "auto" }}>
      <table className="interactive">
        <thead>
          <tr>
            <th></th>
            <th>Date</th>
            {timeSlots.map((time) => (
              <th key={time}>{time}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dates.map((date) => {
            const allSlotsForDate = Array.from<string>(
              dateToTimeMap.get(date) || [],
            ).map((time: string) => {
              const [hour, minute] = time.split(":").map(Number);
              const dateObj = new Date(`${date}T00:00:00Z`);
              dateObj.setUTCHours(hour, minute);
              return dateObj.toISOString();
            });
            const areAllSelected =
              allSlotsForDate.length > 0 &&
              allSlotsForDate.every((slot) => selectedSlots.includes(slot));

            return (
              <tr key={date}>
                <td>
                  <input
                    type="checkbox"
                    onChange={() => onSelectAllForDate(date)}
                    checked={areAllSelected}
                    disabled={isSubmitting || allSlotsForDate.length === 0}
                  />
                </td>
                <td>
                  {new Date(date + "T12:00:00Z").toLocaleDateString(undefined, {
                    timeZone: "UTC",
                  })}
                </td>
                {timeSlots.map((time) => {
                  const slotExists = dateToTimeMap.get(date)?.has(time);

                  let isoString = "";
                  if (slotExists) {
                    const [hour, minute] = time.split(":").map(Number);
                    const dateObj = new Date(`${date}T00:00:00Z`);
                    dateObj.setUTCHours(hour, minute);
                    isoString = dateObj.toISOString();
                  }

                  return (
                    <td key={time} style={{ textAlign: "center" }}>
                      {slotExists && (
                        <input
                          type="checkbox"
                          id={isoString}
                          checked={selectedSlots.includes(isoString)}
                          onChange={() => onSlotSelection(isoString)}
                          disabled={isSubmitting}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const RsvpAvailabilityGrid = memo(RsvpAvailabilityGridComponent);
