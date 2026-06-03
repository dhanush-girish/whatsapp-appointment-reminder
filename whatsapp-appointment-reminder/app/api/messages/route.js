import { NextResponse } from "next/server";
import { sql, initDB } from "../../../lib/db.js";

/**
 * GET /api/messages
 *
 * Returns all message logs ordered by most recent first.
 */
export async function GET() {
  try {
    await initDB();
    const db = sql();

    const messages = await db`
      SELECT
        ml.*,
        a.customer_name
      FROM message_logs ml
      LEFT JOIN appointments a ON a.id = ml.appointment_id
      ORDER BY ml.created_at DESC;
    `;

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error("[messages] GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
