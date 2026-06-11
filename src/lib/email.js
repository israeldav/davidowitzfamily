import { Resend } from "resend";
import { optionalEnv } from "../env.js";

export async function sendReminderEmail(reminders, recipientEmail, targetDate) {
  const reminderList = Array.isArray(reminders) ? reminders : [reminders];
  const apiKey = optionalEnv("RESEND_API_KEY");
  const from = optionalEnv("EMAIL_FROM");
  if (!apiKey || !from) {
    return {
      status: "dry_run",
      error: "RESEND_API_KEY and EMAIL_FROM are not configured.",
    };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [recipientEmail],
    subject: emailSubject(reminderList),
    text: messageText(reminderList, targetDate),
    html: messageHtml(reminderList, targetDate),
  });

  if (error) {
    throw new Error(error.message || "Resend email send failed.");
  }

  return { status: "sent", error: "" };
}

function emailSubject(reminders) {
  if (reminders.length === 1) {
    return `Yahrzeit reminder for ${reminders[0].personName}`;
  }
  return `Yahrzeit reminders for ${reminders.length} names`;
}

function messageText(reminders, targetDate) {
  return reminders
    .map((reminder) => reminderFields(reminder, targetDate)
      .map(([label, value]) => `${label}: ${value}`)
      .join("\n"))
    .join("\n\n---\n\n");
}

function messageHtml(reminders, targetDate) {
  const sections = reminders.map((reminder, index) => reminderSectionHtml(reminder, targetDate, index)).join("");
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #17201d;">
      <h1 style="font-size: 20px; margin: 0 0 12px;">Yahrzeit reminder${reminders.length === 1 ? "" : "s"}</h1>
      ${sections}
    </div>
  `;
}

function reminderSectionHtml(reminder, targetDate, index) {
  const rows = reminderFields(reminder, targetDate)
    .map(([label, value]) => {
      const displayValue = label === "Details"
        ? `<a href="${escapeHtml(value)}" style="color: #1d594b;">View details</a>`
        : escapeHtml(value).replaceAll("\n", "<br>");
      return `
        <tr>
          <th style="padding: 8px 16px 8px 0; text-align: left; vertical-align: top; color: #5f6b67; font-size: 13px; font-weight: 700; white-space: nowrap;">${escapeHtml(label)}</th>
          <td style="padding: 8px 0; color: #17201d; font-size: 15px;">${displayValue}</td>
        </tr>
      `;
    })
    .join("");
  const divider = index === 0 ? "" : "border-top: 1px solid #e3e9e6; padding-top: 16px;";
  return `
    <section style="${divider} margin: ${index === 0 ? "0" : "16px 0 0"};">
      <table style="border-collapse: collapse;">${rows}</table>
    </section>
  `;
}

function reminderFields(reminder, targetDate) {
  const detailUrl = personDetailUrl(reminder);
  return [
    ["Hebrew Name", reminder.hebrewName],
    ["Father's Name", reminder.fatherName],
    ["Secular Name", reminder.secularName],
    ["Hebrew Date", formatHebrewDate(reminder)],
    ["Secular Date", formatSecularDate(reminder.reminderDate || targetDate)],
    ["Notes", reminder.notes],
    ["Details", detailUrl],
  ].filter(([, value]) => value);
}

function personDetailUrl(reminder) {
  const baseUrl = optionalEnv("APP_BASE_URL");
  if (!baseUrl || !reminder.id) {
    return "";
  }
  return `${baseUrl.replace(/\/+$/, "")}/people/${reminder.id}`;
}

function formatHebrewDate(reminder) {
  return [reminder.hebrewDay, reminder.hebrewMonth, reminder.hebrewYear]
    .filter(Boolean)
    .join(" ");
}

function formatSecularDate(date) {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return "";
  }
  return `${match[2]}/${match[3]}/${match[1]}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
