// Calendario lavorativo italiano: lunedì-venerdì, escluse le festività nazionali.
//
// NOTA: questa logica è replicata in frontend/src/lib/dates.js perché i due
// pacchetti hanno build e contesti Docker separati. Se cambi le regole qui,
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

// Domenica di Pasqua secondo l'algoritmo di Meeus/Jones/Butcher (calendario gregoriano).
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

const cache = new Map();

// Mappa 'YYYY-MM-DD' -> nome della ricorrenza, per l'anno richiesto.
export function holidaysForYear(year) {
  if (cache.has(year)) return cache.get(year);

  const map = new Map();
  Object.entries(FIXED_HOLIDAYS).forEach(([md, name]) => {
    map.set(`${year}-${md}`, name);
  });

  const easter = easterSunday(year);
  const easterDate = new Date(Date.UTC(year, easter.month - 1, easter.day));
  map.set(iso(year, easter.month, easter.day), 'Pasqua');

  const monday = new Date(easterDate.getTime() + 24 * 60 * 60 * 1000);
  map.set(
    iso(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate()),
    "Lunedì dell'Angelo"
  );

  cache.set(year, map);
  return map;
}

// Nome della festività per 'YYYY-MM-DD', oppure null.
export function holidayName(date) {
  const year = Number(date.slice(0, 4));
  return holidaysForYear(year).get(date) || null;
}

export function isWeekend(date) {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  return dow === 0 || dow === 6;
}

// Giorno lavorativo = lun-ven e non festivo.
export function isWorkingDay(date) {
  return !isWeekend(date) && !holidayName(date);
}

const WEEKDAYS_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

// Tutti i giorni del mese 'YYYY-MM' con la loro natura.
export function monthDays(month) {
  const [year, m] = month.split('-').map(Number);
  const total = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const days = [];
  for (let day = 1; day <= total; day += 1) {
    const date = iso(year, m, day);
    const holiday = holidayName(date);
    days.push({
      date,
      weekday: WEEKDAYS_IT[new Date(`${date}T00:00:00Z`).getUTCDay()],
      isWeekend: isWeekend(date),
      holiday,
      isWorkingDay: !isWeekend(date) && !holiday,
    });
  }
  return days;
}

// Numero di giorni lavorativi attesi nel mese.
export function workingDaysInMonth(month) {
  return monthDays(month).filter((d) => d.isWorkingDay).length;
}
