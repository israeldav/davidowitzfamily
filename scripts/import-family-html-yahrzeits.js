import "../src/env.js";
import { pool } from "../src/lib/db.js";
import { convertGregorianToHebrew } from "../src/lib/dateConversion.js";

const rows = [
  { sourceFile: "TziporahDavidowitz2.html", familyName: "Davidowitz", secularName: "Tzipora Davidowitz", hebrewName: "Tzipora", fatherName: "Avroham", death: "1944", burialLocation: "Auschwitz", motherName: "Flora" },
  { sourceFile: "branaHerskovics.html", familyName: "Herskowitz", secularName: "Brana Herskowitz", hebrewName: "Brana", fatherName: "Efraim", death: "June 3, 1944 | Sivan 13, 5704", burialLocation: "Auschwitz", motherName: "Freida", spouse: "Michael Moskovitz" },
  { sourceFile: "bubby.html", familyName: "Herskowitz", secularName: "Sarah Davidowitz (Herskowitz)", hebrewName: "Sarah", fatherName: "Efraim", death: "Dec 23, 1993", burialLocation: "Mount Carmel, Los Angeles", motherName: "Freida" },
  { sourceFile: "chanaFeigaLebovics.html", familyName: "Davidowitz", secularName: "Chana Feiga Davidowitz", hebrewName: "Chana", fatherName: "Chaim Ber", death: "1944", burialLocation: "Auschwitz", motherName: "Pesel" },
  { sourceFile: "efraimhershkowitz.html", familyName: "Herskowitz", secularName: "Efraim Herskowitz", hebrewName: "Efraim", fatherName: "Meir", death: "May 18, 1944 | Iyar 26, 5704", burialLocation: "Auschwitz", spouse: "Freda" },
  { sourceFile: "etelDavidowitz.html", familyName: "Lebovics", secularName: "Etel Lebovic (Davidowitz)", hebrewName: "Etel", fatherName: "Mechel", death: "1944", burialLocation: "Auschwitz", motherName: "Tziporah", spouse: "Leib" },
  { sourceFile: "freidahershkowitz.html", familyName: "Herskowitz", secularName: "Freida Herskowitz (Farkas)", hebrewName: "Freida", fatherName: "Mordechai", death: "May 18, 1944 | Iyar 26, 5704", burialLocation: "Auschwitz", motherName: "Devorah" },
  { sourceFile: "goldaLebovics.html", familyName: "Lebovics", secularName: "Golda Lebovics", hebrewName: "Golda", fatherName: "Chaim Ber", death: "1944", burialLocation: "Auschwitz", motherName: "Pesel" },
  { sourceFile: "hershmeilichhershkowitz.html", familyName: "Herskowitz", secularName: "Hersh Meilich Herskowitz", hebrewName: "Hersh", fatherName: "Efraim", death: "June 8, 1944 | Sivan 18, 5704", burialLocation: "Auschwitz", motherName: "Freida" },
  { sourceFile: "irvingHerskowitz.html", familyName: "Herskowitz", secularName: "Irving Herskowitz", hebrewName: "Irving", fatherName: "Efraim", death: "Dec 20, 1999 | 11 Teves, 5760", burialLocation: "Mt Lebanon, Queens", burialLink: "https://www.findagrave.com/memorial/98890092/irving-herskowitz", motherName: "Freida" },
  { sourceFile: "jacobMoskovics.html", familyName: "Moskovics", secularName: "Jacob Moskovics", hebrewName: "Jacob", fatherName: "Michael Chaim", death: "Jan 13, 1939", motherName: "Breina" },
  { sourceFile: "mechelDavidowitz.html", familyName: "Davidowitz", secularName: "Mechel Davidowitz", hebrewName: "Mechel", death: "April 13, 1920", spouse: "Tziporah" },
  { sourceFile: "michaDavidowitz.html", familyName: "Davidowitz", secularName: "Micha Davidowitz", hebrewName: "Micha", fatherName: "Avroham", death: "1944", burialLocation: "Auschwitz", motherName: "Flora" },
  { sourceFile: "mordechaiHerskowitz.html", familyName: "Herskowitz", secularName: "Mordechai (Marton) Herskowitz", hebrewName: "Mordechai", fatherName: "Efraim", death: "July 24, 1922", motherName: "Freida" },
  { sourceFile: "mordechaiLebovics.html", familyName: "Lebovics", secularName: "Mordechai Lebovics", hebrewName: "Mordechai", fatherName: "Yaakov", death: "1890", motherName: "Freida (Farkas)" },
  { sourceFile: "moshe.html", familyName: "Davidowitz", secularName: "Moshe Davidowitz (Zaidy's Father)", hebrewName: "Moshe", fatherName: "Mechel", death: "Oct 8, 1944 | 21 Tishrei, 5705", burialLocation: "Auschwitz", motherName: "Tziporah", spouse: "Rivkah" },
  { sourceFile: "peppiDavidowitz.html", familyName: "Lebovics", secularName: "Pesil (Peppi, Paula) Lebovics nee Davidowitz", hebrewName: "Pesil", fatherName: "Mechel", death: "1944", burialLocation: "Auschwitz", motherName: "Tziporah", spouse: "Chaim Ber" },
  { sourceFile: "poliKlein.html", familyName: "Herskowitz", secularName: "Poli (Toli) Herskovics (nee Klein)", hebrewName: "Poli", fatherName: "Shmuel", death: "May 1, 1900", motherName: "Leni (Herschkovics)" },
  { sourceFile: "rivkahDavidowitz.html", familyName: "Herskowitz", secularName: "Rivka (Regina) Davidowitz nee Herskovics", hebrewName: "Rivka", fatherName: "Leib (Leba)", death: "Jan 29, 1920 | Shevat 10", motherName: "Poli (Toli) nee Klein", spouse: "Moshe" },
  { sourceFile: "shlomoDavidowitz.html", familyName: "Davidowitz", secularName: "Shlomo Davidowitz", hebrewName: "Shlomo", fatherName: "Mechel", death: "1944", burialLocation: "Auschwitz", motherName: "Tziporah" },
  { sourceFile: "shmuelDavidowitz.html", familyName: "Davidowitz", secularName: "Shmuel Davidowitz", hebrewName: "Shmuel", fatherName: "Moshe", death: "Nov 11, 2003 | 16 Cheshvon, 5764", burialLocation: "Floral Park Cemetery South Brunswick, NJ", burialLink: "https://www.findagrave.com/memorial/196590833/samuel-davidovicz", motherName: "Rivkah (Regina)" },
  { sourceFile: "shmuelLebovics1.html", familyName: "Lebovics", secularName: "Shmuel Lebovics", hebrewName: "Shmuel", fatherName: "Chaim Ber", death: "1944", burialLocation: "Auschwitz", motherName: "Pesel" },
  { sourceFile: "srulDavidowitz.html", familyName: "Davidowitz", secularName: "Srul Davidowitz", hebrewName: "Srul", fatherName: "Moshe", death: "Jan 18, 1982 | Teves 24, 5742", burialLocation: "Floral Park Cemetery South Brunswick, NJ", burialLink: "https://www.findagrave.com/memorial/196587166/sol-david", motherName: "Rivkah (Miriam)" },
  { sourceFile: "suriDavidowitzBasMechel.html", familyName: "Davidowitz", secularName: "Suri Davidowitz", hebrewName: "Suri", fatherName: "Mechel", death: "March 24, 1900", motherName: "Tziporah" },
  { sourceFile: "szerenaDavidowitz.html", familyName: "Davidowitz", secularName: "Szerena (Sarah?) Davidowitz", hebrewName: "Szerena", fatherName: "Mechel", death: "June 20, 1902", motherName: "Tziporah" },
  { sourceFile: "tziporaDavidowitz.html", familyName: "Moskovics", secularName: "Tziporah Davidowitz (nee Moskovics)", hebrewName: "Tziporah", fatherName: "Mozes", death: "Mar 21, 1920", spouse: "Mechel" },
  { sourceFile: "tziporahLebovics.html", familyName: "Lebovics", secularName: "Tziporah Lebovics", hebrewName: "Tziporah", fatherName: "Chaim Ber", death: "1944", burialLocation: "Auschwitz", motherName: "Pesel" },
  { sourceFile: "yechezkelhershkowitz.html", familyName: "Herskowitz", secularName: "Yechezkel Herskowitz", hebrewName: "Yechezkel", fatherName: "Efraim", death: "June 3, 1944 | Sivan 13, 5704", burialLocation: "Auschwitz", motherName: "Freida" },
  { sourceFile: "zaidy.html", familyName: "Davidowitz", secularName: "Yitzchok (Irving, Ignatz) Davidowitz", hebrewName: "Yitzchok", fatherName: "Moshe", death: "Jan 6, 2006 | 6 Teves, 5766", burialLocation: "Mount Carmel, Los Angeles", motherName: "Rivkah" },
];

