export const TYPE_LABELS = {
  worked: 'Lavorato',
  vacation: 'Ferie',
  sick: 'Malattia/Permesso',
};

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(month) {
  const [year, m] = month.split('-').map(Number);
  const names = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
  ];
  return `${names[m - 1]} ${year}`;
}

export function shiftMonth(month, delta) {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(year, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Returns array of { date: 'YYYY-MM-DD', weekday, isWeekend } for the month
export function daysInMonth(month) {
  const [year, m] = month.split('-').map(Number);
  const total = new Date(year, m, 0).getDate();
  const days = [];
  const weekdays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  for (let day = 1; day <= total; day += 1) {
    const dt = new Date(year, m - 1, day);
    const dow = dt.getDay();
    days.push({
      date: `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      weekday: weekdays[dow],
      isWeekend: dow === 0 || dow === 6,
    });
  }
  return days;
}
