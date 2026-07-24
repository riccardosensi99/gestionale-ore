export const TYPE_LABELS = {
  worked: 'Lavorato',
  vacation: 'Ferie',
  sick: 'Malattia/Permesso',
};

// Calendario lavorativo italiano: lunedì-venerdì, escluse le festività nazionali.
//
// NOTA: questa logica è replicata in backend/src/services/calendar.js perché i
// due pacchetti hanno build e contesti Docker separati. Se cambi le regole qui,
// aggiorna anche l'altro file.
const FIXED_HOLIDAYS = {
  '01-01': 'Capodanno',
  '01-06': 'Epifania',
  '04-25': 'Festa della Liberazione',
  '05-01': 'Festa del Lavoro',
  '06-02': 'Festa della Repubblica',
  '08-15': 'Ferragosto',
  '11-01': 'Ognissanti',
  '12-08': 'Immacolata Concezione',
  '12-25': 'Natale',
  '12-26': 'Santo Stefano',
};

function iso(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Domenica di Pasqua secondo l'algoritmo di Meeus/Jones/Butcher.
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

const holidayCache = new Map();

export function holidaysForYear(year) {
  if (holidayCache.has(year)) return holidayCache.get(year);

  const map = new Map();
  Object.entries(FIXED_HOLIDAYS).forEach(([md, name]) => {
    map.set(`${year}-${md}`, name);
  });

  const easter = easterSunday(year);
  map.set(iso(year, easter.month, easter.day), 'Pasqua');

  const monday = new Date(Date.UTC(year, easter.month - 1, easter.day + 1));
  map.set(
    iso(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate()),
    "Lunedì dell'Angelo"
  );

  holidayCache.set(year, map);
  return map;
}

export function holidayName(date) {
  return holidaysForYear(Number(date.slice(0, 4))).get(date) || null;
}

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

// Returns array of { date, weekday, isWeekend, holiday, isWorkingDay } for the month
export function daysInMonth(month) {
  const [year, m] = month.split('-').map(Number);
  const total = new Date(year, m, 0).getDate();
  const days = [];
  const weekdays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  for (let day = 1; day <= total; day += 1) {
    const dow = new Date(year, m - 1, day).getDay();
    const date = iso(year, m, day);
    const holiday = holidayName(date);
    const isWeekend = dow === 0 || dow === 6;
    days.push({
      date,
      weekday: weekdays[dow],
      isWeekend,
      holiday,
      isWorkingDay: !isWeekend && !holiday,
    });
  }
  return days;
}
