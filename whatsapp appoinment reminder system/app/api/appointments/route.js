import { NextResponse } from "next/server";
import { sql, initDB } from "../../../lib/db.js";
import { sendConfirmation } from "../../../lib/messaging.js";

/**
 * POST /api/appointments
 *
 * Creates a new appointment, persists it, sends (or simulates)
 * a WhatsApp / SMS confirmation, and logs the message result.
 */
export async function POST(request) {
  try {
    // --- Parse & validate ------------------------------------------------
    const body = await request.json();
    const { customer_name, phone_number, appointment_time } = body;

    if (!customer_name || !phone_number || !appointment_time) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: customer_name, phone_number, appointment_time",
        },
        { status: 400 }
      );
    }

    const parsedTime = new Date(appointment_time);
    if (isNaN(parsedTime.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid appointment_time format. Please use ISO 8601 (e.g. 2026-06-05T14:30:00).",
        },
        { status: 400 }
      );
    }

    // --- Persist appointment ---------------------------------------------
    await initDB();
    const db = sql();

    const rows = await db`
      INSERT INTO appointments (customer_name, phone_number, appointment_time)
      VALUES (${customer_name}, ${phone_number}, ${parsedTime.toISOString()})
      RETURNING *;
    `;
    const appointment = rows[0];

    console.log(`[appointments] Created appointment #${appointment.id}`);

    // --- Send confirmation (real or simulated) ---------------------------
    const msgResult = await sendConfirmation(
      phone_number,
      customer_name,
      appointment_time
    );

    // Build the message body for logging
    const msgBody =
      msgResult.simulatedMessage ||
      `Hi ${customer_name}! Your appointment is confirmed for ${new Date(appointment_time).toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}. We look forward to seeing you!`;

    // --- Log message to database -----------------------------------------
    const db2 = sql();
    await db2`
      INSERT INTO message_logs (appointment_id, phone_number, message_type, message_body, channel, twilio_sid)
      VALUES (
        ${appointment.id},
        ${phone_number},
        ${"confirmation"},
        ${msgBody},
        ${msgResult.channel},
        ${msgResult.messageId || null}
      );
    `;

    return NextResponse.json(
      { success: true, appointment, message: msgResult },
      { status: 201 }
    );
  } catch (error) {
    console.error("[appointments] POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/appointments
 *
 * Returns all appointments ordered by appointment_time descending.
 */
export async function GET() {
  try {
    await initDB();
    const db = sql();

    const appointments = await db`
      SELECT * FROM appointments
      ORDER BY appointment_time DESC;
    `;

    return NextResponse.json({ success: true, appointments });
  } catch (error) {
    console.error("[appointments] GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
