import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { getEntries } from '../services/summary.js';

const router = Router();
const VALID_TYPES = ['worked', 'vacation', 'sick'];
const MONTH_RE = /^\d{4}-\d{2}$/;

router.use(requireAuth);

function validateBody(body) {
  const { date, type, hours, note } = body;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return 'Data non valida (formato YYYY-MM-DD)';
  }
  if (!VALID_TYPES.includes(type)) {
    return `Tipo non valido (${VALID_TYPES.join(', ')})`;
  }
  const h = Number(hours ?? 0);
  if (Number.isNaN(h) || h < 0 || h > 24) {
    return 'Ore non valide (0-24)';
  }
  if (note != null && String(note).length > 500) {
    return 'Nota troppo lunga';
  }
  return null;
}

// GET /entries?month=YYYY-MM
router.get('/', async (req, res, next) => {
  try {
    const month = req.query.month;
    if (!month || !MONTH_RE.test(month)) {
      return res.status(400).json({ error: 'Parametro month richiesto (YYYY-MM)' });
    }
    const rows = await getEntries(req.user.id, month);
    res.json({ entries: rows });
  } catch (err) {
    next(err);
  }
});

// POST /entries  (upsert su user_id+date)
router.post('/', async (req, res, next) => {
  try {
    const error = validateBody(req.body);
    if (error) return res.status(400).json({ error });
    const { date, type, hours = 0, note = null } = req.body;
    const { rows } = await query(
      `INSERT INTO time_entries (user_id, entry_date, type, hours, note)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, entry_date) DO UPDATE
         SET type = EXCLUDED.type,
             hours = EXCLUDED.hours,
             note = EXCLUDED.note,
             updated_at = now()
       RETURNING id, entry_date, type, hours, note`,
      [req.user.id, date, type, hours, note]
    );
    res.status(201).json({ entry: rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /entries/:id
router.put('/:id', async (req, res, next) => {
  try {
    const error = validateBody(req.body);
    if (error) return res.status(400).json({ error });
    const { date, type, hours = 0, note = null } = req.body;
    const { rows } = await query(
      `UPDATE time_entries
       SET entry_date = $1, type = $2, hours = $3, note = $4, updated_at = now()
       WHERE id = $5 AND user_id = $6
       RETURNING id, entry_date, type, hours, note`,
      [date, type, hours, note, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Registrazione non trovata' });
    res.json({ entry: rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /entries/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await query(
      `DELETE FROM time_entries WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Registrazione non trovata' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
