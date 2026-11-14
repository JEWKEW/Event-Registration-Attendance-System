import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatBangkokDate } from '../lib/formatDate';

interface EventItem {
  id: string;
  title: string;
  category: string;
  location: string;
  startAt: string;
  endAt: string;
  registrationDeadline: string;
  capacity: number;
  activeCount: number;
  remainingSeats: number;
  registrationOpen: boolean;
  organizerName: string;
}

export function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/events', {
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
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.25rem 0', color: '#111827' }}>Upcoming Events</h2>
        <p style={{ margin: 0, color: '#4b5563', fontSize: '0.95rem' }}>
          Explore campus workshops, seminars, and activities open for registration.
        </p>
      </div>

      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'inline-block', width: '2rem', height: '2rem', border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.95rem' }}>Loading upcoming events...</p>
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
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>No upcoming events</h3>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>
            Check back later for new campus activities and announcements.
          </p>
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {events.map((evt) => (
            <div
              key={evt.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px'
                    }}
                  >
                    {evt.category}
                  </span>
                  {evt.remainingSeats === 0 ? (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px'
                      }}
                    >
                      Full
                    </span>
                  ) : !evt.registrationOpen ? (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: '#f3f4f6',
                        color: '#4b5563',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px'
                      }}
                    >
                      Closed
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: '#dcfce7',
                        color: '#166534',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px'
                      }}
                    >
                      {evt.remainingSeats} seats left
                    </span>
                  )}
                </div>

                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#111827' }}>
                  {evt.title}
                </h3>

                <p style={{ margin: '0 0 0.5rem 0', color: '#4b5563', fontSize: '0.85rem' }}>
                  📅 {formatBangkokDate(evt.startAt)}
                </p>

                <p style={{ margin: '0 0 0.5rem 0', color: '#4b5563', fontSize: '0.85rem' }}>
                  📍 {evt.location}
                </p>

                <p style={{ margin: '0 0 1rem 0', color: '#6b7280', fontSize: '0.8rem' }}>
                  Organized by <strong>{evt.organizerName}</strong>
                </p>
              </div>

              <Link
                to={`/events/${evt.id}`}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '0.5rem',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontWeight: 500,
                  fontSize: '0.9rem'
                }}
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
