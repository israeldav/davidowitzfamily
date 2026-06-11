import { pool } from "./db.js";
import { assertIsoDate } from "./dates.js";

const HEBCAL_CALENDAR_URL = "https://www.hebcal.com/hebcal";

export async function ensureJewishHolidaysForRange(startDate, endDate) {
  assertIsoDate(startDate, "Start date");
  assertIsoDate(endDate, "End date");

  if (!(await hasSyncedRange(startDate, endDate))) {
    await syncJewishHolidaysForRange(startDate, endDate);
  }

  return listJewishHolidays(startDate, endDate);
}

export async function listJewishHolidays(startDate, endDate) {
  const result = await pool.query(
    `
    SELECT holiday_date, title, source
    FROM jewish_holidays
    WHERE holiday_date BETWEEN $1::date AND $2::date
    ORDER BY holiday_date, title
    `,
    [startDate, endDate],
  );
  return result.rows.map((row) => ({
    holidayDate: normalizeDate(row.holiday_date),
    title: row.title,
    source: row.source,
  }));
}

export async function syncJewishHolidaysForRange(startDate, endDate) {
  const events = await fetchYomTovEvents(startDate, endDate);

  for (const event of events) {
    await pool.query(
      `
      INSERT INTO jewish_holidays (holiday_date, title, source)
      VALUES ($1, $2, 'hebcal-yom-tov')
      ON CONFLICT (holiday_date, title)
      DO UPDATE SET source = EXCLUDED.source,
                    updated_at = now()
      `,
      [event.date, event.title],
    );
  }

  await pool.query(
    `
    INSERT INTO jewish_holiday_syncs (start_date, end_date, source)
    VALUES ($1, $2, 'hebcal-yom-tov')
    `,
    [startDate, endDate],
  );

  return events;
}

async function hasSyncedRange(startDate, endDate) {
  const result = await pool.query(
    `
    SELECT 1
    FROM jewish_holiday_syncs
    WHERE start_date <= $1::date
      AND end_date >= $2::date
      AND source = 'hebcal-yom-tov'
    LIMIT 1
    `,
    [startDate, endDate],
  );
  return result.rowCount > 0;
}

async function fetchYomTovEvents(startDate, endDate) {
  const url = new URL(HEBCAL_CALENDAR_URL);
  url.search = new URLSearchParams({
    v: "1",
    cfg: "json",
    start: startDate,
    end: endDate,
    i: "off",
    yto: "on",
  }).toString();

  let response;
  try {
    response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "yahrzeit-reminder/1.0",
      },
    });
  } catch (error) {
    throw validationError(`Holiday service is unavailable: ${error.message}`);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw validationError(data.error || data.message || "Holiday sync failed.");
  }

  return (data.items || [])
    .filter((item) => item.date && item.title)
    .map((item) => ({
      date: item.date.slice(0, 10),
      title: item.title,
    }));
}

function normalizeDate(value) {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

function validationError(message) {
  const error = new Error(message);
  error.name = "ValidationError";
  return error;
}
