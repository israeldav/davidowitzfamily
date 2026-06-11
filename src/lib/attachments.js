import { pool } from "./db.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(["application/pdf"]);

export async function listAttachments(reminderId) {
  const id = parseId(reminderId, "Reminder");
  const result = await pool.query(
    `
    SELECT id, reminder_id, file_name, content_type, file_size, created_at
    FROM reminder_attachments
    WHERE reminder_id = $1
    ORDER BY created_at DESC, id DESC
    `,
    [id],
  );
  return result.rows.map(mapAttachment);
}

export async function createAttachment(reminderId, file) {
  const id = parseId(reminderId, "Reminder");
  if (!file) {
    throw validationError("A file is required.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw validationError("File must be 10MB or smaller.");
  }
  if (!file.mimetype.startsWith("image/") && !ALLOWED_CONTENT_TYPES.has(file.mimetype)) {
    throw validationError("Only images and PDFs can be uploaded.");
  }

  const result = await pool.query(
    `
    INSERT INTO reminder_attachments (reminder_id, file_name, content_type, file_size, file_data)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, reminder_id, file_name, content_type, file_size, created_at
    `,
    [
      id,
      cleanText(file.originalname) || "attachment",
      cleanText(file.mimetype) || "application/octet-stream",
      file.size,
      file.buffer,
    ],
  );
  return mapAttachment(result.rows[0]);
}

export async function getAttachment(attachmentId) {
  const id = parseId(attachmentId, "Attachment");
  const result = await pool.query(
    `
    SELECT *
    FROM reminder_attachments
    WHERE id = $1
    `,
    [id],
  );
  return result.rows[0] ? {
    ...mapAttachment(result.rows[0]),
    data: result.rows[0].file_data,
  } : null;
}

export async function deleteAttachment(attachmentId) {
  const id = parseId(attachmentId, "Attachment");
  const result = await pool.query("DELETE FROM reminder_attachments WHERE id = $1", [id]);
  return result.rowCount === 1;
}

function mapAttachment(row) {
  return {
    id: Number(row.id),
    reminderId: Number(row.reminder_id),
    fileName: row.file_name,
    contentType: row.content_type,
    fileSize: Number(row.file_size),
    createdAt: row.created_at,
    url: `/api/attachments/${row.id}`,
  };
}

function parseId(value, fieldName) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw validationError(`${fieldName} is invalid.`);
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
