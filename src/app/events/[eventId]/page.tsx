'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { nanoid } from 'nanoid'; // For new respondent tokens
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns'; // For formatting dates

interface EventData {
  event_id: string;
  title: string;
  description: string;
  block_minutes: number;
  time_slots: string[];
}

interface RsvpData {
  respondent_token: string;
  name: string;
  selected_slots: string[];
}

interface EventPageData {
  event: EventData;
  rsvps: RsvpData[];
}

export default function EventRsvpPage() {
  const { eventId } = useParams();
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [rsvps, setRsvps] = useState<RsvpData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [respondentName, setRespondentName] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [localRespondentToken, setLocalRespondentToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    // Attempt to load respondent token from local storage
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem(`rsvp_token_${eventId}`);
      if (storedToken) {
        setLocalRespondentToken(storedToken);
      }
    }

    const fetchEventData = async () => {
      if (!eventId) return;

      try {
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch event data');
        }
        const data: EventPageData = await response.json();
        setEventData(data.event);
        setRsvps(data.rsvps);

        // Pre-fill form if existing RSVP found
        if (localRespondentToken) {
          const existingRsvp = data.rsvps.find(
            (rsvp) => rsvp.respondent_token === localRespondentToken
          );
          if (existingRsvp) {
            setRespondentName(existingRsvp.name);
            setSelectedSlots(existingRsvp.selected_slots);
          }
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while loading event.');
        console.error('Fetch event error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [eventId, localRespondentToken]); // Refetch if eventId or localRespondentToken changes

  const handleSlotToggle = (slot: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const handleSubmitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSubmitSuccess(false);

    try {
      let tokenToSend = localRespondentToken;
      if (!tokenToSend) {
        // If no local token, generate a new one for this submission
        tokenToSend = nanoid(32);
      }

      const response = await fetch('/api/rsvps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: eventId,
          respondent_token: tokenToSend,
          name: respondentName,
          selected_slots: selectedSlots,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit RSVP');
      }

      const { respondent_token: returnedToken } = await response.json();
      // Store the token (either new or existing) in local storage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`rsvp_token_${eventId}`, returnedToken);
        setLocalRespondentToken(returnedToken); // Update state to reflect stored token
      }

      setSubmitSuccess(true);
      // Optionally re-fetch event data to show updated RSVPs
      // fetchEventData(); // This would require refactoring fetchEventData to be callable
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred during RSVP submission.');
      console.error('RSVP submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8">Loading event...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  }

  if (!eventData) {
    return <div className="text-center p-8">Event not found.</div>;
  }

  // Calculate available slots considering existing RSVPs
  const allSlots = eventData.time_slots;
  const occupiedSlotsCount: { [key: string]: number } = {};
  rsvps.forEach(rsvp => {
    rsvp.selected_slots.forEach(slot => {
      occupiedSlotsCount[slot] = (occupiedSlotsCount[slot] || 0) + 1;
    });
  });

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-primary/10 p-4">
      <Card className="w-full max-w-2xl mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">{eventData.title}</CardTitle>
          {eventData.description && (
            <p className="text-muted-foreground text-center pt-2">{eventData.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitRsvp} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="respondentName">Your Name</Label>
              <Input
                type="text"
                id="respondentName"
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Select Available Time Slots</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allSlots.length > 0 ? (
                  allSlots.map((slot) => {
                    const isSelected = selectedSlots.includes(slot);
                    const isOccupied = occupiedSlotsCount[slot] > 0;
                    const slotDisplay = format(new Date(slot), 'PPP p');

                    return (
                      <Button
                        key={slot}
                        type="button"
                        onClick={() => handleSlotToggle(slot)}
                        variant={isSelected ? 'default' : 'outline'}
                        className={`h-auto p-3 text-left justify-start flex-col items-start
                          ${isOccupied && !isSelected ? 'opacity-60 cursor-not-allowed' : ''}
                        `}
                        disabled={isOccupied && !isSelected}
                      >
                        <span>{slotDisplay}</span>
                        <span className="text-xs text-muted-foreground">
                          ({eventData.block_minutes} min)
                        </span>
                        {isOccupied && !isSelected && (
                          <span className="ml-2 text-sm text-destructive"> (taken)</span>
                        )}
                      </Button>
                    );
                  })
                ) : (
                  <p className="col-span-full text-muted-foreground">No time slots available for this event.</p>
                )}
              </div>
            </div>

            {error && <p className="text-destructive text-xs italic">{error}</p>}
            {submitSuccess && (
              <p className="text-green-500 text-xs italic">RSVP submitted successfully!</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Availability'}
            </Button>
          </form>

          <div className="mt-8">
            <h2 className="text-xl font-semibold">Who's attending:</h2>
            {rsvps.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                {rsvps.map((rsvp) => (
                  <div key={rsvp.respondent_token} className="p-3 bg-muted rounded-md text-center">
                    {rsvp.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground mt-2">No one has RSVP'd yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
