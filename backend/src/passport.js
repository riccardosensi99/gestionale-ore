import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './config.js';
import { isEmailAllowed } from './services/access.js';
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
          if (!(await isEmailAllowed(email))) {
            return done(null, false, { reason: 'not_allowed' });
          }

          const name = profile.displayName || null;
          const googleId = profile.id;
          const role = config.adminEmails.includes(email) ? 'admin' : 'user';

          // L'utente può già esistere con lo stesso google_id (login ripetuto)
          // oppure con la stessa email ma un google_id diverso (creato dal
          // login di sviluppo, o email cambiata lato Google): in entrambi i
          // casi si aggiorna la riga esistente invece di inserirne una nuova,
          // che violerebbe l'unique su email.
          const { rows: existing } = await query(
            `SELECT id FROM users
             WHERE google_id = $1 OR email = $2
             ORDER BY (google_id = $1) DESC
             LIMIT 1`,
            [googleId, email]
          );

          if (existing.length) {
            const { rows } = await query(
              `UPDATE users
               SET google_id = $1,
                   email = $2,
                   name = $3,
                   role = CASE WHEN role = 'admin' THEN 'admin' ELSE $4 END
               WHERE id = $5
               RETURNING id, email, name, role`,
              [googleId, email, name, role, existing[0].id]
            );
            return done(null, rows[0]);
          }

          const { rows } = await query(
            `INSERT INTO users (google_id, email, name, role)
             VALUES ($1, $2, $3, $4)
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
