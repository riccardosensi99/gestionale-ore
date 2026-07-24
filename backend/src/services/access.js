import { query } from '../db/pool.js';
import { config } from '../config.js';

// Whitelist di accesso: unisce le voci statiche di ALLOWED_EMAILS (utili al
// primo avvio, quando il backoffice non è ancora raggiungibile) a quelle
// gestite dagli admin nella tabella allowed_emails.
// Una voce che inizia con "@" autorizza l'intero dominio.
export async function listAllowedEmails() {
  const { rows } = await query(
    `SELECT id, email, created_at FROM allowed_emails ORDER BY email ASC`
  );
  return rows;
}

function matches(entries, email) {
  return entries.some((entry) =>
    entry.startsWith('@') ? email.endsWith(entry) : email === entry
  );
}

export async function isEmailAllowed(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return false;

  if (config.allowedEmails.length && matches(config.allowedEmails, normalized)) {
    return true;
  }

  const { rows } = await query(`SELECT email FROM allowed_emails`);
  // Nessuna restrizione configurata da nessuna parte: accedono tutti.
  if (!rows.length && !config.allowedEmails.length) return true;

  return matches(rows.map((r) => r.email), normalized);
}

export async function addAllowedEmail(email, createdBy) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !(normalized.startsWith('@') || normalized.includes('@'))) {
    return { error: 'Inserisci una email valida o un dominio (@azienda.it)' };
  }
  const { rows } = await query(
    `INSERT INTO allowed_emails (email, created_by)
     VALUES ($1, $2)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email, created_at`,
    [normalized, createdBy]
  );
  if (!rows.length) return { error: 'Questa email è già in elenco' };
  return { entry: rows[0] };
}

export async function removeAllowedEmail(id) {
  const { rowCount } = await query(`DELETE FROM allowed_emails WHERE id = $1`, [id]);
  return rowCount > 0;
}
