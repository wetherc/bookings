"use client";

import { CopyToClipboardButton } from "./CopyToClipboardButton";

interface RsvpConfirmationProps {
  respondentName: string;
  selectedSlots: string[];
  rsvpLink: string;
  onEdit: () => void;
  isSubmitting: boolean;
}

export function RsvpConfirmation({
  respondentName,
  selectedSlots,
  rsvpLink,
  onEdit,
  isSubmitting,
}: RsvpConfirmationProps) {
  return (
    <>
      <fieldset style={{ marginTop: "1rem" }}>
        <legend>Your Submitted Availability</legend>
        <p>Thank you for submitting your availability!</p>
        <p>
          <strong>Your Name:</strong> {respondentName}
        </p>
        <div
          style={{
            maxHeight: "200px",
            overflowY: "auto",
            paddingTop: "0.5rem",
          }}
        >
          <p>
            <strong>Selected Slots:</strong>
          </p>
          {selectedSlots.length > 0 ? (
            <ul>
              {selectedSlots
                .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
                .map((slot) => (
                <li key={slot}>
                  <span className="datetime-part">
                    {new Date(slot).toLocaleDateString([], { timeZone: "UTC" })}
                  </span>
                  <span className="datetime-part">
                    {new Date(slot).toLocaleTimeString([], {
                      timeZone: "UTC",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No slots selected.</p>
          )}
        </div>
        {rsvpLink && (
          <div style={{ marginTop: "1rem" }}>
            <p>
              This is your personal RSVP link. <strong>Save it!</strong> You
              will need this link to view or edit your availability later.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                readOnly
                value={rsvpLink}
                style={{ width: "100%" }}
              />
              <CopyToClipboardButton
                textToCopy={rsvpLink}
                buttonText="Copy URL"
                className="copy-button"
              />
            </div>
          </div>
        )}
      </fieldset>
      <div style={{ marginTop: "1rem", textAlign: "right" }}>
        <button onClick={onEdit} disabled={isSubmitting}>
          Edit RSVP
        </button>
      </div>
    </>
  );
}
