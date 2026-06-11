import { pool } from "./db.js";

export async function listEmailRecipients() {
  const result = await pool.query(
    `
    SELECT
      er.*,
      f.name AS family_name,
      COALESCE(
        json_agg(
          json_build_object(
            'id', r.id,
            'personName', r.person_name,
            'hebrewName', r.hebrew_name,
            'secularName', r.secular_name,
            'familyName', rf.name
          )
          ORDER BY lower(COALESCE(NULLIF(r.secular_name, ''), r.person_name))
        ) FILTER (WHERE r.id IS NOT NULL),
        '[]'
      ) AS selected_reminders
    FROM email_recipients er
    LEFT JOIN families f ON f.id = er.family_id
    LEFT JOIN email_recipient_selections ers ON ers.email_recipient_id = er.id
    LEFT JOIN reminders r ON r.id = ers.reminder_id
    LEFT JOIN families rf ON rf.id = r.family_id
    GROUP BY er.id, f.name
    ORDER BY lower(er.email)
    `,
  );
  return result.rows.map(mapRecipient);
}

export async function createEmailRecipient(input = {}) {
  const email = cleanText(input.email);
  const familyId = parseOptionalInteger(input.familyId, "Family", 1, Number.MAX_SAFE_INTEGER);
  const reminderIds = uniqueIds(input.reminderIds || []);

  if (!isEmailish(email)) {
    throw validationError("A valid email address is required.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const recipient = await client.query(
      `
      INSERT INTO email_recipients (email, family_id)
      VALUES ($1, $2)
      RETURNING *
      `,
      [email, familyId],
    );

    for (const reminderId of reminderIds) {
      await client.query(
        `
        INSERT INTO email_recipient_selections (email_recipient_id, reminder_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        `,
        [recipient.rows[0].id, reminderId],
      );
    }

    await client.query("COMMIT");
    return getEmailRecipient(recipient.rows[0].id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateEmailRecipient(id, input = {}) {
  const recipientId = parseOptionalInteger(id, "Email", 1, Number.MAX_SAFE_INTEGER);
  const email = cleanText(input.email);
  const familyId = parseOptionalInteger(input.familyId, "Family", 1, Number.MAX_SAFE_INTEGER);
  const reminderIds = uniqueIds(input.reminderIds || []);

  if (!recipientId) {
    throw validationError("Email is invalid.");
  }
  if (!isEmailish(email)) {
    throw validationError("A valid email address is required.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const recipient = await client.query(
      `
      UPDATE email_recipients
      SET email = $2,
          family_id = $3,
          updated_at = now()
      WHERE id = $1
      RETURNING *
      `,
      [recipientId, email, familyId],
    );

    if (!recipient.rowCount) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query("DELETE FROM email_recipient_selections WHERE email_recipient_id = $1", [recipientId]);

    for (const reminderId of reminderIds) {
      await client.query(
        `
        INSERT INTO email_recipient_selections (email_recipient_id, reminder_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        `,
        [recipientId, reminderId],
      );
    }

    await client.query("COMMIT");
    return getEmailRecipient(recipientId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteEmailRecipient(id) {
  const recipientId = parseOptionalInteger(id, "Email", 1, Number.MAX_SAFE_INTEGER);
  if (!recipientId) {
    throw validationError("Email is invalid.");
  }
  const result = await pool.query("DELETE FROM email_recipients WHERE id = $1", [recipientId]);
  return result.rowCount > 0;
}

export async function listRecipientsForReminder(reminder) {
  const result = await pool.query(
    `
    SELECT er.*
    FROM email_recipients er
    WHERE (er.family_id IS NULL OR er.family_id = $2)
      AND (
        NOT EXISTS (
          SELECT 1
          FROM email_recipient_selections existing
          WHERE existing.email_recipient_id = er.id
        )
        OR EXISTS (
          SELECT 1
          FROM email_recipient_selections selected
          WHERE selected.email_recipient_id = er.id
            AND selected.reminder_id = $1
        )
      )
    ORDER BY lower(er.email)
    `,
    [reminder.id, reminder.familyId],
  );
  return result.rows.map(mapRecipient);
}

async function getEmailRecipient(id) {
  const recipients = await listEmailRecipients();
  return recipients.find((recipient) => recipient.id === Number(id)) || null;
}

function mapRecipient(row) {
  const selectedReminders = Array.isArray(row.selected_reminders) ? row.selected_reminders : [];
  return {
    id: Number(row.id),
    email: row.email,
    familyId: row.family_id ? Number(row.family_id) : null,
    familyName: row.family_name || "",
    selectedReminders: selectedReminders.map((reminder) => ({
      id: Number(reminder.id),
      personName: reminder.personName || "",
      hebrewName: reminder.hebrewName || "",
      secularName: reminder.secularName || "",
      familyName: reminder.familyName || "",
    })),
    selectedCount: selectedReminders.length,
  };
}

function uniqueIds(values) {
  return [...new Set(values.map((value) => parseOptionalInteger(value, "Selected name", 1, Number.MAX_SAFE_INTEGER)).filter(Boolean))];
}

function parseOptionalInteger(value, fieldName, min, max) {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return null;
  }
  const number = Number(cleaned);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw validationError(`${fieldName} is invalid.`);
  }
  return number;
}

function cleanText(value) {
  return String(value || "").trim();
}

function isEmailish(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validationError(message) {
  const error = new Error(message);
  error.name = "ValidationError";
  return error;
}
