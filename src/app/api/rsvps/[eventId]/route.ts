import { NextRequest, NextResponse } from "next/server";
import { getDbClient } from "@/lib/db/client";
import { nanoid } from 'nanoid';

// GET handler to fetch a single RSVP by eventId and respondentToken
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    const respondentToken = request.nextUrl.searchParams.get('token');

    if (!respondentToken) {
      return NextResponse.json({ error: "Respondent token is required" }, { status: 401 });
    }

    const db = getDbClient();
    const rsvpResult = await db.execute({
      sql: "SELECT name, selected_slots FROM rsvps WHERE event_id = :eventId AND respondent_token = :respondentToken",
      args: { eventId, respondentToken },
    });

    if (rsvpResult.rows.length === 0) {
      return NextResponse.json({ error: "RSVP not found" }, { status: 404 });
    }

    const rsvp = rsvpResult.rows[0];
    return NextResponse.json({
      name: rsvp.name,
      selected_slots: JSON.parse(rsvp.selected_slots as string),
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching RSVP:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// PUT handler to update an existing RSVP
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    const respondentToken = request.nextUrl.searchParams.get('token');
    const { name, selectedSlots } = await request.json();

    if (!respondentToken || !name || !selectedSlots) {
      return NextResponse.json(
        { error: "Missing required fields: respondentToken (query), name, selectedSlots" },
        { status: 400 },
      );
    }

    const db = getDbClient();
    const now = new Date().toISOString();

    const updateResult = await db.execute({
      sql: "UPDATE rsvps SET name = :name, selected_slots = :selected_slots, updated_at = :updated_at WHERE event_id = :eventId AND respondent_token = :respondentToken",
      args: {
        name,
        selected_slots: JSON.stringify(selectedSlots),
        updated_at: now,
        eventId,
        respondentToken,
      },
    });
    
    if (updateResult.rowsAffected === 0) {
      return NextResponse.json({ error: "RSVP not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "RSVP updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating RSVP:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
