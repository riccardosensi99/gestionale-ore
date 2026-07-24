import { useEffect, useState } from 'react';
import { api, API_URL } from '../api/client.js';
import SummaryCards from '../components/SummaryCards.jsx';
import { TYPE_LABELS, currentMonth, monthLabel, shiftMonth } from '../lib/dates.js';

export default function Backoffice() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [month, setMonth] = useState(currentMonth());
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/users').then(({ data }) => {
      setUsers(data.users);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    api
      .get(`/admin/users/${selected.id}/summary`, { params: { month } })
      .then(({ data }) => setDetail(data));
  }, [selected, month]);

  if (loading) return <div className="container">Caricamento…</div>;

  return (
    <div className="container">
      <h2>Backoffice — Utenti</h2>
      <table>
        <thead>
          <tr><th>Nome</th><th>Email</th><th>Ruolo</th><th></th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name || '—'}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>
                <button className="btn secondary" onClick={() => { setSelected(u); setDetail(null); }}>
                  Vedi ore
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <div style={{ marginTop: 32 }}>
          <h3>{selected.name || selected.email}</h3>
          <div className="toolbar">
            <button className="btn secondary" onClick={() => setMonth((m) => shiftMonth(m, -1))}>←</button>
            <strong style={{ minWidth: 160, textAlign: 'center' }}>{monthLabel(month)}</strong>
            <button className="btn secondary" onClick={() => setMonth((m) => shiftMonth(m, 1))}>→</button>
            <a
              className="btn"
              href={`${API_URL}/export/pdf?month=${month}&userId=${selected.id}&name=${encodeURIComponent(selected.name || '')}&email=${encodeURIComponent(selected.email)}`}
              target="_blank"
              rel="noreferrer"
            >
              ⬇ Esporta PDF
            </a>
          </div>

          {detail && (
            <>
              <SummaryCards summary={detail.summary} />
              <table style={{ marginTop: 16 }}>
                <thead>
                  <tr><th>Data</th><th>Tipo</th><th>Ore</th><th>Nota</th></tr>
                </thead>
                <tbody>
                  {detail.entries.length === 0 && (
                    <tr><td colSpan="4" style={{ color: 'var(--muted)' }}>Nessuna registrazione.</td></tr>
                  )}
                  {detail.entries.map((e) => (
                    <tr key={e.id}>
                      <td>{String(e.entry_date).slice(0, 10)}</td>
                      <td><span className={`badge ${e.type}`}>{TYPE_LABELS[e.type]}</span></td>
                      <td>{e.type === 'worked' ? e.hours : '—'}</td>
                      <td>{e.note || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
