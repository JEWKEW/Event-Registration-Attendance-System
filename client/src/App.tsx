import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { CreateEventPage } from './pages/CreateEventPage';
import { OrganizerEventsPage } from './pages/OrganizerEventsPage';
import { EventRosterPage } from './pages/EventRosterPage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { Navbar } from './components/Navbar';

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
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/organizer/events" element={<OrganizerEventsPage />} />
            <Route path="/organizer/events/new" element={<CreateEventPage />} />
            <Route path="/organizer/events/:id" element={<EventRosterPage />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
