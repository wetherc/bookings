'use client';

import * as React from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TimeRange {
  start: string;
  end: string;
}

interface TimeRangePickerProps {
  onTimeRangesChange: (timeRanges: TimeRange[]) => void;
}

export function TimeRangePicker({ onTimeRangesChange }: TimeRangePickerProps) {
  const [timeRanges, setTimeRanges] = React.useState<TimeRange[]>([]);
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('17:00');

  const handleAddRange = () => {
    const newRange = { start: startTime, end: endTime };
    const updatedRanges = [...timeRanges, newRange].sort((a, b) =>
      a.start.localeCompare(b.start)
    );
    setTimeRanges(updatedRanges);
    onTimeRangesChange(updatedRanges);
  };

  const handleRemoveRange = (index: number) => {
    const updatedRanges = timeRanges.filter((_, i) => i !== index);
    setTimeRanges(updatedRanges);
    onTimeRangesChange(updatedRanges);
  };

  // Helper to convert time string "HH:MM" to minutes from midnight
  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Helper to convert minutes from midnight to time string "HH:MM"
  const minutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Selected Time Ranges:</Label>
        </div>
        {timeRanges.length > 0 ? (
          <ul className="space-y-2">
            {timeRanges.map((range, index) => (
              <li
                key={index}
                className="flex items-center justify-between p-2 bg-muted rounded-md"
              >
                <span>
                  {range.start} - {range.end}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveRange(index)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No time ranges added yet.</p>
        )}
      </div>

      <div className="p-4 border rounded-lg space-y-4">
        <h4 className="font-semibold">Add a new time range</h4>
        <div className="flex items-center space-x-4">
          <div className="w-1/2">
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="w-1/2">
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Start Time</Label>
          <Slider
            value={[timeToMinutes(startTime)]}
            onValueChange={(value) => setStartTime(minutesToTime(value[0]))}
            max={24 * 60}
            step={15}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <Label>End Time</Label>
          <Slider
            value={[timeToMinutes(endTime)]}
            onValueChange={(value) => setEndTime(minutesToTime(value[0]))}
            max={24 * 60}
            step={15}
            className="w-full"
          />
        </div>

        <Button onClick={handleAddRange} className="w-full">
          Add Time Range
        </Button>
      </div>
    </div>
  );
}
