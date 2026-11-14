import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatBangkokDate } from '../lib/formatDate';

interface RegistrationDetail {
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

export function RegistrationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [registration, setRegistration] = useState<RegistrationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchRegistration = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorCode(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/registrations/${id}`, {
        credentials: 'include'
      });

      if (!res.ok) {
        setErrorCode(res.status);
        if (res.status === 404) {
          setErrorMessage('Registration not found');
        } else {
          const data = await res.json().catch(() => null);
          setErrorMessage(data?.error?.message || `Failed to load registration (${res.status})`);
        }
        return;
      }

      const data = await res.json();
      setRegistration(data.registration);
    } catch {
      setErrorMessage('Something went wrong, try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRegistration();
  }, [fetchRegistration]);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          to="/me/registrations"
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
          ← Back to My Registrations
        </Link>
      </div>

      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'inline-block', width: '2rem', height: '2rem', border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.95rem' }}>Loading registration details...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {errorMessage && !loading && (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: errorCode === 404 ? '#374151' : '#dc2626' }}>
            {errorMessage}
          </h3>
          <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280', fontSize: '0.9rem' }}>
            {errorCode === 404
              ? 'This registration does not exist or you do not have permission to view it.'
              : 'Unable to retrieve registration details at this time.'}
          </p>
          <Link
            to="/me/registrations"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '0.9rem'
            }}
          >
            View My Registrations
          </Link>
        </div>
      )}

      {!loading && !errorMessage && registration && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                Registration ID
              </span>
              <div style={{ fontFamily: 'monospace', fontSize: '1rem', color: '#1f2937', fontWeight: 600, marginTop: '0.2rem' }}>
                {registration.id}
              </div>
            </div>
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                backgroundColor: '#f0fdf4',
                color: '#15803d',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #bbf7d0'
              }}
            >
              ✓ {registration.status}
            </span>
          </div>

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
                Registered Date
              </div>
              <div style={{ fontSize: '0.9rem', color: '#1f2937', fontWeight: 500, marginTop: '0.25rem' }}>
                {formatBangkokDate(registration.registeredAt)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                Event Status
              </div>
              <div style={{ fontSize: '0.9rem', color: '#1f2937', fontWeight: 500, marginTop: '0.25rem' }}>
                {registration.event.effectiveStatus}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#111827', fontSize: '1.2rem' }}>
              Event Information
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.35rem' }}>
                <Link
                  to={`/events/${registration.event.id}`}
                  style={{ color: '#2563eb', textDecoration: 'none' }}
                >
                  {registration.event.title}
                </Link>
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>
                  📅 Event Schedule
                </div>
                <div style={{ fontSize: '0.9rem', color: '#1f2937', marginTop: '0.25rem' }}>
                  {formatBangkokDate(registration.event.startAt)} to {formatBangkokDate(registration.event.endAt)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>
                  📍 Location
                </div>
                <div style={{ fontSize: '0.9rem', color: '#1f2937', marginTop: '0.25rem' }}>
                  {registration.event.location}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <Link
                to={`/events/${registration.event.id}`}
                style={{
                  display: 'inline-block',
                  padding: '0.6rem 1.2rem',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontWeight: 500,
                  fontSize: '0.9rem'
                }}
              >
                View Event Page →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
