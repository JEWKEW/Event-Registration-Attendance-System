import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatBangkokDate } from '../lib/formatDate';

interface RosterStudent {
  id: string;
  displayName: string;
  studentNo: string | null;
  email: string;
}

interface RosterRegistration {
  id: string;
  status: string;
  registeredAt: string;
  student: RosterStudent;
}

interface RosterEventHeader {
  id: string;
  title: string;
  capacity: number;
  activeCount: number;
}

export function EventRosterPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<RosterEventHeader | null>(null);
  const [registrations, setRegistrations] = useState<RosterRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchRoster = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorCode(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/events/${id}/registrations`, {
        credentials: 'include'
      });

      if (!res.ok) {
        setErrorCode(res.status);
        if (res.status === 403) {
          setErrorMessage("You don't have access to this event");
        } else if (res.status === 404) {
          setErrorMessage('Event not found');
        } else {
          const data = await res.json().catch(() => null);
          setErrorMessage(data?.error?.message || 'Failed to load roster. Please try again.');
        }
        return;
      }

      const data = await res.json();
      setEvent(data.event);
      setRegistrations(data.registrations || []);
    } catch {
      setErrorMessage('Something went wrong, try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          to="/organizer/events"
          style={{
            color: '#2563eb',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          ← Back to My Events
        </Link>
      </div>

      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'inline-block', width: '2rem', height: '2rem', border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.95rem' }}>Loading roster...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {errorMessage && !loading && (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ color: errorCode === 403 || errorCode === 404 ? '#4b5563' : '#dc2626', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            {errorMessage}
          </div>
          {errorCode !== 403 && errorCode !== 404 && (
            <button
              onClick={fetchRoster}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {!loading && !errorMessage && event && (
        <>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>
                  Event Roster
                </span>
                <h2 style={{ margin: '0.25rem 0 0 0', color: '#111827' }}>{event.title}</h2>
              </div>
              <div
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#eff6ff',
                  borderRadius: '6px',
                  border: '1px solid #bfdbfe',
                  textAlign: 'right'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Registrations
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1d4ed8' }}>
                  {event.activeCount} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#6b7280' }}>/ {event.capacity}</span>
                </div>
              </div>
            </div>
          </div>

          {registrations.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>No registrations yet</h3>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>
                Students who register for this event will appear in this roster.
              </p>
            </div>
          ) : (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '0.75rem 1rem', width: '50px' }}>#</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Student No.</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Registered At</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg, index) => (
                    <tr key={reg.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '1rem', color: '#6b7280', fontWeight: 500 }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 600, color: '#111827' }}>
                        {reg.student.displayName}
                      </td>
                      <td style={{ padding: '1rem', color: '#374151', fontFamily: 'monospace' }}>
                        {reg.student.studentNo || '—'}
                      </td>
                      <td style={{ padding: '1rem', color: '#4b5563' }}>
                        {reg.student.email}
                      </td>
                      <td style={{ padding: '1rem', color: '#4b5563', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                        {formatBangkokDate(reg.registeredAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
