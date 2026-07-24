import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config, isEmailAllowed } from './config.js';
import { query } from './db/pool.js';

export function configurePassport() {
  if (!config.google.clientId || !config.google.clientSecret) {
    console.warn(
      '[passport] GOOGLE_CLIENT_ID/SECRET non configurati: il login Google non funzionerà finché non li imposti in .env'
    );
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId || 'missing',
        clientSecret: config.google.clientSecret || 'missing',
        callbackURL: config.google.callbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = (profile.emails?.[0]?.value || '').toLowerCase();

          // Whitelist: nessun utente viene creato se l'email non è autorizzata.
          if (!isEmailAllowed(email)) {
            return done(null, false, { reason: 'not_allowed' });
          }

          const name = profile.displayName || null;
          const googleId = profile.id;
          const role = config.adminEmails.includes(email) ? 'admin' : 'user';

          const { rows } = await query(
            `INSERT INTO users (google_id, email, name, role)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (google_id) DO UPDATE
               SET email = EXCLUDED.email,
                   name = EXCLUDED.name,
                   role = CASE
                            WHEN users.role = 'admin' THEN 'admin'
                            ELSE EXCLUDED.role
                          END
             RETURNING id, email, name, role`,
            [googleId, email, name, role]
          );
          return done(null, rows[0]);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  return passport;
}
