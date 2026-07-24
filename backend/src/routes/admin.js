import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getSummary, getEntries } from '../services/summary.js';
import { listAllowedEmails, addAllowedEmail, removeAllowedEmail } from '../services/access.js';
import { config } from '../config.js';

const router = Router();
const MONTH_RE = /^\d{4}-\d{2}$/;

router.use(requireAuth, requireAdmin);

// GET /admin/users
router.get('/users', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, email, name, role, created_at FROM users ORDER BY created_at ASC`
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

// GET /admin/users/:id/summary?month=YYYY-MM
router.get('/users/:id/summary', async (req, res, next) => {
  try {
    const month = req.query.month;
    if (!month || !MONTH_RE.test(month)) {
      return res.status(400).json({ error: 'Parametro month richiesto (YYYY-MM)' });
    }
    const userId = Number(req.params.id);
    const [summary, entries] = await Promise.all([
      getSummary(userId, month),
      getEntries(userId, month),
    ]);
    res.json({ summary, entries });
  } catch (err) {
    next(err);
  }
});

// DELETE /admin/users/:id — elimina un dipendente e, in cascata, le sue ore.
router.delete('/users/:id', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Non puoi eliminare il tuo account' });
    }
    const { rows } = await query(
      `DELETE FROM users WHERE id = $1 RETURNING email`,
      [userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Utente non trovato' });
    res.json({ deleted: rows[0].email });
  } catch (err) {
    next(err);
  }
});

// GET /admin/allowed-emails
router.get('/allowed-emails', async (req, res, next) => {
  try {
    res.json({ emails: await listAllowedEmails(), fromEnv: config.allowedEmails });
  } catch (err) {
    next(err);
  }
});

// POST /admin/allowed-emails
router.post('/allowed-emails', async (req, res, next) => {
  try {
    const { error, entry } = await addAllowedEmail(req.body?.email, req.user.id);
    if (error) return res.status(400).json({ error });
    res.status(201).json({ entry });
  } catch (err) {
    next(err);
  }
});

// DELETE /admin/allowed-emails/:id
router.delete('/allowed-emails/:id', async (req, res, next) => {
  try {
    const removed = await removeAllowedEmail(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: 'Voce non trovata' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// GET /admin/submissions?month=YYYY-MM — chi ha inviato quel mese.
router.get('/submissions', async (req, res, next) => {
  try {
    const month = req.query.month;
    if (!month || !MONTH_RE.test(month)) {
      return res.status(400).json({ error: 'Parametro month richiesto (YYYY-MM)' });
    }
    const { rows } = await query(
      `SELECT user_id, submitted_at FROM month_submissions WHERE month = $1`,
      [month]
    );
    res.json({ submissions: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
