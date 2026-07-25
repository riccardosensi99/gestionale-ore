import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://gestionale:gestionale@localhost:5432/gestionale',
  jwtSecret: process.env.JWT_SECRET || 'changeme',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:4000/auth/google/callback',
  },
  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  // Email (o domini, es. "@azienda.it") autorizzati ad accedere.
  // Lista vuota = nessuna voce statica aggiuntiva (la whitelist resta comunque
  // quella in DB; se anche quella è vuota, entrano solo gli ADMIN_EMAILS).
  allowedEmails: (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  // Login di sviluppo (bypass Google). MAI attivo in produzione.
  devLogin: process.env.DEV_LOGIN === 'true' && process.env.NODE_ENV !== 'production',
};

export const isProd = config.env === 'production';
