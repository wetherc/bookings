"use client";

import { useState, useEffect, type SetStateAction } from "react";
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

interface TimeSlotManagerState {
  startDate: Date | null;
  endDate: Date | null;
  startTime: { hour: number; minute: number };
  endTime: { hour: number; minute: number };
  calendarType: string;
  selectedVisualSlots: Set<string>;
}

// Using a different session storage key to avoid conflicts
const SESSION_STORAGE_KEY = "timeSlotManagerState";

export function TimeSlotManager({
  eventTimes,
  setEventTimes,
}: TimeSlotManagerProps) {
  const [state, setState] = useState<TimeSlotManagerState>(() => {
    if (typeof window !== "undefined") {
      const savedState = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        return {
          startDate: parsed.startDate ? new Date(parsed.startDate) : new Date(),
          endDate: parsed.endDate ? new Date(parsed.endDate) : null,
          startTime: parsed.startTime || { hour: 9, minute: 0 },
          endTime: parsed.endTime || { hour: 17, minute: 0 },
          calendarType: parsed.calendarType || "Traditional",
          selectedVisualSlots: new Set(
            (parsed.selectedVisualSlots || []) as string[],
          ),
        };
      }
    }
    return {
      startDate: new Date(),
      endDate: null,
      startTime: { hour: 9, minute: 0 },
      endTime: { hour: 17, minute: 0 },
      calendarType: "Traditional",
      selectedVisualSlots: new Set<string>(),
    };
  });

  const {
    startDate,
    endDate,
    startTime,
    endTime,
    calendarType,
    selectedVisualSlots,
  } = state;

  const [alert, setAlert] = useState({ isOpen: false, message: "" });

  // The session storage logic from CreateEventForm is probably not fully needed here,
  // especially if this component is used in different contexts.
  // For now, I'll include it but it might need adjustment.
  // The state it saves/loads is local to this component.

  useEffect(() => {
    const stateToSave = {
      ...state,
      selectedVisualSlots: Array.from(state.selectedVisualSlots),
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToSave));
  }, [state]);

  const handleStartTimeChange = (part: "hour" | "minute", value: number) => {
    const newStartTime = { ...startTime, [part]: value };
    setState((s) => ({ ...s, startTime: newStartTime }));

    if (startDate && endDate && startDate.getTime() === endDate.getTime()) {
      const startTotalMinutes = newStartTime.hour * 60 + newStartTime.minute;
      const endTotalMinutes = endTime.hour * 60 + endTime.minute;
      if (startTotalMinutes > endTotalMinutes) {
        setState((s) => ({ ...s, endTime: newStartTime }));
      }
    }
  };

  const handleEndTimeChange = (part: "hour" | "minute", value: number) => {
    const newEndTime = { ...endTime, [part]: value };
    setState((s) => ({ ...s, endTime: newEndTime }));
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
        startDate: new Date(
          new Date(loopDate).setHours(startTime.hour, startTime.minute, 0, 0),
        ),
        endDate: new Date(
          new Date(loopDate).setHours(endTime.hour, endTime.minute, 0, 0),
        ),
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
    setState((s) => ({ ...s, selectedVisualSlots: new Set() }));
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
          onChange={(e) =>
            setState((s) => ({ ...s, calendarType: e.target.value }))
          }
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
              setStartDate={(newStartDate: SetStateAction<Date | null>) => {
                setState((prevState) => {
                  const resolvedDate =
                    typeof newStartDate === "function"
                      ? newStartDate(prevState.startDate)
                      : newStartDate;
                  return { ...prevState, startDate: resolvedDate };
                });
              }}
              setEndDate={(newEndDate: SetStateAction<Date | null>) => {
                setState((prevState) => {
                  const resolvedDate =
                    typeof newEndDate === "function"
                      ? newEndDate(prevState.endDate)
                      : newEndDate;
                  return { ...prevState, endDate: resolvedDate };
                });
              }}
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
              setStartDate={(newStartDate: SetStateAction<Date | null>) => {
                setState((prevState) => {
                  const resolvedDate =
                    typeof newStartDate === "function"
                      ? newStartDate(prevState.startDate)
                      : newStartDate;
                  return { ...prevState, startDate: resolvedDate };
                });
              }}
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
              setSelectedSlots={(
                newSelectedSlots: SetStateAction<Set<string>>,
              ) => {
                setState((prevState) => {
                  const resolvedSlots =
                    typeof newSelectedSlots === "function"
                      ? newSelectedSlots(prevState.selectedVisualSlots)
                      : newSelectedSlots;
                  return { ...prevState, selectedVisualSlots: resolvedSlots };
                });
              }}
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
                    {segment.date.toLocaleDateString()} from{" "}
                    {formatTimePart(segment.startTime.hour)}:
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
