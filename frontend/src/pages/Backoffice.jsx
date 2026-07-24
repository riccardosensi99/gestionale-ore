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

  if (loading) return <div className="center">Caricamento…</div>;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Backoffice</h1>
          <p className="subtitle">Consulta ed esporta le ore registrate da ogni dipendente.</p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Utenti</h2>
            <p className="subtitle">{users.length} account registrati</p>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Nome</th><th>Email</th><th>Ruolo</th><th /></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <span className="cell-strong">{u.name || '—'}</span>
                </td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'worked' : 'vacation'}`}>
                    {u.role === 'admin' ? 'Amministratore' : 'Dipendente'}
                  </span>
                </td>
                <td>
                  <button className="btn secondary" onClick={() => { setSelected(u); setDetail(null); }}>
                    Vedi ore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selected && (
        <section className="section">
          <div className="page-head">
            <div>
              <h1 style={{ fontSize: 22 }}>{selected.name || selected.email}</h1>
              <p className="subtitle">{selected.email}</p>
            </div>
            <div className="toolbar">
              <div className="date-filter">
                <button title="Mese precedente" onClick={() => setMonth((m) => shiftMonth(m, -1))}>‹</button>
                <span className="current">{monthLabel(month)}</span>
                <button title="Mese successivo" onClick={() => setMonth((m) => shiftMonth(m, 1))}>›</button>
              </div>
              <a
                className="btn"
                href={`${API_URL}/export/pdf?month=${month}&userId=${selected.id}&name=${encodeURIComponent(selected.name || '')}&email=${encodeURIComponent(selected.email)}`}
                target="_blank"
                rel="noreferrer"
              >
                ⬇ Esporta PDF
              </a>
            </div>
          </div>

          {detail && (
            <>
              <SummaryCards summary={detail.summary} />
              <div className="section panel">
                <div className="panel-head">
                  <div>
                    <h2>Registrazioni</h2>
                    <p className="subtitle">Dettaglio del mese selezionato</p>
                  </div>
                </div>
                <table>
                  <thead>
                    <tr><th>Data</th><th>Tipo</th><th>Ore</th><th>Nota</th></tr>
                  </thead>
                  <tbody>
                    {detail.entries.length === 0 && (
                      <tr><td className="empty-row" colSpan="4">Nessuna registrazione.</td></tr>
                    )}
                    {detail.entries.map((e) => (
                      <tr key={e.id}>
                        <td><span className="cell-strong">{String(e.entry_date).slice(0, 10)}</span></td>
                        <td><span className={`badge ${e.type}`}>{TYPE_LABELS[e.type]}</span></td>
                        <td>{e.type === 'worked' ? e.hours : '—'}</td>
                        <td>{e.note || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}
