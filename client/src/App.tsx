import { useEffect, useState } from 'react';

interface HealthData {
  status: string;
  version: string;
  commit: string;
}

export default function App() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Health check failed', err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>KMUTT Event Registration & Attendance System</h1>
      <p>Baseline Platform & Configuration (SR-01)</p>
      <div style={{ padding: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
        <h3>System Status:</h3>
        {loading ? (
          <p>Checking API health...</p>
        ) : health ? (
          <ul>
            <li><strong>Status:</strong> {health.status}</li>
            <li><strong>Version:</strong> {health.version}</li>
            <li><strong>Commit:</strong> {health.commit}</li>
          </ul>
        ) : (
          <p style={{ color: 'red' }}>Could not reach API server</p>
        )}
      </div>
    </div>
  );
}
