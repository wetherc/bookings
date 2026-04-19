"use client";

import { useState, useEffect } from 'react';

const formatTimePart = (value: number) => String(value).padStart(2, '0');

interface EventRsvpViewProps {
  eventId: string;
  respondentToken?: string;
  onTitleLoaded: (title: string, type: 'admin' | 'rsvp') => void;
}

export function EventRsvpView({ eventId, respondentToken: initialRespondentToken, onTitleLoaded }: EventRsvpViewProps) {
  const [eventData, setEventData] = useState<any>(null);
  const [respondentName, setRespondentName] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rsvpSaved, setRsvpSaved] = useState(false);
  const [currentRespondentToken, setCurrentRespondentToken] = useState<string | undefined>(initialRespondentToken);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      setRsvpSaved(false);

      try {
        // Fetch event details
        const eventRes = await fetch(`/api/events/${eventId}`); // No token for public view
        if (!eventRes.ok) {
          const errorData = await eventRes.json();
          throw new Error(errorData.message || `Error fetching event: ${eventRes.status}`);
        }
        const fetchedEventData = await eventRes.json();
        setEventData(fetchedEventData.event);
        onTitleLoaded(fetchedEventData.event.title, 'rsvp');

        // If currentRespondentToken exists, fetch existing RSVP
        if (currentRespondentToken) {
          const rsvpRes = await fetch(`/api/rsvps/${eventId}?token=${currentRespondentToken}`);
          if (!rsvpRes.ok) {
            // If RSVP not found for token, proceed without pre-filling
            if (rsvpRes.status !== 404) {
              const errorData = await rsvpRes.json();
              throw new Error(errorData.message || `Error fetching RSVP: ${rsvpRes.status}`);
            }
          } else {
            const fetchedRsvpData = await rsvpRes.json();
            setRespondentName(fetchedRsvpData.name);
            setSelectedSlots(fetchedRsvpData.selected_slots);
            setRsvpSaved(true); // Pre-fill implies it's already saved
          }
        }

      } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, currentRespondentToken]);

  const handleSlotSelection = (slot: string) => {
    setSelectedSlots(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );
  };

  const handleSubmitRsvp = async () => {
    if (!respondentName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (selectedSlots.length === 0) {
      setError("Please select at least one time slot.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const method = currentRespondentToken ? 'PUT' : 'POST';
      const url = currentRespondentToken 
        ? `/api/rsvps/${eventId}?token=${currentRespondentToken}` 
        : `/api/rsvps`;

      const body = {
        eventId,
        name: respondentName,
        selectedSlots: selectedSlots,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to ${method === 'POST' ? 'create' : 'update'} RSVP.`);
      }

      const responseData = await res.json();
      if (responseData.respondent_token && !currentRespondentToken) {
        setCurrentRespondentToken(responseData.respondent_token);
        // This is where you would ideally update the parent tab state
        // to persist the respondentToken in the tab.
      }
      setRsvpSaved(true);

    } catch (e) {
      setError(e instanceof Error ? e.message : "An unknown error occurred during RSVP submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div>Loading event for RSVP...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  if (!eventData) {
    return <div>Event not found or cannot be RSVP'd to.</div>;
  }

  // Generate all possible time slots for the event
  const allPossibleSlots: string[] = [];
  eventData.time_slots.forEach((timeBlock: any) => {
    const start = new Date(timeBlock.startDate);
    const end = new Date(timeBlock.endDate);
    
    // Iterate over each day in the range
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const currentSlotStart = new Date(d);
      currentSlotStart.setHours(timeBlock.startTime.hour, timeBlock.startTime.minute, 0, 0);

      const currentSlotEnd = new Date(d);
      currentSlotEnd.setHours(timeBlock.endTime.hour, timeBlock.endTime.minute, 0, 0);

      let currentBlock = new Date(currentSlotStart);
      while (currentBlock < currentSlotEnd) {
        allPossibleSlots.push(currentBlock.toISOString());
        currentBlock.setMinutes(currentBlock.getMinutes() + eventData.block_minutes);
      }
    }
  });

  const rsvpLink = currentRespondentToken 
    ? `${window.location.origin}/events/${eventId}?token=${currentRespondentToken}`
    : '';

  return (
    <>
      <fieldset>
        <legend>RSVP for {eventData.title}</legend>
        <p><strong>Description:</strong> {eventData.description || 'N/A'}</p>
        {!rsvpSaved && <p>Select the times you are available. Each slot is {eventData.block_minutes} minutes.</p>}
      </fieldset>

      {!rsvpSaved ? (
        <fieldset style={{ marginTop: '1rem' }}>
          <legend>Your Availability</legend>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="respondentName">Your Name:</label>
            <input 
              id="respondentName" 
              type="text" 
              value={respondentName} 
              onChange={e => setRespondentName(e.target.value)} 
              style={{ width: '100%' }} 
              disabled={isSubmitting}
            />
          </div>

          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            <div style={{ paddingTop: '0.5rem' }}>
              {allPossibleSlots.map(slot => (
                <div key={slot} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <input 
                    type="checkbox" 
                    id={slot} 
                    checked={selectedSlots.includes(slot)} 
                    onChange={() => handleSlotSelection(slot)} 
                    disabled={isSubmitting}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <label htmlFor={slot}>
                    {new Date(slot).toLocaleString()}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </fieldset>
      ) : (
        <fieldset style={{ marginTop: '1rem' }}>
          <legend>Your Submitted Availability</legend>
          <p>Thank you for submitting your availability!</p>
          <p><strong>Your Name:</strong> {respondentName}</p>
          <div style={{ maxHeight: '200px', overflowY: 'auto', paddingTop: '0.5rem' }}>
            <p><strong>Selected Slots:</strong></p>
            {selectedSlots.length > 0 ? (
              <ul>
                {selectedSlots.map(slot => (
                  <li key={slot}>{new Date(slot).toLocaleString()}</li>
                ))}
              </ul>
            ) : (
              <p>No slots selected.</p>
            )}
          </div>
          {currentRespondentToken && (
            <div style={{ marginTop: '1rem' }}>
              <p>This is your personal RSVP link. <strong>Save it!</strong> You will need this link to view or edit your availability later.</p>
              <input type="text" readOnly value={rsvpLink} style={{ width: '100%' }} />
            </div>
          )}
        </fieldset>
      )}

      <div style={{ marginTop: "1rem", textAlign: "right" }}>
        {!rsvpSaved && (
          <button onClick={handleSubmitRsvp} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save RSVP'}
          </button>
        )}
        {rsvpSaved && (
            <button onClick={() => setRsvpSaved(false)} disabled={isSubmitting}>Edit RSVP</button>
        )}
      </div>
    </>
  );
}
