import { query } from '../db/pool.js';
import { workingDaysInMonth } from './calendar.js';

// Ore di una giornata standard: oltre questa soglia si contano straordinari.
const STANDARD_DAY = 8;

// month = 'YYYY-MM'
export function monthRange(month) {
  const [year, m] = month.split('-').map(Number);
  const start = `${year}-${String(m).padStart(2, '0')}-01`;
  const endDate = new Date(Date.UTC(year, m, 1)); // first day of next month
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
}

export async function getEntries(userId, month) {
  const { start, end } = monthRange(month);
  const { rows } = await query(
    `SELECT id, entry_date, type, hours, note
     FROM time_entries
     WHERE user_id = $1 AND entry_date >= $2 AND entry_date < $3
     ORDER BY entry_date ASC`,
    [userId, start, end]
  );
  return rows;
}

export async function getSummary(userId, month) {
  const { start, end } = monthRange(month);
  const { rows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE type = 'worked' AND hours > 0) AS worked_days,
       COALESCE(SUM(hours) FILTER (WHERE type = 'worked'), 0) AS total_hours,
       COUNT(*) FILTER (WHERE type = 'vacation') AS vacation_days,
       COUNT(*) FILTER (WHERE type = 'sick') AS sick_days,
       COUNT(*) FILTER (WHERE type = 'rest') AS rest_days,
       COALESCE(SUM(GREATEST(hours - ${STANDARD_DAY}, 0))
                FILTER (WHERE type = 'worked'), 0) AS overtime_hours
     FROM time_entries
     WHERE user_id = $1 AND entry_date >= $2 AND entry_date < $3`,
    [userId, start, end]
  );
  const r = rows[0];
  return {
    month,
    // Giorni lavorativi attesi da calendario (lun-ven, festività escluse).
    expectedWorkingDays: workingDaysInMonth(month),
    workedDays: Number(r.worked_days),
    totalHours: Number(r.total_hours),
    vacationDays: Number(r.vacation_days),
    sickDays: Number(r.sick_days),
    restDays: Number(r.rest_days),
    overtimeHours: Number(r.overtime_hours),
  };
}

// Riepilogo per anno: una riga per mese con dati registrati, più i totali.
export async function getYearSummary(userId, year) {
  const { rows } = await query(
    `SELECT
       to_char(entry_date, 'YYYY-MM') AS month,
       COUNT(*) FILTER (WHERE type = 'worked' AND hours > 0) AS worked_days,
       COALESCE(SUM(hours) FILTER (WHERE type = 'worked'), 0) AS total_hours,
       COALESCE(SUM(GREATEST(hours - ${STANDARD_DAY}, 0))
                FILTER (WHERE type = 'worked'), 0) AS overtime_hours
     FROM time_entries
     WHERE user_id = $1
       AND entry_date >= make_date($2, 1, 1)
       AND entry_date < make_date($2 + 1, 1, 1)
     GROUP BY 1
     ORDER BY 1`,
    [userId, year]
  );

  const months = rows.map((r) => ({
    month: r.month,
    workedDays: Number(r.worked_days),
    totalHours: Number(r.total_hours),
    overtimeHours: Number(r.overtime_hours),
    expectedWorkingDays: workingDaysInMonth(r.month),
  }));

  const totalHours = months.reduce((sum, m) => sum + m.totalHours, 0);
  const overtimeHours = months.reduce((sum, m) => sum + m.overtimeHours, 0);
  const best = months.reduce(
    (top, m) => (!top || m.totalHours > top.totalHours ? m : top),
    null
  );

  return {
    year,
    months,
    totalHours,
    overtimeHours,
    averageHours: months.length ? Math.round(totalHours / months.length) : 0,
    bestMonth: best,
  };
}
