"use client";

import { useState, useEffect } from 'react';

const formatTimePart = (value: number) => String(value).padStart(2, '0');

interface EventRsvpViewProps {
  eventId: string;
  respondentToken?: string;
  onTitleLoaded: (title: string, type: 'admin' | 'rsvp') => void;
}

export function EventRsvpView({ eventId, respondentToken, onTitleLoaded }: EventRsvpViewProps) {
  const [eventData, setEventData] = useState<any>(null);
  const [respondentName, setRespondentName] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rsvpSaved, setRsvpSaved] = useState(false);

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

        // If respondentToken exists, fetch existing RSVP
        if (respondentToken) {
          const rsvpRes = await fetch(`/api/rsvps/${eventId}?token=${respondentToken}`);
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
  }, [eventId, respondentToken]);

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
      const method = respondentToken ? 'PUT' : 'POST';
      const url = respondentToken 
        ? `/api/rsvps/${eventId}?token=${respondentToken}` 
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
      if (responseData.respondent_token && !respondentToken) {
        // If it was a new RSVP, update the URL (or local storage for tab) with the new token
        // For now, we'll just acknowledge success. Later, might update tab state to include token.
        console.log("New RSVP created, token:", responseData.respondent_token);
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


  return (
    <>
      <fieldset>
        <legend>RSVP for {eventData.title}</legend>
        <p><strong>Description:</strong> {eventData.description || 'N/A'}</p>
        <p>Select the times you are available. Each slot is {eventData.block_minutes} minutes.</p>
      </fieldset>

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
          <ul className="tree-view">
            {allPossibleSlots.map(slot => (
              <li key={slot}>
                <input 
                  type="checkbox" 
                  id={slot} 
                  checked={selectedSlots.includes(slot)} 
                  onChange={() => handleSlotSelection(slot)} 
                  disabled={isSubmitting}
                />
                <label htmlFor={slot} style={{ marginLeft: '0.5rem' }}>
                  {new Date(slot).toLocaleString()}
                </label>
              </li>
            ))}
          </ul>
        </div>
      </fieldset>

      <div style={{ marginTop: "1rem", textAlign: "right" }}>
        {rsvpSaved && <span style={{ color: 'green', marginRight: '1rem' }}>RSVP Saved!</span>}
        <button onClick={handleSubmitRsvp} disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save RSVP'}
        </button>
      </div>
    </>
  );
}
