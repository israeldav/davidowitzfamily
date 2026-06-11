import { pool } from "./db.js";

export async function listFamilies() {
  const result = await pool.query(
    `
    SELECT id, name
    FROM families
    ORDER BY lower(name)
    `,
  );
  return result.rows.map(mapFamily);
}

export async function createFamily(input = {}) {
  const name = cleanText(input.name);
  if (!name) {
    throw validationError("Family name is required.");
  }

  const result = await pool.query(
    `
    INSERT INTO families (name)
    VALUES ($1)
    ON CONFLICT (name)
    DO UPDATE SET updated_at = now()
    RETURNING id, name
    `,
    [name],
  );
  return mapFamily(result.rows[0]);
}

function mapFamily(row) {
  return {
    id: Number(row.id),
    name: row.name,
  };
}

function cleanText(value) {
  return String(value || "").trim();
}

function validationError(message) {
  const error = new Error(message);
  error.name = "ValidationError";
  return error;
}
