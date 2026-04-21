"use client";

import { CopyToClipboardButton } from "./CopyToClipboardButton";

interface EventLinksProps {
  eventId: string;
  token: string;
}

export function EventLinks({ eventId, token }: EventLinksProps) {
  // Construct URLs for display
  const host = typeof window !== "undefined" ? window.location.origin : "";
  const adminUrl = `${host}/events/${eventId}/admin?token=${token}`;
  const rsvpUrl = `${host}/events/${eventId}`;

  return (
    <fieldset style={{ marginTop: "1rem" }}>
      <legend>Event Links</legend>
      <div style={{ marginBottom: "1rem" }}>
        <p>
          This is your secret admin link. Keep it safe! You&apos;ll need it to
          see this page again.
        </p>
        <div style={{ display: "flex", alignItems: "center" }}>
          <input
            type="text"
            readOnly
            value={adminUrl}
            style={{ flexGrow: 1, marginRight: "0.5rem" }}
          />
          <CopyToClipboardButton
            textToCopy={adminUrl}
            buttonText="Copy URL"
          />
        </div>
      </div>
      <div>
        <p>Share this link with your event participants for them to RSVP.</p>
        <div style={{ display: "flex", alignItems: "center" }}>
          <input
            type="text"
            readOnly
            value={rsvpUrl}
            style={{ flexGrow: 1, marginRight: "0.5rem" }}
          />
          <CopyToClipboardButton textToCopy={rsvpUrl} buttonText="Copy URL" />
        </div>
      </div>
    </fieldset>
  );
}
