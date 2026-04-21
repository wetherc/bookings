"use client";

import { useState, useEffect } from "react";
import { VisualCalendar } from "./VisualCalendar";
import { DatePicker } from "./DatePicker";
import { Alert } from "./Alert";
import {
  type EventTime,
  formatTimePart,
  getDisplaySegments,
  mergeEventTimes,
} from "@/lib/utils";

interface TimeSlotManagerProps {
  eventTimes: EventTime[];
  setEventTimes: React.Dispatch<React.SetStateAction<EventTime[]>>;
}

interface SerializedEventTime {
  id: number;
  startDate: string;
  endDate: string;
  startTime: { hour: number; minute: number };
  endTime: { hour: number; minute: number };
}

// Using a different session storage key to avoid conflicts
const SESSION_STORAGE_KEY = "timeSlotManagerState";

export function TimeSlotManager({
  eventTimes,
  setEventTimes,
}: TimeSlotManagerProps) {
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState({ hour: 9, minute: 0 });
  const [endTime, setEndTime] = useState({ hour: 17, minute: 0 });
  const [alert, setAlert] = useState({ isOpen: false, message: "" });
  const [calendarType, setCalendarType] = useState("Traditional");
  const [selectedVisualSlots, setSelectedVisualSlots] = useState<Set<string>>(
    new Set()
  );

  // The session storage logic from CreateEventForm is probably not fully needed here,
  // especially if this component is used in different contexts.
  // For now, I'll include it but it might need adjustment.
  // The state it saves/loads is local to this component.

  useEffect(() => {
    const savedState = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      setStartDate(parsed.startDate ? new Date(parsed.startDate) : new Date());
      setEndDate(parsed.endDate ? new Date(parsed.endDate) : null);
      setStartTime(parsed.startTime || { hour: 9, minute: 0 });
      setEndTime(parsed.endTime || { hour: 17, minute: 0 });
      setCalendarType(parsed.calendarType || "Traditional");
      setSelectedVisualSlots(
        new Set((parsed.selectedVisualSlots || []) as string[])
      );
    }
  }, []);

  useEffect(() => {
    const stateToSave = {
      startDate,
      endDate,
      startTime,
      endTime,
      calendarType,
      selectedVisualSlots: Array.from(selectedVisualSlots),
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [
    startDate,
    endDate,
    startTime,
    endTime,
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
    const exclusiveEndDate = new Date(endDate);
    exclusiveEndDate.setDate(exclusiveEndDate.getDate() + 1);

    while (loopDate < exclusiveEndDate) {
      const newEventTime: EventTime = {
        id: loopDate.getTime() + startTotalMinutes, // Reasonably unique key
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
    </>
  );
}
