import { pool, mapReminder } from "./db.js";
import { assertIsoDate } from "./dates.js";

const HEBREW_MONTHS = new Set([
  "Nisan",
  "Iyyar",
  "Sivan",
  "Tamuz",
  "Av",
  "Elul",
  "Tishrei",
  "Cheshvan",
  "Kislev",
  "Tevet",
  "Sh'vat",
  "Adar",
  "Adar I",
  "Adar II",
]);

export async function listReminders() {
  const result = await pool.query(
    `
    SELECT r.*, f.name AS family_name
    FROM reminders r
    LEFT JOIN families f ON f.id = r.family_id
    ORDER BY
      r.hebrew_year IS NULL,
      r.hebrew_year,
      CASE r.hebrew_month
        WHEN 'Nisan' THEN 1
        WHEN 'Iyyar' THEN 2
        WHEN 'Sivan' THEN 3
        WHEN 'Tamuz' THEN 4
        WHEN 'Av' THEN 5
        WHEN 'Elul' THEN 6
        WHEN 'Tishrei' THEN 7
        WHEN 'Cheshvan' THEN 8
        WHEN 'Kislev' THEN 9
        WHEN 'Tevet' THEN 10
        WHEN 'Sh''vat' THEN 11
        WHEN 'Adar' THEN 12
        WHEN 'Adar I' THEN 12
        WHEN 'Adar II' THEN 13
        ELSE 99
      END,
      r.hebrew_day,
      lower(COALESCE(NULLIF(secular_name, ''), person_name))
    `,
  );
  return result.rows.map(mapReminder);
}

export async function listDueReminders(targetDate, hebrewDate) {
  const sendForDate = assertIsoDate(targetDate, "Target date");
  const hebrewDay = parseOptionalInteger(hebrewDate?.hebrewDay, "Hebrew day", 1, 30);
  const hebrewMonth = cleanText(hebrewDate?.hebrewMonth);

  if (!hebrewDay || !HEBREW_MONTHS.has(hebrewMonth)) {
    throw validationError("A valid Hebrew day and month are required.");
  }

  const result = await pool.query(
    `
    SELECT r.*, f.name AS family_name
    FROM reminders r
    LEFT JOIN families f ON f.id = r.family_id
    WHERE r.hebrew_day = $1
      AND r.hebrew_month = $2
    ORDER BY lower(r.person_name)
    `,
    [hebrewDay, hebrewMonth],
  );
  return {
    targetDate: sendForDate,
    hebrewDay,
    hebrewMonth,
    reminders: result.rows.map(mapReminder),
  };
}

export async function getReminder(id) {
  return getReminderById(parseId(id));
}

export async function createReminder(input) {
  const data = normalizeReminderInput(input);
  const result = await pool.query(
    `
    INSERT INTO reminders (
      family_id,
      person_name,
      hebrew_name,
      secular_name,
      father_name,
      reminder_date,
      hebrew_day,
      hebrew_month,
      hebrew_year,
      notes,
      burial_location,
      burial_link,
      annual
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id
    `,
    reminderValues(data),
  );
  return getReminderById(result.rows[0].id);
}

export async function updateReminder(id, input) {
  const numericId = parseId(id);
  const data = normalizeReminderInput(input);
  const result = await pool.query(
      `
      UPDATE reminders
      SET family_id = $1,
          person_name = $2,
          hebrew_name = $3,
          secular_name = $4,
          father_name = $5,
          reminder_date = $6,
          hebrew_day = $7,
          hebrew_month = $8,
          hebrew_year = $9,
          notes = $10,
          burial_location = $11,
          burial_link = $12,
          annual = $13,
          updated_at = now()
      WHERE id = $14
      RETURNING id
      `,
    [...reminderValues(data), numericId],
  );
  if (!result.rowCount) {
    return null;
  }
  return getReminderById(result.rows[0].id);
}

export async function deleteReminder(id) {
  const numericId = parseId(id);
  const result = await pool.query("DELETE FROM reminders WHERE id = $1", [numericId]);
  return result.rowCount === 1;
}

async function getReminderById(id) {
  const result = await pool.query(
    `
    SELECT r.*, f.name AS family_name
    FROM reminders r
    LEFT JOIN families f ON f.id = r.family_id
    WHERE r.id = $1
    `,
    [id],
  );
  return result.rows[0] ? mapReminder(result.rows[0]) : null;
}

function reminderValues(data) {
  return [
    data.familyId,
    data.personName,
    data.hebrewName,
    data.secularName,
    data.fatherName,
    data.reminderDate,
    data.hebrewDay,
    data.hebrewMonth,
    data.hebrewYear,
    data.notes,
    data.burialLocation,
    data.burialLink,
    data.annual,
  ];
}

function parseId(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 1) {
    const error = new Error("Invalid reminder id.");
    error.name = "ValidationError";
    throw error;
  }
  return numericId;
}

function normalizeReminderInput(input = {}) {
  const hebrewName = cleanText(input.hebrewName);
  const secularName = cleanText(input.secularName);
  const fatherName = cleanText(input.fatherName);
  const personName = secularName || hebrewName;
  const familyId = parseOptionalInteger(input.familyId, "Family", 1, Number.MAX_SAFE_INTEGER);
  const reminderDate = cleanText(input.reminderDate)
    ? assertIsoDate(input.reminderDate, "Reminder date")
    : null;
  const hebrewDay = parseOptionalInteger(input.hebrewDay, "Hebrew day", 1, 30);
  const hebrewMonth = cleanText(input.hebrewMonth);
  const hebrewYear = parseOptionalInteger(input.hebrewYear, "Hebrew year", 1, 9999);
  const notes = cleanText(input.notes);
  const burialLocation = cleanText(input.burialLocation);
  const burialLink = cleanText(input.burialLink);
  const annual = input.annual !== false;

  if (!personName) {
    throw validationError("Hebrew name or secular name is required.");
  }
  if (hebrewMonth && !HEBREW_MONTHS.has(hebrewMonth)) {
    throw validationError("Hebrew month is invalid.");
  }

  return {
    personName,
    hebrewName,
    secularName,
    fatherName,
    familyId,
    reminderDate,
    hebrewDay,
    hebrewMonth: hebrewMonth || null,
    hebrewYear,
    notes,
    burialLocation,
    burialLink,
    annual,
  };
}

function parseOptionalInteger(value, fieldName, min, max) {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return null;
  }
  const number = Number(cleaned);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw validationError(`${fieldName} must be between ${min} and ${max}.`);
  }
  return number;
}

function cleanText(value) {
  return String(value || "").trim();
}

function validationError(message) {
  const error = new Error(message);
  error.name = "ValidationError";
  return error;
}
