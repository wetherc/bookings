export const createTablesSql = `
CREATE TABLE events (
  event_id     TEXT PRIMARY KEY,   -- nanoid
  admin_token  TEXT NOT NULL,      -- nanoid, secret
  title        TEXT NOT NULL,
  description  TEXT,
  block_minutes INTEGER NOT NULL,  -- 15, 30, or 60
  time_slots   TEXT NOT NULL,      -- JSON array
  created_at   TEXT NOT NULL
);

CREATE TABLE rsvps (
  event_id        TEXT NOT NULL,
  respondent_token TEXT NOT NULL,  -- nanoid, secret
  name            TEXT NOT NULL,
  selected_slots  TEXT NOT NULL,   -- JSON array of ISO strings
  updated_at      TEXT NOT NULL,
  PRIMARY KEY (event_id, respondent_token)
);

CREATE INDEX idx_rsvps_event ON rsvps(event_id);
`;
