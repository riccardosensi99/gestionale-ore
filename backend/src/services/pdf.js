import PDFDocument from 'pdfkit';
import { monthDays } from './calendar.js';

const TYPE_LABELS = {
  worked: 'Lavorato',
  vacation: 'Ferie',
  sick: 'Malattia/Permesso',
};

const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

function monthLabel(month) {
  const [year, m] = month.split('-').map(Number);
  return `${MONTHS_IT[m - 1]} ${year}`;
}

// Streams a PDF into res. summary + entries + user info.
export function streamMonthlyPdf(res, { user, month, summary, entries }) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);

  // Header
  doc.fontSize(20).text('Riepilogo Ore', { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(12).fillColor('#555')
    .text(`${user.name || user.email} — ${monthLabel(month)}`);
  doc.fillColor('#000').moveDown(1);

  // Summary boxes as a small table
  doc.fontSize(14).text('Riepilogo', { underline: true });
  doc.moveDown(0.5);
  const summaryRows = [
    ['Giorni lavorativi del mese', String(summary.expectedWorkingDays ?? '-')],
    ['Giorni lavorati', String(summary.workedDays)],
    ['Totale ore', String(summary.totalHours)],
    ['Giorni di ferie', String(summary.vacationDays)],
    ['Giorni malattia/permessi', String(summary.sickDays)],
  ];
  doc.fontSize(11);
  summaryRows.forEach(([label, value]) => {
    doc.text(`${label}: `, { continued: true }).font('Helvetica-Bold')
      .text(value).font('Helvetica');
  });
  doc.moveDown(1);

  // Detail table
  doc.fontSize(14).text('Dettaglio giornaliero', { underline: true });
  doc.moveDown(0.5);

  const startX = 50;
  const colWidths = [90, 120, 70, 165];
  const headers = ['Data', 'Tipo', 'Ore', 'Nota'];

  const drawRow = (cells, isHeader) => {
    const y = doc.y;
    let x = startX;
    doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
    cells.forEach((cell, i) => {
      doc.text(String(cell), x + 2, y + 3, { width: colWidths[i] - 4 });
      x += colWidths[i];
    });
    const rowH = 18;
    doc.moveTo(startX, y + rowH)
      .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y + rowH)
      .strokeColor('#ddd').stroke();
    doc.y = y + rowH;
  };

  // Il dettaglio copre tutti i giorni del mese: i giorni senza registrazione
  // vengono qualificati (riposo, festività) invece di sparire dal prospetto.
  const byDate = new Map(
    entries.map((e) => [String(e.entry_date).slice(0, 10), e])
  );

  drawRow(headers, true);
  monthDays(month).forEach((day) => {
    if (doc.y > 760) {
      doc.addPage();
      drawRow(headers, true);
    }

    const entry = byDate.get(day.date);
    const label = `${day.weekday} ${day.date.slice(8)}`;

    if (entry) {
      drawRow([
        label,
        TYPE_LABELS[entry.type] || entry.type,
        entry.type === 'worked' ? entry.hours : '-',
        entry.note || (day.holiday ?? ''),
      ]);
      return;
    }

    let type = 'Non registrato';
    if (day.holiday) type = `Festività — ${day.holiday}`;
    else if (day.isWeekend) type = 'Riposo';

    doc.fillColor(day.isWorkingDay ? '#b45309' : '#888');
    drawRow([label, type, '-', '']);
    doc.fillColor('#000');
  });

  doc.moveDown(2).fontSize(8).fillColor('#999')
    .text(`Generato il ${new Date().toLocaleDateString('it-IT')}`, { align: 'right' });

  doc.end();
}
