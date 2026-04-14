import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db/client';

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;
    const db = getDbClient();

    // Fetch event details
    const eventResult = await db.execute({
      sql: 'SELECT event_id, title, description, block_minutes, time_slots FROM events WHERE event_id = :eventId',
      args: { eventId },
    });

    if (eventResult.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const event = eventResult.rows[0];
    // Parse time_slots back from JSON string
    event.time_slots = JSON.parse(event.time_slots as string);


    // Fetch RSVPs for this event
    const rsvpsResult = await db.execute({
      sql: 'SELECT respondent_token, name, selected_slots FROM rsvps WHERE event_id = :eventId',
      args: { eventId },
    });

    const rsvps = rsvpsResult.rows.map(row => ({
      ...row,
      selected_slots: JSON.parse(row.selected_slots as string), // Parse selected_slots back from JSON string
    }));

    return NextResponse.json({ event, rsvps }, { status: 200 });
  } catch (error) {
    console.error('Error fetching event or RSVPs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
