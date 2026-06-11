import "../src/env.js";
import { pool } from "../src/lib/db.js";
import { sendDueReminders } from "../src/lib/reminderJob.js";

const targetDateArg = process.argv.find((arg) => arg.startsWith("--date="));
const targetDate = targetDateArg ? targetDateArg.split("=")[1] : undefined;

try {
  const result = await sendDueReminders({ targetDate });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await pool.end();
}

