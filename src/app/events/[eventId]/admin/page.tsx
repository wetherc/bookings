import { notFound } from 'next/navigation';

// On the server, we need to use an absolute URL for fetch.
const host = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

async function getEventData(eventId: string, token: string) {
  const url = `${host}/api/events/${eventId}?token=${token}`;
  
  try {
    const res = await fetch(url, { cache: 'no-store' }); // Don't cache admin data

    if (!res.ok) {
      // This will be caught by the error boundary or return a not found page
      if (res.status === 404 || res.status === 401 || res.status === 403) {
        return null;
      }
      throw new Error('Failed to fetch event data');
    }
    return res.json();
  } catch (error) {
    console.error("Error fetching event data:", error);
    return null;
  }
}

const formatTimePart = (value: number) => String(value).padStart(2, '0');

export default async function EventAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { eventId } = await params;
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams.token as string;

  if (!token) {
    notFound(); // Or show a specific "token required" message
  }

  const data = await getEventData(eventId, token);

  if (!data) {
    notFound();
  }

  const { event, rsvps } = data;

  const adminUrl = `${host}/events/${eventId}/admin?token=${token}`;
  const rsvpUrl = `${host}/events/${eventId}`;

  return (
    <main
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        padding: "2rem",
        boxSizing: "border-box",
      }}
    >
      <div className="window" style={{ width: "75%", height: "85%", display: 'flex', flexDirection: 'column' }}>
        <div className="title-bar">
          <div className="title-bar-text">Admin: {event.title}</div>
          <div className="title-bar-controls">
            <button aria-label="Close"></button>
          </div>
        </div>
        <div className="window-body" style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="sunken-panel" style={{ flexGrow: 1, padding: '1rem', overflowY: 'auto' }}>
            <fieldset>
              <legend>Event Details</legend>
              <p><strong>Title:</strong> {event.title}</p>
              <p><strong>Description:</strong> {event.description || 'N/A'}</p>
              <p><strong>Time Slot Duration:</strong> {event.block_minutes} minutes</p>
            </fieldset>

            <fieldset style={{ marginTop: '1rem' }}>
              <legend>Event Links</legend>
              <div style={{ marginBottom: '1rem' }}>
                <p>This is your secret admin link. Keep it safe! You'll need it to see this page again.</p>
                <input type="text" readOnly value={adminUrl} style={{ width: '100%' }} />
              </div>
              <div>
                <p>Share this link with your event participants for them to RSVP.</p>
                <input type="text" readOnly value={rsvpUrl} style={{ width: '100%' }} />
              </div>
            </fieldset>

            <fieldset style={{ marginTop: '1rem' }}>
              <legend>Proposed Time Slots</legend>
              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                <ul className="tree-view">
                  {event.time_slots.map((time: any, index: number) => (
                    <li key={index}>
                      {new Date(time.startDate).toLocaleDateString()} - {new Date(time.endDate).toLocaleDateString()} from {formatTimePart(time.startTime.hour)}:{formatTimePart(time.startTime.minute)} to {formatTimePart(time.endTime.hour)}:{formatTimePart(time.endTime.minute)}
                    </li>
                  ))}
                </ul>
              </div>
            </fieldset>

            <fieldset style={{ marginTop: '1rem' }}>
              <legend>RSVPs ({rsvps.length})</legend>
              {rsvps.length > 0 ? (
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  <ul className="tree-view">
                    {rsvps.map((rsvp: any) => (
                      <li key={rsvp.respondent_token}>
                        <strong>{rsvp.name}</strong> has selected:
                        <ul>
                          {rsvp.selected_slots.map((slot: string) => (
                             <li key={slot}>{new Date(slot).toLocaleString()}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>No RSVPs yet.</p>
              )}
            </fieldset>
          </div>
        </div>
      </div>
    </main>
  );
}
