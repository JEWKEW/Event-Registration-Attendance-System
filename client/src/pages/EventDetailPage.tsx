import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatBangkokDate } from '../lib/formatDate';

interface EventDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  startAt: string;
  endAt: string;
  registrationDeadline: string;
  capacity: number;
  status: string;
  effectiveStatus: string;
  activeCount: number;
  remainingSeats: number;
  registrationOpen: boolean;
  organizerName: string;
}

interface MyRegistration {
  id: string;
  status: string;
  registeredAt: string;
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [myRegistration, setMyRegistration] = useState<MyRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerFeedback, setRegisterFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchEvent = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorCode(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/events/${id}`, {
        credentials: 'include'
      });

      if (!res.ok) {
        setErrorCode(res.status);
        if (res.status === 404) {
          setErrorMessage('Event not found');
        } else {
          const data = await res.json().catch(() => null);
          setErrorMessage(data?.error?.message || `Failed to load event (${res.status})`);
        }
        return;
      }

      const data = await res.json();
      setEvent(data.event);
      setMyRegistration(data.myRegistration);
    } catch {
      setErrorMessage('Something went wrong, try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleRegister = async () => {
    if (!id || isRegistering) return;
    setIsRegistering(true);
    setRegisterFeedback(null);

    try {
      const res = await fetch(`/api/events/${id}/registrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({})
      });

      const data = await res.json().catch(() => null);

      if (res.status === 201 && data?.registration) {
        setMyRegistration({
          id: data.registration.id,
          status: data.registration.status,
          registeredAt: data.registration.registeredAt
        });
        setEvent((prev) =>
          prev
            ? {
                ...prev,
                activeCount: prev.activeCount + 1,
                remainingSeats: Math.max(0, prev.remainingSeats - 1)
              }
            : null
        );
        setRegisterFeedback({ type: 'success', message: "You're successfully registered!" });
        return;
      }

      if (res.status === 409) {
        const code = data?.error?.code;
        if (code === 'EVENT_FULL') {
          setRegisterFeedback({ type: 'error', message: 'Sorry, this event just filled up.' });
          setEvent((prev) => (prev ? { ...prev, remainingSeats: 0 } : null));
        } else if (code === 'ALREADY_REGISTERED') {
          setRegisterFeedback({ type: 'error', message: "You're already registered for this event." });
          fetchEvent();
        } else if (code === 'REGISTRATION_CLOSED' || code === 'EVENT_NOT_OPEN') {
          setRegisterFeedback({ type: 'error', message: 'Registration is closed for this event.' });
          setEvent((prev) => (prev ? { ...prev, registrationOpen: false } : null));
        } else {
          setRegisterFeedback({ type: 'error', message: data?.error?.message || 'Registration failed.' });
        }
        return;
      }

      setRegisterFeedback({
        type: 'error',
        message: data?.error?.message || `Failed to register (${res.status})`
      });
    } catch {
      setRegisterFeedback({ type: 'error', message: 'Something went wrong, try again.' });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          to="/events"
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
          ← Back to Events
        </Link>
      </div>

      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'inline-block', width: '2rem', height: '2rem', border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.95rem' }}>Loading event details...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {errorMessage && !loading && (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: errorCode === 404 ? '#374151' : '#dc2626' }}>
            {errorMessage}
          </h3>
          {errorCode !== 404 && (
            <button
              onClick={fetchEvent}
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
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                padding: '0.25rem 0.6rem',
                borderRadius: '4px'
              }}
            >
              {event.category}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
              Organized by <strong>{event.organizerName}</strong>
            </span>
          </div>

          <h1 style={{ margin: '0 0 1.5rem 0', color: '#111827', fontSize: '1.75rem' }}>
            {event.title}
          </h1>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              backgroundColor: '#f9fafb',
              padding: '1.25rem',
              borderRadius: '8px',
              border: '1px solid #f3f4f6',
              marginBottom: '1.5rem'
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                📅 Schedule
              </div>
              <div style={{ fontSize: '0.9rem', color: '#1f2937', fontWeight: 500, marginTop: '0.25rem' }}>
                {formatBangkokDate(event.startAt)}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#4b5563' }}>
                to {formatBangkokDate(event.endAt)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                ⏳ Registration Deadline
              </div>
              <div style={{ fontSize: '0.9rem', color: '#1f2937', fontWeight: 500, marginTop: '0.25rem' }}>
                {formatBangkokDate(event.registrationDeadline)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                📍 Location
              </div>
              <div style={{ fontSize: '0.9rem', color: '#1f2937', fontWeight: 500, marginTop: '0.25rem' }}>
                {event.location}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                🎟️ Seats Available
              </div>
              <div style={{ fontSize: '0.9rem', color: '#1f2937', fontWeight: 500, marginTop: '0.25rem' }}>
                {event.remainingSeats} of {event.capacity} seats left
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151', fontSize: '1.1rem' }}>
              About this Event
            </h3>
            <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {event.description || 'No description provided.'}
            </p>
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
            {registerFeedback && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  borderRadius: '6px',
                  backgroundColor: registerFeedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${registerFeedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                  color: registerFeedback.type === 'success' ? '#15803d' : '#b91c1c',
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}
              >
                {registerFeedback.message}
              </div>
            )}

            {myRegistration ? (
              <div
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}
              >
                <div>
                  <span style={{ color: '#15803d', fontWeight: 600, fontSize: '1rem' }}>
                    ✓ You're registered
                  </span>
                  <div style={{ color: '#166534', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    Registered on {formatBangkokDate(myRegistration.registeredAt)}
                  </div>
                </div>
                <Link
                  to={`/registrations/${myRegistration.id}`}
                  style={{
                    color: '#15803d',
                    textDecoration: 'underline',
                    fontSize: '0.9rem',
                    fontWeight: 500
                  }}
                >
                  View registration →
                </Link>
              </div>
            ) : event.remainingSeats === 0 ? (
              <button
                disabled
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#e5e7eb',
                  color: '#9ca3af',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'not-allowed'
                }}
              >
                Full
              </button>
            ) : !event.registrationOpen ? (
              <button
                disabled
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#e5e7eb',
                  color: '#9ca3af',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'not-allowed'
                }}
              >
                Registration closed
              </button>
            ) : user?.role === 'STUDENT' ? (
              <button
                disabled={isRegistering}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: isRegistering ? '#93c5fd' : '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: isRegistering ? 'not-allowed' : 'pointer'
                }}
                onClick={handleRegister}
              >
                {isRegistering ? 'Registering…' : 'Register'}
              </button>
            ) : (
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem', fontStyle: 'italic' }}>
                You are logged in as an Organizer.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
