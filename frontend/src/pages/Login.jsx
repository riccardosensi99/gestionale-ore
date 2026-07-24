import { useEffect, useState } from 'react';
import { api, API_URL } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import Logo from '../components/Logo.jsx';

// Anteprima decorativa dell'hero: valori d'esempio, come nel design.
const PREVIEW_BARS = [
  { day: 'Lun', pct: 51 },
  { day: 'Mar', pct: 73 },
  { day: 'Mer', pct: 62 },
  { day: 'Gio', pct: 90 },
  { day: 'Ven', pct: 79 },
];

export default function Login() {
  const { refresh } = useAuth();
  const [devEnabled, setDevEnabled] = useState(false);
  const [email, setEmail] = useState('dev@example.com');
  const [admin, setAdmin] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [devError, setDevError] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const errorMessage = {
    auth: 'Autenticazione fallita, riprova.',
    not_allowed: 'Questa email non è autorizzata ad accedere. Contatta l’amministratore.',
  }[params.get('error')];

  useEffect(() => {
    api.get('/auth/config').then(({ data }) => setDevEnabled(data.devLogin)).catch(() => {});
  }, []);

  const devLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setDevError(null);
    try {
      await api.post('/auth/dev-login', { email, admin });
      await refresh();
    } catch (err) {
      setDevError(err.response?.data?.error || 'Login di sviluppo fallito.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-hero">
        <span className="glow glow-1" />
        <span className="glow glow-2" />

        <div className="brand">
          <Logo size={44} />
          <span className="name">Time Manager</span>
        </div>

        <h1 className="claim">Il tempo del tuo team,<br />sotto controllo.</h1>
        <p className="pitch">
          Registra le ore, monitora i progetti e mantieni il lavoro organizzato in un unico posto.
        </p>

        <div className="hero-preview">
          <div className="row">
            <div>
              <div className="label">Questa settimana</div>
              <div className="value">37h 30m</div>
            </div>
            <span className="pill">+ 8%</span>
          </div>
          <div className="divider" />
          <div className="bars">
            {PREVIEW_BARS.map((b) => (
              <div className="bar" key={b.day}>
                <div className="track">
                  <div className="fill" style={{ height: `${b.pct}%` }} />
                </div>
                <div className="day">{b.day}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="login-form-area">
        <div className="login-card">
          <h1>Bentornato</h1>
          <p className="subtitle">Accedi per registrare le tue ore di lavoro.</p>
          {errorMessage && <p className="error">{errorMessage}</p>}

          <a className="gsi-material-button" href={`${API_URL}/auth/google`}>
            <div className="gsi-material-button-state" />
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
              </div>
              <span className="gsi-material-button-contents">Accedi con Google</span>
            </div>
          </a>

          {devEnabled && (
            <form onSubmit={devLogin}>
              <div className="divider" />
              <p className="dev-hint">🛠️ Login di sviluppo (solo locale)</p>

              <div className="field">
                <label htmlFor="dev-email">Email</label>
                <input
                  id="dev-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@azienda.it"
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, margin: '20px 0' }}>
                <input type="checkbox" checked={admin} onChange={(e) => setAdmin(e.target.checked)} />
                Entra come admin
              </label>

              {devError && <p className="error">{devError}</p>}

              <button className="btn secondary block" type="submit" disabled={submitting}>
                {submitting ? 'Accesso…' : 'Login di sviluppo'}
              </button>
            </form>
          )}

          <div className="divider" />
          <p className="footnote">
            Non hai ancora un account?
            <span className="accent">Contatta l’amministratore</span>
          </p>
        </div>

        <p className="login-copyright">© {new Date().getFullYear()} Time Manager. Tutti i diritti riservati.</p>
      </section>
    </div>
  );
}
