'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from '@radix-ui/react-icons';

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
  const [editSelectedDates, setEditSelectedDates] = useState<Date[]>([]); // For non-contiguous dates
  const [editSelectedTimesInput, setEditSelectedTimesInput] = useState('09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00'); // Comma-separated time strings (e.g., "HH:MM")
  const [isUpdatingEvent, setIsUpdatingEvent] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const publicLink = typeof window !== 'undefined' ? `${window.location.origin}/events/${eventId}` : '';

  const handleSelectEditDate = (date: Date | undefined) => {
    if (!date) return;
    setEditSelectedDates((prev) =>
      prev.some((d) => d.toDateString() === date.toDateString())
        ? prev.filter((d) => d.toDateString() !== date.toDateString())
        : [...prev, date].sort((a, b) => a.getTime() - b.getTime())
    );
  };

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
      // Convert stored ISO strings back to Date objects for the calendar
      setEditSelectedDates(data.event.time_slots.map(s => new Date(s)));
      // Attempt to extract times from the first slot, or use default if none
      if (data.event.time_slots.length > 0) {
        const uniqueTimes = Array.from(new Set(
          data.event.time_slots.map(s => format(new Date(s), 'HH:mm'))
        )).join(',');
        setEditSelectedTimesInput(uniqueTimes);
      }
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
      if (editSelectedDates.length === 0) {
        throw new Error('Please select at least one date.');
      }

      const times = editSelectedTimesInput
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.match(/^([01]\d|2[0-3]):([0-5]\d)$/));

      if (times.length === 0) {
        throw new Error('Please enter valid times (e.g., HH:MM).');
      }

      const updated_time_slots: string[] = [];
      editSelectedDates.forEach((date) => {
        times.forEach((time) => {
          const [hours, minutes] = time.split(':').map(Number);
          const dateTime = new Date(date);
          dateTime.setHours(hours, minutes, 0, 0);
          updated_time_slots.push(dateTime.toISOString());
        });
      });
      updated_time_slots.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

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
          time_slots: updated_time_slots,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }

      setUpdateSuccess(true);
      fetchEventData(); // Re-fetch event data to reflect changes
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
      <Card className="w-full max-w-4xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Admin: {eventData.title}</CardTitle>
          {eventData.description && (
            <p className="text-gray-600 mb-6 text-center">{eventData.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Public Shareable Link</h2>
            <div className="flex items-center">
              <Input
                type="text"
                readOnly
                value={publicLink}
                className="flex-grow p-2"
              />
              <Button
                onClick={() => navigator.clipboard.writeText(publicLink)}
                className="ml-2"
              >
                Copy
              </Button>
            </div>
            <Link href={publicLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline mt-2 block">
              Open Public Page
            </Link>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Edit Event Details</h2>
            <form onSubmit={handleUpdateEvent}>
              <div className="mb-4">
                <Label htmlFor="editTitle" className="mb-2 block">
                  Event Title
                </Label>
                <Input
                  type="text"
                  id="editTitle"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>

              <div className="mb-4">
                <Label htmlFor="editDescription" className="mb-2 block">
                  Description (Optional)
                </Label>
                <Textarea
                  id="editDescription"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                ></Textarea>
              </div>

              <div className="mb-4">
                <Label htmlFor="editBlockMinutes" className="mb-2 block">
                  Time Block Duration
                </Label>
                <Select
                  value={String(editBlockMinutes)}
                  onValueChange={(value) => setEditBlockMinutes(Number(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 Minutes</SelectItem>
                    <SelectItem value="30">30 Minutes</SelectItem>
                    <SelectItem value="60">60 Minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-6">
                <Label htmlFor="editTimeSlots" className="mb-2 block">
                  Select Dates
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !editSelectedDates && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editSelectedDates.length > 0 ? (
                        <span>{`${editSelectedDates.length} date(s) selected`}</span>
                      ) : (
                        <span>Pick dates</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="multiple"
                      selected={editSelectedDates}
                      onSelect={(dates) => handleSelectEditDate(dates as Date | undefined)}
                      initialFocus
                    />
                    <div className="p-2 border-t">
                      <h4 className="text-sm font-semibold mb-1">Selected Dates:</h4>
                      {editSelectedDates.length > 0 ? (
                        <ul className="text-sm">
                          {editSelectedDates.map((date, index) => (
                            <li key={index}>{format(date, 'PPP')}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No dates selected.</p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="mb-6">
                <Label htmlFor="editSelectedTimesInput" className="mb-2 block">
                  Available Times (Comma-separated, e.g., HH:MM)
                </Label>
                <Textarea
                  id="editSelectedTimesInput"
                  value={editSelectedTimesInput}
                  onChange={(e) => setEditSelectedTimesInput(e.target.value)}
                  rows={3}
                  placeholder="e.g., 09:00, 10:00, 14:30"
                  required
                ></Textarea>
              </div>

              {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
              {updateSuccess && (
                <p className="text-green-500 text-xs italic mb-4">Event updated successfully!</p>
              )}

              <Button type="submit" className="w-full" disabled={isUpdatingEvent}>
                {isUpdatingEvent ? 'Updating Event...' : 'Update Event'}
              </Button>
            </form>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">RSVP Summary</h2>
            {allTimeSlots.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allTimeSlots.map(slot => {
                  const attendees = rsvpSummary[slot];
                  const slotDisplay = format(new Date(slot), 'PPP p');
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
        </CardContent>
      </Card>
    </div>
  );
}
