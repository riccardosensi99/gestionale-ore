import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getSummary, getEntries } from '../services/summary.js';

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

export default router;
