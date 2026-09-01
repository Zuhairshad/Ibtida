-- Two-stage wake verification: add wudu_token to prayer_alarm_settings and
-- wudu_scanned_at to wake_verifications so the sink-scan step is tracked
-- independently from the final mat-scan step.

ALTER TABLE prayer_alarm_settings
  ADD COLUMN IF NOT EXISTS wudu_token text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '');

ALTER TABLE wake_verifications
  ADD COLUMN IF NOT EXISTS wudu_scanned_at timestamptz;
