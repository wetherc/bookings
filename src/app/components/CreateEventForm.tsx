import { useState, useEffect } from "react";
import { VisualCalendar } from "./VisualCalendar";
import { DatePicker } from "./DatePicker";
import { Alert } from "./Alert";

interface EventTime {
  id: number;
  startDate: Date;
  endDate: Date;
  startTime: { hour: number; minute: number };
  endTime: { hour: number; minute: number };
}

interface CreateEventFormProps {
  onEventCreated: (event: { eventId: string; adminToken: string; eventName: string }) => void;
}

const formatTimePart = (value: number) => String(value).padStart(2, '0');

const SESSION_STORAGE_KEY = "createEventFormState";

const mergeEventTimes = (
  existingTimes: EventTime[],
  newTimes: EventTime[],
): EventTime[] => {
  const allTimes = [...existingTimes, ...newTimes].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime(),
  );

  if (allTimes.length === 0) {
    return [];
  }

  const merged: EventTime[] = [];
  merged.push({ ...allTimes[0] });

  for (let i = 1; i < allTimes.length; i++) {
    const lastMerged = merged[merged.length - 1];
    const current = allTimes[i];

    // Check for overlap or contiguity.
    // The check must be against the full date-time.
    if (current.startDate.getTime() <= lastMerged.endDate.getTime()) {
      // They overlap or are contiguous, so merge them by taking the later end time.
      if (current.endDate.getTime() > lastMerged.endDate.getTime()) {
        lastMerged.endDate = current.endDate;
        lastMerged.endTime = current.endTime;
      }
    } else {
      // They are separate, add the current interval as a new block.
      merged.push({ ...current });
    }
  }

  // Re-assign IDs for stable keys in React.
  return merged.map((time, index) => ({ ...time, id: index }));
};

interface SerializedEventTime {
  id: number;
  startDate: string;
  endDate: string;
  startTime: { hour: number; minute: number };
  endTime: { hour: number; minute: number };
}

const getDisplaySegments = (eventTime: EventTime) => {
  const segments: Array<{
    date: Date;
    startTime: { hour: number; minute: number };
    endTime: { hour: number; minute: number };
  }> = [];

  // eslint-disable-next-line prefer-const
  let currentDay = new Date(eventTime.startDate);
  currentDay.setHours(0, 0, 0, 0); // Normalize to start of day

  const endDay = new Date(eventTime.endDate);
  endDay.setHours(0, 0, 0, 0); // Normalize to start of day

  while (currentDay.getTime() <= endDay.getTime()) {
    const isFirstDay =
      currentDay.getTime() === new Date(eventTime.startDate).setHours(0, 0, 0, 0);
    const isLastDay = currentDay.getTime() === endDay.getTime();

    let segmentStartTime = { hour: 0, minute: 0 };
    let segmentEndTime = { hour: 23, minute: 59 };

    if (isFirstDay) {
      segmentStartTime = eventTime.startTime;
    }
    if (isLastDay) {
      segmentEndTime = eventTime.endTime;
    }

    // Adjust segment end time if it matches the actual event end time on the last day,
    // or if it's the start day and end time is earlier than 23:59
    if (isLastDay) {
      segmentEndTime = eventTime.endTime;
    } else if (isFirstDay) {
      const currentDayEndTime = new Date(currentDay);
      currentDayEndTime.setHours(23, 59, 0, 0);
      const eventEndDateTime = new Date(eventTime.endDate);
      eventEndDateTime.setHours(eventTime.endTime.hour, eventTime.endTime.minute, 0, 0);
      
      // If the event ends on the same day it starts, use its actual end time, not 23:59
      if (eventTime.startDate.setHours(0,0,0,0) === eventTime.endDate.setHours(0,0,0,0)) {
        segmentEndTime = eventTime.endTime;
      } else {
        segmentEndTime = { hour: 23, minute: 59 };
      }

    }


    // Make sure segment start time is not after segment end time
    const startMinutes = segmentStartTime.hour * 60 + segmentStartTime.minute;
    const endMinutes = segmentEndTime.hour * 60 + segmentEndTime.minute;
    if (startMinutes >= endMinutes) {
      // This segment is invalid or represents a zero-duration block, skip
      currentDay.setDate(currentDay.getDate() + 1);
      continue;
    }

    segments.push({
      date: new Date(currentDay), // Push a copy
      startTime: segmentStartTime,
      endTime: segmentEndTime,
    });

    currentDay.setDate(currentDay.getDate() + 1); // Move to the next day
  }

  return segments;
};

