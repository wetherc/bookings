"use client";

import { RsvpAvailabilityGrid } from "./RsvpAvailabilityGrid";

interface RsvpFormProps {
  respondentName: string;
  setRespondentName: (name: string) => void;
  isSubmitting: boolean;
  dates: string[];
  timeSlots: string[];
  dateToTimeMap: Map<string, Set<string>>;
  selectedSlots: string[];
  onSlotSelection: (slot: string) => void;
  onSelectAllForDate: (date: string) => void;
  onSubmit: () => void;
}

export function RsvpForm({
  respondentName,
  setRespondentName,
  isSubmitting,
  dates,
  timeSlots,
  dateToTimeMap,
  selectedSlots,
  onSlotSelection,
  onSelectAllForDate,
  onSubmit,
}: RsvpFormProps) {
  return (
    <>
      <fieldset style={{ marginTop: "1rem" }}>
        <legend>Your Availability</legend>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="respondentName">Your Name:</label>
          <input
            id="respondentName"
            type="text"
            value={respondentName}
            onChange={(e) => setRespondentName(e.target.value)}
            style={{ width: "100%" }}
            disabled={isSubmitting}
          />
        </div>

        <RsvpAvailabilityGrid
          dates={dates}
          timeSlots={timeSlots}
          dateToTimeMap={dateToTimeMap}
          selectedSlots={selectedSlots}
          isSubmitting={isSubmitting}
          onSlotSelection={onSlotSelection}
          onSelectAllForDate={onSelectAllForDate}
        />
      </fieldset>
      <div style={{ marginTop: "1rem", textAlign: "right" }}>
        <button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save RSVP"}
        </button>
      </div>
    </>
  );
}
