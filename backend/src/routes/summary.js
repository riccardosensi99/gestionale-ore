import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSummary, getYearSummary } from '../services/summary.js';

const router = Router();
const MONTH_RE = /^\d{4}-\d{2}$/;

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const month = req.query.month;
    if (!month || !MONTH_RE.test(month)) {
      return res.status(400).json({ error: 'Parametro month richiesto (YYYY-MM)' });
    }
    const summary = await getSummary(req.user.id, month);
    res.json({ summary });
  } catch (err) {
    next(err);
  }
});

// GET /summary/year?year=YYYY — recap annuale, un elemento per mese registrato.
router.get('/year', requireAuth, async (req, res, next) => {
  try {
    const year = Number(req.query.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return res.status(400).json({ error: 'Parametro year non valido' });
    }
    const recap = await getYearSummary(req.user.id, year);
    res.json({ recap });
  } catch (err) {
    next(err);
  }
});

export default router;
