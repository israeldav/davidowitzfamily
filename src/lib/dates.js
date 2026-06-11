import { optionalEnv } from "../env.js";

export function appTimeZone() {
  return optionalEnv("APP_TIME_ZONE", "America/New_York");
}

export function todayIso(timeZone = appTimeZone()) {
  return isoDateInZone(new Date(), timeZone);
}

export function tomorrowIso(timeZone = appTimeZone()) {
  return addDaysIso(todayIso(timeZone), 1, timeZone);
}

export function addDaysIso(isoDate, days, timeZone = appTimeZone()) {
  assertIsoDate(isoDate);
  if (!Number.isInteger(days)) {
    throw validationError("Days must be an integer.");
  }
  const [year, month, day] = isoDate.split("-").map(Number);
  const noonUtc = Date.UTC(year, month - 1, day, 12, 0, 0);
  return isoDateInZone(new Date(noonUtc + days * 24 * 60 * 60 * 1000), timeZone);
}

export function dayOfWeek(isoDate, timeZone = appTimeZone()) {
  assertIsoDate(isoDate);
  const [year, month, day] = isoDate.split("-").map(Number);
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(noonUtc);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

export function dateRange(startDate, endDate, timeZone = appTimeZone()) {
  assertIsoDate(startDate, "Start date");
  assertIsoDate(endDate, "End date");
  const dates = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    dates.push(cursor);
    cursor = addDaysIso(cursor, 1, timeZone);
  }
  return dates;
}

export function assertIsoDate(value, fieldName = "Date") {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw validationError(`${fieldName} must be in YYYY-MM-DD format.`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw validationError(`${fieldName} must be a real calendar date.`);
  }
  return value;
}

function isoDateInZone(date, timeZone) {
  const parts = partsInZone(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function partsInZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function validationError(message) {
  const error = new Error(message);
  error.name = "ValidationError";
  return error;
}
