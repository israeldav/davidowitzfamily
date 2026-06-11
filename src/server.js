import express from "express";
import helmet from "helmet";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./env.js";
import { createAttachment, deleteAttachment, getAttachment, listAttachments } from "./lib/attachments.js";
import { convertGregorianToHebrew, convertHebrewToGregorian } from "./lib/dateConversion.js";
import { createEmailRecipient, deleteEmailRecipient, listEmailRecipients, updateEmailRecipient } from "./lib/emailRecipients.js";
import { createFamily, listFamilies } from "./lib/families.js";
import { createReminder, deleteReminder, getReminder, listDueReminders, listReminders, updateReminder } from "./lib/reminders.js";
import { sendDueReminders } from "./lib/reminderJob.js";
import { optionalEnv, requiredEnv } from "./env.js";
import { tomorrowIso } from "./lib/dates.js";

const app = express();
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const staticRoot = path.join(root, "static");
const familyRoot = path.join(staticRoot, "family");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use((_req, res, next) => {
  res.set("X-Robots-Tag", "noindex, nofollow");
  next();
});
app.use(express.json());
app.use(express.static(staticRoot));

app.get("/img/*", (req, res) => {
  const target = req.path.replace(/^\/img\//, "/family/img/");
  res.redirect(301, target);
});

app.get(["/branch-viewer", "/family-explorer", "/tree-custom", "/tree-balkan"], (req, res) => {
  res.redirect(301, `/family${req.path}/`);
});

app.get("/:slug.html", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    next();
    return;
  }

  const { slug } = req.params;
  if (["newTree", "newDavidowitzTree", "tree"].includes(slug)) {
    res.redirect(301, `/family/${slug}.html`);
    return;
  }

  res.redirect(301, `/family/people/${slug}.html`);
});

app.get("/family/:slug.html", (req, res, next) => {
  const { slug } = req.params;
  if (["index", "newTree", "newDavidowitzTree", "tree"].includes(slug)) {
    next();
    return;
  }

  res.redirect(301, `/family/people/${slug}.html`);
});

app.get("/family/:slug", (req, res) => {
  res.redirect(301, `/family/people/${req.params.slug}.html`);
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/reminders", async (_req, res, next) => {
  try {
    res.json({ reminders: await listReminders() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/due-tomorrow", async (_req, res, next) => {
  try {
    const targetDate = tomorrowIso();
    const hebrewDate = await convertGregorianToHebrew({ secularDate: targetDate });
    const result = await listDueReminders(targetDate, hebrewDate);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/families", async (_req, res, next) => {
  try {
    res.json({ families: await listFamilies() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/families", async (req, res, next) => {
  try {
    const family = await createFamily(req.body);
    res.status(201).json({ family });
  } catch (error) {
    next(error);
  }
});

app.get("/api/email-recipients", async (_req, res, next) => {
  try {
    res.json({ recipients: await listEmailRecipients() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/email-recipients", async (req, res, next) => {
  try {
    const recipient = await createEmailRecipient(req.body);
    res.status(201).json({ recipient });
  } catch (error) {
    next(error);
  }
});

app.put("/api/email-recipients/:id", async (req, res, next) => {
  try {
    const recipient = await updateEmailRecipient(req.params.id, req.body);
    if (!recipient) {
      res.status(404).json({ error: "Email not found." });
      return;
    }
    res.json({ recipient });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/email-recipients/:id", async (req, res, next) => {
  try {
    const deleted = await deleteEmailRecipient(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Email not found." });
      return;
    }
    res.json({ deleted: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/date-conversions/gregorian-to-hebrew", async (req, res, next) => {
  try {
    res.json(await convertGregorianToHebrew(req.body));
  } catch (error) {
    next(error);
  }
});

app.post("/api/date-conversions/hebrew-to-gregorian", async (req, res, next) => {
  try {
    res.json(await convertHebrewToGregorian(req.body));
  } catch (error) {
    next(error);
  }
});

app.post("/api/reminders", async (req, res, next) => {
  try {
    const reminder = await createReminder(req.body);
    res.status(201).json({ reminder });
  } catch (error) {
    next(error);
  }
});

app.get("/api/reminders/:id", async (req, res, next) => {
  try {
    const reminder = await getReminder(req.params.id);
    if (!reminder) {
      res.status(404).json({ error: "Reminder not found." });
      return;
    }
    const attachments = await listAttachments(req.params.id);
    res.json({ reminder, attachments });
  } catch (error) {
    next(error);
  }
});

app.put("/api/reminders/:id", async (req, res, next) => {
  try {
    const reminder = await updateReminder(req.params.id, req.body);
    if (!reminder) {
      res.status(404).json({ error: "Reminder not found." });
      return;
    }
    res.json({ reminder });
  } catch (error) {
    next(error);
  }
});

app.get("/api/reminders/:id/attachments", async (req, res, next) => {
  try {
    res.json({ attachments: await listAttachments(req.params.id) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/reminders/:id/attachments", upload.single("file"), async (req, res, next) => {
  try {
    const attachment = await createAttachment(req.params.id, req.file);
    res.status(201).json({ attachment });
  } catch (error) {
    next(error);
  }
});

app.get("/api/attachments/:id", async (req, res, next) => {
  try {
    const attachment = await getAttachment(req.params.id);
    if (!attachment) {
      res.status(404).json({ error: "Attachment not found." });
      return;
    }
    res.set({
      "Content-Type": attachment.contentType,
      "Content-Length": String(attachment.fileSize),
      "Content-Disposition": `inline; filename="${attachment.fileName.replaceAll('"', '')}"`,
    });
    res.send(attachment.data);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/attachments/:id", async (req, res, next) => {
  try {
    const deleted = await deleteAttachment(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Attachment not found." });
      return;
    }
    res.json({ deleted: true });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/reminders/:id", async (req, res, next) => {
  try {
    const deleted = await deleteReminder(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Reminder not found." });
      return;
    }
    res.json({ deleted: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/jobs/send-reminders", async (req, res, next) => {
  try {
    assertJobAuth(req);
    const result = await sendDueReminders({ targetDate: req.body?.targetDate });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/family", (_req, res) => {
  res.sendFile(path.join(familyRoot, "index.html"));
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(staticRoot, "index.html"));
});

app.use((error, _req, res, _next) => {
  const status = error.status || (error.name === "ValidationError" || error.code === "LIMIT_FILE_SIZE" ? 400 : 500);
  res.status(status).json({
    error: error.code === "LIMIT_FILE_SIZE"
      ? "File must be 10MB or smaller."
      : status === 500 ? "Unexpected server error." : error.message,
  });
  if (status === 500) {
    console.error(error);
  }
});

function assertJobAuth(req) {
  const expected = requiredEnv("REMINDER_JOB_TOKEN");
  const header = req.get("authorization") || "";
  const actual = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!actual || actual !== expected) {
    const error = new Error("Unauthorized.");
    error.status = 401;
    throw error;
  }
}

const port = Number(optionalEnv("PORT", "3000"));
app.listen(port, () => {
  console.log(`Yahrzeit Reminder listening on port ${port}`);
});
