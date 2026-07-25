import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

// Le colonne DATE restano stringhe 'YYYY-MM-DD': convertirle in Date porta a
// slittamenti di fuso e a chiavi non confrontabili con il calendario (il PDF
// segnava ogni giorno come "Non registrato").
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

export const pool = new Pool({ connectionString: config.databaseUrl });

export const query = (text, params) => pool.query(text, params);
