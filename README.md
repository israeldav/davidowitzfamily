# Davidowitz Family App

Combined application for:

- family-history pages and trees
- yahrzeit reminder management
- reminder email delivery
- local family page generation through the Electron person builder

## Structure

- `src/` Express server and API
- `db/` PostgreSQL schema
- `scripts/` migration, reminder, import, and holiday sync scripts
- `static/` browser assets
- `static/family/` family-history site
- `static/family/people/` person HTML pages
- `static/family/img/` family images and PDFs
- `tools/electron-person-builder/` local page/media builder

## Main Routes

- `/` Yahrzeit reminder app
- `/family` family-history home
- `/family/newTree.html` Hershkowitz tree
- `/family/newDavidowitzTree.html` Davidowitz tree
- `/family/people/<person>.html` person pages

Legacy family URLs are redirected into `/family/...` paths by the Express server.

## Environment

Copy `.env.example` to `.env` and set:

```sh
DATABASE_URL=postgres://user:password@host:5432/yahrzeit
APP_BASE_URL=https://your-app.example.com
APP_TIME_ZONE=America/New_York
RESEND_API_KEY=re_your_api_key
EMAIL_FROM="Yahrzeit Reminder <reminders@your-verified-domain.com>"
REMINDER_JOB_TOKEN=change-me
```

## Run

```sh
npm install
npm run migrate
npm run sync-holidays
npm start
```

Local app:

- `http://127.0.0.1:3000/`

## Electron Builder

Run the local builder with:

```sh
npm run person-builder
```

Or directly:

```sh
cd tools/electron-person-builder
npm start
```

Generated family pages are written to:

- `static/family/people/`

Generated media folders are written to:

- `static/family/img/`
