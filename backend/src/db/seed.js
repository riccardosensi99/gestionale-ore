import { pool } from './pool.js';

async function seed() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `INSERT INTO users (google_id, email, name, role)
       VALUES ('seed-demo-user', 'demo@example.com', 'Utente Demo', 'user')
       ON CONFLICT (google_id) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`
    );
    const userId = rows[0].id;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-based

    const entries = [];
    for (let day = 1; day <= 5; day += 1) {
      const date = new Date(Date.UTC(year, month, day));
      entries.push([userId, date.toISOString().slice(0, 10), 'worked', 8]);
    }
    entries.push([
      userId,
      new Date(Date.UTC(year, month, 8)).toISOString().slice(0, 10),
      'vacation',
      0,
    ]);
    entries.push([
      userId,
      new Date(Date.UTC(year, month, 9)).toISOString().slice(0, 10),
      'sick',
      0,
    ]);

    for (const [uid, date, type, hours] of entries) {
      await client.query(
        `INSERT INTO time_entries (user_id, entry_date, type, hours)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, entry_date) DO NOTHING`,
        [uid, date, type, hours]
      );
    }
    console.log('[seed] dati di test inseriti');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('[seed] errore:', err);
  process.exit(1);
});
