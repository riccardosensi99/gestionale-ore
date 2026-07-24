import { useEffect, useState, useCallback } from 'react';
import { api, API_URL } from '../api/client.js';
import SummaryCards from '../components/SummaryCards.jsx';
import {
  TYPE_LABELS,
  currentMonth,
  monthLabel,
  shiftMonth,
  daysInMonth,
} from '../lib/dates.js';

export default function MonthView() {
  const [month, setMonth] = useState(currentMonth());
  const [entries, setEntries] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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

  const saveDay = async (date, patch) => {
    const existing = entries[date] || {};
    const payload = {
      date,
      type: patch.type ?? existing.type ?? 'worked',
      hours: patch.hours ?? existing.hours ?? 0,
      note: patch.note ?? existing.note ?? '',
    };
    // Se non c'è tipo e nessun valore, non salvare
    const { data } = await api.post('/entries', payload);
    setEntries((prev) => ({ ...prev, [date]: data.entry }));
    const s = await api.get('/summary', { params: { month } });
    setSummary(s.data.summary);
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
    const s = await api.get('/summary', { params: { month } });
    setSummary(s.data.summary);
  };

  const days = daysInMonth(month);

  return (
    <div className="container">
      <SummaryCards summary={summary} />

      <div className="toolbar">
        <button className="btn secondary" onClick={() => setMonth((m) => shiftMonth(m, -1))}>← Mese prec.</button>
        <strong style={{ minWidth: 160, textAlign: 'center' }}>{monthLabel(month)}</strong>
        <button className="btn secondary" onClick={() => setMonth((m) => shiftMonth(m, 1))}>Mese succ. →</button>
        <button className="btn secondary" onClick={() => setMonth(currentMonth())}>Oggi</button>
        <a className="btn" href={`${API_URL}/export/pdf?month=${month}`} target="_blank" rel="noreferrer">
          ⬇ Esporta PDF
        </a>
      </div>

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      {loading ? (
        <p>Caricamento…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th style={{ width: 130 }}>Giorno</th>
              <th style={{ width: 180 }}>Tipo</th>
              <th style={{ width: 100 }}>Ore</th>
              <th>Nota</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const entry = entries[d.date];
              return (
                <tr key={d.date} style={d.isWeekend ? { background: '#fafafa' } : undefined}>
                  <td>
                    {d.weekday} {d.date.slice(8)}
                  </td>
                  <td>
                    <select
                      value={entry?.type || ''}
                      onChange={(ev) =>
                        ev.target.value
                          ? saveDay(d.date, { type: ev.target.value })
                          : clearDay(d.date)
                      }
                    >
                      <option value="">—</option>
                      {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      style={{ width: 70 }}
                      disabled={!entry || entry.type !== 'worked'}
                      value={entry?.type === 'worked' ? entry.hours : ''}
                      onChange={(ev) =>
                        saveDay(d.date, { hours: Number(ev.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      style={{ width: '100%' }}
                      placeholder="Nota…"
                      disabled={!entry}
                      defaultValue={entry?.note || ''}
                      onBlur={(ev) =>
                        entry && saveDay(d.date, { note: ev.target.value })
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
    </div>
  );
}
