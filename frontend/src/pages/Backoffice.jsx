import { useEffect, useState } from 'react';
import { api, API_URL } from '../api/client.js';
import SummaryCards from '../components/SummaryCards.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { TYPE_LABELS, currentMonth, daysInMonth, monthLabel, shiftMonth } from '../lib/dates.js';

const dateTime = (value) =>
  new Date(value).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });

export default function Backoffice() {
  const toast = useToast();
  const { user: me } = useAuth();

  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [month, setMonth] = useState(currentMonth());
  const [detail, setDetail] = useState(null);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [allowed, setAllowed] = useState([]);
  const [fromEnv, setFromEnv] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [emailToRemove, setEmailToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const loadUsers = () =>
    api.get('/admin/users').then(({ data }) => setUsers(data.users));

  const loadAllowed = () =>
    api.get('/admin/allowed-emails').then(({ data }) => {
      setAllowed(data.emails);
      setFromEnv(data.fromEnv);
    });

  useEffect(() => {
    Promise.all([loadUsers(), loadAllowed()])
      .catch(() => toast('Errore nel caricamento del backoffice', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Chi ha inviato il mese selezionato: solo quei mesi sono scaricabili.
  useEffect(() => {
    api.get('/admin/submissions', { params: { month } }).then(({ data }) => {
      const map = {};
      data.submissions.forEach((s) => {
        map[s.user_id] = s.submitted_at;
      });
      setSubmissions(map);
    });
  }, [month]);

  useEffect(() => {
    if (!selected) return;
    api
      .get(`/admin/users/${selected.id}/summary`, { params: { month } })
      .then(({ data }) => setDetail(data));
  }, [selected, month]);

  const deleteUser = async () => {
    setDeleting(true);
    try {
      await api.delete(`/admin/users/${toDelete.id}`);
      toast(`${toDelete.name || toDelete.email} eliminato`);
      if (selected?.id === toDelete.id) {
        setSelected(null);
        setDetail(null);
      }
      setToDelete(null);
      await loadUsers();
    } catch (err) {
      toast(err.response?.data?.error || 'Eliminazione non riuscita', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const addEmail = async (ev) => {
    ev.preventDefault();
    setAdding(true);
    try {
      const first = !allowed.length && !fromEnv.length;
      await api.post('/admin/allowed-emails', { email: newEmail });
      toast(
        first
          ? 'Whitelist attivata: da ora entrano solo le email in elenco (e gli admin)'
          : `${newEmail.trim().toLowerCase()} può ora accedere`
      );
      setNewEmail('');
      await loadAllowed();
    } catch (err) {
      toast(err.response?.data?.error || 'Aggiunta non riuscita', 'error');
    } finally {
      setAdding(false);
    }
  };

  const removeEmail = async () => {
    setRemoving(true);
    try {
      await api.delete(`/admin/allowed-emails/${emailToRemove.id}`);
      toast(`${emailToRemove.email} rimossa dalla whitelist`);
      setEmailToRemove(null);
      await loadAllowed();
    } catch {
      toast('Rimozione non riuscita', 'error');
    } finally {
      setRemoving(false);
    }
  };

  if (loading) return <div className="center">Caricamento…</div>;

  const submittedAt = selected ? submissions[selected.id] : null;

  // Il dettaglio copre tutti i giorni del mese: ferie, malattia e riposi
  // restano visibili e i giorni lavorativi vuoti vengono evidenziati.
  const byDate = new Map(
    (detail?.entries ?? []).map((e) => [String(e.entry_date).slice(0, 10), e])
  );

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Backoffice</h1>
          <p className="subtitle">Gestisci dipendenti, accessi e ore inviate.</p>
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
            <tr><th>Nome</th><th>Email</th><th>Ruolo</th><th>{monthLabel(month)}</th><th /></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><span className="cell-strong">{u.name || '—'}</span></td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'worked' : 'vacation'}`}>
                    {u.role === 'admin' ? 'Amministratore' : 'Dipendente'}
                  </span>
                </td>
                <td>
                  {submissions[u.id] ? (
                    <span className="badge vacation">Inviato</span>
                  ) : (
                    <span className="empty-row">Non inviato</span>
                  )}
                </td>
                <td>
                  <div className="row-actions">
                    <button
                      className="btn secondary"
                      onClick={() => { setSelected(u); setDetail(null); }}
                    >
                      Vedi ore
                    </button>
                    <button
                      className="btn ghost"
                      title={u.id === me.id ? 'Non puoi eliminare il tuo account' : 'Elimina'}
                      disabled={u.id === me.id}
                      onClick={() => setToDelete(u)}
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="section panel">
        <div className="panel-head">
          <div>
            <h2>Accessi consentiti</h2>
            <p className="subtitle">
              Solo queste email possono entrare. Usa <code>@azienda.it</code> per
              autorizzare un intero dominio. Elenco vuoto: accede chiunque. Gli
              amministratori configurati in <code>ADMIN_EMAILS</code> entrano sempre.
            </p>
          </div>
        </div>
        <div className="panel-body">
          <form className="toolbar" onSubmit={addEmail}>
            <input
              type="text"
              placeholder="nome@azienda.it oppure @azienda.it"
              value={newEmail}
              onChange={(ev) => setNewEmail(ev.target.value)}
              style={{ flex: 1, minWidth: 240 }}
            />
            <button className="btn" type="submit" disabled={adding || !newEmail.trim()}>
              Aggiungi
            </button>
          </form>

          {!allowed.length && !fromEnv.length && (
            <p className="empty-row" style={{ marginTop: 20 }}>
              Nessuna restrizione attiva: chiunque abbia un account Google può accedere.
            </p>
          )}

          {allowed.length > 0 && (
            <ul className="chip-list">
              {allowed.map((entry) => (
                <li className="chip" key={entry.id}>
                  {entry.email}
                  <button title="Rimuovi" onClick={() => setEmailToRemove(entry)}>✕</button>
                </li>
              ))}
            </ul>
          )}

          {fromEnv.length > 0 && (
            <>
              <p className="subtitle" style={{ marginTop: 20 }}>
                Da variabile d'ambiente <code>ALLOWED_EMAILS</code>, modificabili solo nel
                file <code>.env</code>:
              </p>
              <ul className="chip-list">
                {fromEnv.map((email) => (
                  <li className="chip locked" key={email}>{email}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {selected && (
        <section className="section">
          <div className="page-head">
            <div>
              <h1 style={{ fontSize: 22 }}>{selected.name || selected.email}</h1>
              <p className="subtitle">
                {submittedAt
                  ? `Mese inviato il ${dateTime(submittedAt)}`
                  : 'Il dipendente non ha ancora inviato questo mese'}
              </p>
            </div>
            <div className="toolbar">
              <div className="date-filter">
                <button title="Mese precedente" onClick={() => setMonth((m) => shiftMonth(m, -1))}>‹</button>
                <span className="current">{monthLabel(month)}</span>
                <button title="Mese successivo" onClick={() => setMonth((m) => shiftMonth(m, 1))}>›</button>
              </div>
              {submittedAt ? (
                <a
                  className="btn"
                  href={`${API_URL}/export/pdf?month=${month}&userId=${selected.id}&name=${encodeURIComponent(selected.name || '')}&email=${encodeURIComponent(selected.email)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  ⬇ Esporta PDF
                </a>
              ) : (
                <button className="btn" disabled title="Disponibile dopo l'invio del dipendente">
                  ⬇ Esporta PDF
                </button>
              )}
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
                    {daysInMonth(month).map((day) => {
                      const entry = byDate.get(day.date);
                      return (
                        <tr key={day.date}>
                          <td>
                            <span className="cell-strong">
                              {day.weekday} {day.date.slice(8)}
                            </span>
                          </td>
                          <td>
                            {entry ? (
                              <span className={`badge ${entry.type}`}>{TYPE_LABELS[entry.type]}</span>
                            ) : day.holiday ? (
                              <span className="badge rest">Festività</span>
                            ) : day.isWeekend ? (
                              <span className="badge rest">Riposo</span>
                            ) : (
                              <span className="badge missing">Non registrato</span>
                            )}
                          </td>
                          <td>{entry?.type === 'worked' ? entry.hours : '—'}</td>
                          <td>{entry?.note || day.holiday || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {emailToRemove && (
        <ConfirmDialog
          danger
          busy={removing}
          title="Rimuovere questo accesso?"
          message={`${emailToRemove.email} non potrà più accedere. Le ore già registrate restano al loro posto.`}
          confirmLabel="Rimuovi"
          onConfirm={removeEmail}
          onCancel={() => setEmailToRemove(null)}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          danger
          busy={deleting}
          title="Eliminare questo dipendente?"
          message={`${toDelete.name || toDelete.email} verrà rimosso insieme a tutte le ore registrate. L'operazione non è reversibile.`}
          confirmLabel="Elimina definitivamente"
          onConfirm={deleteUser}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
