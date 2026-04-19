"use client";

import { useState } from "react";
import { Calendar } from "./Calendar";

interface DatePickerProps {
    startDate: Date | null;
    endDate: Date | null;
    setStartDate: (date: Date) => void;
    setEndDate: (date: Date | null) => void;
}

export function DatePicker({ startDate, endDate, setStartDate, setEndDate }: DatePickerProps) {
  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false);
  const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false);

  const handleSelectStartDate = (date: Date) => {
    setStartDate(date);
    if (endDate && date > endDate) {
      setEndDate(null);
    }
    setIsStartCalendarOpen(false);
  };

  const handleSelectEndDate = (date: Date) => {
    setEndDate(date);
    setIsEndCalendarOpen(false);
  };

  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <div style={{ position: 'relative' }}>
        <label htmlFor="startDate">Start Date:</label>
        <div className="field-row" style={{ alignItems: 'center' }}>
          <input
            id="startDate"
            type="text"
            readOnly
            value={startDate ? startDate.toLocaleDateString() : ""}
            style={{ width: '150px' }}
            onClick={() => setIsStartCalendarOpen(!isStartCalendarOpen)}
          />
          <button onClick={() => setIsStartCalendarOpen(!isStartCalendarOpen)}>
            📅
          </button>
        </div>
        {isStartCalendarOpen && (
          <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1 }}>
            <Calendar onDateSelect={handleSelectStartDate} initialDate={startDate || undefined} />
          </div>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <label htmlFor="endDate">End Date:</label>
        <div className="field-row" style={{ alignItems: 'center' }}>
          <input
            id="endDate"
            type="text"
            readOnly
            value={endDate ? endDate.toLocaleDateString() : ""}
            style={{ width: '150px' }}
            onClick={() => setIsEndCalendarOpen(!isEndCalendarOpen)}
          />
          <button onClick={() => setIsEndCalendarOpen(!isEndCalendarOpen)}>
            📅
          </button>
        </div>
        {isEndCalendarOpen && (
          <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1 }}>
            <Calendar onDateSelect={handleSelectEndDate} initialDate={endDate || undefined} minDate={startDate || undefined} />
          </div>
        )}
      </div>
    </div>
  );
}
