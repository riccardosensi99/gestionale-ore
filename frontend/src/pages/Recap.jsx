import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { currentMonth, monthLabel } from '../lib/dates.js';

const MONTH_SHORT = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic',
];

export default function Recap() {
  const thisMonth = currentMonth();
  const [year, setYear] = useState(Number(thisMonth.slice(0, 4)));
  const [recap, setRecap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get('/summary/year', { params: { year } })
      .then(({ data }) => active && setRecap(data.recap))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [year]);

  const months = recap?.months ?? [];
  const maxHours = Math.max(1, ...months.map((m) => m.totalHours));
  const isOpen = (month) => month === thisMonth;

  // Il grafico copre tutti e 12 i mesi: con soli due mesi registrati le barre
  // finivano agli estremi del riquadro e l'andamento era illeggibile.
  const byMonth = new Map(months.map((m) => [m.month, m]));
  const yearMonths = Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, '0')}`;
    return byMonth.get(month) ?? { month, totalHours: 0 };
  });

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Recap mensile</h1>
          <p className="subtitle">Confronta le ore registrate mese per mese.</p>
        </div>
        <div className="date-filter">
          <button title="Anno precedente" onClick={() => setYear((y) => y - 1)}>‹</button>
          <span className="current" style={{ minWidth: 64 }}>{year}</span>
          <button title="Anno successivo" onClick={() => setYear((y) => y + 1)}>›</button>
        </div>
      </header>

      {loading && <p className="center">Caricamento…</p>}

      {!loading && !months.length && (
        <div className="panel">
          <p className="panel-body empty-row">
            Nessuna ora registrata nel {year}.
          </p>
        </div>
      )}

      {!loading && months.length > 0 && (
        <>
          <div className="cards">
            <div className="kpi">
              <div className="head">
                <span className="tile">T</span>
                <span className="label">Ore totali</span>
              </div>
              <div className="value">{recap.totalHours}h</div>
              <div className="hint">
                {monthLabel(months[0].month).split(' ')[0]} – {monthLabel(months[months.length - 1].month).split(' ')[0]}
              </div>
            </div>
            <div className="kpi">
              <div className="head">
                <span className="tile purple">M</span>
                <span className="label">Media mensile</span>
              </div>
              <div className="value">{recap.averageHours}h</div>
              <div className="hint">su {months.length} mesi</div>
            </div>
            <div className="kpi">
              <div className="head">
                <span className="tile amber">+</span>
                <span className="label">Straordinari</span>
              </div>
              <div className="value">{recap.overtimeHours}h</div>
              <div className="hint">
                {recap.totalHours
                  ? `${((recap.overtimeHours / recap.totalHours) * 100).toFixed(1).replace('.', ',')}% del totale`
                  : '—'}
              </div>
            </div>
            <div className="kpi">
              <div className="head">
                <span className="tile green">★</span>
                <span className="label">Mese migliore</span>
              </div>
              <div className="value">{monthLabel(recap.bestMonth.month).split(' ')[0]}</div>
              <div className="hint">{recap.bestMonth.totalHours} ore registrate</div>
            </div>
          </div>

          <section className="section">
            <h2 className="section-title">Mesi registrati</h2>
            <p className="subtitle">Apri un mese per vedere il dettaglio delle attività.</p>

            <div className="month-grid">
              {months.map((m) => (
                <div className="month-card" key={m.month}>
                  <div className="row">
                    <h3>{monthLabel(m.month).split(' ')[0]}</h3>
                    <span className={`badge ${isOpen(m.month) ? 'worked' : 'vacation'}`}>
                      {isOpen(m.month) ? 'In corso' : 'Completato'}
                    </span>
                  </div>
                  <div className="hours">{m.totalHours}h</div>
                  <div className="meta">{m.workedDays} giorni lavorati</div>
                  <div className="meta">Straordinari {m.overtimeHours}h</div>
                  <Link className="detail-link" to={`/?month=${m.month}`}>
                    Visualizza dettaglio →
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <div className="recap-bottom section">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Andamento annuale</h2>
                  <p className="subtitle">Ore registrate per mese</p>
                </div>
              </div>
              <div className="panel-body">
                <div className="bars">
                  {yearMonths.map((m) => (
                    <div
                      className="bar"
                      key={m.month}
                      title={`${monthLabel(m.month)}: ${m.totalHours}h`}
                    >
                      <div className="value">{m.totalHours || ''}</div>
                      <div className="track">
                        {m.totalHours > 0 && (
                          <div
                            className={`fill${isOpen(m.month) ? '' : ' alt'}`}
                            style={{ height: `${(m.totalHours / maxHours) * 100}%` }}
                          />
                        )}
                      </div>
                      <div className="day">{MONTH_SHORT[Number(m.month.slice(5)) - 1]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Riepilogo dettagliato</h2>
                  <p className="subtitle">Ore, giorni e straordinari per mese</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr><th>Mese</th><th>Ore</th><th>Giorni</th><th>Extra</th><th>Stato</th></tr>
                </thead>
                <tbody>
                  {[...months].reverse().map((m) => (
                    <tr key={m.month}>
                      <td><span className="cell-strong">{monthLabel(m.month).split(' ')[0]}</span></td>
                      <td><span className="cell-strong">{m.totalHours}h</span></td>
                      <td>{m.workedDays}</td>
                      <td>{m.overtimeHours}h</td>
                      <td>
                        <span className={`badge ${isOpen(m.month) ? 'worked' : 'vacation'}`}>
                          {isOpen(m.month) ? 'In corso' : 'Chiuso'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}
    </>
  );
}
