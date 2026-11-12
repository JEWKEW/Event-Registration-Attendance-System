import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatBangkokDate } from '../lib/formatDate';

interface OrganizerEventItem {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  effectiveStatus: string;
  capacity: number;
  activeCount: number;
  remainingSeats: number;
}

export function OrganizerEventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<OrganizerEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/organizer/events', {
        credentials: 'include'
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || `Failed to fetch events (${res.status})`);
      }
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err: any) {
      setError(err.message || 'Something went wrong, try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem 0', color: '#111827' }}>Organizer Events</h2>
          <p style={{ margin: 0, color: '#4b5563', fontSize: '0.95rem' }}>
            Welcome, {user?.displayName}! Manage your events and review attendee rosters.
          </p>
        </div>
        <Link
          to="/organizer/events/new"
          style={{
            padding: '0.6rem 1.2rem',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            display: 'inline-block'
          }}
        >
          + Create Event
        </Link>
      </div>

      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'inline-block', width: '2rem', height: '2rem', border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.95rem' }}>Loading your events...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '1.5rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <p style={{ margin: '0 0 0.75rem 0', color: '#991b1b', fontWeight: 500 }}>{error}</p>
          <button
            onClick={fetchEvents}
            style={{
              padding: '0.4rem 0.9rem',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.85rem'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>You have no events yet</h3>
          <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280', fontSize: '0.95rem' }}>
            Get started by creating your first campus event.
          </p>
          <Link
            to="/organizer/events/new"
            style={{
              padding: '0.6rem 1.2rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}
          >
            Create event
          </Link>
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Title</th>
                <th style={{ padding: '0.75rem 1rem' }}>Date & Time</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Capacity</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Registered</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Seats Left</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt) => (
                <tr key={evt.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: '#111827' }}>
                    {evt.title}
                  </td>
                  <td style={{ padding: '1rem', color: '#4b5563', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                    {formatBangkokDate(evt.startAt)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: evt.effectiveStatus === 'COMPLETED' ? '#f3f4f6' : '#dcfce7',
                        color: evt.effectiveStatus === 'COMPLETED' ? '#4b5563' : '#166534'
                      }}
                    >
                      {evt.effectiveStatus}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', color: '#374151' }}>
                    {evt.capacity}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: '#2563eb' }}>
                    {evt.activeCount}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', color: evt.remainingSeats === 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                    {evt.remainingSeats}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <Link
                      to={`/organizer/events/${evt.id}`}
                      style={{
                        padding: '0.4rem 0.8rem',
                        backgroundColor: '#f3f4f6',
                        color: '#1f2937',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        display: 'inline-block',
                        border: '1px solid #d1d5db'
                      }}
                    >
                      View Roster
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
