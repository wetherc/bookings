export interface EventTime {
  id: number;
  startDate: Date;
  endDate: Date;
  startTime: { hour: number; minute: number };
  endTime: { hour: number; minute: number };
}

export const formatTimePart = (value: number) => String(value).padStart(2, '0');

export const mergeEventTimes = (
  existingTimes: EventTime[],
  newTimes: EventTime[],
): EventTime[] => {
  const allTimes = [...existingTimes, ...newTimes].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime(),
  );

  if (allTimes.length === 0) {
    return [];
  }

  const merged: EventTime[] = [];
  merged.push({ ...allTimes[0] });

  for (let i = 1; i < allTimes.length; i++) {
    const lastMerged = merged[merged.length - 1];
    const current = allTimes[i];

    // Check for overlap or contiguity.
    // The check must be against the full date-time.
    if (current.startDate.getTime() <= lastMerged.endDate.getTime()) {
      // They overlap or are contiguous, so merge them by taking the later end time.
      if (current.endDate.getTime() > lastMerged.endDate.getTime()) {
        lastMerged.endDate = current.endDate;
        lastMerged.endTime = current.endTime;
      }
    } else {
      // They are separate, add the current interval as a new block.
      merged.push({ ...current });
    }
  }

  // Re-assign IDs for stable keys in React.
  return merged.map((time, index) => ({ ...time, id: index }));
};

export const getDisplaySegments = (eventTime: EventTime) => {
  const segments: Array<{
    date: Date;
    startTime: { hour: number; minute: number };
    endTime: { hour: number; minute: number };
  }> = [];

  // eslint-disable-next-line prefer-const
  let currentDay = new Date(eventTime.startDate);
  currentDay.setHours(0, 0, 0, 0); // Normalize to start of day

  const endDay = new Date(eventTime.endDate);
  endDay.setHours(0, 0, 0, 0); // Normalize to start of day

  while (currentDay.getTime() <= endDay.getTime()) {
    const isFirstDay =
      currentDay.getTime() === new Date(eventTime.startDate).setHours(0, 0, 0, 0);
    const isLastDay = currentDay.getTime() === endDay.getTime();

    let segmentStartTime = { hour: 0, minute: 0 };
    let segmentEndTime = { hour: 23, minute: 59 };

    if (isFirstDay) {
      segmentStartTime = eventTime.startTime;
    }
    if (isLastDay) {
      segmentEndTime = eventTime.endTime;
    }

    // Adjust segment end time if it matches the actual event end time on the last day,
    // or if it's the start day and end time is earlier than 23:59
    if (isLastDay) {
      segmentEndTime = eventTime.endTime;
    } else if (isFirstDay) {
      const currentDayEndTime = new Date(currentDay);
      currentDayEndTime.setHours(23, 59, 0, 0);
      const eventEndDateTime = new Date(eventTime.endDate);
      eventEndDateTime.setHours(eventTime.endTime.hour, eventTime.endTime.minute, 0, 0);
      
      // If the event ends on the same day it starts, use its actual end time, not 23:59
      if (eventTime.startDate.setHours(0,0,0,0) === eventTime.endDate.setHours(0,0,0,0)) {
        segmentEndTime = eventTime.endTime;
      } else {
        segmentEndTime = { hour: 23, minute: 59 };
      }

    }


    // Make sure segment start time is not after segment end time
    const startMinutes = segmentStartTime.hour * 60 + segmentStartTime.minute;
    const endMinutes = segmentEndTime.hour * 60 + segmentEndTime.minute;
    if (startMinutes >= endMinutes) {
      // This segment is invalid or represents a zero-duration block, skip
      currentDay.setDate(currentDay.getDate() + 1);
      continue;
    }

    segments.push({
      date: new Date(currentDay), // Push a copy
      startTime: segmentStartTime,
      endTime: segmentEndTime,
    });

    currentDay.setDate(currentDay.getDate() + 1); // Move to the next day
  }

  return segments;
};

export const groupAndFormatSlots = (
  slots: string[],
  blockMinutes: number,
): string[] => {
  if (slots.length === 0) return [];

  const timeZone = "UTC";
  const dateOptions: Intl.DateTimeFormatOptions = { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' };
  const timeOptions: Intl.DateTimeFormatOptions = { timeZone, hour: "numeric", minute: "2-digit" };


  // 1. Convert to Dates and sort
  const sortedSlots = slots
    .map((s) => new Date(s))
    .sort((a, b) => a.getTime() - b.getTime());

  // 2. Group by UTC day
  const slotsByDay = new Map<string, Date[]>();
  for (const slot of sortedSlots) {
    const day = slot.toISOString().split("T")[0];
    if (!slotsByDay.has(day)) {
      slotsByDay.set(day, []);
    }
    slotsByDay.get(day)!.push(slot);
  }

  const formattedRanges: string[] = [];
  const slotDurationMs = 30 * 60 * 1000; // Always merge in 30-minute blocks

  // 3. Process each day
  for (const daySlots of slotsByDay.values()) {
    if (daySlots.length === 0) continue;

    let currentRangeStart = daySlots[0];
    let currentRangeEnd = new Date(daySlots[0].getTime() + slotDurationMs);

    for (let i = 1; i < daySlots.length; i++) {
      const currentSlot = daySlots[i];
      // Check if the current slot starts exactly where the previous one ended
      if (currentSlot.getTime() === currentRangeEnd.getTime()) {
        // Extend the range
        currentRangeEnd = new Date(currentSlot.getTime() + slotDurationMs);
      } else {
        // End of a contiguous block, format and push the previous range
        formattedRanges.push(
          `${currentRangeStart.toLocaleDateString([], dateOptions)}, ${currentRangeStart.toLocaleTimeString([], timeOptions)} - ${currentRangeEnd.toLocaleTimeString([], timeOptions)}`,
        );
        // Start a new range
        currentRangeStart = currentSlot;
        currentRangeEnd = new Date(currentSlot.getTime() + slotDurationMs);
      }
    }

    // Add the last range
    formattedRanges.push(
      `${currentRangeStart.toLocaleDateString([], dateOptions)}, ${currentRangeStart.toLocaleTimeString([], timeOptions)} - ${currentRangeEnd.toLocaleTimeString([], timeOptions)}`,
    );
  }

  return formattedRanges;
};
