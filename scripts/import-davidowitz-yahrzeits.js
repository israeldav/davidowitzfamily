import "../src/env.js";
import { pool } from "../src/lib/db.js";

const familyName = "Davidowitz";

const rows = [
  { hebrewDay: 26, hebrewMonth: "Iyyar", hebrewYear: 5704, hebrewName: "Efraim", fatherName: "Meir", notes: "Bubby's Father", burialLocation: "Auschwitz" },
  { hebrewDay: 26, hebrewMonth: "Iyyar", hebrewYear: 5704, hebrewName: "Freida", fatherName: "Mordechai", notes: "Bubby's Mother" },
  { hebrewDay: 18, hebrewMonth: "Sivan", hebrewYear: 5704, hebrewName: "Hershmeilech", fatherName: "Efraim", notes: "Bubby's Brother" },
  { hebrewDay: 21, hebrewMonth: "Tishrei", hebrewYear: 5705, hebrewName: "Moshe", fatherName: "Yechiel", notes: "Zaidy's Father", burialLocation: "Auschwitz" },
  { hebrewDay: 10, hebrewMonth: "Sh'vat", hebrewYear: 5680, hebrewName: "Rivka", notes: "Zaidy's real Mother" },
  { hebrewDay: 24, hebrewMonth: "Tevet", hebrewName: "Sara", fatherName: "Efraim", notes: "Bubby" },
  { hebrewDay: 13, hebrewMonth: "Sivan", hebrewName: "Chatzkel" },
  { hebrewDay: 7, hebrewMonth: "Adar", hebrewYear: 5741, hebrewName: "Danniel" },
  { hebrewDay: 20, hebrewMonth: "Elul", hebrewYear: 5750, hebrewName: "Michael", secularName: "Mitch" },
  { hebrewDay: 5, hebrewMonth: "Cheshvan", hebrewYear: 5751, hebrewName: "Yaankel", fatherName: "Yehuda Leib", notes: "Uncle Yankel" },
  { hebrewDay: 6, hebrewMonth: "Tamuz", hebrewName: "Chaya", fatherName: "Efraim" },
  { hebrewDay: 11, hebrewMonth: "Tevet", hebrewName: "Yitzchok", fatherName: "Efraim", notes: "Uncle Irving" },
  { hebrewDay: 24, hebrewMonth: "Tevet", hebrewYear: 5743, hebrewName: "Yisroel", fatherName: "Moshe", notes: "Uncle Srul", burialLocation: "Deans" },
  { hebrewDay: 22, hebrewMonth: "Tamuz", hebrewYear: 5746, hebrewName: "Devorah", fatherName: "Yehuda Leib", notes: "Aunt Flori", burialLocation: "Deans" },
  { hebrewDay: 16, hebrewMonth: "Cheshvan", hebrewYear: 5765, hebrewName: "Shmuel", fatherName: "Moshe", notes: "Uncle Shmeial", burialLocation: "Deans" },
  { hebrewDay: 5, hebrewMonth: "Tishrei", hebrewYear: 5756, hebrewName: "Chaya", fatherName: "Tzvi Shimon", notes: "Aunt Helen", burialLocation: "Deans" },
  { hebrewDay: 10, hebrewMonth: "Elul", hebrewYear: 5775, hebrewName: "Tzipra", fatherName: "Moshe", notes: "Aunt Ceil", burialLocation: "Deans" },
  { hebrewDay: 18, hebrewMonth: "Av", hebrewYear: 5753, hebrewName: "David Tzvi", fatherName: "Moshe Dov", notes: "Aunt Ceil Husband" },
];

const client = await pool.connect();

try {
  await client.query("BEGIN");
  await client.query("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS burial_location TEXT NOT NULL DEFAULT ''");
  await client.query("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS burial_link TEXT NOT NULL DEFAULT ''");
  await client.query("ALTER TABLE reminders ALTER COLUMN reminder_date DROP NOT NULL");

  const family = await client.query(
    `
    INSERT INTO families (name)
    VALUES ($1)
    ON CONFLICT (name)
    DO UPDATE SET updated_at = now()
    RETURNING id
    `,
    [familyName],
  );
  const familyId = family.rows[0].id;
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const personName = row.secularName || row.hebrewName;
    const duplicate = await client.query(
      `
      SELECT 1
      FROM reminders
      WHERE family_id = $1
        AND hebrew_day = $2
        AND hebrew_month = $3
        AND COALESCE(hebrew_year, 0) = COALESCE($4::integer, 0)
        AND hebrew_name = $5
        AND secular_name = $6
        AND father_name = $7
      LIMIT 1
      `,
      [
        familyId,
        row.hebrewDay,
        row.hebrewMonth,
        row.hebrewYear || null,
        row.hebrewName || "",
        row.secularName || "",
        row.fatherName || "",
      ],
    );

    if (duplicate.rowCount) {
      skipped += 1;
      continue;
    }

    await client.query(
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
        annual
      )
      VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, $8, $9, $10, true)
      `,
      [
        familyId,
        personName,
        row.hebrewName || "",
        row.secularName || "",
        row.fatherName || "",
        row.hebrewDay,
        row.hebrewMonth,
        row.hebrewYear || null,
        row.notes || "",
        row.burialLocation || "",
      ],
    );
    inserted += 1;
  }

  await client.query("COMMIT");
  console.log(JSON.stringify({ family: familyName, inserted, skipped, total: rows.length }, null, 2));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
