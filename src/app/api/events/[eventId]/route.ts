import { NextRequest, NextResponse } from "next/server";
import { getDbClient } from "@/lib/db/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    const adminToken = request.nextUrl.searchParams.get('token');

    if (!adminToken) {
      return NextResponse.json({ error: "Admin token is required" }, { status: 401 });
    }
    
    console.log(`Fetching event. eventId: ${eventId}, adminToken: ${adminToken}`);
    
    const db = getDbClient();

    // Fetch event details and validate token
    const eventResult = await db.execute({
      sql: "SELECT event_id, title, description, block_minutes, time_slots FROM events WHERE event_id = :eventId AND admin_token = :adminToken",
      args: { eventId, adminToken },
    });

    console.log(`Found ${eventResult.rows.length} matching events.`);

    if (eventResult.rows.length === 0) {
      return NextResponse.json({ error: "Event not found or unauthorized" }, { status: 404 });
    }

    const event = eventResult.rows[0];
    // Parse time_slots back from JSON string
    event.time_slots = JSON.parse(event.time_slots as string);

    // Fetch RSVPs for this event
    const rsvpsResult = await db.execute({
      sql: "SELECT respondent_token, name, selected_slots FROM rsvps WHERE event_id = :eventId",
      args: { eventId },
    });

    const rsvps = rsvpsResult.rows.map((row) => ({
      ...row,
      selected_slots: JSON.parse(row.selected_slots as string), // Parse selected_slots back from JSON string
    }));

    return NextResponse.json({ event, rsvps }, { status: 200 });
  } catch (error) {
    console.error("Error fetching event or RSVPs:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    const { admin_token, ...updateData } = await request.json();

    if (!admin_token) {
      return NextResponse.json(
        { error: "Admin token is required" },
        { status: 401 },
      );
    }

    const db = getDbClient();

    // Verify admin token
    const tokenCheckResult = await db.execute({
      sql: "SELECT admin_token FROM events WHERE event_id = :eventId",
      args: { eventId },
    });

    if (tokenCheckResult.rows.length === 0) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (tokenCheckResult.rows[0].admin_token !== admin_token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const args: Record<string, any> = { eventId };

    if (updateData.title !== undefined) {
      updateFields.push("title = :title");
      args.title = updateData.title;
    }
    if (updateData.description !== undefined) {
      updateFields.push("description = :description");
      args.description = updateData.description;
    }
    if (updateData.block_minutes !== undefined) {
      updateFields.push("block_minutes = :block_minutes");
      args.block_minutes = updateData.block_minutes;
    }
    if (updateData.time_slots !== undefined) {
      updateFields.push("time_slots = :time_slots");
      args.time_slots = JSON.stringify(updateData.time_slots);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { message: "No fields to update" },
        { status: 200 },
      );
    }

    const updateSql = `UPDATE events SET ${updateFields.join(", ")} WHERE event_id = :eventId`;

    await db.execute({ sql: updateSql, args });

    return NextResponse.json(
      { message: "Event updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
