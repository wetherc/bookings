import { NextRequest, NextResponse } from "next/server";
import { getDbClient } from "@/lib/db/client";
import { nanoid } from 'nanoid';

// POST handler to create a new RSVP
export async function POST(request: NextRequest) {
  try {
    const { eventId, name, selectedSlots } = await request.json();

    if (!eventId || !name || !selectedSlots) {
      return NextResponse.json(
        { error: "Missing required fields: eventId, name, selectedSlots" },
        { status: 400 },
      );
    }

    const respondentToken = nanoid();
    const db = getDbClient();
    const now = new Date().toISOString();

    await db.execute({
      sql: "INSERT INTO rsvps (event_id, respondent_token, name, selected_slots, updated_at) VALUES (:eventId, :respondentToken, :name, :selected_slots, :updated_at)",
      args: {
        eventId,
        respondentToken,
        name,
        selected_slots: JSON.stringify(selectedSlots),
        updated_at: now,
      },
    });

    return NextResponse.json(
      { message: "RSVP created successfully", respondent_token: respondentToken },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating RSVP:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
