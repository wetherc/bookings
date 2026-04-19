import { useState } from "react";
import { DatePicker } from "./DatePicker";
import { Alert } from "./Alert";

interface EventTime {
  id: number;
  startDate: Date;
  endDate: Date;
  startTime: { hour: number; minute: number };
  endTime: { hour: number; minute: number };
}

interface CreateEventFormProps {
  onEventCreated: (event: { eventId: string; adminToken: string; eventName: string }) => void;
}

const formatTimePart = (value: number) => String(value).padStart(2, '0');

export function CreateEventForm({ onEventCreated }: CreateEventFormProps) {
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [blockMinutes, setBlockMinutes] = useState(30);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState({ hour: 9, minute: 0 });
  const [endTime, setEndTime] = useState({ hour: 17, minute: 0 });
  const [eventTimes, setEventTimes] = useState<EventTime[]>([]);
  const [alert, setAlert] = useState({ isOpen: false, message: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleStartTimeChange = (part: 'hour' | 'minute', value: number) => {
    const newStartTime = { ...startTime, [part]: value };
    setStartTime(newStartTime);

    if (startDate && endDate && startDate.getTime() === endDate.getTime()) {
      const startTotalMinutes = newStartTime.hour * 60 + newStartTime.minute;
      const endTotalMinutes = endTime.hour * 60 + endTime.minute;
      if (startTotalMinutes > endTotalMinutes) {
        setEndTime(newStartTime);
      }
    }
  };

  const handleEndTimeChange = (part: 'hour' | 'minute', value: number) => {
    const newEndTime = { ...endTime, [part]: value };
    setEndTime(newEndTime);
  };

  const handleAddEventTime = () => {
    if (!startDate || !endDate) {
      setAlert({ isOpen: true, message: "Please select a start and end date." });
      return;
    }
    
    if (startDate.getTime() === endDate.getTime()) {
      const startTotalMinutes = startTime.hour * 60 + startTime.minute;
      const endTotalMinutes = endTime.hour * 60 + endTime.minute;
      if (startTotalMinutes >= endTotalMinutes) {
        setAlert({ isOpen: true, message: "For single-day events, the end time must be after the start time." });
        return;
      }
    }

    const newEventTime: EventTime = {
      id: Date.now(),
      startDate,
      endDate,
      startTime,
      endTime,
    };
    setEventTimes([...eventTimes, newEventTime]);
  };
  
  const handleRemoveEventTime = (id: number) => {
    setEventTimes(eventTimes.filter(time => time.id !== id));
  }
  
  const handleSubmit = async () => {
    if (!eventName.trim()) {
      setAlert({ isOpen: true, message: "Please enter an event name." });
      return;
    }
    if (eventTimes.length === 0) {
      setAlert({ isOpen: true, message: "Please add at least one time slot to the event." });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventName,
          description: eventDescription,
          block_minutes: blockMinutes,
          time_slots: eventTimes, 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create event.');
      }

      const { event_id, admin_token } = await response.json();
      
      onEventCreated({
        eventId: event_id,
        adminToken: admin_token,
        eventName: eventName,
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred.";
      setAlert({ isOpen: true, message });
    } finally {
      setIsLoading(false);
    }
  };

  const isSameDay = startDate && endDate && startDate.getTime() === endDate.getTime();

  return (
    <>
      {alert.isOpen && <Alert message={alert.message} onClose={() => setAlert({ isOpen: false, message: "" })} />}
      <div className="field-row">
        <label htmlFor="eventName">Event Name:</label>
        <input id="eventName" type="text" value={eventName} onChange={e => setEventName(e.target.value)} style={{ flexGrow: 1 }} />
      </div>
      <div className="field-row" style={{ marginTop: "1rem" }}>
        <label htmlFor="eventDescription">Description:</label>
        <textarea id="eventDescription" value={eventDescription} onChange={e => setEventDescription(e.target.value)} style={{ flexGrow: 1, height: "unset" }}></textarea>
      </div>
       <div className="field-row" style={{ marginTop: '1rem' }}>
        <label htmlFor="blockMinutes">Event Duration:</label>
        <select id="blockMinutes" value={blockMinutes} onChange={e => setBlockMinutes(parseInt(e.target.value))}>
          <option value="30">30 minutes</option>
          <option value="60">60 minutes</option>
          <option value="90">90 minutes</option>
          <option value="120">120 minutes</option>
        </select>
      </div>
      <fieldset style={{ marginTop: "1rem" }}>
        <legend>Date and Time Selection</legend>
        <DatePicker
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
        />
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <label>Start Time:</label>
            <div className="field-row" style={{ alignItems: 'center' }}>
              <input type="number" min="0" max="23" value={formatTimePart(startTime.hour)} onChange={e => handleStartTimeChange('hour', parseInt(e.target.value))} style={{ width: '50px' }} />
              :
              <input type="number" min="0" max="59" step="15" value={formatTimePart(startTime.minute)} onChange={e => handleStartTimeChange('minute', parseInt(e.target.value) || 0)} style={{ width: '50px' }} />
            </div>
          </div>
          <div>
            <label>End Time:</label>
            <div className="field-row" style={{ alignItems: 'center' }}>
              <input
                type="number"
                min={isSameDay ? startTime.hour : 0}
                max="23"
                value={formatTimePart(endTime.hour)}
                onChange={e => handleEndTimeChange('hour', parseInt(e.target.value))}
                style={{ width: '50px' }}
              />
              :
              <input
                type="number"
                min={isSameDay && startTime.hour === endTime.hour ? startTime.minute : 0}
                max="59"
                step="15"
                value={formatTimePart(endTime.minute)}
                onChange={e => handleEndTimeChange('minute', parseInt(e.target.value) || 0)}
                style={{ width: '50px' }}
              />
            </div>
          </div>
        </div>
        <button onClick={handleAddEventTime} style={{ marginTop: '1rem' }}>Add to event</button>
      </fieldset>
      
      <fieldset style={{ marginTop: "1rem" }}>
        <legend>Proposed Event Times</legend>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <ul className="tree-view">
            {eventTimes.map(time => (
              <li key={time.id}>
                <span className="event-time-part">
                  {time.startDate.toLocaleDateString()} - {time.endDate.toLocaleDateString()}
                </span>
                <span className="event-time-part">
                  from {formatTimePart(time.startTime.hour)}:{formatTimePart(time.startTime.minute)} to {formatTimePart(time.endTime.hour)}:{formatTimePart(time.endTime.minute)}
                </span>
                <button onClick={() => handleRemoveEventTime(time.id)} style={{ marginLeft: '1rem' }}>Remove</button>
              </li>
            ))}
          </ul>
        </div>
      </fieldset>

      <div style={{ marginTop: "1rem", textAlign: "right" }}>
        <button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Event'}
        </button>
      </div>
    </>
  );
}
