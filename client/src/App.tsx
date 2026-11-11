import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
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
      <h2>Organizer Dashboard / Events</h2>
      <p>Welcome, {user?.displayName}! You are logged in as an Organizer.</p>
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
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
