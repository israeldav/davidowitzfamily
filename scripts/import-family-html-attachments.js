import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import "../src/env.js";
import { pool } from "../src/lib/db.js";

const defaultSourceDir = path.resolve(process.cwd(), "static", "family", "people");
const sourceDir = path.resolve(process.env.FAMILY_HTML_DIR || defaultSourceDir);
const maxFileSize = 10 * 1024 * 1024;
const allowedExtensions = new Set([".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const excludedPages = new Set([
  "index.html",
  "newDavidowitzTree.html",
  "newTree.html",
  "tree.html",
]);

const client = await pool.connect();

try {
  await client.query("BEGIN");
  await ensureSchema();

  const reminders = await loadReminders();
  const pages = await loadPages();
  const summary = {
    pages: pages.length,
    attached: 0,
    duplicates: 0,
    noReminder: [],
    noFiles: [],
    missingFiles: [],
    tooLarge: [],
  };

  for (const page of pages) {
    const reminder = findReminder(page, reminders);
    if (!reminder) {
      summary.noReminder.push(page.fileName);
      continue;
    }
    if (!page.files.length) {
      summary.noFiles.push(page.fileName);
      continue;
    }

    for (const filePath of page.files) {
      let fileStat;
      try {
        fileStat = await stat(filePath);
      } catch {
        summary.missingFiles.push(relativeSourcePath(filePath));
        continue;
      }
      if (fileStat.size > maxFileSize) {
        summary.tooLarge.push(relativeSourcePath(filePath));
        continue;
      }

      const fileName = path.basename(filePath);
      const duplicate = await client.query(
        `
        SELECT 1
        FROM reminder_attachments
        WHERE reminder_id = $1
          AND file_name = $2
          AND file_size = $3
        LIMIT 1
        `,
        [reminder.id, fileName, fileStat.size],
      );
      if (duplicate.rowCount) {
        summary.duplicates += 1;
        continue;
      }

      const buffer = await readFile(filePath);
      await client.query(
        `
        INSERT INTO reminder_attachments (reminder_id, file_name, content_type, file_size, file_data)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [reminder.id, fileName, contentTypeFor(filePath), fileStat.size, buffer],
      );
      summary.attached += 1;
    }
  }

  await client.query("COMMIT");
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}

async function ensureSchema() {
  await client.query(`
    CREATE TABLE IF NOT EXISTS reminder_attachments (
      id BIGSERIAL PRIMARY KEY,
      reminder_id BIGINT NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      content_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS idx_reminder_attachments_reminder_id ON reminder_attachments (reminder_id)");
}

async function loadReminders() {
  const result = await client.query(`
    SELECT r.*, f.name AS family_name
    FROM reminders r
    LEFT JOIN families f ON f.id = r.family_id
  `);
  return result.rows.map((row) => ({
    id: Number(row.id),
    sourceKeys: sourceKeys(row.notes),
    searchable: normalizeSearch([
      row.person_name,
      row.secular_name,
      row.hebrew_name,
      row.family_name,
    ].filter(Boolean).join(" ")),
    names: [
      normalizeSearch(row.person_name),
      normalizeSearch(row.secular_name),
      normalizeSearch(row.hebrew_name),
    ].filter(Boolean),
  }));
}

async function loadPages() {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  const pages = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".html") || excludedPages.has(entry.name)) {
      continue;
    }
    const filePath = path.join(sourceDir, entry.name);
    const html = await readFile(filePath, "utf8");
    const title = extractTitle(html);
    const files = extractLocalFiles(html, filePath);
    if (!title && !files.length) {
      continue;
    }
    pages.push({
      fileName: entry.name,
      filePath,
      title,
      searchTitle: normalizeSearch(title),
      files,
    });
  }
  return pages;
}

function findReminder(page, reminders) {
  const sourceMatch = reminders.find((reminder) => reminder.sourceKeys.has(page.fileName));
  if (sourceMatch) {
    return sourceMatch;
  }

  const titleMatch = reminders.find((reminder) => reminder.names.includes(page.searchTitle));
  if (titleMatch) {
    return titleMatch;
  }

  const looseTitle = dropParentheticals(page.searchTitle);
  return reminders.find((reminder) =>
    reminder.names.some((name) => name === looseTitle || dropParentheticals(name) === looseTitle),
  ) || null;
}

function sourceKeys(notes) {
  const keys = new Set();
  for (const match of String(notes || "").matchAll(/(?:davidowitzfamily1|family\/people)\/([^)\s\n]+)/g)) {
    keys.add(path.basename(match[1]));
  }
  return keys;
}

function extractTitle(html) {
  const titles = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((match) => stripTags(match[1]).trim())
    .filter((text) => text && text.toLowerCase() !== "home");
  return titles.at(-1) || "";
}

function extractLocalFiles(html, htmlPath) {
  const values = [
    ...attributeValues(html, "src"),
    ...attributeValues(html, "data"),
    ...attributeValues(html, "href"),
  ];
  const files = new Map();
  for (const value of values) {
    const resolved = resolveLocalFile(value, htmlPath);
    if (!resolved) {
      continue;
    }
    files.set(resolved, resolved);
  }
  return [...files.values()];
}

function attributeValues(html, attributeName) {
  const pattern = new RegExp(`${attributeName}\\s*=\\s*["']([^"']*)["']`, "gi");
  return [...html.matchAll(pattern)].map((match) => match[1]);
}

function resolveLocalFile(value, htmlPath) {
  const cleanValue = String(value || "").trim().split("#")[0].split("?")[0];
  if (
    !cleanValue ||
    cleanValue.startsWith("http://") ||
    cleanValue.startsWith("https://") ||
    cleanValue.startsWith("mailto:") ||
    cleanValue.startsWith("%PUBLIC_URL%")
  ) {
    return null;
  }

  let decoded;
  try {
    decoded = decodeURI(cleanValue);
  } catch {
    decoded = cleanValue;
  }

  const extension = path.extname(decoded).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    return null;
  }

  const relativePath = decoded.startsWith("/")
    ? decoded.slice(1)
    : path.relative(sourceDir, path.resolve(path.dirname(htmlPath), decoded));
  return path.resolve(sourceDir, relativePath);
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentTypes = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return contentTypes[extension] || "application/octet-stream";
}

function stripTags(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&[^;\s]+;/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function dropParentheticals(value) {
  return String(value || "")
    .replace(/\b(?:nee|ben|bas)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function relativeSourcePath(filePath) {
  return path.relative(sourceDir, filePath);
}
