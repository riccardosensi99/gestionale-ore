import { Router } from 'express';
import passport from 'passport';
import { config, isProd } from '../config.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { query } from '../db/pool.js';

const router = Router();

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${config.frontendUrl}/login?error=auth`,
  }),
  (req, res) => {
    const token = signToken(req.user);
    res.cookie('token', token, cookieOptions);
    res.redirect(config.frontendUrl);
  }
);

// Indica al frontend se il login di sviluppo è disponibile
router.get('/config', (req, res) => {
  res.json({ devLogin: config.devLogin });
});

// Login di sviluppo: crea/recupera un utente e rilascia il JWT senza Google.
// Attivo solo se DEV_LOGIN=true e NODE_ENV != production.
router.post('/dev-login', async (req, res, next) => {
  if (!config.devLogin) {
    return res.status(404).json({ error: 'Login di sviluppo non abilitato' });
  }
  try {
    const email = String(req.body?.email || 'dev@example.com').toLowerCase();
    const name = req.body?.name || 'Utente Dev';
    const role = config.adminEmails.includes(email) || req.body?.admin ? 'admin' : 'user';
    const { rows } = await query(
      `INSERT INTO users (google_id, email, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name,
             role = CASE WHEN users.role = 'admin' THEN 'admin' ELSE EXCLUDED.role END
       RETURNING id, email, name, role`,
      [`dev-${email}`, email, name, role]
    );
    const token = signToken(rows[0]);
    res.cookie('token', token, cookieOptions);
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
});

export default router;
