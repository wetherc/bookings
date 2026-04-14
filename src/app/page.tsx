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
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from '@radix-ui/react-icons';

export default function Home() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [blockMinutes, setBlockMinutes] = useState(30); // Default to 30 minutes
  const [selectedDates, setSelectedDates] = useState<Date[]>([]); // For non-contiguous dates
  const [selectedTimesInput, setSelectedTimesInput] = useState('09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00'); // Comma-separated time strings (e.g., "HH:MM")
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return;

    // Toggle selection for non-contiguous dates
    setSelectedDates((prev) =>
      prev.some((d) => d.toDateString() === date.toDateString())
        ? prev.filter((d) => d.toDateString() !== date.toDateString())
        : [...prev, date].sort((a, b) => a.getTime() - b.getTime()) // Keep sorted
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (selectedDates.length === 0) {
        throw new Error('Please select at least one date.');
      }

      const times = selectedTimesInput
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.match(/^([01]\d|2[0-3]):([0-5]\d)$/)); // Basic HH:MM validation

      if (times.length === 0) {
        throw new Error('Please enter valid times (e.g., HH:MM).');
      }

      const time_slots: string[] = [];
      selectedDates.forEach((date) => {
        times.forEach((time) => {
          // Create a new Date object for each combination of date and time
          const [hours, minutes] = time.split(':').map(Number);
          const dateTime = new Date(date);
          dateTime.setHours(hours, minutes, 0, 0); // Set time, seconds, and milliseconds to 0

          // Convert to ISO string, ensuring it's in UTC or a consistent timezone for backend
          // For simplicity, let's assume local time is fine for now and convert to ISO.
          // A more robust solution might involve timezone handling.
          time_slots.push(dateTime.toISOString());
        });
      });
      // Sort time_slots to maintain consistency
      time_slots.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

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
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Create New Event</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <Label htmlFor="title" className="mb-2 block">
                Event Title
              </Label>
              <Input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <Label htmlFor="description" className="mb-2 block">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              ></Textarea>
            </div>

            <div className="mb-4">
              <Label htmlFor="blockMinutes" className="mb-2 block">
                Time Block Duration
              </Label>
              <Select
                value={String(blockMinutes)}
                onValueChange={(value) => setBlockMinutes(Number(value))}
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
              <Label htmlFor="timeSlots" className="mb-2 block">
                Select Dates
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !selectedDates && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDates.length > 0 ? (
                      <span>{`${selectedDates.length} date(s) selected`}</span>
                    ) : (
                      <span>Pick dates</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={(dates) => handleSelectDate(dates as Date | undefined)}
                    initialFocus
                  />
                  <div className="p-2 border-t">
                    <h4 className="text-sm font-semibold mb-1">Selected Dates:</h4>
                    {selectedDates.length > 0 ? (
                      <ul className="text-sm">
                        {selectedDates.map((date, index) => (
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
              <Label htmlFor="selectedTimesInput" className="mb-2 block">
                Available Times (Comma-separated, e.g., HH:MM)
              </Label>
              <Textarea
                id="selectedTimesInput"
                value={selectedTimesInput}
                onChange={(e) => setSelectedTimesInput(e.target.value)}
                rows={3}
                placeholder="e.g., 09:00, 10:00, 14:30"
                required
              ></Textarea>
            </div>

            {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating Event...' : 'Create Event'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
