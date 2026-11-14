import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatBangkokDate } from '../lib/formatDate';

interface RegistrationItem {
  id: string;
  status: string;
  registeredAt: string;
  event: {
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    location: string;
    effectiveStatus: string;
  };
}

export function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/me/registrations', {
        credentials: 'include'
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || `Failed to fetch registrations (${res.status})`);
      }
      const data = await res.json();
      setRegistrations(data.registrations || []);
    } catch (err: any) {
      setError(err.message || 'Something went wrong, try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.25rem 0', color: '#111827' }}>My Registrations</h2>
        <p style={{ margin: 0, color: '#4b5563', fontSize: '0.95rem' }}>
          Your active event registrations and schedules.
        </p>
      </div>

      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'inline-block', width: '2rem', height: '2rem', border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.95rem' }}>Loading your registrations...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '1.5rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <p style={{ margin: '0 0 0.75rem 0', color: '#991b1b', fontWeight: 500 }}>{error}</p>
          <button
            onClick={fetchRegistrations}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && registrations.length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>You haven't registered for any events yet</h3>
          <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280', fontSize: '0.95rem' }}>
            Check out upcoming workshops, seminars, and activities.
          </p>
          <Link
            to="/events"
            style={{
              display: 'inline-block',
              padding: '0.6rem 1.2rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '0.95rem'
            }}
          >
            Browse Upcoming Events →
          </Link>
        </div>
      )}

      {!loading && !error && registrations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {registrations.map((reg) => (
            <div
              key={reg.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div style={{ flex: '1 1 300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: '#f0fdf4',
                      color: '#15803d',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #bbf7d0'
                    }}
                  >
                    {reg.status}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    Registered on {formatBangkokDate(reg.registeredAt)}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem' }}>
                  <Link
                    to={`/events/${reg.event.id}`}
                    style={{ color: '#111827', textDecoration: 'none' }}
                  >
                    {reg.event.title}
                  </Link>
                </h3>

                <div style={{ fontSize: '0.85rem', color: '#4b5563', display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                  <span>📅 {formatBangkokDate(reg.event.startAt)}</span>
                  <span>📍 {reg.event.location}</span>
                </div>
              </div>

              <div>
                <Link
                  to={`/registrations/${reg.id}`}
                  style={{
                    display: 'inline-block',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: 500,
                    fontSize: '0.875rem'
                  }}
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
