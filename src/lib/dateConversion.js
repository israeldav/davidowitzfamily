import { assertIsoDate } from "./dates.js";

const HEBCAL_CONVERTER_URL = "https://www.hebcal.com/converter";
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

export async function convertGregorianToHebrew(input = {}) {
  const secularDate = assertIsoDate(input.secularDate, "Secular date");
  const data = await fetchHebcal({
    cfg: "json",
    date: secularDate,
    g2h: "1",
    strict: "1",
  });

  return {
    secularDate,
    hebrewDay: data.hd,
    hebrewMonth: data.hm,
    hebrewYear: data.hy,
  };
}

export async function convertHebrewToGregorian(input = {}) {
  const hebrewDay = parseInteger(input.hebrewDay, "Hebrew day", 1, 30);
  const hebrewMonth = cleanText(input.hebrewMonth);
  const hebrewYear = parseInteger(input.hebrewYear, "Hebrew year", 1, 9999);

  if (!HEBREW_MONTHS.has(hebrewMonth)) {
    throw validationError("Hebrew month is invalid.");
  }

  const data = await fetchHebcal({
    cfg: "json",
    hd: String(hebrewDay),
    hm: hebrewMonth,
    hy: String(hebrewYear),
    h2g: "1",
    strict: "1",
  });

  return {
    secularDate: [
      data.gy,
      String(data.gm).padStart(2, "0"),
      String(data.gd).padStart(2, "0"),
    ].join("-"),
    hebrewDay,
    hebrewMonth: data.hm || hebrewMonth,
    hebrewYear,
  };
}

async function fetchHebcal(params) {
  const url = new URL(HEBCAL_CONVERTER_URL);
  url.search = new URLSearchParams(params).toString();

  let response;
  try {
    response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "yahrzeit-reminder/1.0",
      },
    });
  } catch (error) {
    throw validationError(`Date conversion service is unavailable: ${error.message}`);
  }
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw validationError(data.error || data.message || "Date conversion failed.");
  }

  return data;
}

function parseInteger(value, fieldName, min, max) {
  const cleaned = cleanText(value);
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
