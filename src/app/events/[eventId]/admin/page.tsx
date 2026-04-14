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
import { TimeRangePicker } from '@/components/ui/time-range-picker';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, TrashIcon } from '@radix-ui/react-icons';

interface TimeRange {
  start: string;
  end: string;
}

interface ProposedSlot {
  dates: Date[];
  timeRanges: TimeRange[];
}

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
  const [editProposedSlots, setEditProposedSlots] = useState<ProposedSlot[]>([]);
  const [editCurrentDates, setEditCurrentDates] = useState<Date[]>([]);
  const [editCurrentTimeRanges, setEditCurrentTimeRanges] = useState<TimeRange[]>([]);
  const [isUpdatingEvent, setIsUpdatingEvent] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const publicLink = typeof window !== 'undefined' ? `${window.location.origin}/events/${eventId}` : '';

  const handleAddEditProposedSlot = () => {
    if (editCurrentDates.length === 0 || editCurrentTimeRanges.length === 0) {
      return;
    }
    const newProposedSlot: ProposedSlot = {
      dates: editCurrentDates,
      timeRanges: editCurrentTimeRanges,
    };
    setEditProposedSlots([...editProposedSlots, newProposedSlot]);
    setEditCurrentDates([]);
  };

  const handleRemoveEditProposedSlot = (index: number) => {
    setEditProposedSlots(editProposedSlots.filter((_, i) => i !== index));
  };
  
  const groupTimeSlots = (timeSlots: string[], blockMinutes: number): ProposedSlot[] => {
    if (!timeSlots || timeSlots.length === 0) {
        return [];
    }

    const slotsByDate: { [key: string]: Date[] } = {};
    timeSlots.forEach(slot => {
        const date = parseISO(slot);
        const dateString = format(date, 'yyyy-MM-dd');
        if (!slotsByDate[dateString]) {
            slotsByDate[dateString] = [];
        }
        slotsByDate[dateString].push(date);
    });

    const proposedSlots: ProposedSlot[] = [];
    for (const dateString in slotsByDate) {
        const dates = slotsByDate[dateString].sort((a, b) => a.getTime() - b.getTime());
        const timeRanges: TimeRange[] = [];
        
        let currentRange: TimeRange | null = null;
        dates.forEach((date, i) => {
            if (!currentRange) {
                currentRange = { start: format(date, 'HH:mm'), end: '' };
            }

            const nextDate = dates[i + 1];
            if (!nextDate || nextDate.getTime() - date.getTime() > blockMinutes * 60 * 1000) {
                const endDate = new Date(date.getTime() + blockMinutes * 60 * 1000);
                currentRange.end = format(endDate, 'HH:mm');
                timeRanges.push(currentRange);
                currentRange = null;
            }
        });
        
        proposedSlots.push({
            dates: [parseISO(dateString)],
            timeRanges: timeRanges,
        });
    }

    return proposedSlots;
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
      
      const groupedSlots = groupTimeSlots(data.event.time_slots, data.event.block_minutes);
      setEditProposedSlots(groupedSlots);
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading event.');
      console.error('Fetch event error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [eventId, adminToken]);

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
      if (editProposedSlots.length === 0) {
        throw new Error('Please add at least one time slot to the event.');
      }

      const time_slots: string[] = [];
      editProposedSlots.forEach((slot) => {
        slot.dates.forEach((date) => {
          slot.timeRanges.forEach((range) => {
            const [startHours, startMinutes] = range.start.split(':').map(Number);
            const [endHours, endMinutes] = range.end.split(':').map(Number);

            let current = new Date(date);
            current.setHours(startHours, startMinutes, 0, 0);

            const endDate = new Date(date);
            endDate.setHours(endHours, endMinutes, 0, 0);

            while (current < endDate) {
              time_slots.push(current.toISOString());
              current.setMinutes(current.getMinutes() + editBlockMinutes);
            }
          });
        });
      });

      const unique_time_slots = [...new Set(time_slots)].sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      );

      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_token: adminToken,
          title: editTitle,
          description: editDescription,
          block_minutes: editBlockMinutes,
          time_slots: unique_time_slots,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }

      setUpdateSuccess(true);
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

  const allTimeSlots = eventData.time_slots.sort();
  const rsvpSummary: { [slot: string]: string[] } = {};

  allTimeSlots.forEach(slot => {
    rsvpSummary[slot] = [];
  });

  rsvps.forEach(rsvp => {
    rsvp.selected_slots.forEach(selectedSlot => {
      if (rsvpSummary[selectedSlot]) {
        rsvpSummary[selectedSlot].push(rsvp.name);
      }
    });
  });

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-4xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Admin: {eventData.title}</CardTitle>
          {eventData.description && (
            <p className="text-muted-foreground text-center pt-2">{eventData.description}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">Public Shareable Link</h2>
            <div className="flex items-center">
              <Input type="text" readOnly value={publicLink} className="flex-grow p-2" />
              <Button onClick={() => navigator.clipboard.writeText(publicLink)} className="ml-2">
                Copy
              </Button>
            </div>
            <Link href={publicLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline mt-2 block">
              Open Public Page
            </Link>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Edit Event Details</h2>
            <form onSubmit={handleUpdateEvent} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="editTitle">Event Title</Label>
                <Input
                  id="editTitle"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDescription">Description (Optional)</Label>
                <Textarea
                  id="editDescription"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editBlockMinutes">Time Block Duration</Label>
                <Select
                  value={String(editBlockMinutes)}
                  onValueChange={(value) => setEditBlockMinutes(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 Minutes</SelectItem>
                    <SelectItem value="30">30 Minutes</SelectItem>
                    <SelectItem value="60">60 Minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 border rounded-lg space-y-4">
                <h3 className="font-semibold text-lg">Propose Time Slots</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>1. Select Dates</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !editCurrentDates.length && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editCurrentDates.length > 0 ? (
                            <span>{`${editCurrentDates.length} date(s) selected`}</span>
                          ) : (
                            <span>Pick dates</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="multiple"
                          selected={editCurrentDates}
                          onSelect={(dates) => setEditCurrentDates(dates || [])}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>2. Select Time Ranges</Label>
                    <TimeRangePicker onTimeRangesChange={setEditCurrentTimeRanges} />
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleAddEditProposedSlot}
                  className="w-full"
                  disabled={editCurrentDates.length === 0 || editCurrentTimeRanges.length === 0}
                >
                  Add to Event
                </Button>
              </div>

              {editProposedSlots.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Proposed Event Slots</h3>
                  <ul className="space-y-2">
                    {editProposedSlots.map((slot, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted rounded-md"
                      >
                        <div>
                          <p className="font-semibold">
                            {slot.dates.map(d => format(d, 'PPP')).join(', ')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {slot.timeRanges.map(r => `${r.start}-${r.end}`).join(', ')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEditProposedSlot(index)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {error && <p className="text-destructive text-xs italic">{error}</p>}
              {updateSuccess && (
                <p className="text-green-500 text-xs italic">Event updated successfully!</p>
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
                    <Card key={slot} className="p-4 bg-muted/50">
                      <h3 className="font-semibold mb-2">{slotDisplay}</h3>
                      {attendees && attendees.length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                          {attendees.map((name, index) => (
                            <li key={index}>{name}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground text-sm">No RSVPs for this slot.</p>
                      )}
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">No time slots defined for this event.</p>
            )}
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
