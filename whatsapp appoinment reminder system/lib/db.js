import { neon } from "@neondatabase/serverless";

/**
 * Creates a Neon serverless SQL tagged-template function.
 * Each call creates a fresh connection — recommended for
 * serverless / edge environments.
 */
export function sql() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL environment variable is not set. " +
        "Please add it to .env.local."
    );
  }
  return neon(process.env.DATABASE_URL);
}

/**
 * Ensures all required tables exist.
 * Safe to call on every request — uses CREATE TABLE IF NOT EXISTS.
 */
export async function initDB() {
  const db = sql();

  await db`
    CREATE TABLE IF NOT EXISTS appointments (
      id               SERIAL PRIMARY KEY,
      customer_name    VARCHAR(255) NOT NULL,
      phone_number     VARCHAR(50)  NOT NULL,
      appointment_time TIMESTAMP    NOT NULL,
      status           VARCHAR(50)  DEFAULT 'confirmed',
      reminder_sent    BOOLEAN      DEFAULT false,
      created_at       TIMESTAMP    DEFAULT NOW()
    );
  `;

  await db`
    CREATE TABLE IF NOT EXISTS message_logs (
      id               SERIAL PRIMARY KEY,
      appointment_id   INTEGER REFERENCES appointments(id),
      phone_number     VARCHAR(50)  NOT NULL,
      message_type     VARCHAR(20)  NOT NULL,
      message_body     TEXT         NOT NULL,
      channel          VARCHAR(20)  NOT NULL,
      twilio_sid       VARCHAR(100),
      created_at       TIMESTAMP    DEFAULT NOW()
    );
  `;

  console.log("[db] tables ready");
}
