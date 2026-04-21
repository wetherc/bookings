"use client";

import { useMemo } from "react";
import { formatTimePart } from "@/lib/utils";

interface TimeBlock {
  startDate: string;
  endDate: string;
  startTime: { hour: number; minute: number };
  endTime: { hour: number; minute: number };
}

interface EventData {
  block_minutes: number;
  time_slots: TimeBlock[];
}

interface RsvpData {
  name: string;
  selected_slots: string[];
}

interface AvailabilityGridProps {
  event: EventData;
  rsvps: RsvpData[];
}

export function AvailabilityGrid({ event, rsvps }: AvailabilityGridProps) {
  const { dates, timeSlots, allPossibleSlotsSet } = useMemo(() => {
    if (!event || !Array.isArray(event.time_slots)) {
      return {
        dates: [],
        timeSlots: [],
        allPossibleSlotsSet: new Set<string>(),
      };
    }

    const allPossibleSlots: string[] = [];
    event.time_slots.forEach((timeBlock: TimeBlock) => {
      const start = new Date(timeBlock.startDate);
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(timeBlock.endDate);
      end.setUTCHours(0, 0, 0, 0);

      const currentDate = new Date(start);
      while (currentDate <= end) {
        const currentSlotStart = new Date(currentDate.getTime());
        currentSlotStart.setUTCHours(
          timeBlock.startTime.hour,
          timeBlock.startTime.minute,
          0,
          0,
        );

        const currentSlotEnd = new Date(currentDate.getTime());
        currentSlotEnd.setUTCHours(
          timeBlock.endTime.hour,
          timeBlock.endTime.minute,
          0,
          0,
        );

        const currentBlock = new Date(currentSlotStart.getTime());
        while (currentBlock < currentSlotEnd) {
          allPossibleSlots.push(currentBlock.toISOString());
          currentBlock.setUTCMinutes(currentBlock.getUTCMinutes() + 30);
        }

        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }
    });

    const allPossibleSlotsSet = new Set(allPossibleSlots);
    const dateToTimeMap = new Map<string, Set<string>>();
    const timeSet = new Set<string>();

    allPossibleSlots.forEach((isoString) => {
      const date = new Date(isoString);
      const dateKey = `${date.getUTCFullYear()}-${formatTimePart(
        date.getUTCMonth() + 1,
      )}-${formatTimePart(date.getUTCDate())}`;
      const timeKey = `${formatTimePart(
        date.getUTCHours(),
      )}:${formatTimePart(date.getUTCMinutes())}`;

      if (!dateToTimeMap.has(dateKey)) {
        dateToTimeMap.set(dateKey, new Set());
      }
      dateToTimeMap.get(dateKey)!.add(timeKey);
      timeSet.add(timeKey);
    });

    return {
      dates: Array.from(dateToTimeMap.keys()).sort(),
      timeSlots: Array.from(timeSet).sort(),
      allPossibleSlotsSet,
    };
  }, [event]);

  const slotCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (rsvps) {
      rsvps.forEach((rsvp: RsvpData) => {
        rsvp.selected_slots.forEach((slot: string) => {
          counts.set(slot, (counts.get(slot) || 0) + 1);
        });
      });
    }
    return counts;
  }, [rsvps]);

  const attendeesPerSlot = useMemo(() => {
    const map = new Map<string, string[]>();
    if (rsvps) {
      rsvps.forEach((rsvp: RsvpData) => {
        const attendeeName = rsvp.name;
        rsvp.selected_slots.forEach((slot: string) => {
          if (!map.has(slot)) {
            map.set(slot, []);
          }
          map.get(slot)!.push(attendeeName);
        });
      });
    }
    return map;
  }, [rsvps]);

  const qualifiedSlotsToBorder = useMemo(() => {
    if (!rsvps || rsvps.length === 0 || !event) {
      return new Set<string>();
    }

    const allAttendeesAvailableSlots = new Set<string>();
    slotCounts.forEach((count, isoString) => {
      if (count === rsvps.length && allPossibleSlotsSet.has(isoString)) {
        allAttendeesAvailableSlots.add(isoString);
      }
    });

    const qualifiedSlots = new Set<string>();
    dates.forEach((dateKey) => {
      let currentContiguousBlock: string[] = [];
      timeSlots.forEach((timeKey) => {
        const [hour, minute] = timeKey.split(":").map(Number);
        const dateObj = new Date(`${dateKey}T00:00:00Z`);
        dateObj.setUTCHours(hour, minute);
        const isoString = dateObj.toISOString();

        if (allAttendeesAvailableSlots.has(isoString)) {
          currentContiguousBlock.push(isoString);
        } else {
          // End of a contiguous block
          if (currentContiguousBlock.length > 0) {
            const blockDurationMinutes = currentContiguousBlock.length * 30;
            if (blockDurationMinutes >= event.block_minutes) {
              currentContiguousBlock.forEach((slot) =>
                qualifiedSlots.add(slot),
              );
            }
            currentContiguousBlock = []; // Reset for next block
          }
        }
      });

      // Check for any remaining block at the end of the day
      if (currentContiguousBlock.length > 0) {
        const blockDurationMinutes = currentContiguousBlock.length * 30;
        if (blockDurationMinutes >= event.block_minutes) {
          currentContiguousBlock.forEach((slot) => qualifiedSlots.add(slot));
        }
      }
    });

    return qualifiedSlots;
  }, [dates, timeSlots, slotCounts, rsvps, event, allPossibleSlotsSet]);

  return (
    <fieldset style={{ marginTop: "1rem" }}>
      <legend>Availability Grid</legend>
      {qualifiedSlotsToBorder.size === 0 && (
        <div
          style={{
            fontStyle: "italic",
            fontWeight: "bold",
            color: "darkred",
            marginBottom: "1rem",
          }}
        >
          No common availability blocks for all attendees found yet for the
          event duration.
        </div>
      )}
      <div style={{ marginBottom: "1rem" }}>
        Hover over a cell to see confirmed attendees. Cells will have a thick
        border to indicate that everyone is available for the full event
        duration.
      </div>

      <div style={{ overflow: "auto" }}>
        <table className="interactive">
          <thead>
            <tr>
              <th>Date</th>
              {timeSlots.map((time) => (
                <th key={time}>{time}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dates.map((date) => (
              <tr key={date}>
                <td>
                  {new Date(date + "T12:00:00Z").toLocaleDateString(undefined, {
                    timeZone: "UTC",
                  })}
                </td>
                {timeSlots.map((time) => {
                  const [hour, minute] = time.split(":").map(Number);
                  const dateObj = new Date(`${date}T00:00:00Z`);
                  dateObj.setUTCHours(hour, minute);
                  const isoString = dateObj.toISOString();

                  const slotExists = allPossibleSlotsSet.has(isoString);
                  const count = slotCounts.get(isoString) || 0;
                  const attendees = attendeesPerSlot.get(isoString) || [];

                  return (
                    <td
                      key={time}
                      title={
                        slotExists
                          ? attendees.length > 0
                            ? `Attendees: ${attendees.join(", ")}`
                            : "No attendees available"
                          : ""
                      }
                      style={{
                        textAlign: "center",
                        backgroundColor: slotExists
                          ? `rgba(0, 255, 0, ${count / (rsvps.length || 1)})`
                          : "transparent",
                        border:
                          slotExists && qualifiedSlotsToBorder.has(isoString)
                            ? "3px solid black"
                            : "1px solid transparent",
                      }}
                    >
                      {slotExists ? count : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </fieldset>
  );
}
