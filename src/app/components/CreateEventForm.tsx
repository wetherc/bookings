import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Alert } from "./Alert";
import { EventDurationSelector } from "./EventDurationSelector";
import { type EventTime } from "@/lib/utils";

const TimeSlotManager = dynamic(
  () => import("./TimeSlotManager").then((mod) => mod.TimeSlotManager),
  {
    ssr: false,
    loading: () => <div>Loading calendar...</div>,
  },
);

interface CreateEventFormProps {
  onEventCreated: (event: {
    eventId: string;
    adminToken: string;
    eventName: string;
  }) => void;
}

const SESSION_STORAGE_KEY = "createEventFormState";

interface SerializedEventTime {
  id: number;
  startDate: string;
  endDate: string;
  startTime: { hour: number; minute: number };
  endTime: { hour: number; minute: number };
}

export function CreateEventForm({ onEventCreated }: CreateEventFormProps) {
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [blockMinutes, setBlockMinutes] = useState(30);
  const [eventTimes, setEventTimes] = useState<EventTime[]>([]);
  const [alert, setAlert] = useState({ isOpen: false, message: "" });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedState = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      setEventName(parsed.eventName || "");
      setEventDescription(parsed.eventDescription || "");
      setBlockMinutes(parsed.blockMinutes || 30);
      setEventTimes(
        (parsed.eventTimes || []).map((t: SerializedEventTime) => ({
          ...t,
          startDate: new Date(t.startDate),
          endDate: new Date(t.endDate),
        })),
      );
    }
  }, []);

  useEffect(() => {
    const stateToSave = {
      eventName,
      eventDescription,
      blockMinutes,
      eventTimes: eventTimes.map(t => ({...t, startDate: t.startDate.toISOString(), endDate: t.endDate.toISOString()})),
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [
    eventName,
    eventDescription,
    blockMinutes,
    eventTimes,
  ]);

  const handleSubmit = async () => {
    if (!eventName.trim()) {
      setAlert({ isOpen: true, message: "Please enter an event name." });
      return;
    }
    if (eventTimes.length === 0) {
      setAlert({
        isOpen: true,
        message: "Please add at least one time slot to the event.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: eventName,
          description: eventDescription,
          block_minutes: blockMinutes,
          time_slots: eventTimes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create event.");
      }

      const { event_id, admin_token } = await response.json();
      
      sessionStorage.removeItem(SESSION_STORAGE_KEY);

      onEventCreated({
        eventId: event_id,
        adminToken: admin_token,
        eventName: eventName,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred.";
      setAlert({ isOpen: true, message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {alert.isOpen && (
        <Alert
          message={alert.message}
          onClose={() => setAlert({ isOpen: false, message: "" })}
        />
      )}
      <div className="field-row">
        <label htmlFor="eventName">Event Name:</label>
        <input
          id="eventName"
          type="text"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          style={{ flexGrow: 1 }}
        />
      </div>
      <div className="field-row" style={{ marginTop: "1rem" }}>
        <label htmlFor="eventDescription">Description:</label>
        <textarea
          id="eventDescription"
          value={eventDescription}
          onChange={(e) => setEventDescription(e.target.value)}
          style={{ flexGrow: 1, height: "unset" }}
        ></textarea>
      </div>
      <EventDurationSelector
        id="blockMinutes"
        label="Event Duration:"
        value={blockMinutes}
        onChange={setBlockMinutes}
        className="field-row"
        style={{ marginTop: "1rem" }}
      />
      <TimeSlotManager eventTimes={eventTimes} setEventTimes={setEventTimes} />
      <div style={{ marginTop: "1rem", textAlign: "right" }}>
        <button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Event"}
        </button>
      </div>
    </>
  );
}


