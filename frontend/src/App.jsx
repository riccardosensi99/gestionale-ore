import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import Login from './pages/Login.jsx';
import MonthView from './pages/MonthView.jsx';
import Backoffice from './pages/Backoffice.jsx';

function initials(user) {
  const parts = (user?.name || user?.email || '').split(/[\s.@_-]+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
}

function Sidebar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const items = [
    { to: '/', icon: '◷', label: 'Le mie ore' },
    ...(user.role === 'admin' ? [{ to: '/backoffice', icon: '♙', label: 'Backoffice' }] : []),
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="mark">T</span>
        <span className="name">Time Manager</span>
      </div>

      <div className="nav-label">MENU</div>
      {items.map((item) => (
        <Link key={item.to} to={item.to} className={`nav-item${pathname === item.to ? ' active' : ''}`}>
          <span className="icon">{item.icon}</span>
          {item.label}
        </Link>
      ))}

      <div className="profile">
        <span className="avatar">{initials(user)}</span>
        <span className="who">
          <span className="name">{user.name || user.email}</span>
          <span className="role">{user.role === 'admin' ? 'Amministratore' : 'Dipendente'}</span>
        </span>
        <button className="logout" title="Esci" onClick={logout}>⏻</button>
      </div>
    </aside>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="center">Caricamento…</div>;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<MonthView />} />
          <Route
            path="/backoffice"
            element={user.role === 'admin' ? <Backoffice /> : <Navigate to="/" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
