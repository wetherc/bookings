"use client";

import { useState } from "react";
import { TimeSlotManager } from "./TimeSlotManager";
import { type EventTime, formatTimePart } from "@/lib/utils";

interface TimeBlock {
  startDate: string;
  endDate: string;
  startTime: { hour: number; minute: number };
  endTime: { hour: number; minute: number };
}

interface TimeSlotsEditorProps {
  timeSlots: TimeBlock[];
  onSave: (updatedTimeSlots: EventTime[]) => Promise<void>;
}

export function TimeSlotsEditor({
  timeSlots,
  onSave,
}: TimeSlotsEditorProps) {
  const [isEditingTimeSlots, setIsEditingTimeSlots] = useState(false);
  const [editableTimeSlots, setEditableTimeSlots] = useState<EventTime[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleEditTimeSlots = () => {
    const timeSlotsWithDateObjects = timeSlots.map((ts, index) => ({
      ...ts,
      id: index, // Simple id for now
      startDate: new Date(ts.startDate),
      endDate: new Date(ts.endDate),
    }));
    setEditableTimeSlots(timeSlotsWithDateObjects);
    setIsEditingTimeSlots(true);
  };

  const handleCancelTimeSlots = () => {
    setIsEditingTimeSlots(false);
    setEditableTimeSlots([]);
  };

  const handleSaveTimeSlots = async () => {
    setIsSaving(true);
    try {
      await onSave(editableTimeSlots);
      setIsEditingTimeSlots(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
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
              {timeSlots.map((time: TimeBlock, index: number) => (
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
  );
}
