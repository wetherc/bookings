"use client";

interface RsvpData {
  respondent_token: string;
  name: string;
  selected_slots: string[];
}

interface RsvpListProps {
  rsvps: RsvpData[];
}

export function RsvpList({ rsvps }: RsvpListProps) {
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
  );
}
