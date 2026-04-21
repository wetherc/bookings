"use client";

import { useState } from "react";
import { EventDurationSelector } from "./EventDurationSelector";

interface EventData {
  title: string;
  description: string;
  block_minutes: number;
}

interface EventDetailsProps {
  event: EventData;
  onSave: (updatedDetails: Partial<EventData>) => Promise<void>;
}

export function EventDetails({ event, onSave }: EventDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editableTitle, setEditableTitle] = useState(event.title);
  const [editableDescription, setEditableDescription] = useState(
    event.description || "",
  );
  const [editableBlockMinutes, setEditableBlockMinutes] = useState(
    event.block_minutes,
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    // Reset fields to current state in case of previous edits
    setEditableTitle(event.title);
    setEditableDescription(event.description || "");
    setEditableBlockMinutes(event.block_minutes);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        title: editableTitle,
        description: editableDescription,
        block_minutes: Number(editableBlockMinutes),
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <fieldset>
      <legend>Event Details</legend>
      {isEditing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
  );
}
