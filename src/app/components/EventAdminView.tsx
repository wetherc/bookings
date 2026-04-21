"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { CopyToClipboardButton } from "./CopyToClipboardButton";
import { EventDurationSelector } from "./EventDurationSelector";
import { TimeSlotManager } from "./TimeSlotManager";
import { type EventTime, formatTimePart } from "@/lib/utils";
import { Alert } from "./Alert";

interface TimeBlock {
  startDate: string;
  endDate: string;
  startTime: { hour: number; minute: number };
  endTime: { hour: number; minute: number };
}

interface EventData {
  event_id: string;
  title: string;
  description: string;
  block_minutes: number;
  time_slots: TimeBlock[];
}

interface RsvpData {
  respondent_token: string;
  name: string;
  selected_slots: string[];
}

interface FetchedData {
  event: EventData;
  rsvps: RsvpData[];
}

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
  const [data, setData] = useState<FetchedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for inline editing
  const [isEditing, setIsEditing] = useState(false);
  const [editableTitle, setEditableTitle] = useState("");
  const [editableDescription, setEditableDescription] = useState("");
  const [editableBlockMinutes, setEditableBlockMinutes] = useState(30);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [isEditingTimeSlots, setIsEditingTimeSlots] = useState(false);
  const [editableTimeSlots, setEditableTimeSlots] = useState<EventTime[]>([]);

  const getEventData = useCallback(async () => {
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
        // Initialize editable fields
        setEditableTitle(fetchedData.event.title);
        setEditableDescription(fetchedData.event.description || "");
        setEditableBlockMinutes(fetchedData.event.block_minutes);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, token]);

  useEffect(() => {
    getEventData();
  }, [getEventData]);

  const handleEdit = () => {
    // Reset fields to current state in case of previous edits
    if (data?.event) {
      setEditableTitle(data.event.title);
      setEditableDescription(data.event.description || "");
      setEditableBlockMinutes(data.event.block_minutes);
    }
    setEditError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setEditError(null);

    const url = `/api/events/${eventId}`;
    const payload = {
      title: editableTitle,
      description: editableDescription,
      block_minutes: Number(editableBlockMinutes),
      admin_token: token,
    };

    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Error: ${res.status}`);
      }

      // Refresh data to show updated details
      await getEventData();
      setIsEditing(false);
    } catch (e) {
      setEditError(
        e instanceof Error ? e.message : "Failed to save. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditTimeSlots = () => {
    if (!data?.event.time_slots) return;
    
    const timeSlotsWithDateObjects = data.event.time_slots.map(
      (ts, index) => ({
        ...ts,
        id: index, // Simple id for now
        startDate: new Date(ts.startDate),
        endDate: new Date(ts.endDate),
      }),
    );
    setEditableTimeSlots(timeSlotsWithDateObjects);
    setIsEditingTimeSlots(true);
  };

  const handleCancelTimeSlots = () => {
    setIsEditingTimeSlots(false);
    setEditableTimeSlots([]);
    setEditError(null);
  };

  const handleSaveTimeSlots = async () => {
    setIsSaving(true);
    setEditError(null);

    const url = `/api/events/${eventId}`;
    const payload = {
      time_slots: editableTimeSlots,
      admin_token: token,
    };

    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Error: ${res.status}`);
      }

      // Refresh data to show updated details
      await getEventData();
      setIsEditingTimeSlots(false);
    } catch (e) {
      setEditError(
        e instanceof Error ? e.message : "Failed to save. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const { dates, timeSlots, dateToTimeMap, allPossibleSlotsSet } = useMemo(() => {
    if (!data?.event || !Array.isArray(data.event.time_slots)) {
      return { dates: [], timeSlots: [], dateToTimeMap: new Map(), allPossibleSlotsSet: new Set<string>() };
    }

    const allPossibleSlots: string[] = [];
    data.event.time_slots.forEach((timeBlock: TimeBlock) => {
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
      allPossibleSlotsSet,
    };
  }, [data?.event]);

  const rsvps = useMemo(() => data?.rsvps || [], [data?.rsvps]);
  const event = useMemo(() => data?.event, [data?.event]);
  // Derive rsvps and event from data here, as they are needed for the next useMemo

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
        const blockDurationMinutes =
          currentContiguousBlock.length * 30;
        if (blockDurationMinutes >= event.block_minutes) {
          currentContiguousBlock.forEach((slot) => qualifiedSlots.add(slot));
        }
      }
    });

    return qualifiedSlots;
  }, [dates, timeSlots, slotCounts, rsvps, event, allPossibleSlotsSet]);

  if (isLoading && !data) {
    // Show initial loading state only on first load
    return <div>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: "red" }}>Error: {error}</div>;
  }

  if (!data || !event) {
    return <div>No data found.</div>;
  }

  // Construct URLs for display
  const host = window.location.origin;
  const adminUrl = `${host}/events/${eventId}/admin?token=${token}`;
  const rsvpUrl = `${host}/events/${eventId}`;

  return (
    <>
      {editError && <Alert message={editError} onClose={() => setEditError(null)} />}
      <fieldset>
        <legend>Event Details</legend>
        {isEditing ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div>
              <label htmlFor="eventTitle" style={{ display: "block" }}>
                Title
              </label>
              <input
                type="text"
                id="eventTitle"
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label htmlFor="eventDescription" style={{ display: "block" }}>
                Description
              </label>
              <textarea
                id="eventDescription"
                value={editableDescription}
                onChange={(e) => setEditableDescription(e.target.value)}
                style={{ width: "100%", minHeight: "80px" }}
              />
            </div>
            <EventDurationSelector
              id="eventDuration"
              label="Event Duration (minutes)"
              value={editableBlockMinutes}
              onChange={setEditableBlockMinutes}
              labelStyle={{ display: "block" }}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button onClick={handleCancel} disabled={isSaving}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p>
              <strong>Title:</strong> {event.title}
            </p>
            <p>
              <strong>Description:</strong> {event.description || "N/A"}
            </p>
            <p>
              <strong>Event Duration:</strong> {event.block_minutes} minutes
            </p>
            <button onClick={handleEdit} style={{ marginTop: "0.5rem" }}>
              Edit
            </button>
          </>
        )}
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>Event Links</legend>
        <div style={{ marginBottom: "1rem" }}>
          <p>
            This is your secret admin link. Keep it safe! You&apos;ll need it to
            see this page again.
          </p>
          <div style={{ display: "flex", alignItems: "center" }}>
            <input
              type="text"
              readOnly
              value={adminUrl}
              style={{ flexGrow: 1, marginRight: "0.5rem" }}
            />
            <CopyToClipboardButton
              textToCopy={adminUrl}
              buttonText="Copy URL"
            />
          </div>
        </div>
        <div>
          <p>Share this link with your event participants for them to RSVP.</p>
          <div style={{ display: "flex", alignItems: "center" }}>
            <input
              type="text"
              readOnly
              value={rsvpUrl}
              style={{ flexGrow: 1, marginRight: "0.5rem" }}
            />
            <CopyToClipboardButton textToCopy={rsvpUrl} buttonText="Copy URL" />
          </div>
        </div>
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>Proposed Time Slots</legend>
        {isEditingTimeSlots ? (
          <>
            <TimeSlotManager
              eventTimes={editableTimeSlots}
              setEventTimes={setEditableTimeSlots}
            />
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
              <button onClick={handleSaveTimeSlots} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={handleCancelTimeSlots} disabled={isSaving}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ maxHeight: "150px", overflowY: "auto" }}>
              <ul className="tree-view">
                {event.time_slots.map((time: TimeBlock, index: number) => (
                  <li key={index}>
                    {new Date(time.startDate).toLocaleDateString()} from{" "}
                    {formatTimePart(time.startTime.hour)}:
                    {formatTimePart(time.startTime.minute)} to{" "}
                    {formatTimePart(time.endTime.hour)}:
                    {formatTimePart(time.endTime.minute)}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={handleEditTimeSlots}
              style={{ marginTop: "0.5rem" }}
            >
              Edit Time Slots
            </button>
          </>
        )}
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

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>RSVPs ({rsvps.length})</legend>
        {rsvps.length > 0 ? (
          <div style={{ maxHeight: "250px", overflowY: "auto" }}>
            <ul className="tree-view">
              {rsvps.map((rsvp: RsvpData) => (
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
