CREATE TABLE IF NOT EXISTS families (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reminders (
    id BIGSERIAL PRIMARY KEY,
    family_id BIGINT REFERENCES families(id) ON DELETE SET NULL,
    person_name TEXT NOT NULL,
    hebrew_name TEXT NOT NULL DEFAULT '',
    secular_name TEXT NOT NULL DEFAULT '',
    father_name TEXT NOT NULL DEFAULT '',
    reminder_date DATE,
    hebrew_day INTEGER,
    hebrew_month TEXT,
    hebrew_year INTEGER,
    recipient_email TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    burial_location TEXT NOT NULL DEFAULT '',
    burial_link TEXT NOT NULL DEFAULT '',
    annual BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_recipients (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    family_id BIGINT REFERENCES families(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_recipient_selections (
    email_recipient_id BIGINT NOT NULL REFERENCES email_recipients(id) ON DELETE CASCADE,
    reminder_id BIGINT NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (email_recipient_id, reminder_id)
);

CREATE TABLE IF NOT EXISTS jewish_holidays (
    id BIGSERIAL PRIMARY KEY,
    holiday_date DATE NOT NULL,
    title TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (holiday_date, title)
);

CREATE TABLE IF NOT EXISTS jewish_holiday_syncs (
    id BIGSERIAL PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    source TEXT NOT NULL DEFAULT 'hebcal-yom-tov',
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_deliveries (
    id BIGSERIAL PRIMARY KEY,
    reminder_id BIGINT NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
    send_for_date DATE NOT NULL,
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'error', 'dry_run')),
    error TEXT NOT NULL DEFAULT '',
    sent_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reminder_attachments (
    id BIGSERIAL PRIMARY KEY,
    reminder_id BIGINT NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reminders ADD COLUMN IF NOT EXISTS family_id BIGINT;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS hebrew_day INTEGER;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS hebrew_month TEXT;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS hebrew_year INTEGER;
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS hebrew_name TEXT NOT NULL DEFAULT '';
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS secular_name TEXT NOT NULL DEFAULT '';
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS father_name TEXT NOT NULL DEFAULT '';
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS burial_location TEXT NOT NULL DEFAULT '';
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS burial_link TEXT NOT NULL DEFAULT '';
ALTER TABLE reminders ALTER COLUMN reminder_date DROP NOT NULL;
ALTER TABLE reminders ALTER COLUMN recipient_email SET DEFAULT '';
ALTER TABLE reminders ALTER COLUMN recipient_email DROP NOT NULL;

ALTER TABLE email_deliveries DROP CONSTRAINT IF EXISTS email_deliveries_reminder_id_send_for_date_key;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'email_deliveries_reminder_date_recipient_key'
    ) THEN
        ALTER TABLE email_deliveries
        ADD CONSTRAINT email_deliveries_reminder_date_recipient_key
        UNIQUE (reminder_id, send_for_date, recipient_email);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'reminders_family_id_fkey'
    ) THEN
        ALTER TABLE reminders
        ADD CONSTRAINT reminders_family_id_fkey
        FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_families_name ON families (lower(name));
CREATE INDEX IF NOT EXISTS idx_email_recipients_family_id ON email_recipients (family_id);
CREATE INDEX IF NOT EXISTS idx_email_recipient_selections_reminder_id ON email_recipient_selections (reminder_id);
CREATE INDEX IF NOT EXISTS idx_jewish_holidays_date ON jewish_holidays (holiday_date);
CREATE INDEX IF NOT EXISTS idx_jewish_holiday_syncs_range ON jewish_holiday_syncs (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_reminders_family_id ON reminders (family_id);
CREATE INDEX IF NOT EXISTS idx_reminders_hebrew_day_month ON reminders (hebrew_day, hebrew_month);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders (reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_month_day ON reminders (
    (EXTRACT(MONTH FROM reminder_date)),
    (EXTRACT(DAY FROM reminder_date))
);
CREATE INDEX IF NOT EXISTS idx_email_deliveries_status ON email_deliveries (status);
CREATE INDEX IF NOT EXISTS idx_reminder_attachments_reminder_id ON reminder_attachments (reminder_id);
