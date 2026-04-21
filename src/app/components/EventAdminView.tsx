"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { type EventTime } from "@/lib/utils";
import { Alert } from "./Alert";
import { EventDetails } from "./EventDetails";
import { EventLinks } from "./EventLinks";
import { TimeSlotsEditor } from "./TimeSlotsEditor";
import { AvailabilityGrid } from "./AvailabilityGrid";
import { RsvpList } from "./RsvpList";

// Interfaces (can be moved to a types file later)
interface TimeBlock {
  startDate: string;
  endDate: string;
  startTime: { hour: number; minute: number };
  endTime: { hour: number; minute: number };
}

export interface EventData {
  event_id: string;
  title: string;
  description: string;
  block_minutes: number;
  time_slots: TimeBlock[];
}

export interface RsvpData {
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
  const [editError, setEditError] = useState<string | null>(null);

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
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [eventId, token, onTitleLoaded]);

  useEffect(() => {
    getEventData();
  }, [getEventData]);

  const handleUpdateEvent = async (
    payload: Partial<EventData> | { time_slots: EventTime[] },
  ) => {
    setEditError(null);

    const url = `/api/events/${eventId}`;
    const fullPayload = {
      ...payload,
      admin_token: token,
    };

    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullPayload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Error: ${res.status}`);
      }
      await getEventData(); // Refresh data
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to save. Please try again.";
      setEditError(errorMessage);
      // Re-throw to inform the child component of the failure
      throw e;
    }
  };

  const event = useMemo(() => data?.event, [data?.event]);
  const rsvps = useMemo(() => data?.rsvps || [], [data?.rsvps]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: "red" }}>Error: {error}</div>;
  }

  if (!data || !event) {
    return <div>No data found.</div>;
  }

  return (
    <>
      {editError && (
        <Alert message={editError} onClose={() => setEditError(null)} />
      )}

      <EventDetails event={event} onSave={handleUpdateEvent} />

      <EventLinks eventId={eventId} token={token} />

      <TimeSlotsEditor
        timeSlots={event.time_slots}
        onSave={(updatedTimeSlots) =>
          handleUpdateEvent({ time_slots: updatedTimeSlots })
        }
      />

      <AvailabilityGrid event={event} rsvps={rsvps} />

      <RsvpList rsvps={rsvps} blockMinutes={event.block_minutes} />
    </>
  );
}
