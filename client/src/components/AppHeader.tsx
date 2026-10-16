import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <Link to="/" className="brand">
        Kanban
      </Link>
      <div className="user">
        <span>{user?.name}</span>
        <button type="button" className="secondary" onClick={logout}>
          Sair
        </button>
      </div>
    </header>
  );
}