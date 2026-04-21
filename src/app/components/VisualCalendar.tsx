"use client";

import React, { useState } from "react";

interface VisualCalendarProps {
  startDate: Date | null;
  startTime: { hour: number; minute: number };
  endTime: { hour: number; minute: number };
  selectedSlots: Set<string>;
  setSelectedSlots: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const formatTimePart = (value: number) => String(value).padStart(2, "0");

export function VisualCalendar({
  startDate,
  startTime,
  endTime,
  selectedSlots,
  setSelectedSlots,
}: VisualCalendarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"select" | "deselect" | null>(null);

  const dates: Date[] = [];
  if (startDate) {
    for (let i = 0; i < 7; i++) {
      const newDate = new Date(startDate);
      newDate.setDate(startDate.getDate() + i);
      dates.push(newDate);
    }
  }

  const timeSlots: string[] = [];
  const startTotalMinutes = startTime.hour * 60 + startTime.minute;
  const endTotalMinutes = endTime.hour * 60 + endTime.minute;

  for (
    let totalMinutes = startTotalMinutes;
    totalMinutes < endTotalMinutes;
    totalMinutes += 30
  ) {
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    timeSlots.push(`${formatTimePart(hour)}:${formatTimePart(minute)}`);
  }

  const getIsoString = (date: Date, time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    const newDate = new Date(date);
    newDate.setHours(hour, minute, 0, 0);
    return newDate.toISOString();
  };

  const handleMouseDown = (isoString: string) => {
    setIsDragging(true);
    const newSelectedSlots = new Set(selectedSlots);
    if (newSelectedSlots.has(isoString)) {
      setDragMode("deselect");
      newSelectedSlots.delete(isoString);
    } else {
      setDragMode("select");
      newSelectedSlots.add(isoString);
    }
    setSelectedSlots(newSelectedSlots);
  };

  const handleMouseEnter = (isoString: string) => {
    if (isDragging) {
      const newSelectedSlots = new Set(selectedSlots);
      if (dragMode === "select") {
        newSelectedSlots.add(isoString);
      } else if (dragMode === "deselect") {
        newSelectedSlots.delete(isoString);
      }
      setSelectedSlots(newSelectedSlots);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragMode(null);
  };

  return (
    <div
      style={{ marginTop: "1rem", overflowX: "auto" }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <table
        className="interactive"
        style={{ width: "100%", tableLayout: "fixed", userSelect: "none" }}
      >
        <thead>
          <tr>
            {dates.map((date, index) => (
              <th key={index} style={{ width: `${100 / 7}%` }}>
                {date
                  .toLocaleDateString(undefined, { weekday: "short" })
                  .toUpperCase()}
                <br />
                {date.toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((time, timeIndex) => (
            <tr key={timeIndex}>
              {dates.map((date, dateIndex) => {
                const isoString = getIsoString(date, time);
                const isSelected = selectedSlots.has(isoString);
                return (
                  <td
                    key={dateIndex}
                    style={{
                      textAlign: "center",
                      backgroundColor: isSelected ? "lightgreen" : "white",
                      cursor: "pointer",
                    }}
                    onMouseDown={() => handleMouseDown(isoString)}
                    onMouseEnter={() => handleMouseEnter(isoString)}
                  >
                    {time}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
