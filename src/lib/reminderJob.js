import { pool } from "./db.js";
import { convertGregorianToHebrew } from "./dateConversion.js";
import { sendReminderEmail } from "./email.js";
import { listRecipientsForReminder } from "./emailRecipients.js";
import { ensureJewishHolidaysForRange } from "./jewishHolidays.js";
import { listDueReminders } from "./reminders.js";
import { addDaysIso, assertIsoDate, dayOfWeek, tomorrowIso } from "./dates.js";

export async function sendDueReminders({ targetDate } = {}) {
  const sendForDate = targetDate ? assertIsoDate(targetDate, "Target date") : tomorrowIso();
  const sendDates = await buildSendDateWindow(sendForDate);
  const results = [];

  for (const sendDate of sendDates) {
    const hebrewDate = await convertGregorianToHebrew({ secularDate: sendDate });
    const due = await listDueReminders(sendDate, hebrewDate);
    const remindersByRecipient = new Map();

    for (const reminder of due.reminders) {
      const recipients = await listRecipientsForReminder(reminder);

      for (const recipient of recipients) {
        const reminders = remindersByRecipient.get(recipient.email) || [];
        reminders.push(reminder);
        remindersByRecipient.set(recipient.email, reminders);
      }
    }

    for (const [recipientEmail, recipientReminders] of remindersByRecipient) {
      const remindersToSend = [];

      for (const reminder of recipientReminders) {
        const reserved = await reserveDelivery(reminder, recipientEmail, sendDate);
        if (reserved) {
          remindersToSend.push(reminder);
          continue;
        }

        results.push({
          targetDate: sendDate,
          reminderId: reminder.id,
          personName: reminder.personName,
          recipientEmail,
          status: "skipped",
          error: "Already sent for this date.",
        });
      }

      if (!remindersToSend.length) {
        continue;
      }

      let delivery;
      try {
        delivery = await sendReminderEmail(remindersToSend, recipientEmail, sendDate);
      } catch (error) {
        delivery = { status: "error", error: error.message };
      }

      for (const reminder of remindersToSend) {
        await updateDelivery(reminder.id, recipientEmail, sendDate, delivery);
        results.push({
          targetDate: sendDate,
          reminderId: reminder.id,
          personName: reminder.personName,
          recipientEmail,
          status: delivery.status,
          error: delivery.error || "",
        });
      }
    }
  }

  return {
    targetDate: sendForDate,
    targetDates: sendDates,
    count: results.length,
    results,
  };
}

async function buildSendDateWindow(firstDate) {
  const lookaheadEnd = addDaysIso(firstDate, 14);
  const holidays = await ensureJewishHolidaysForRange(firstDate, lookaheadEnd);
  const holidayDates = new Set(holidays.map((holiday) => holiday.holidayDate));
  const dates = [firstDate];
  let cursor = addDaysIso(firstDate, 1);

  while (dayOfWeek(cursor) === 6 || holidayDates.has(cursor)) {
    dates.push(cursor);
    cursor = addDaysIso(cursor, 1);
  }

  return dates;
}

async function reserveDelivery(reminder, recipientEmail, sendForDate) {
  const result = await pool.query(
    `
    INSERT INTO email_deliveries (reminder_id, send_for_date, recipient_email, status)
    VALUES ($1, $2, $3, 'pending')
    ON CONFLICT (reminder_id, send_for_date, recipient_email)
    DO UPDATE
      SET status = 'pending',
          error = '',
          recipient_email = EXCLUDED.recipient_email,
          updated_at = now()
    WHERE email_deliveries.status != 'sent'
    RETURNING id
    `,
    [reminder.id, sendForDate, recipientEmail],
  );
  return result.rowCount === 1;
}

async function updateDelivery(reminderId, recipientEmail, sendForDate, delivery) {
  await pool.query(
    `
    UPDATE email_deliveries
    SET status = $3,
        error = $4,
        sent_at = CASE WHEN $3 IN ('sent', 'dry_run') THEN now() ELSE sent_at END,
        updated_at = now()
    WHERE reminder_id = $1
      AND send_for_date = $2
      AND recipient_email = $5
    `,
    [reminderId, sendForDate, delivery.status, delivery.error || "", recipientEmail],
  );
}
