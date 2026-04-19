"use client";

import { useState, useEffect, useMemo } from 'react';

const formatTimePart = (value: number) => String(value).padStart(2, '0');

interface TimeInput {
  hour: number;
  minute: number;
}

interface TimeBlock {
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  startTime: TimeInput;
  endTime: TimeInput;
}

interface EventData {
  event_id: string;
  admin_token: string;
  title: string;
  description?: string; // Optional based on SQL schema
  block_minutes: number;
  time_slots: TimeBlock[]; // This is the JSON array
  created_at: string;
}

interface EventRsvpViewProps {
  eventId: string;
  respondentToken?: string;
  onTitleLoaded: (title: string, type: 'admin' | 'rsvp') => void;
}

export function EventRsvpView({ eventId, respondentToken: initialRespondentToken, onTitleLoaded }: EventRsvpViewProps) {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [respondentName, setRespondentName] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rsvpSaved, setRsvpSaved] = useState(false);
  const [currentRespondentToken, setCurrentRespondentToken] = useState<string | undefined>(initialRespondentToken);

  const { dates, timeSlots, dateToTimeMap } = useMemo(() => {
    if (!eventData || !Array.isArray(eventData.time_slots)) {
      return { dates: [], timeSlots: [], dateToTimeMap: new Map() };
    }

    const allPossibleSlots: string[] = [];
    eventData.time_slots.forEach((timeBlock: TimeBlock) => {
      const start = new Date(timeBlock.startDate);
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(timeBlock.endDate);
      end.setUTCHours(0, 0, 0, 0);
      
      // Loop through each day in UTC using a standard while loop
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const currentSlotStart = new Date(currentDate.getTime());
        currentSlotStart.setUTCHours(timeBlock.startTime.hour, timeBlock.startTime.minute, 0, 0);

        const currentSlotEnd = new Date(currentDate.getTime());
        currentSlotEnd.setUTCHours(timeBlock.endTime.hour, timeBlock.endTime.minute, 0, 0);
        
        const currentBlock = new Date(currentSlotStart.getTime());
        while (currentBlock < currentSlotEnd) {
          allPossibleSlots.push(currentBlock.toISOString());
          currentBlock.setUTCMinutes(currentBlock.getUTCMinutes() + 30);
        }
        
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }
    });

    const dateToTimeMap = new Map<string, Set<string>>();
    const timeSet = new Set<string>();

    allPossibleSlots.forEach(isoString => {
      const date = new Date(isoString);
      const dateKey = `${date.getUTCFullYear()}-${formatTimePart(date.getUTCMonth() + 1)}-${formatTimePart(date.getUTCDate())}`;
      const timeKey = `${formatTimePart(date.getUTCHours())}:${formatTimePart(date.getUTCMinutes())}`;
      
      if (!dateToTimeMap.has(dateKey)) {
        dateToTimeMap.set(dateKey, new Set());
      }
      dateToTimeMap.get(dateKey)!.add(timeKey);
      timeSet.add(timeKey);
    });

    return {
      dates: Array.from(dateToTimeMap.keys()).sort(),
      timeSlots: Array.from(timeSet).sort(),
      dateToTimeMap,
    };
  }, [eventData]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      setRsvpSaved(false);

      try {
        const eventRes = await fetch(`/api/events/${eventId}`);
        if (!eventRes.ok) {
          const errorData = await eventRes.json();
          throw new Error(errorData.message || `Error fetching event: ${eventRes.status}`);
        }
        const fetchedEventData = await eventRes.json();
        
        if (fetchedEventData && fetchedEventData.event) {
          setEventData(fetchedEventData.event);
          onTitleLoaded(fetchedEventData.event.title, 'rsvp');
        } else {
          throw new Error("Event data is missing in API response.");
        }

        if (currentRespondentToken) {
          const rsvpRes = await fetch(`/api/rsvps/${eventId}?token=${currentRespondentToken}`);
          if (!rsvpRes.ok) {
            if (rsvpRes.status !== 404) {
              const errorData = await rsvpRes.json();
              throw new Error(errorData.message || `Error fetching RSVP: ${rsvpRes.status}`);
            }
          } else {
            const fetchedRsvpData = await rsvpRes.json();
            setRespondentName(fetchedRsvpData.name);
            setSelectedSlots(fetchedRsvpData.selected_slots);
            setRsvpSaved(true);
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

  const handleSelectAllForDate = (date: string) => {
    const slotsForDate = dateToTimeMap.get(date);
    if (!slotsForDate) return;

    const isoSlotsForDate = Array.from<string>(slotsForDate).map((time: string) => {
      const [hour, minute] = time.split(':').map(Number);
      const dateObj = new Date(`${date}T00:00:00Z`);
      dateObj.setUTCHours(hour, minute);
      return dateObj.toISOString();
    });

    const allSelected = isoSlotsForDate.every(slot => selectedSlots.includes(slot));

    if (allSelected) {
      setSelectedSlots(prev => prev.filter(s => !isoSlotsForDate.includes(s)));
    } else {
      setSelectedSlots(prev => [...new Set([...prev, ...isoSlotsForDate])]);
    }
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

  const rsvpLink = currentRespondentToken 
    ? `${window.location.origin}/events/${eventId}?token=${currentRespondentToken}`
    : '';

  return (
    <>
      <fieldset>
        <legend>RSVP for {eventData.title}</legend>
        <p><strong>Description:</strong> {eventData.description || 'N/A'}</p>
        {!rsvpSaved && <p>Select the times you are available. The event is {eventData.block_minutes} minutes.</p>}
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

          <div style={{ overflow: 'auto' }}>
            <table className="interactive">
              <thead>
                <tr>
                  <th></th>
                  <th>Date</th>
                  {timeSlots.map(time => <th key={time}>{time}</th>)}
                </tr>
              </thead>
              <tbody>
                {dates.map(date => {
                  const allSlotsForDate = Array.from<string>(dateToTimeMap.get(date) || []).map((time: string) => {
                    const [hour, minute] = time.split(':').map(Number);
                    const dateObj = new Date(`${date}T00:00:00Z`);
                    dateObj.setUTCHours(hour, minute);
                    return dateObj.toISOString();
                  });
                  const areAllSelected = allSlotsForDate.length > 0 && allSlotsForDate.every(slot => selectedSlots.includes(slot));

                  return (
                    <tr key={date}>
                      <td>
                        <input
                          type="checkbox"
                          onChange={() => handleSelectAllForDate(date)}
                          checked={areAllSelected}
                          disabled={isSubmitting || allSlotsForDate.length === 0}
                        />
                      </td>
                      <td>
                        {new Date(date + 'T12:00:00Z').toLocaleDateString(undefined, { timeZone: 'UTC' })}
                      </td>
                      {timeSlots.map(time => {
                        const slotExists = dateToTimeMap.get(date)?.has(time);
                        
                        let isoString = '';
                        if (slotExists) {
                          const [hour, minute] = time.split(':').map(Number);
                          const dateObj = new Date(`${date}T00:00:00Z`);
                          dateObj.setUTCHours(hour, minute);
                          isoString = dateObj.toISOString();
                        }

                        return (
                          <td key={time} style={{ textAlign: 'center' }}>
                            {slotExists && (
                              <input
                                type="checkbox"
                                id={isoString}
                                checked={selectedSlots.includes(isoString)}
                                onChange={() => handleSlotSelection(isoString)}
                                disabled={isSubmitting}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                  <li key={slot}>
                      <span className="datetime-part">{new Date(slot).toLocaleDateString()}</span>
                      <span className="datetime-part">{new Date(slot).toLocaleTimeString()}</span>
                    </li>
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

