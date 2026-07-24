import { Router } from 'express';
import passport from 'passport';
import { config, isProd } from '../config.js';
import { signToken, requireAuth } from '../middleware/auth.js';

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

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', { ...cookieOptions, maxAge: undefined });
  res.json({ ok: true });
});

export default router;
