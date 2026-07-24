import { useEffect, useState } from 'react';
import { api, API_URL } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Login() {
  const { refresh } = useAuth();
  const [devEnabled, setDevEnabled] = useState(false);
  const [email, setEmail] = useState('dev@example.com');
  const [admin, setAdmin] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');

  useEffect(() => {
    api.get('/auth/config').then(({ data }) => setDevEnabled(data.devLogin)).catch(() => {});
  }, []);

  const devLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/auth/dev-login', { email, admin });
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="center">
      <div className="login-box">
        <h1 style={{ marginTop: 0 }}>🕒 Gestionale Ore</h1>
        <p style={{ color: 'var(--muted)' }}>Accedi per registrare le tue ore.</p>
        {error && <p style={{ color: '#dc2626' }}>Autenticazione fallita, riprova.</p>}

        <a className="btn" href={`${API_URL}/auth/google`} style={{ justifyContent: 'center' }}>
          Accedi con Google
        </a>

        {devEnabled && (
          <form onSubmit={devLogin} style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 12px' }}>
              🛠️ Login di sviluppo (solo locale)
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
              style={{ width: '100%', marginBottom: 10 }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 12, justifyContent: 'center' }}>
              <input type="checkbox" checked={admin} onChange={(e) => setAdmin(e.target.checked)} />
              Entra come admin
            </label>
            <button className="btn secondary" type="submit" disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>
              {submitting ? 'Accesso…' : 'Login di sviluppo'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
