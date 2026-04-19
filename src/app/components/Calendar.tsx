"use client";

import { useState } from "react";

interface CalendarProps {
  onDateSelect: (date: Date) => void;
  initialDate?: Date;
  minDate?: Date;
}

export function Calendar({ onDateSelect, initialDate, minDate }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());

  const changeMonth = (amount: number) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate.getFullYear(), prevDate.getMonth() + amount, 1);
      return newDate;
    });
  };

  const renderHeader = () => {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem" }}>
        <button onClick={() => changeMonth(-1)}>&lt;</button>
        <span>
          {currentDate.toLocaleString("default", { month: "long" })} {currentDate.getFullYear()}
        </span>
        <button onClick={() => changeMonth(1)}>&gt;</button>
      </div>
    );
  };

  const renderDaysOfWeek = () => {
    const days = ["S", "M", "T", "W", "T", "F", "S"];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" }}>
        {days.map((day, index) => (
          <div key={index} style={{ padding: "0.25rem" }}>{day}</div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - monthStart.getDay());
    const endDate = new Date(monthEnd);
    if (monthEnd.getDay() !== 6) {
        endDate.setDate(endDate.getDate() + (6 - monthEnd.getDay()));
    }

    const rows = [];
    let day = new Date(startDate);

    const minDateNormalized = minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) : null;

    while (day <= endDate) {
      const days = [];
      const rowStartDate = new Date(day);
      for (let i = 0; i < 7; i++) {
        const cloneDay = new Date(day);
        cloneDay.setHours(0, 0, 0, 0);
        const isDisabled = minDateNormalized && cloneDay < minDateNormalized;
        
        days.push(
          <div
            key={cloneDay.toISOString()}
            style={{
              padding: "0.25rem",
              textAlign: "center",
              cursor: isDisabled ? "not-allowed" : "pointer",
              backgroundColor: cloneDay.getMonth() !== currentDate.getMonth() ? "#f0f0f0" : "#fff",
              color: isDisabled ? "#aaa" : "#000",
            }}
            onClick={() => !isDisabled && onDateSelect(cloneDay)}
          >
            {cloneDay.getDate()}
          </div>
        );
        day.setDate(day.getDate() + 1);
      }
      rows.push(
        <div key={rowStartDate.toISOString()} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {days}
        </div>
      );
    }
    return <div>{rows}</div>;
  };

  return (
    <div className="window" style={{ width: "250px" }}>
        <div className="title-bar">
            <div className="title-bar-text">Select a date</div>
        </div>
      <div className="window-body">
        {renderHeader()}
        {renderDaysOfWeek()}
        {renderCells()}
      </div>
    </div>
  );
}
