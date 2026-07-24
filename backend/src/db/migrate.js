import { pool } from './pool.js';

const MIGRATION = `
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  google_id   TEXT UNIQUE NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_entries (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date  DATE NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('worked', 'vacation', 'sick', 'rest')),
  hours       NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (hours >= 0),
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_time_entries_user_date
  ON time_entries (user_id, entry_date);

-- Il tipo 'rest' (riposo) è stato aggiunto dopo: allinea le installazioni
-- esistenti, dove la tabella era già stata creata senza quel valore.
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_type_check;
ALTER TABLE time_entries ADD CONSTRAINT time_entries_type_check
  CHECK (type IN ('worked', 'vacation', 'sick', 'rest'));
`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(MIGRATION);
    console.log('[migrate] schema applicato con successo');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('[migrate] errore:', err);
  process.exit(1);
});
