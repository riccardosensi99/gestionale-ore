import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSummary, getEntries } from '../services/summary.js';
import { streamMonthlyPdf } from '../services/pdf.js';

const router = Router();
const MONTH_RE = /^\d{4}-\d{2}$/;

// GET /export/pdf?month=YYYY-MM   (utente corrente)
// GET /export/pdf?month=YYYY-MM&userId=..&name=..  (usato internamente dal backoffice)
router.get('/pdf', requireAuth, async (req, res, next) => {
  try {
    const month = req.query.month;
    if (!month || !MONTH_RE.test(month)) {
      return res.status(400).json({ error: 'Parametro month richiesto (YYYY-MM)' });
    }

    let targetUser = { id: req.user.id, name: req.user.name, email: req.user.email };
    if (req.query.userId && req.user.role === 'admin') {
      targetUser = {
        id: Number(req.query.userId),
        name: req.query.name || null,
        email: req.query.email || '',
      };
    }

    const [summary, entries] = await Promise.all([
      getSummary(targetUser.id, month),
      getEntries(targetUser.id, month),
    ]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ore-${month}.pdf"`
    );
    streamMonthlyPdf(res, { user: targetUser, month, summary, entries });
  } catch (err) {
    next(err);
  }
});

export default router;
