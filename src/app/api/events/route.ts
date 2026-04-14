import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getDbClient } from '@/lib/db/client';

export async function POST(request: Request) {
  try {
    const { title, description, block_minutes, time_slots } = await request.json();

    if (!title || !block_minutes || !time_slots) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const event_id = nanoid(10); // Generate a unique event ID
    const admin_token = nanoid(32); // Generate a secret admin token

    const db = getDbClient();

    const createdAt = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO events (event_id, admin_token, title, description, block_minutes, time_slots, created_at)
            VALUES (:event_id, :admin_token, :title, :description, :block_minutes, :time_slots, :created_at)`,
      args: {
        event_id,
        admin_token,
        title,
        description,
        block_minutes,
        time_slots: JSON.stringify(time_slots), // Store as JSON string
        created_at: createdAt,
      },
    });

    return NextResponse.json({ event_id, admin_token }, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
