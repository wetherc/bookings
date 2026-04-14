'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { nanoid } from 'nanoid'; // For new respondent tokens

interface EventData {
  event_id: string;
  title: string;
  description: string;
  block_minutes: number;
  time_slots: string[];
}

interface RsvpData {
  respondent_token: string;
  name: string;
  selected_slots: string[];
}

interface EventPageData {
  event: EventData;
  rsvps: RsvpData[];
}

export default function EventRsvpPage() {
  const { eventId } = useParams();
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [rsvps, setRsvps] = useState<RsvpData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [respondentName, setRespondentName] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [localRespondentToken, setLocalRespondentToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    // Attempt to load respondent token from local storage
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem(`rsvp_token_${eventId}`);
      if (storedToken) {
        setLocalRespondentToken(storedToken);
      }
    }

    const fetchEventData = async () => {
      if (!eventId) return;

      try {
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch event data');
        }
        const data: EventPageData = await response.json();
        setEventData(data.event);
        setRsvps(data.rsvps);

        // Pre-fill form if existing RSVP found
        if (localRespondentToken) {
          const existingRsvp = data.rsvps.find(
            (rsvp) => rsvp.respondent_token === localRespondentToken
          );
          if (existingRsvp) {
            setRespondentName(existingRsvp.name);
            setSelectedSlots(existingRsvp.selected_slots);
          }
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while loading event.');
        console.error('Fetch event error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [eventId, localRespondentToken]); // Refetch if eventId or localRespondentToken changes

  const handleSlotToggle = (slot: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const handleSubmitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSubmitSuccess(false);

    try {
      let tokenToSend = localRespondentToken;
      if (!tokenToSend) {
        // If no local token, generate a new one for this submission
        tokenToSend = nanoid(32);
      }

      const response = await fetch('/api/rsvps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: eventId,
          respondent_token: tokenToSend,
          name: respondentName,
          selected_slots: selectedSlots,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit RSVP');
      }

      const { respondent_token: returnedToken } = await response.json();
      // Store the token (either new or existing) in local storage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`rsvp_token_${eventId}`, returnedToken);
        setLocalRespondentToken(returnedToken); // Update state to reflect stored token
      }

      setSubmitSuccess(true);
      // Optionally re-fetch event data to show updated RSVPs
      // fetchEventData(); // This would require refactoring fetchEventData to be callable
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred during RSVP submission.');
      console.error('RSVP submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8">Loading event...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  }

  if (!eventData) {
    return <div className="text-center p-8">Event not found.</div>;
  }

  // Calculate available slots considering existing RSVPs
  const allSlots = eventData.time_slots;
  const occupiedSlotsCount: { [key: string]: number } = {};
  rsvps.forEach(rsvp => {
    rsvp.selected_slots.forEach(slot => {
      occupiedSlotsCount[slot] = (occupiedSlotsCount[slot] || 0) + 1;
    });
  });

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl mt-8">
        <h1 className="text-3xl font-bold mb-4 text-center">{eventData.title}</h1>
        {eventData.description && (
          <p className="text-gray-600 mb-6 text-center">{eventData.description}</p>
        )}

        <form onSubmit={handleSubmitRsvp} className="mb-8">
          <div className="mb-4">
            <label htmlFor="respondentName" className="block text-gray-700 text-sm font-bold mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="respondentName"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={respondentName}
              onChange={(e) => setRespondentName(e.target.value)}
              required
            />
          </div>

          <h2 className="text-xl font-semibold mb-4">Select Available Time Slots</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {allSlots.length > 0 ? (
              allSlots.map((slot) => {
                const isSelected = selectedSlots.includes(slot);
                const isOccupied = occupiedSlotsCount[slot] > 0; // Simplified: just show if anyone took it
                const slotDisplay = new Date(slot).toLocaleString(); // Format for display

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => handleSlotToggle(slot)}
                    className={`p-3 rounded-lg text-left transition-colors duration-200
                      ${isSelected
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }
                      ${isOccupied && !isSelected ? 'opacity-60 cursor-not-allowed' : ''}
                    `}
                    disabled={isOccupied && !isSelected}
                  >
                    {slotDisplay} ({eventData.block_minutes} min)
                    {isOccupied && !isSelected && (
                      <span className="ml-2 text-sm"> (taken)</span>
                    )}
                  </button>
                );
              })
            ) : (
              <p className="col-span-full text-gray-500">No time slots available for this event.</p>
            )}
          </div>

          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          {submitSuccess && (
            <p className="text-green-500 text-xs italic mb-4">RSVP submitted successfully!</p>
          )}

          <button
            type="submit"
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Availability'}
          </button>
        </form>

        {/* Display existing RSVPs (simplified for public view) */}
        <h2 className="text-xl font-semibold mt-8 mb-4">Who's attending:</h2>
        {rsvps.length > 0 ? (
          <ul className="list-disc pl-5">
            {rsvps.map((rsvp) => (
              <li key={rsvp.respondent_token} className="text-gray-700">
                {rsvp.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No one has RSVP'd yet.</p>
        )}
      </div>
    </div>
  );
}
