import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getDbClient } from '@/lib/db/client';

export async function POST(request: Request) {
  try {
    const { event_id, respondent_token: client_respondent_token, name, selected_slots } = await request.json();

    if (!event_id || !name || !selected_slots) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getDbClient();
    const updated_at = new Date().toISOString();

    let respondent_token = client_respondent_token;
    if (!respondent_token) {
      // If no token is provided, this is a new RSVP, generate one
      respondent_token = nanoid(32);
    }

    // Use INSERT OR REPLACE to handle both new RSVPs and updates to existing ones
    await db.execute({
      sql: `INSERT OR REPLACE INTO rsvps (event_id, respondent_token, name, selected_slots, updated_at)
            VALUES (:event_id, :respondent_token, :name, :selected_slots, :updated_at)`,
      args: {
        event_id,
        respondent_token,
        name,
        selected_slots: JSON.stringify(selected_slots), // Store as JSON string
        updated_at,
      },
    });

    return NextResponse.json({ respondent_token }, { status: 200 });
  } catch (error) {
    console.error('Error submitting/updating RSVP:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
