"use client";

import { useState, useEffect, useMemo } from "react";

const formatTimePart = (value: number) => String(value).padStart(2, "0");

interface EventAdminViewProps {
  eventId: string;
  token: string;
  onTitleLoaded: (title: string) => void;
}

export function EventAdminView({
  eventId,
  token,
  onTitleLoaded,
}: EventAdminViewProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getEventData() {
      setIsLoading(true);
      setError(null);

      const url = `/api/events/${eventId}?token=${token}`;

      try {
        const res = await fetch(url);

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `Error: ${res.status}`);
        }

        const fetchedData = await res.json();
        setData(fetchedData);
        if (fetchedData.event?.title) {
          onTitleLoaded(fetchedData.event.title);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    }

    getEventData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, token]);

  const { dates, timeSlots, dateToTimeMap } = useMemo(() => {
    if (!data?.event || !Array.isArray(data.event.time_slots)) {
      return { dates: [], timeSlots: [], dateToTimeMap: new Map() };
    }

    const allPossibleSlots: string[] = [];
    data.event.time_slots.forEach((timeBlock: any) => {
      const start = new Date(timeBlock.startDate);
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(timeBlock.endDate);
      end.setUTCHours(0, 0, 0, 0);

      let currentDate = new Date(start);
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

        let currentBlock = new Date(currentSlotStart.getTime());
        while (currentBlock < currentSlotEnd) {
          allPossibleSlots.push(currentBlock.toISOString());
          currentBlock.setUTCMinutes(currentBlock.getUTCMinutes() + 30);
        }

        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }
    });

    const dateToTimeMap = new Map<string, Set<string>>();
    const timeSet = new Set<string>();

    allPossibleSlots.forEach((isoString) => {
      const date = new Date(isoString);
      const dateKey = `${date.getUTCFullYear()}-${formatTimePart(date.getUTCMonth() + 1)}-${formatTimePart(date.getUTCDate())}`;
      const timeKey = `${formatTimePart(date.getUTCHours())}:${formatTimePart(date.getUTCMinutes())}`;

      if (!dateToTimeMap.has(dateKey)) {
        dateToTimeMap.set(dateKey, new Set());
      }
      dateToTimeMap.get(dateKey)!.add(timeKey);
      timeSet.add(timeKey);
    });

    return {
      dates: Array.from(dateToTimeMap.keys()).sort(),
      timeSlots: Array.from(timeSet).sort(),
      dateToTimeMap,
    };
  }, [data?.event]);

  // Derive rsvps and event from data here, as they are needed for the next useMemo
  const rsvps = data?.rsvps || [];
  const event = data?.event;

  const slotCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (rsvps) {
      rsvps.forEach((rsvp: any) => {
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
      rsvps.forEach((rsvp: any) => {
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
      if (count === rsvps.length) {
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
            const blockDurationMinutes = currentContiguousBlock.length * 30; // Each slot is 30 minutes
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
  }, [dates, timeSlots, slotCounts, rsvps.length, event?.block_minutes]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: "red" }}>Error: {error}</div>;
  }

  if (!data) {
    return <div>No data found.</div>;
  }

  // Construct URLs for display
  const host = window.location.origin;
  const adminUrl = `${host}/events/${eventId}/admin?token=${token}`;
  const rsvpUrl = `${host}/events/${eventId}`;

  return (
    <>
      <fieldset>
        <legend>Event Details</legend>
        <p>
          <strong>Title:</strong> {event.title}
        </p>
        <p>
          <strong>Description:</strong> {event.description || "N/A"}
        </p>
        <p>
          <strong>Event Duration:</strong> {event.block_minutes} minutes
        </p>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>Event Links</legend>
        <div style={{ marginBottom: "1rem" }}>
          <p>
            This is your secret admin link. Keep it safe! You'll need it to see
            this page again.
          </p>
          <input
            type="text"
            readOnly
            value={adminUrl}
            style={{ width: "100%" }}
          />
        </div>
        <div>
          <p>Share this link with your event participants for them to RSVP.</p>
          <input
            type="text"
            readOnly
            value={rsvpUrl}
            style={{ width: "100%" }}
          />
        </div>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>Proposed Time Slots</legend>
        <div style={{ maxHeight: "150px", overflowY: "auto" }}>
          <ul className="tree-view">
            {event.time_slots.map((time: any, index: number) => (
              <li key={index}>
                {new Date(time.startDate).toLocaleDateString()} -{" "}
                {new Date(time.endDate).toLocaleDateString()} from{" "}
                {formatTimePart(time.startTime.hour)}:
                {formatTimePart(time.startTime.minute)} to{" "}
                {formatTimePart(time.endTime.hour)}:
                {formatTimePart(time.endTime.minute)}
              </li>
            ))}
          </ul>
        </div>
      </fieldset>

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
                    {new Date(date + "T12:00:00Z").toLocaleDateString(
                      undefined,
                      { timeZone: "UTC" },
                    )}
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

                    const count = slotExists
                      ? slotCounts.get(isoString) || 0
                      : 0;

                    return (
                      <td
                        key={time}
                        title={
                          attendeesPerSlot.has(isoString)
                            ? `Attendees: ${attendeesPerSlot.get(isoString)!.join(", ")}`
                            : "No attendees available for this slot"
                        }
                        style={{
                          textAlign: "center",
                          backgroundColor: slotExists
                            ? `rgba(0, 255, 0, ${count / (rsvps.length || 1)})`
                            : "transparent",
                          border: qualifiedSlotsToBorder.has(isoString)
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

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>RSVPs ({rsvps.length})</legend>
        {rsvps.length > 0 ? (
          <div style={{ maxHeight: "250px", overflowY: "auto" }}>
            <ul className="tree-view">
              {rsvps.map((rsvp: any) => (
                <li key={rsvp.respondent_token}>
                  <details>
                    <summary>{rsvp.name}</summary>
                    <ul>
                      {rsvp.selected_slots.map((slot: string) => (
                        <li key={slot}>{new Date(slot).toLocaleString()}</li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>No RSVPs yet.</p>
        )}
      </fieldset>
    </>
  );
}
