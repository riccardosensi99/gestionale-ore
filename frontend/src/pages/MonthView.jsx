import { useEffect, useState, useCallback } from 'react';
import { api, API_URL } from '../api/client.js';
import SummaryCards from '../components/SummaryCards.jsx';
import {
  TYPE_LABELS,
  defaultTypeFor,
  currentMonth,
  monthLabel,
  shiftMonth,
  daysInMonth,
} from '../lib/dates.js';

export default function MonthView() {
  // Il recap linka un mese specifico con ?month=YYYY-MM
  const [month, setMonth] = useState(
    () => new URLSearchParams(window.location.search).get('month') || currentMonth()
  );
  const [entries, setEntries] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Ids creati dall'ultima precompilazione, per poterla annullare.
  const [prefilled, setPrefilled] = useState(null);
  // Richiesta di conferma prima di replicare le ore sul resto del mese.
  const [askPrefill, setAskPrefill] = useState(null);

  const days = daysInMonth(month);

  const refreshSummary = useCallback(async () => {
    const s = await api.get('/summary', { params: { month } });
    setSummary(s.data.summary);
  }, [month]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPrefilled(null);
    setAskPrefill(null);
    try {
      const [e, s] = await Promise.all([
        api.get('/entries', { params: { month } }),
        api.get('/summary', { params: { month } }),
      ]);
      const map = {};
      e.data.entries.forEach((row) => {
        map[String(row.entry_date).slice(0, 10)] = row;
      });
      setEntries(map);
      setSummary(s.data.summary);
    } catch {
      setError('Errore nel caricamento dei dati.');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  // Su richiesta, replica lo stesso orario su tutti gli altri giorni lavorativi
  // ancora vuoti del mese (weekend e festività esclusi).
  const prefillMonth = async (fromDate, hours) => {
    const targets = days
      .filter((d) => d.isWorkingDay && d.date !== fromDate && !entries[d.date])
      .map((d) => ({ date: d.date, type: 'worked', hours, note: '' }));
    if (!targets.length) return;

    const { data } = await api.post('/entries/bulk', { entries: targets });
    setEntries((prev) => {
      const next = { ...prev };
      data.entries.forEach((row) => {
        next[String(row.entry_date).slice(0, 10)] = row;
      });
      return next;
    });
    setPrefilled({ ids: data.entries.map((e) => e.id), count: data.entries.length, hours });
    await refreshSummary();
  };

  const undoPrefill = async () => {
    const { ids } = prefilled;
    await api.delete('/entries/bulk', { data: { ids } });
    setEntries((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((date) => {
        if (ids.includes(next[date].id)) delete next[date];
      });
      return next;
    });
    setPrefilled(null);
    await refreshSummary();
  };

  const saveDay = async (date, patch, day) => {
    const existing = entries[date] || {};
    const wasEmpty = Object.keys(entries).length === 0;
    const payload = {
      date,
      type: patch.type ?? existing.type ?? defaultTypeFor(day),
      hours: patch.hours ?? existing.hours ?? 0,
      note: patch.note ?? existing.note ?? '',
    };
    // Se non c'è tipo e nessun valore, non salvare
    const { data } = await api.post('/entries', payload);
    setEntries((prev) => ({ ...prev, [date]: data.entry }));
    await refreshSummary();

    // Prima registrazione di ore del mese: chiedi se replicarle sugli altri
    // giorni lavorativi, invece di deciderlo al posto dell'utente.
    if (wasEmpty && payload.type === 'worked' && Number(payload.hours) > 0) {
      const targets = days.filter(
        (d) => d.isWorkingDay && d.date !== date && !entries[d.date]
      ).length;
      if (targets) setAskPrefill({ date, hours: Number(payload.hours), targets });
    }
  };

  const clearDay = async (date) => {
    const existing = entries[date];
    if (!existing?.id) return;
    await api.delete(`/entries/${existing.id}`);
    setEntries((prev) => {
      const copy = { ...prev };
      delete copy[date];
      return copy;
    });
    await refreshSummary();
  };

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Le mie ore</h1>
          <p className="subtitle">Registra e monitora il tempo dedicato al tuo lavoro.</p>
        </div>
        <div className="toolbar">
          <div className="date-filter">
            <button title="Mese precedente" onClick={() => setMonth((m) => shiftMonth(m, -1))}>‹</button>
            <span className="current">{monthLabel(month)}</span>
            <button title="Mese successivo" onClick={() => setMonth((m) => shiftMonth(m, 1))}>›</button>
          </div>
          <button className="btn secondary" onClick={() => setMonth(currentMonth())}>Oggi</button>
          <a className="btn" href={`${API_URL}/export/pdf?month=${month}`} target="_blank" rel="noreferrer">
            ⬇ Esporta PDF
          </a>
        </div>
      </header>

      <SummaryCards summary={summary} />

      {prefilled && (
        <div className="notice">
          <span>
            Ho compilato {prefilled.count} giorni lavorativi con {prefilled.hours}h.
            Puoi modificarli singolarmente.
          </span>
          <button className="btn secondary" onClick={undoPrefill}>Annulla</button>
        </div>
      )}

      {askPrefill && (
        <div className="modal-backdrop" onClick={() => setAskPrefill(null)}>
          <div className="modal" onClick={(ev) => ev.stopPropagation()}>
            <h2>Applicare {askPrefill.hours}h a tutto il mese?</h2>
            <p>
              Posso registrare {askPrefill.hours} ore anche sugli altri{' '}
              {askPrefill.targets} giorni lavorativi ancora vuoti di{' '}
              {monthLabel(month).toLowerCase()}. Weekend e festività restano esclusi
              e potrai modificare ogni giorno singolarmente.
            </p>
            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setAskPrefill(null)}>
                No, solo questo giorno
              </button>
              <button
                className="btn"
                onClick={async () => {
                  const { date, hours } = askPrefill;
                  setAskPrefill(null);
                  await prefillMonth(date, hours);
                }}
              >
                Sì, applica a tutti
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="section panel">
        <div className="panel-head">
          <div>
            <h2>Registro del mese</h2>
            <p className="subtitle">Imposta tipo, ore e nota per ogni giorno.</p>
          </div>
        </div>

        {error && <p className="panel-body" style={{ color: 'var(--danger)' }}>{error}</p>}
        {loading ? (
          <p className="panel-body">Caricamento…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 180 }}>Giorno</th>
                <th style={{ width: 200 }}>Tipo</th>
                <th style={{ width: 120 }}>Ore</th>
                <th>Nota</th>
                <th style={{ width: 60 }} />
              </tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const entry = entries[d.date];
                // Senza registrazione vale il tipo proposto dal calendario:
                // lavorato dal lunedì al venerdì, riposo nel weekend e nei festivi.
                const type = entry?.type ?? defaultTypeFor(d);
                return (
                  <tr key={d.date} className={d.isWorkingDay ? undefined : 'weekend'}>
                    <td>
                      <span className="cell-strong">{d.weekday} {d.date.slice(8)}</span>
                      {d.holiday && <span className="day-note">{d.holiday}</span>}
                    </td>
                    <td>
                      <select
                        className={`table-input${entry ? '' : ' proposed'}`}
                        value={type}
                        onChange={(ev) =>
                          ev.target.value
                            ? saveDay(d.date, { type: ev.target.value }, d)
                            : clearDay(d.date)
                        }
                      >
                        {Object.entries(TYPE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                        {entry && <option value="">— Nessuna registrazione</option>}
                      </select>
                    </td>
                    <td>
                      <input
                        className="table-input hours"
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        disabled={type !== 'worked'}
                        value={entry?.type === 'worked' ? entry.hours : ''}
                        placeholder="0"
                        onChange={(ev) =>
                          saveDay(d.date, { hours: Number(ev.target.value) }, d)
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="table-input note"
                        type="text"
                        placeholder="Nota…"
                        disabled={!entry}
                        defaultValue={entry?.note || ''}
                        onBlur={(ev) =>
                          entry && saveDay(d.date, { note: ev.target.value }, d)
                        }
                      />
                    </td>
                    <td>
                      {entry && (
                        <button className="btn ghost" title="Cancella" onClick={() => clearDay(d.date)}>✕</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
