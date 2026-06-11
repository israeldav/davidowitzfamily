import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import "../src/env.js";
import { pool } from "../src/lib/db.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const schemaPath = path.join(root, "db", "schema.sql");
const schema = await readFile(schemaPath, "utf8");

try {
  await pool.query(schema);
  console.log("Database schema is up to date.");
} finally {
  await pool.end();
}

