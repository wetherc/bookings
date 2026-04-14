'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

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

export default function AdminEventPage() {
  const { eventId } = useParams();
  const searchParams = useSearchParams();
  const adminToken = searchParams.get('token');

  const [eventData, setEventData] = useState<EventData | null>(null);
  const [rsvps, setRsvps] = useState<RsvpData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for editing event details
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBlockMinutes, setEditBlockMinutes] = useState(30);
  const [editTimeSlotsInput, setEditTimeSlotsInput] = useState('');
  const [isUpdatingEvent, setIsUpdatingEvent] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const publicLink = typeof window !== 'undefined' ? `${window.location.origin}/events/${eventId}` : '';

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

      // Initialize edit states
      setEditTitle(data.event.title);
      setEditDescription(data.event.description || '');
      setEditBlockMinutes(data.event.block_minutes);
      setEditTimeSlotsInput(data.event.time_slots.join(', '));
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading event.');
      console.error('Fetch event error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [eventId, adminToken]); // Refetch if eventId or adminToken changes

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingEvent(true);
    setUpdateSuccess(false);
    setError(null);

    if (!adminToken) {
      setError('Admin token missing. Cannot update event.');
      setIsUpdatingEvent(false);
      return;
    }

    try {
      const time_slots = editTimeSlotsInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_token: adminToken, // Pass token for authorization
          title: editTitle,
          description: editDescription,
          block_minutes: editBlockMinutes,
          time_slots: time_slots,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }

      setUpdateSuccess(true);
      // Re-fetch event data to reflect changes
      fetchEventData();
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred during event update.');
      console.error('Event update error:', err);
    } finally {
      setIsUpdatingEvent(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8">Loading event data for admin view...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  }

  if (!eventData || !adminToken) {
    return <div className="text-center p-8 text-red-500">Event not found or unauthorized access.</div>;
  }

  // --- RSVP Visualization ---
  const allTimeSlots = eventData.time_slots.sort(); // Sort for consistent display
  const rsvpSummary: { [slot: string]: string[] } = {};

  allTimeSlots.forEach(slot => {
    rsvpSummary[slot] = []; // Initialize each slot with an empty array of attendees
  });

  rsvps.forEach(rsvp => {
    rsvp.selected_slots.forEach(selectedSlot => {
      if (rsvpSummary[selectedSlot]) {
        rsvpSummary[selectedSlot].push(rsvp.name);
      }
    });
  });

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-4xl mx-auto mt-8">
        <h1 className="text-3xl font-bold mb-4 text-center">Admin: {eventData.title}</h1>
        {eventData.description && (
          <p className="text-gray-600 mb-6 text-center">{eventData.description}</p>
        )}

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Public Shareable Link</h2>
          <div className="flex items-center">
            <input
              type="text"
              readOnly
              value={publicLink}
              className="flex-grow p-2 border rounded-l-md bg-gray-50 text-gray-700"
            />
            <button
              onClick={() => navigator.clipboard.writeText(publicLink)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r-md"
            >
              Copy
            </button>
          </div>
          <Link href={publicLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline mt-2 block">
            Open Public Page
          </Link>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Edit Event Details</h2>
          <form onSubmit={handleUpdateEvent}>
            <div className="mb-4">
              <label htmlFor="editTitle" className="block text-gray-700 text-sm font-bold mb-2">
                Event Title
              </label>
              <input
                type="text"
                id="editTitle"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="editDescription" className="block text-gray-700 text-sm font-bold mb-2">
                Description (Optional)
              </label>
              <textarea
                id="editDescription"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              ></textarea>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Time Block Duration
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="editBlockMinutes"
                    value={15}
                    checked={editBlockMinutes === 15}
                    onChange={() => setEditBlockMinutes(15)}
                  />
                  <span className="ml-2">15 mins</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="editBlockMinutes"
                    value={30}
                    checked={editBlockMinutes === 30}
                    onChange={() => setEditBlockMinutes(30)}
                  />
                  <span className="ml-2">30 mins</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="editBlockMinutes"
                    value={60}
                    checked={editBlockMinutes === 60}
                    onChange={() => setEditBlockMinutes(60)}
                  />
                  <span className="ml-2">60 mins</span>
                </label>
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="editTimeSlotsInput" className="block text-gray-700 text-sm font-bold mb-2">
                Time Slots (Comma-separated ISO Date-Time Strings)
              </label>
              <textarea
                id="editTimeSlotsInput"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                value={editTimeSlotsInput}
                onChange={(e) => setEditTimeSlotsInput(e.target.value)}
                rows={5}
                placeholder="e.g., 2024-05-01T10:00:00, 2024-05-01T11:00:00"
                required
              ></textarea>
            </div>

            {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
            {updateSuccess && (
              <p className="text-green-500 text-xs italic mb-4">Event updated successfully!</p>
            )}

            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
              disabled={isUpdatingEvent}
            >
              {isUpdatingEvent ? 'Updating Event...' : 'Update Event'}
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">RSVP Summary</h2>
          {allTimeSlots.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allTimeSlots.map(slot => {
                const attendees = rsvpSummary[slot];
                const slotDisplay = new Date(slot).toLocaleString();
                return (
                  <div key={slot} className="p-4 border rounded-lg shadow-sm bg-gray-50">
                    <h3 className="font-semibold mb-2">{slotDisplay}</h3>
                    {attendees && attendees.length > 0 ? (
                      <ul className="list-disc list-inside text-sm">
                        {attendees.map((name, index) => (
                          <li key={index}>{name}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-sm">No RSVPs for this slot.</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No time slots defined for this event.</p>
          )}
        </section>
      </div>
    </div>
  );
}
