import { useEffect, useState } from 'react';
import { api } from '../services/api';

export function useFetch(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((e) => alive && setState({ data: null, loading: false, error: e.message }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

export function useDebounce(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

// Small module-level caches for reference data used everywhere
let sportsCache, compsCache;
export const useSports = () => useFetch(() => (sportsCache ||= api.sports.list().catch((e) => { sportsCache = null; throw e; })), []);
export const useCompetitions = () => useFetch(() => (compsCache ||= api.competitions.list({ limit: 100 }).then((r) => r.items).catch((e) => { compsCache = null; throw e; })), []);
export const clearCaches = () => { sportsCache = null; compsCache = null; };
