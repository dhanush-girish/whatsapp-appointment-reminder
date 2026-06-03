import { NextResponse } from "next/server";
import { sql, initDB } from "../../../lib/db.js";
import { sendReminder } from "../../../lib/messaging.js";

/**
 * GET /api/reminders
 *
 * Cron-friendly endpoint that finds confirmed appointments
 * within the next hour and sends (or simulates) reminders.
 */
export async function GET() {
  try {
    await initDB();
    const db = sql();

    // --- Find upcoming appointments needing a reminder -------------------
    const upcoming = await db`
      SELECT * FROM appointments
      WHERE appointment_time BETWEEN NOW() AND NOW() + INTERVAL '1 hour'
        AND reminder_sent = false
        AND status = 'confirmed'
      ORDER BY appointment_time ASC;
    `;

    console.log(
      `[reminders] Found ${upcoming.length} appointment(s) needing reminders`
    );

    if (upcoming.length === 0) {
      return NextResponse.json({
        success: true,
        remindersProcessed: 0,
        message: "No upcoming appointments need reminders right now.",
      });
    }

    // --- Send reminders --------------------------------------------------
    let successCount = 0;
    const results = [];

    for (const appt of upcoming) {
      const result = await sendReminder(
        appt.phone_number,
        appt.customer_name,
        appt.appointment_time
      );

      if (result.success) {
        // Mark as reminded in the database
        const db2 = sql();
        await db2`
          UPDATE appointments
          SET reminder_sent = true,
              status = 'reminder_sent'
          WHERE id = ${appt.id};
        `;

        // Log the reminder message
        const msgBody =
          result.simulatedMessage ||
          `Hi ${appt.customer_name}! Reminder: your appointment is in 1 hour. See you soon!`;

        const db3 = sql();
        await db3`
          INSERT INTO message_logs (appointment_id, phone_number, message_type, message_body, channel, twilio_sid)
          VALUES (
            ${appt.id},
            ${appt.phone_number},
            ${"reminder"},
            ${msgBody},
            ${result.channel},
            ${result.messageId || null}
          );
        `;

        successCount++;
        console.log(
          `[reminders] Reminder sent for appointment #${appt.id} via ${result.channel}`
        );
      } else {
        console.warn(
          `[reminders] Failed to remind appointment #${appt.id}: ${result.error}`
        );
      }

      results.push({
        appointmentId: appt.id,
        customerName: appt.customer_name,
        ...result,
      });
    }

    return NextResponse.json({
      success: true,
      remindersProcessed: successCount,
      totalFound: upcoming.length,
      results,
    });
  } catch (error) {
    console.error("[reminders] GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
