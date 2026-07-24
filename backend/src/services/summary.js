import { query } from '../db/pool.js';

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
       COUNT(*) FILTER (WHERE type = 'sick') AS sick_days
     FROM time_entries
     WHERE user_id = $1 AND entry_date >= $2 AND entry_date < $3`,
    [userId, start, end]
  );
  const r = rows[0];
  return {
    month,
    workedDays: Number(r.worked_days),
    totalHours: Number(r.total_hours),
    vacationDays: Number(r.vacation_days),
    sickDays: Number(r.sick_days),
  };
}
