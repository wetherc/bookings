"use client";

import { useState, useEffect } from 'react';

const formatTimePart = (value: number) => String(value).padStart(2, '0');

interface EventAdminViewProps {
  eventId: string;
  token: string;
  onTitleLoaded: (title: string) => void;
}

export function EventAdminView({ eventId, token, onTitleLoaded }: EventAdminViewProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getEventData() {
      setIsLoading(true);
      setError(null);
      
      const url = `/api/events/${eventId}?token=${token}`;
      
      try {
        const res = await fetch(url);

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || `Error: ${res.status}`);
        }
        
        const fetchedData = await res.json();
        setData(fetchedData);
        if (fetchedData.event?.title) {
          onTitleLoaded(fetchedData.event.title);
        }

      } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    }

    getEventData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, token]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  if (!data) {
    return <div>No data found.</div>;
  }

  const { event, rsvps } = data;
  
  // Construct URLs for display
  const host = window.location.origin;
  const adminUrl = `${host}/events/${eventId}/admin?token=${token}`;
  const rsvpUrl = `${host}/events/${eventId}`;

  return (
    <>
      <fieldset>
        <legend>Event Details</legend>
        <p><strong>Title:</strong> {event.title}</p>
        <p><strong>Description:</strong> {event.description || 'N/A'}</p>
        <p><strong>Time Slot Duration:</strong> {event.block_minutes} minutes</p>
      </fieldset>

      <fieldset style={{ marginTop: '1rem' }}>
        <legend>Event Links</legend>
        <div style={{ marginBottom: '1rem' }}>
          <p>This is your secret admin link. Keep it safe! You'll need it to see this page again.</p>
          <input type="text" readOnly value={adminUrl} style={{ width: '100%' }} />
        </div>
        <div>
          <p>Share this link with your event participants for them to RSVP.</p>
          <input type="text" readOnly value={rsvpUrl} style={{ width: '100%' }} />
        </div>
      </fieldset>

      <fieldset style={{ marginTop: '1rem' }}>
        <legend>Proposed Time Slots</legend>
        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
          <ul className="tree-view">
            {event.time_slots.map((time: any, index: number) => (
              <li key={index}>
                {new Date(time.startDate).toLocaleDateString()} - {new Date(time.endDate).toLocaleDateString()} from {formatTimePart(time.startTime.hour)}:{formatTimePart(time.startTime.minute)} to {formatTimePart(time.endTime.hour)}:{formatTimePart(time.endTime.minute)}
              </li>
            ))}
          </ul>
        </div>
      </fieldset>

      <fieldset style={{ marginTop: '1rem' }}>
        <legend>RSVPs ({rsvps.length})</legend>
        {rsvps.length > 0 ? (
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            <ul className="tree-view">
              {rsvps.map((rsvp: any) => (
                <li key={rsvp.respondent_token}>
                  <strong>{rsvp.name}</strong> has selected:
                  <ul>
                    {rsvp.selected_slots.map((slot: string) => (
                       <li key={slot}>{new Date(slot).toLocaleString()}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>No RSVPs yet.</p>
        )}
      </fieldset>
    </>
  );
}
