import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { CreateEventPage } from './pages/CreateEventPage';
import { Navbar } from './components/Navbar';

function StudentEventsPage() {
  const { user } = useAuth();
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>Upcoming Events</h2>
      <p>Welcome, {user?.displayName}! You are logged in as a Student.</p>
    </div>
  );
}

function OrganizerEventsPage() {
  const { user } = useAuth();
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Organizer Events</h2>
        <Link
          to="/organizer/events/new"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}
        >
          + Create Event
        </Link>
      </div>
      <p>Welcome, {user?.displayName}! Here you manage your created events.</p>
    </div>
  );
}

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ORGANIZER') {
    return <Navigate to="/organizer/events" replace />;
  }

  return <Navigate to="/events" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
          <Navbar />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/events" element={<StudentEventsPage />} />
            <Route path="/organizer/events" element={<OrganizerEventsPage />} />
            <Route path="/organizer/events/new" element={<CreateEventPage />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
