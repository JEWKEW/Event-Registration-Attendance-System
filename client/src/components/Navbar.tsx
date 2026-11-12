import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleDisplay = user.role === 'ORGANIZER' ? 'Organizer' : 'Student';

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.75rem 1.5rem',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <Link
          to="/"
          style={{
            fontWeight: 'bold',
            fontSize: '1.1rem',
            color: '#1f2937',
            textDecoration: 'none'
          }}
        >
          KMUTT Events
        </Link>
        {user.role === 'STUDENT' && (
          <Link
            to="/events"
            style={{
              fontSize: '0.9rem',
              color: '#4b5563',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            Upcoming Events
          </Link>
        )}
        {user.role === 'ORGANIZER' && (
          <Link
            to="/organizer/events"
            style={{
              fontSize: '0.9rem',
              color: '#4b5563',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            My Events
          </Link>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>
          <strong>{user.displayName}</strong> · {roleDisplay}
        </span>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.4rem 0.8rem',
            fontSize: '0.85rem',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            color: '#374151'
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
