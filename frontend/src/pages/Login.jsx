import { API_URL } from '../api/client.js';

export default function Login() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  return (
    <div className="center">
      <div className="login-box">
        <h1 style={{ marginTop: 0 }}>🕒 Gestionale Ore</h1>
        <p style={{ color: 'var(--muted)' }}>Accedi per registrare le tue ore.</p>
        {error && (
          <p style={{ color: '#dc2626' }}>Autenticazione fallita, riprova.</p>
        )}
        <a className="btn" href={`${API_URL}/auth/google`} style={{ justifyContent: 'center' }}>
          Accedi con Google
        </a>
      </div>
    </div>
  );
}
