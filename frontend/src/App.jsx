import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import Login from './pages/Login.jsx';
import MonthView from './pages/MonthView.jsx';
import Backoffice from './pages/Backoffice.jsx';

function Navbar() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div className="navbar">
      <span className="brand">🕒 Gestionale Ore</span>
      <nav>
        <Link to="/">Le mie ore</Link>
        {user.role === 'admin' && <Link to="/backoffice">Backoffice</Link>}
      </nav>
      <div>
        <span style={{ marginRight: 12, color: 'var(--muted)' }}>{user.name || user.email}</span>
        <button className="btn secondary" onClick={logout}>Esci</button>
      </div>
    </div>
  );
}

function Protected({ children, adminOnly }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Caricamento…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  return (
    <>
      <Navbar />
      <Routes>
        <Route
          path="/login"
          element={loading ? <div className="center">Caricamento…</div> : user ? <Navigate to="/" replace /> : <Login />}
        />
        <Route path="/" element={<Protected><MonthView /></Protected>} />
        <Route path="/backoffice" element={<Protected adminOnly><Backoffice /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
