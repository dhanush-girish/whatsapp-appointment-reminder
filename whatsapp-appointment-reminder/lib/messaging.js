import twilio from "twilio";

/**
 * Lazy-initialised Twilio client.
 * Returns null (instead of throwing) when credentials are missing —
 * the send helpers will fall back to simulation mode.
 */
let _client = undefined; // undefined = not yet attempted

function getClient() {
  if (_client !== undefined) return _client;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (
    !accountSid ||
    !authToken ||
    accountSid === "your_account_sid_here" ||
    authToken === "your_auth_token_here"
  ) {
    console.warn(
      "[messaging] Twilio credentials not configured — running in simulation mode."
    );
    _client = null;
    return _client;
  }

  _client = twilio(accountSid, authToken);
  return _client;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/**
 * Formats a Date / ISO-string into a human-friendly string.
 * Example: "June 3, 2026 at 3:30 PM"
 */
function formatTime(appointmentTime) {
  const date = new Date(appointmentTime);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Sends a message via Twilio (WhatsApp → SMS fallback).
 * If Twilio is unavailable or the send fails for any reason,
 * falls back to simulation mode — returning the exact message
 * that *would* have been sent so it can be displayed in the UI.
 *
 * @param {string} phoneNumber  – E.164 format, e.g. "+919876543210"
 * @param {string} body         – The message text
 * @returns {Promise<{
 *   success: boolean,
 *   channel: 'whatsapp'|'sms'|'simulated',
 *   messageId?: string,
 *   error?: string,
 *   simulatedMessage?: string,
 *   simulatedTo?: string
 * }>}
 */
async function sendWithFallback(phoneNumber, body) {
  const client = getClient();

  // ── No Twilio client → simulate immediately ──
  if (!client) {
    console.log(
      `[messaging] SIMULATED → To: ${phoneNumber}\n    Message: "${body}"`
    );
    return {
      success: true,
      channel: "simulated",
      simulatedMessage: body,
      simulatedTo: phoneNumber,
    };
  }

  // ── Attempt 1: WhatsApp ──
  try {
    const whatsappMsg = await client.messages.create({
      body,
      from: "whatsapp:+14155238886", // Twilio sandbox number
      to: `whatsapp:${phoneNumber}`,
    });

    console.log(`[messaging] WhatsApp sent → SID ${whatsappMsg.sid}`);
    return {
      success: true,
      channel: "whatsapp",
      messageId: whatsappMsg.sid,
    };
  } catch (whatsappError) {
    console.warn(
      `[messaging] WhatsApp failed (${whatsappError.message}), trying SMS…`
    );
  }

  // ── Attempt 2: SMS ──
  try {
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    if (!twilioPhone || twilioPhone === "+1234567890") {
      throw new Error("TWILIO_PHONE_NUMBER is not configured for SMS.");
    }

    const smsMsg = await client.messages.create({
      body,
      from: twilioPhone,
      to: phoneNumber,
    });

    console.log(`[messaging] SMS sent → SID ${smsMsg.sid}`);
    return {
      success: true,
      channel: "sms",
      messageId: smsMsg.sid,
    };
  } catch (smsError) {
    console.warn(
      `[messaging] SMS also failed (${smsError.message}), falling back to simulation…`
    );
  }

  // ── Attempt 3: Simulation fallback ──
  console.log(
    `[messaging] SIMULATED (after Twilio failure) → To: ${phoneNumber}\n    Message: "${body}"`
  );
  return {
    success: true,
    channel: "simulated",
    simulatedMessage: body,
    simulatedTo: phoneNumber,
  };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Sends an appointment confirmation message.
 */
export async function sendConfirmation(
  phoneNumber,
  customerName,
  appointmentTime
) {
  const formattedTime = formatTime(appointmentTime);
  const body =
    `Hi ${customerName}! Your appointment is confirmed for ${formattedTime}. ` +
    `We look forward to seeing you!`;

  console.log(`[messaging] Sending confirmation to ${phoneNumber}`);
  return sendWithFallback(phoneNumber, body);
}

/**
 * Sends an appointment reminder message (typically ~1 hour before).
 */
export async function sendReminder(
  phoneNumber,
  customerName,
  appointmentTime
) {
  const formattedTime = formatTime(appointmentTime);
  const body =
    `Hi ${customerName}! Reminder: your appointment is in 1 hour at ${formattedTime}. ` +
    `See you soon!`;

  console.log(`[messaging] Sending reminder to ${phoneNumber}`);
  return sendWithFallback(phoneNumber, body);
}