export function CreateEventForm({ onEventCreated }: CreateEventFormProps) {
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [blockMinutes, setBlockMinutes] = useState(30);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState({ hour: 9, minute: 0 });
  const [endTime, setEndTime] = useState({ hour: 17, minute: 0 });
  const [eventTimes, setEventTimes] = useState<EventTime[]>([]);
  const [alert, setAlert] = useState({ isOpen: false, message: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [calendarType, setCalendarType] = useState("Traditional");
  const [selectedVisualSlots, setSelectedVisualSlots] = useState<Set<string>>(
    new Set(),
  );

  // Effect to load state from session storage on client-side mount
  useEffect(() => {
    const savedState = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      setEventName(parsed.eventName || "");
      setEventDescription(parsed.eventDescription || "");
      setBlockMinutes(parsed.blockMinutes || 30);
      setStartDate(parsed.startDate ? new Date(parsed.startDate) : new Date());
      setEndDate(parsed.endDate ? new Date(parsed.endDate) : null);
      setStartTime(parsed.startTime || { hour: 9, minute: 0 });
      setEndTime(parsed.endTime || { hour: 17, minute: 0 });
      setEventTimes(
        (parsed.eventTimes || []).map((t: SerializedEventTime) => ({
          ...t,
          startDate: new Date(t.startDate),
          endDate: new Date(t.endDate),
        })),
      );
      setCalendarType(parsed.calendarType || "Traditional");
      setSelectedVisualSlots(
        new Set((parsed.selectedVisualSlots || []) as string[]),
      );
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Effect to save state to session storage whenever it changes
  useEffect(() => {
    const stateToSave = {
      eventName,
      eventDescription,
      blockMinutes,
      startDate,
      endDate,
      startTime,
      endTime,
      eventTimes,
      calendarType,
      selectedVisualSlots: Array.from(selectedVisualSlots),
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [
    eventName,
    eventDescription,
    blockMinutes,
    startDate,
    endDate,
    startTime,
    endTime,
    eventTimes,
    calendarType,
    selectedVisualSlots,
  ]);

  const handleStartTimeChange = (part: "hour" | "minute", value: number) => {
    const newStartTime = { ...startTime, [part]: value };
    setStartTime(newStartTime);

    if (startDate && endDate && startDate.getTime() === endDate.getTime()) {
      const startTotalMinutes = newStartTime.hour * 60 + newStartTime.minute;
      const endTotalMinutes = endTime.hour * 60 + endTime.minute;
      if (startTotalMinutes > endTotalMinutes) {
        setEndTime(newStartTime);
      }
    }
  };

  const handleEndTimeChange = (part: "hour" | "minute", value: number) => {
    const newEndTime = { ...endTime, [part]: value };
    setEndTime(newEndTime);
  };

  const handleAddEventTime = () => {
    if (!startDate || !endDate) {
      setAlert({
        isOpen: true,
        message: "Please select a start and end date.",
      });
      return;
    }

    const startTotalMinutes = startTime.hour * 60 + startTime.minute;
    const endTotalMinutes = endTime.hour * 60 + endTime.minute;
    if (startTotalMinutes >= endTotalMinutes) {
      setAlert({
        isOpen: true,
        message: "The end time must be after the start time.",
      });
      return;
    }

    const newEventTimes: EventTime[] = [];
    const loopDate = new Date(startDate);
    const realEndDate = new Date(endDate);

    while (loopDate <= realEndDate) {
      const newEventTime: EventTime = {
        id: loopDate.getTime() + startTotalMinutes, // Reasonably unique key
        // Create new Date objects to avoid reference issues
        startDate: new Date(new Date(loopDate).setHours(startTime.hour, startTime.minute, 0, 0)),
        endDate: new Date(new Date(loopDate).setHours(endTime.hour, endTime.minute, 0, 0)),
        startTime: startTime,
        endTime: endTime,
      };
      newEventTimes.push(newEventTime);
      loopDate.setDate(loopDate.getDate() + 1);
    }
    setEventTimes(mergeEventTimes(eventTimes, newEventTimes));
  };

  const handleAddVisualSelections = () => {
    if (selectedVisualSlots.size === 0) {
      setAlert({
        isOpen: true,
        message: "Please select at least one time slot on the calendar.",
      });
      return;
    }

    const newEventTimes = Array.from(selectedVisualSlots)
      .sort()
      .map((isoString) => {
        const date = new Date(isoString);
        const endDate = new Date(date.getTime() + 30 * 60 * 1000);
        return {
          id: date.getTime(),
          startDate: date,
          endDate: endDate,
          startTime: {
            hour: date.getHours(),
            minute: date.getMinutes(),
          },
          endTime: {
            hour: endDate.getHours(),
            minute: endDate.getMinutes(),
          },
        };
      });

    setEventTimes(mergeEventTimes(eventTimes, newEventTimes));
    setSelectedVisualSlots(new Set());
  };

  const handleRemoveEventTime = (id: number) => {
    setEventTimes(eventTimes.filter((time) => time.id !== id));
  };

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

  const isSameDay =
    startDate && endDate && startDate.getTime() === endDate.getTime();

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
      <div className="field-row" style={{ marginTop: "1rem" }}>
        <label htmlFor="blockMinutes">Event Duration:</label>
        <select
          id="blockMinutes"
          value={blockMinutes}
          onChange={(e) => setBlockMinutes(parseInt(e.target.value))}
        >
          <option value="30">30 minutes</option>
          <option value="60">60 minutes</option>
          <option value="90">90 minutes</option>
          <option value="120">120 minutes</option>
        </select>
      </div>
      <div className="field-row" style={{ marginTop: "1rem" }}>
        <label htmlFor="calendarType">Calendar Type:</label>
        <select
          id="calendarType"
          value={calendarType}
          onChange={(e) => setCalendarType(e.target.value)}
        >
          <option value="Traditional">Traditional</option>
          <option value="Visual">Visual</option>
        </select>
      </div>
      <fieldset style={{ marginTop: "1rem" }}>
        <legend>Date and Time Selection</legend>
        {calendarType === "Traditional" ? (
          <>
            <DatePicker
              startDate={startDate}
              endDate={endDate}
              setStartDate={setStartDate}
              setEndDate={setEndDate}
            />
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <div>
                <label>Start Time:</label>
                <div className="field-row" style={{ alignItems: "center" }}>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={formatTimePart(startTime.hour)}
                    onChange={(e) =>
                      handleStartTimeChange("hour", parseInt(e.target.value))
                    }
                    style={{ width: "50px" }}
                  />
                  :
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="15"
                    value={formatTimePart(startTime.minute)}
                    onChange={(e) =>
                      handleStartTimeChange(
                        "minute",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    style={{ width: "50px" }}
                  />
                </div>
              </div>
              <div>
                <label>End Time:</label>
                <div className="field-row" style={{ alignItems: "center" }}>
                  <input
                    type="number"
                    min={isSameDay ? startTime.hour : 0}
                    max="23"
                    value={formatTimePart(endTime.hour)}
                    onChange={(e) =>
                      handleEndTimeChange("hour", parseInt(e.target.value))
                    }
                    style={{ width: "50px" }}
                  />
                  :
                  <input
                    type="number"
                    min={
                      isSameDay && startTime.hour === endTime.hour
                        ? startTime.minute
                        : 0
                    }
                    max="59"
                    step="15"
                    value={formatTimePart(endTime.minute)}
                    onChange={(e) =>
                      handleEndTimeChange(
                        "minute",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    style={{ width: "50px" }}
                  />
                </div>
              </div>
            </div>
            <button onClick={handleAddEventTime} style={{ marginTop: "1rem" }}>
              Add to event
            </button>
          </>
        ) : (
          <>
            <DatePicker
              startDate={startDate}
              endDate={null}
              setStartDate={setStartDate}
              setEndDate={() => {}}
              showEndDate={false}
            />
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <div>
                <label>Start Time:</label>
                <div className="field-row" style={{ alignItems: "center" }}>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={formatTimePart(startTime.hour)}
                    onChange={(e) =>
                      handleStartTimeChange("hour", parseInt(e.target.value))
                    }
                    style={{ width: "50px" }}
                  />
                  :
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="15"
                    value={formatTimePart(startTime.minute)}
                    onChange={(e) =>
                      handleStartTimeChange(
                        "minute",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    style={{ width: "50px" }}
                  />
                </div>
              </div>
              <div>
                <label>End Time:</label>
                <div className="field-row" style={{ alignItems: "center" }}>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={formatTimePart(endTime.hour)}
                    onChange={(e) =>
                      handleEndTimeChange("hour", parseInt(e.target.value))
                    }
                    style={{ width: "50px" }}
                  />
                  :
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="15"
                    value={formatTimePart(endTime.minute)}
                    onChange={(e) =>
                      handleEndTimeChange(
                        "minute",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    style={{ width: "50px" }}
                  />
                </div>
              </div>
            </div>
            <VisualCalendar
              startDate={startDate}
              startTime={startTime}
              endTime={endTime}
              selectedSlots={selectedVisualSlots}
              setSelectedSlots={setSelectedVisualSlots}
            />
            <button
              onClick={handleAddVisualSelections}
              style={{ marginTop: "1rem" }}
            >
              Add to event
            </button>
          </>
        )}
      </fieldset>

      <fieldset style={{ marginTop: "1rem" }}>
        <legend>Proposed Event Times</legend>
        <div style={{ maxHeight: "200px", overflowY: "auto" }}>
          <ul className="tree-view">
            {eventTimes.flatMap((time) =>
              getDisplaySegments(time).map((segment, index) => (
                <li key={`${time.id}-${index}`}>
                  <span className="event-time-part">
                    {segment.date.toLocaleDateString()}{" "}
                    from {formatTimePart(segment.startTime.hour)}:
                    {formatTimePart(segment.startTime.minute)} to{" "}
                    {formatTimePart(segment.endTime.hour)}:
                    {formatTimePart(segment.endTime.minute)}
                  </span>
                  <button
                    onClick={() => handleRemoveEventTime(time.id)}
                    style={{ marginLeft: "1rem" }}
                  >
                    Remove
                  </button>
                </li>
              )),
            )}
          </ul>
        </div>
      </fieldset>

      <div style={{ marginTop: "1rem", textAlign: "right" }}>
        <button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Event"}
        </button>
      </div>
    </>
  );
}


