import pg from "pg";
import { requiredEnv } from "../env.js";

export const pool = new pg.Pool({
  connectionString: requiredEnv("DATABASE_URL"),
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});

export function mapReminder(row) {
  return {
    id: Number(row.id),
    personName: row.person_name,
    hebrewName: row.hebrew_name || "",
    secularName: row.secular_name || "",
    fatherName: row.father_name || "",
    familyId: row.family_id ? Number(row.family_id) : null,
    familyName: row.family_name || "",
    reminderDate: normalizeDate(row.reminder_date),
    hebrewDay: row.hebrew_day,
    hebrewMonth: row.hebrew_month || "",
    hebrewYear: row.hebrew_year,
    recipientEmail: row.recipient_email,
    notes: row.notes,
    burialLocation: row.burial_location || "",
    burialLink: row.burial_link || "",
    annual: row.annual,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function normalizeDate(value) {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}
