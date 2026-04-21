"use client";

import { groupAndFormatSlots } from "@/lib/utils";

interface RsvpData {
  respondent_token: string;
  name: string;
  selected_slots: string[];
}

interface RsvpListProps {
  rsvps: RsvpData[];
  blockMinutes: number;
}

export function RsvpList({ rsvps, blockMinutes }: RsvpListProps) {
  return (
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
                    {groupAndFormatSlots(rsvp.selected_slots, blockMinutes).map(
                      (formattedSlot) => (
                        <li key={formattedSlot}>{formattedSlot}</li>
                      ),
                    )}
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
  );
}
