import { useState, useEffect, useCallback } from 'react';

export default function useStreak() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStreak = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/streak');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch streak data');
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/streak/refresh', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to refresh data');
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  return { data, loading, error, refresh, refetch: fetchStreak };
}
