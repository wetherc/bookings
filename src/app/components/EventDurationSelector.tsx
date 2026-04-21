import React from "react";

interface EventDurationSelectorProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  className?: string; // for the wrapper div
  style?: React.CSSProperties; // for the wrapper div
  labelStyle?: React.CSSProperties;
}

const DURATION_OPTIONS = [15, 30, 60, 90, 120, 180];

export function EventDurationSelector({
  id,
  label,
  value,
  onChange,
  className,
  style,
  labelStyle,
}: EventDurationSelectorProps) {
  return (
    <div className={className} style={style}>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
      >
        {DURATION_OPTIONS.map((duration) => (
          <option key={duration} value={duration}>
            {duration} minutes
          </option>
        ))}
      </select>
    </div>
  );
}