const client = await pool.connect();

try {
  await client.query("BEGIN");
  await ensureSchema(client);

  let inserted = 0;
  let skipped = 0;

  for (const rawRow of rows) {
    const row = await normalizeRow(rawRow);
    const family = await client.query(
      `
      INSERT INTO families (name)
      VALUES ($1)
      ON CONFLICT (name)
      DO UPDATE SET updated_at = now()
      RETURNING id
      `,
      [row.familyName],
    );
    const familyId = family.rows[0].id;

    const duplicate = await client.query(
      `
      SELECT 1
      FROM reminders
      WHERE family_id = $1
        AND secular_name = $2
        AND hebrew_name = $3
        AND father_name = $4
        AND COALESCE(hebrew_day, 0) = COALESCE($5::integer, 0)
        AND COALESCE(hebrew_month, '') = COALESCE($6::text, '')
        AND COALESCE(hebrew_year, 0) = COALESCE($7::integer, 0)
        AND COALESCE(reminder_date::text, '') = COALESCE($8::text, '')
      LIMIT 1
      `,
      [
        familyId,
        row.secularName,
        row.hebrewName,
        row.fatherName,
        row.hebrewDay,
        row.hebrewMonth,
        row.hebrewYear,
        row.reminderDate,
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
        burial_link,
        annual
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
      `,
      [
        familyId,
        row.secularName || row.hebrewName,
        row.hebrewName,
        row.secularName,
        row.fatherName,
        row.reminderDate,
        row.hebrewDay,
        row.hebrewMonth,
        row.hebrewYear,
        row.notes,
        row.burialLocation,
        row.burialLink,
      ],
    );
    inserted += 1;
  }

  await client.query("COMMIT");
  console.log(JSON.stringify({ inserted, skipped, total: rows.length }, null, 2));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}

async function ensureSchema(client) {
  await client.query("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS burial_location TEXT NOT NULL DEFAULT ''");
  await client.query("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS burial_link TEXT NOT NULL DEFAULT ''");
  await client.query("ALTER TABLE reminders ALTER COLUMN reminder_date DROP NOT NULL");
}

async function normalizeRow(row) {
  const parsedDeath = parseDeath(row.death);
  let hebrew = parsedDeath.hebrew;

  if (parsedDeath.secularDate && (!hebrew || !hebrew.hebrewYear)) {
    const converted = await convertGregorianToHebrew({ secularDate: parsedDeath.secularDate });
    hebrew = {
      ...converted,
      ...hebrew,
      hebrewYear: hebrew?.hebrewYear || converted.hebrewYear,
    };
  }

  const notes = [
    `Death: ${row.death}`,
    row.motherName ? `Mother: ${row.motherName}` : "",
    row.spouse ? `Spouse: ${row.spouse}` : "",
    `Source: family/people/${row.sourceFile}`,
  ].filter(Boolean).join("\n");

  return {
    familyName: row.familyName,
    secularName: row.secularName || "",
    hebrewName: row.hebrewName || "",
    fatherName: row.fatherName || "",
    reminderDate: parsedDeath.secularDate,
    hebrewDay: hebrew?.hebrewDay || null,
    hebrewMonth: hebrew?.hebrewMonth || null,
    hebrewYear: hebrew?.hebrewYear || null,
    notes,
    burialLocation: row.burialLocation || "",
    burialLink: row.burialLink || "",
  };
}

function parseDeath(value) {
  const [secularPart, hebrewPart] = String(value || "").split("|").map((part) => part.trim());
  return {
    secularDate: parseSecularDate(secularPart),
    hebrew: parseHebrewDate(hebrewPart),
  };
}

function parseSecularDate(value) {
  const match = String(value || "").match(/^([A-Za-z]+)\\s+(\\d{1,2}),\\s*(\\d{4})$/);
  if (!match) {
    return null;
  }
  const month = monthNumber(match[1]);
  if (!month) {
    return null;
  }
  return [
    match[3],
    String(month).padStart(2, "0"),
    String(Number(match[2])).padStart(2, "0"),
  ].join("-");
}

function parseHebrewDate(value) {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }

  let match = text.match(/^(\\d{1,2})\\s+(.+?)(?:,\\s*(\\d{4}))?$/);
  if (match) {
    return {
      hebrewDay: Number(match[1]),
      hebrewMonth: normalizeHebrewMonth(match[2]),
      hebrewYear: match[3] ? Number(match[3]) : null,
    };
  }

  match = text.match(/^(.+?)\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?$/);
  if (match) {
    return {
      hebrewDay: Number(match[2]),
      hebrewMonth: normalizeHebrewMonth(match[1]),
      hebrewYear: match[3] ? Number(match[3]) : null,
    };
  }

  return null;
}

function normalizeHebrewMonth(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const months = {
    nisan: "Nisan",
    iyar: "Iyyar",
    iyyar: "Iyyar",
    sivan: "Sivan",
    tamuz: "Tamuz",
    tammuz: "Tamuz",
    av: "Av",
    elul: "Elul",
    tishrei: "Tishrei",
    cheshvan: "Cheshvan",
    cheshvon: "Cheshvan",
    kislev: "Kislev",
    tevet: "Tevet",
    teves: "Tevet",
    shevat: "Sh'vat",
    shvat: "Sh'vat",
    "sh'vat": "Sh'vat",
    adar: "Adar",
  };
  return months[normalized] || value;
}

function monthNumber(value) {
  const months = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  };
  return months[String(value || "").toLowerCase()] || null;
}
