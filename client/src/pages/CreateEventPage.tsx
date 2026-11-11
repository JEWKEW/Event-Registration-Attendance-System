import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  'WORKSHOP',
  'SEMINAR',
  'CAMP',
  'SPORTS',
  'VOLUNTEER',
  'OTHER'
];

export function CreateEventPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'WORKSHOP',
    location: '',
    startAt: '',
    endAt: '',
    registrationDeadline: '',
    capacity: 30
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'capacity' ? parseInt(value, 10) || 0 : value
    }));
  };

  const toBangkokIso = (datetimeLocal: string): string => {
    if (!datetimeLocal) return '';
    // Format YYYY-MM-DDTHH:mm:00+07:00
    return `${datetimeLocal}:00+07:00`;
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim() || form.title.length < 3 || form.title.length > 120) {
      errors.title = 'Title must be between 3 and 120 characters';
    }
    if (!form.location.trim() || form.location.length > 200) {
      errors.location = 'Location is required (max 200 characters)';
    }
    if (form.description.length > 2000) {
      errors.description = 'Description must not exceed 2000 characters';
    }
    if (!form.capacity || form.capacity < 1 || form.capacity > 1000) {
      errors.capacity = 'Capacity must be an integer between 1 and 1000';
    }
    if (!form.startAt) {
      errors.startAt = 'Start time is required';
    }
    if (!form.endAt) {
      errors.endAt = 'End time is required';
    }
    if (!form.registrationDeadline) {
      errors.registrationDeadline = 'Registration deadline is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        location: form.location,
        startAt: toBangkokIso(form.startAt),
        endAt: toBangkokIso(form.endAt),
        registrationDeadline: toBangkokIso(form.registrationDeadline),
        capacity: Number(form.capacity)
      };

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.details && Array.isArray(data.error.details)) {
          const errorsMap: Record<string, string> = {};
          data.error.details.forEach((d: any) => {
            errorsMap[d.field] = d.issue;
          });
          setFieldErrors(errorsMap);
        } else {
          setGeneralError(data.error?.message || 'Failed to create event');
        }
        return;
      }

      // Success: redirect to organizer events list
      navigate('/organizer/events');
    } catch (err: any) {
      setGeneralError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '650px', margin: '2rem auto', padding: '2rem', backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', fontFamily: 'sans-serif' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#111827' }}>
        Create & Publish Event
      </h2>

      {generalError && (
        <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Title */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
            Event Title *
          </label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. Intro to Git Workshop"
            style={{ width: '100%', padding: '0.5rem', border: fieldErrors.title ? '1px solid #ef4444' : '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
          />
          {fieldErrors.title && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{fieldErrors.title}</p>}
        </div>

        {/* Category & Capacity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
              Category *
            </label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
              Capacity (1–1000) *
            </label>
            <input
              type="number"
              name="capacity"
              min="1"
              max="1000"
              value={form.capacity}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.5rem', border: fieldErrors.capacity ? '1px solid #ef4444' : '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
            />
            {fieldErrors.capacity && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{fieldErrors.capacity}</p>}
          </div>
        </div>

        {/* Location */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
            Location *
          </label>
          <input
            type="text"
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="e.g. CB2-301 Computer Lab"
            style={{ width: '100%', padding: '0.5rem', border: fieldErrors.location ? '1px solid #ef4444' : '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
          />
          {fieldErrors.location && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{fieldErrors.location}</p>}
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
              Start Time (Bangkok Time) *
            </label>
            <input
              type="datetime-local"
              name="startAt"
              value={form.startAt}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.5rem', border: fieldErrors.startAt ? '1px solid #ef4444' : '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
            />
            {fieldErrors.startAt && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{fieldErrors.startAt}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
              End Time (Bangkok Time) *
            </label>
            <input
              type="datetime-local"
              name="endAt"
              value={form.endAt}
              onChange={handleChange}
              style={{ width: '100%', padding: '0.5rem', border: fieldErrors.endAt ? '1px solid #ef4444' : '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
            />
            {fieldErrors.endAt && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{fieldErrors.endAt}</p>}
          </div>
        </div>

        {/* Registration Deadline */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
            Registration Deadline (Bangkok Time) *
          </label>
          <input
            type="datetime-local"
            name="registrationDeadline"
            value={form.registrationDeadline}
            onChange={handleChange}
            style={{ width: '100%', padding: '0.5rem', border: fieldErrors.registrationDeadline ? '1px solid #ef4444' : '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
          />
          {fieldErrors.registrationDeadline && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{fieldErrors.registrationDeadline}</p>}
        </div>

        {/* Description */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
            Description (0–2000 chars)
          </label>
          <textarea
            name="description"
            rows={4}
            value={form.description}
            onChange={handleChange}
            placeholder="Describe the activity..."
            style={{ width: '100%', padding: '0.5rem', border: fieldErrors.description ? '1px solid #ef4444' : '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
          />
          {fieldErrors.description && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{fieldErrors.description}</p>}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: isSubmitting ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? 'Publishing…' : 'Publish Event'}
        </button>
      </form>
    </div>
  );
}
