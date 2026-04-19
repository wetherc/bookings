"use client";

import { useState, useEffect, useMemo } from 'react';

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

  const { dates, timeSlots, dateToTimeMap } = useMemo(() => {
    if (!data?.event || !Array.isArray(data.event.time_slots)) {
      return { dates: [], timeSlots: [], dateToTimeMap: new Map() };
    }

    const allPossibleSlots: string[] = [];
    data.event.time_slots.forEach((timeBlock: any) => {
      const start = new Date(timeBlock.startDate);
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(timeBlock.endDate);
      end.setUTCHours(0, 0, 0, 0);
      
      let currentDate = new Date(start);
      while (currentDate <= end) {
        const currentSlotStart = new Date(currentDate.getTime());
        currentSlotStart.setUTCHours(timeBlock.startTime.hour, timeBlock.startTime.minute, 0, 0);

        const currentSlotEnd = new Date(currentDate.getTime());
        currentSlotEnd.setUTCHours(timeBlock.endTime.hour, timeBlock.endTime.minute, 0, 0);
        
        let currentBlock = new Date(currentSlotStart.getTime());
        while (currentBlock < currentSlotEnd) {
          allPossibleSlots.push(currentBlock.toISOString());
          currentBlock.setUTCMinutes(currentBlock.getUTCMinutes() + data.event.block_minutes);
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
  }, [data?.event]);

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
  
  const slotCounts = new Map<string, number>();
  if (rsvps) {
    rsvps.forEach((rsvp: any) => {
      rsvp.selected_slots.forEach((slot: string) => {
        slotCounts.set(slot, (slotCounts.get(slot) || 0) + 1);
      });
    });
  }
  
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
        <p><strong>Event Duration:</strong> {event.block_minutes} minutes</p>
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
        <legend>Availability Grid</legend>
        <div style={{ overflow: 'auto' }}>
          <table className="interactive">
            <thead>
              <tr>
                <th>Date</th>
                {timeSlots.map(time => <th key={time}>{time}</th>)}
              </tr>
            </thead>
            <tbody>
              {dates.map(date => (
                <tr key={date}>
                  <td>{new Date(date + 'T12:00:00Z').toLocaleDateString(undefined, { timeZone: 'UTC' })}</td>
                  {timeSlots.map(time => {
                    const slotExists = dateToTimeMap.get(date)?.has(time);
                    
                    let isoString = '';
                    if (slotExists) {
                      const [hour, minute] = time.split(':').map(Number);
                      const dateObj = new Date(`${date}T00:00:00Z`);
                      dateObj.setUTCHours(hour, minute);
                      isoString = dateObj.toISOString();
                    }
                    
                    const count = slotExists ? slotCounts.get(isoString) || 0 : 0;

                    return (
                      <td key={time} style={{ textAlign: 'center', backgroundColor: slotExists ? `rgba(0, 255, 0, ${count / (rsvps.length || 1)})` : 'transparent' }}>
                        {slotExists ? count : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>

      <fieldset style={{ marginTop: '1rem' }}>
        <legend>RSVPs ({rsvps.length})</legend>
        {rsvps.length > 0 ? (
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            <ul className="tree-view">
              {rsvps.map((rsvp: any) => (
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
    </>
  );
}
