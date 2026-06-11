import "../src/env.js";
import { pool } from "../src/lib/db.js";
import { addDaysIso, todayIso } from "../src/lib/dates.js";
import { syncJewishHolidaysForRange } from "../src/lib/jewishHolidays.js";

const startArg = process.argv.find((arg) => arg.startsWith("--start="));
const endArg = process.argv.find((arg) => arg.startsWith("--end="));
const start = startArg ? startArg.split("=")[1] : todayIso();
const end = endArg ? endArg.split("=")[1] : addDaysIso(start, 3650);

try {
  const events = await syncJewishHolidaysForRange(start, end);
  console.log(JSON.stringify({ start, end, count: events.length, events }, null, 2));
} finally {
  await pool.end();
}
