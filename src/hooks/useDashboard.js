import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { fetchDashboardData, REALTIME_TABLES } from '../services/dashboardService';
import { emptyDashboard } from '../utils/dashboard';

export function useDashboard(user, selectedPlayerId = null) {
  const [data, setData] = useState(emptyDashboard());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const debounceRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!user?.id || !supabase) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboardData(user, selectedPlayerId);
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError('Impossible de charger les données du dashboard.');
    } finally {
      setLoading(false);
    }
  }, [user, selectedPlayerId]);

  const scheduleReload = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(true), 400);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user?.id || !supabase) return;

    const channel = supabase.channel(`dashboard-${user.id}-${selectedPlayerId ?? 'all'}`);

    for (const table of REALTIME_TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        scheduleReload
      );
    }

    channel.subscribe();

    const pollInterval = setInterval(() => load(true), 30000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [user, load, scheduleReload, selectedPlayerId]);

  return { data, loading, error, lastUpdated, refresh: () => load() };
}

export function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
