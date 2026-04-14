'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { format } from 'date-fns';
import { CalendarIcon, TrashIcon } from '@radix-ui/react-icons';

interface TimeRange {
  start: string;
  end: string;
}

interface ProposedSlot {
  dates: Date[];
  timeRanges: TimeRange[];
}

export default function Home() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [blockMinutes, setBlockMinutes] = useState(30);
  const [proposedSlots, setProposedSlots] = useState<ProposedSlot[]>([]);
  const [currentDates, setCurrentDates] = useState<Date[]>([]);
  const [currentTimeRanges, setCurrentTimeRanges] = useState<TimeRange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleAddProposedSlot = () => {
    if (currentDates.length === 0 || currentTimeRanges.length === 0) {
      // Maybe show a more user-friendly error message
      return;
    }
    const newProposedSlot: ProposedSlot = {
      dates: currentDates,
      timeRanges: currentTimeRanges,
    };
    setProposedSlots([...proposedSlots, newProposedSlot]);
    // Reset current selections
    setCurrentDates([]);
    // We don't reset currentTimeRanges here to allow users to apply the same times to different dates.
  };

  const handleRemoveProposedSlot = (index: number) => {
    setProposedSlots(proposedSlots.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (proposedSlots.length === 0) {
        throw new Error('Please add at least one time slot to the event.');
      }

      const time_slots: string[] = [];
      proposedSlots.forEach((slot) => {
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
              current.setMinutes(current.getMinutes() + blockMinutes);
            }
          });
        });
      });

      // Remove duplicates and sort
      const unique_time_slots = [...new Set(time_slots)].sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      );

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          block_minutes: blockMinutes,
          time_slots: unique_time_slots,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event');
      }

      const { event_id, admin_token } = await response.json();
      router.push(`/events/${event_id}/admin?token=${admin_token}`);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
      console.error('Event creation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-primary/10 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Create a New Event</CardTitle>
          <p className="text-muted-foreground text-center text-sm">
            Fill out the form below to create a new event.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="blockMinutes">Time Block Duration</Label>
              <Select
                value={String(blockMinutes)}
                onValueChange={(value) => setBlockMinutes(Number(value))}
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

            <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
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
                          !currentDates.length && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {currentDates.length > 0 ? (
                          <span>{`${currentDates.length} date(s) selected`}</span>
                        ) : (
                          <span>Pick dates</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="multiple"
                        selected={currentDates}
                        onSelect={(dates) => setCurrentDates(dates || [])}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>2. Select Time Ranges</Label>
                  <TimeRangePicker onTimeRangesChange={setCurrentTimeRanges} />
                </div>
              </div>
              <Button
                type="button"
                onClick={handleAddProposedSlot}
                className="w-full"
                disabled={currentDates.length === 0 || currentTimeRanges.length === 0}
              >
                Add to Event
              </Button>
            </div>

            {proposedSlots.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Proposed Event Slots</h3>
                <ul className="space-y-2">
                  {proposedSlots.map((slot, index) => (
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
                        onClick={() => handleRemoveProposedSlot(index)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && <p className="text-destructive text-xs italic">{error}</p>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating Event...' : 'Create Event'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
