import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Loads data when a screen is focused and quietly refreshes it every time the
 * host comes back to the screen (e.g. after logging a match, the Rankings tab
 * is already up to date).
 *
 *  loading   - first load (show a spinner)
 *  refreshing- pull-to-refresh in progress
 *  reload()  - silent refetch, keeps current data on screen (use after saving)
 *  retry()   - refetch with a spinner (use from an error state)
 *  refresh() - pull-to-refresh handler
 */
export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const dataRef = useRef(null);
  const first = useRef(true);

  const run = useCallback(async (mode) => {
    if (mode === 'initial') {
      setLoading(true);
      setError(null);
    }
    if (mode === 'refresh') setRefreshing(true);
    try {
      const result = await fn();
      dataRef.current = result;
      setData(result);
      setError(null);
    } catch (e) {
      // A failed silent refresh shouldn't wipe a screen that already has data.
      if (mode !== 'silent' || !dataRef.current) setError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(
    useCallback(() => {
      run(first.current ? 'initial' : 'silent');
      first.current = false;
    }, [run])
  );

  return {
    data,
    error,
    loading,
    refreshing,
    reload: () => run('silent'),
    retry: () => run('initial'),
    refresh: () => run('refresh'),
  };
}
