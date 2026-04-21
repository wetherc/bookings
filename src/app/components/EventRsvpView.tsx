"use client";

import { useState, useEffect, useMemo } from "react";
import { Alert } from "./Alert"; // Import the Alert component
import { RsvpForm } from "./RsvpForm";
import { RsvpConfirmation } from "./RsvpConfirmation";

const formatTimePart = (value: number) => String(value).padStart(2, "0");

interface TimeInput {
  hour: number;
  minute: number;
}

interface TimeBlock {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  startTime: TimeInput;
  endTime: TimeInput;
}

interface EventData {
  event_id: string;
  admin_token: string;
  title: string;
  description?: string; // Optional based on SQL schema
  block_minutes: number;
  time_slots: TimeBlock[]; // This is the JSON array
  created_at: string;
}

interface EventRsvpViewProps {
  eventId: string;
  respondentToken?: string;
  onTitleLoaded: (title: string, type: "admin" | "rsvp") => void;
}

export function EventRsvpView({
  eventId,
  respondentToken: initialRespondentToken,
  onTitleLoaded,
}: EventRsvpViewProps) {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [respondentName, setRespondentName] = useState("");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rsvpSaved, setRsvpSaved] = useState(false);
  const [currentRespondentToken, setCurrentRespondentToken] = useState<
    string | undefined
  >(initialRespondentToken);

  const { dates, timeSlots, dateToTimeMap } = useMemo(() => {
    if (!eventData || !Array.isArray(eventData.time_slots)) {
      return { dates: [], timeSlots: [], dateToTimeMap: new Map() };
    }

    const allPossibleSlots: string[] = [];
    eventData.time_slots.forEach((timeBlock: TimeBlock) => {
      const start = new Date(timeBlock.startDate);
      start.setUTCHours(0, 0, 0, 0);

      const end = new Date(timeBlock.endDate);
      end.setUTCHours(0, 0, 0, 0);

      // Loop through each day in UTC using a standard while loop
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const currentSlotStart = new Date(currentDate.getTime());
        currentSlotStart.setUTCHours(
          timeBlock.startTime.hour,
          timeBlock.startTime.minute,
          0,
          0,
        );

        const currentSlotEnd = new Date(currentDate.getTime());
        currentSlotEnd.setUTCHours(
          timeBlock.endTime.hour,
          timeBlock.endTime.minute,
          0,
          0,
        );

        const currentBlock = new Date(currentSlotStart.getTime());
        while (currentBlock < currentSlotEnd) {
          allPossibleSlots.push(currentBlock.toISOString());
          currentBlock.setUTCMinutes(currentBlock.getUTCMinutes() + 30);
        }

        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }
    });

    const dateToTimeMap = new Map<string, Set<string>>();
    const timeSet = new Set<string>();

    allPossibleSlots.forEach((isoString) => {
      const date = new Date(isoString);
      const dateKey = `${date.getUTCFullYear()}-${formatTimePart(date.getUTCMonth() + 1)}-${formatTimePart(date.getUTCDate())}`;
      const timeKey = `${formatTimePart(date.getUTCHours())}:${formatTimePart(date.getUTCMinutes())}`;

      if (!dateToTimeMap.has(dateKey)) {
        dateToTimeMap.set(dateKey, new Set());
      }
      dateToTimeMap.get(dateKey)!.add(timeKey);
      timeSet.add(timeKey);
    });

    return {
      dates: Array.from(dateToTimeMap.keys()).sort(),
      timeSlots: Array.from(timeSet).sort(),
      dateToTimeMap,
    };
  }, [eventData]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      setRsvpSaved(false);

      try {
        const eventRes = await fetch(`/api/events/${eventId}`);
        if (!eventRes.ok) {
          const errorData = await eventRes.json();
          throw new Error(
            errorData.message || `Error fetching event: ${eventRes.status}`,
          );
        }
        const fetchedEventData = await eventRes.json();

        if (fetchedEventData && fetchedEventData.event) {
          setEventData(fetchedEventData.event);
          onTitleLoaded(fetchedEventData.event.title, "rsvp");
        } else {
          throw new Error("Event data is missing in API response.");
        }

        if (currentRespondentToken) {
          const rsvpRes = await fetch(
            `/api/rsvps/${eventId}?token=${currentRespondentToken}`,
          );
          if (!rsvpRes.ok) {
            if (rsvpRes.status !== 404) {
              const errorData = await rsvpRes.json();
              throw new Error(
                errorData.message || `Error fetching RSVP: ${rsvpRes.status}`,
              );
            }
          } else {
            const fetchedRsvpData = await rsvpRes.json();
            setRespondentName(fetchedRsvpData.name);
            setSelectedSlots(fetchedRsvpData.selected_slots);
            setRsvpSaved(true);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, currentRespondentToken]);

  const handleSlotSelection = (slot: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    );
  };

  const handleSelectAllForDate = (date: string) => {
    const slotsForDate = dateToTimeMap.get(date);
    if (!slotsForDate) return;

    const isoSlotsForDate = Array.from<string>(slotsForDate).map(
      (time: string) => {
        const [hour, minute] = time.split(":").map(Number);
        const dateObj = new Date(`${date}T00:00:00Z`);
        dateObj.setUTCHours(hour, minute);
        return dateObj.toISOString();
      },
    );

    const allSelected = isoSlotsForDate.every((slot) =>
      selectedSlots.includes(slot),
    );

    if (allSelected) {
      setSelectedSlots((prev) =>
        prev.filter((s) => !isoSlotsForDate.includes(s)),
      );
    } else {
      setSelectedSlots((prev) => [...new Set([...prev, ...isoSlotsForDate])]);
    }
  };

  const handleSubmitRsvp = async () => {
    setIsSubmitting(true);
    setError(null);

    if (!respondentName.trim()) {
      setError("Please enter your name.");
      setIsSubmitting(false);
      return;
    }
    if (selectedSlots.length === 0) {
      setError("Please select at least one time slot.");
      setIsSubmitting(false);
      return;
    }

    if (!eventData) {
      setError("Event data is not loaded yet.");
      setIsSubmitting(false);
      return;
    }

    // Group selectedSlots by date
    const slotsByDate: { [date: string]: string[] } = {};
    selectedSlots.forEach((isoString) => {
      const date = new Date(isoString);
      const dateKey = `${date.getUTCFullYear()}-${formatTimePart(date.getUTCMonth() + 1)}-${formatTimePart(date.getUTCDate())}`;
      if (!slotsByDate[dateKey]) {
        slotsByDate[dateKey] = [];
      }
      slotsByDate[dateKey].push(isoString);
    });

    let allBlocksAreValid = true; // Assume true initially

    for (const dateKey in slotsByDate) {
      const dailySlots = slotsByDate[dateKey].sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime(),
      );

      if (dailySlots.length === 0) continue;

      let currentBlockStartTime = new Date(dailySlots[0]);
      let currentBlockEndTime = new Date(dailySlots[0]);

      // Calculate duration for blocks of 1 or more slots
      if (dailySlots.length > 0) {
        for (let i = 1; i < dailySlots.length; i++) {
          const prevSlotTime = new Date(dailySlots[i - 1]);
          const currentSlotTime = new Date(dailySlots[i]);
          const diffInMinutes =
            (currentSlotTime.getTime() - prevSlotTime.getTime()) / (1000 * 60);

          if (diffInMinutes === 30) {
            currentBlockEndTime = currentSlotTime;
          } else {
            const blockDuration =
              (currentBlockEndTime.getTime() -
                currentBlockStartTime.getTime()) /
                (1000 * 60) +
              30;
            if (blockDuration < eventData.block_minutes) {
              // Check if this block is too short
              allBlocksAreValid = false;
              break; // Exit inner loop, this day has an invalid block
            }
            currentBlockStartTime = currentSlotTime;
            currentBlockEndTime = currentSlotTime;
          }
        }

        // Check the last block for this day
        const lastBlockDuration =
          (currentBlockEndTime.getTime() - currentBlockStartTime.getTime()) /
            (1000 * 60) +
          30;
        if (lastBlockDuration < eventData.block_minutes) {
          // Check if the last block is too short
          allBlocksAreValid = false;
        }
      }

      if (!allBlocksAreValid) {
        break; // Exit outer loop, an invalid block was found
      }
    }

    // Final check
    if (!allBlocksAreValid) {
      setError(
        `All selected contiguous time blocks must be at least ${eventData.block_minutes} minutes long.`,
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const method = currentRespondentToken ? "PUT" : "POST";
      const url = currentRespondentToken
        ? `/api/rsvps/${eventId}?token=${currentRespondentToken}`
        : `/api/rsvps`;

      const body = {
        eventId,
        name: respondentName,
        selectedSlots: selectedSlots,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.message ||
            `Failed to ${method === "POST" ? "create" : "update"} RSVP.`,
        );
      }

      const responseData = await res.json();
      if (responseData.respondent_token && !currentRespondentToken) {
        setCurrentRespondentToken(responseData.respondent_token);
      }
      setRsvpSaved(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "An unknown error occurred during RSVP submission.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div>Loading event for RSVP...</div>;
  }

  if (error && !eventData) {
    return <Alert message={error} onClose={() => setError(null)} />;
  }

  if (!eventData) {
    return <div>Event not found or cannot be RSVPed to.</div>;
  }

  const rsvpLink = currentRespondentToken
    ? `${window.location.origin}/events/${eventId}?token=${currentRespondentToken}`
    : "";

  return (
    <>
      <fieldset>
        <legend>RSVP for {eventData.title}</legend>
        <p>
          <strong>Description:</strong> {eventData.description || "N/A"}
        </p>
        <p>
          Select the times you are available. The event is{" "}
          {eventData.block_minutes} minutes long.
        </p>
      </fieldset>

      {!rsvpSaved ? (
        <RsvpForm
          respondentName={respondentName}
          setRespondentName={setRespondentName}
          isSubmitting={isSubmitting}
          dates={dates}
          timeSlots={timeSlots}
          dateToTimeMap={dateToTimeMap}
          selectedSlots={selectedSlots}
          onSlotSelection={handleSlotSelection}
          onSelectAllForDate={handleSelectAllForDate}
          onSubmit={handleSubmitRsvp}
        />
      ) : (
        <RsvpConfirmation
          respondentName={respondentName}
          selectedSlots={selectedSlots}
          rsvpLink={rsvpLink}
          onEdit={() => setRsvpSaved(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {error && <Alert message={error} onClose={() => setError(null)} />}
    </>
  );
}
