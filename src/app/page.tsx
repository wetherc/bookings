'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [blockMinutes, setBlockMinutes] = useState(30); // Default to 30 minutes
  const [timeSlotsInput, setTimeSlotsInput] = useState(''); // Comma-separated or JSON string
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Basic parsing for time slots (e.g., comma-separated ISO strings)
      // TODO: Replace with a more robust and user-friendly date/time picker component
      const time_slots = timeSlotsInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          block_minutes: blockMinutes,
          time_slots,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event');
      }

      const { event_id, admin_token } = await response.json();
      // Redirect to the admin page for the newly created event
      router.push(`/events/${event_id}/admin?token=${admin_token}`);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
      console.error('Event creation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Create New Event</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2">
              Event Title
            </label>
            <input
              type="text"
              id="title"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
                  name="blockMinutes"
                  value={15}
                  checked={blockMinutes === 15}
                  onChange={() => setBlockMinutes(15)}
                />
                <span className="ml-2">15 mins</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="blockMinutes"
                  value={30}
                  checked={blockMinutes === 30}
                  onChange={() => setBlockMinutes(30)}
                />
                <span className="ml-2">30 mins</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="blockMinutes"
                  value={60}
                  checked={blockMinutes === 60}
                  onChange={() => setBlockMinutes(60)}
                />
                <span className="ml-2">60 mins</span>
              </label>
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="timeSlotsInput" className="block text-gray-700 text-sm font-bold mb-2">
              Time Slots (Comma-separated ISO Date-Time Strings)
            </label>
            <textarea
              id="timeSlotsInput"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={timeSlotsInput}
              onChange={(e) => setTimeSlotsInput(e.target.value)}
              rows={5}
              placeholder="e.g., 2024-05-01T10:00:00, 2024-05-01T11:00:00"
              required
            ></textarea>
            {/* TODO: Implement a user-friendly date/time picker for selecting time slots */}
          </div>

          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}

          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Event...' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
}
