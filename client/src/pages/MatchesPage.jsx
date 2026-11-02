import { useEffect, useState } from 'react';
import { Search, CalendarDays, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useDebounce } from '../hooks/useFetch';
import { Empty, ErrorState, Skeleton, DemoBadge } from '../components/ui';
import { MatchList } from '../components/MatchCard';
import { SportChips, CompetitionSelect } from '../components/Filters';
import { addDays, localISODate, tz } from '../utils/format';

// Shared page for /fixtures (upcoming) and /results (completed)
export default function MatchesPage({ mode }) {
  const fixtures = mode === 'fixtures';
  const [sport, setSport] = useState('');
  const [competition, setCompetition] = useState('');
  const [date, setDate] = useState('');
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [state, setState] = useState({ items: [], page: 1, pages: 1, total: 0, loading: true, error: null });

  const days = Array.from({ length: 7 }, (_, i) => addDays(fixtures ? i : -i));

  const load = async (page = 1) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const params = { page, limit: 20, sport: sport || undefined, competition: competition || undefined, q: dq || undefined, ...(date && { date, tz: tz() }) };
      const r = await (fixtures ? api.matches.upcoming(params) : api.matches.results(params));
      setState((s) => ({ ...r, items: page === 1 ? r.items : [...s.items, ...r.items], loading: false, error: null }));
    } catch (e) { setState((s) => ({ ...s, loading: false, error: e.message })); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(1); }, [sport, competition, date, dq, mode]);
  useEffect(() => { setDate(''); setSport(''); setCompetition(''); setQ(''); }, [mode]);

  const Icon = fixtures ? CalendarDays : CheckCircle2;
  return (
    <div className="container-x py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">{fixtures ? 'Upcoming matches' : 'Completed matches'}</p>
          <h1 className="font-display text-5xl font-extrabold uppercase">{fixtures ? 'Fixtures' : 'Results'}</h1>
        </div>
        <DemoBadge />
      </div>

      {/* Date selector */}
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setDate('')} className={`card shrink-0 px-5 py-3 text-sm font-semibold ${!date ? '!border-lime text-lime' : 'text-mute hover:text-ink'}`}>All dates</button>
        {days.map((d) => {
          const iso = localISODate(d);
          return (
            <button key={iso} onClick={() => setDate(iso)} className={`card w-[68px] shrink-0 py-2 text-center ${date === iso ? '!border-lime text-lime' : 'text-mute hover:text-ink'}`}>
              <div className="text-[10px] font-bold uppercase tracking-wider">{d.toLocaleDateString([], { weekday: 'short' })}</div>
              <div className="score text-xl">{d.getDate()}</div>
            </button>
          );
        })}
      </div>

      <div className="mb-8 grid gap-3 md:grid-cols-[1fr_240px_260px] md:items-center">
        <SportChips value={sport} onChange={(s) => { setSport(s); setCompetition(''); }} />
        <CompetitionSelect sport={sport} value={competition} onChange={setCompetition} />
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search team…" className="input pl-10" maxLength={60} aria-label="Search team" />
        </div>
      </div>

      {state.error ? <ErrorState message={state.error} onRetry={() => load(1)} />
        : state.loading && state.page === 1 && !state.items.length ? <Skeleton rows={6} h="h-14" />
          : !state.items.length ? <Empty icon={Icon} title={`No ${fixtures ? 'fixtures' : 'results'} found`} text="Try another date, sport or competition." />
            : (
              <>
                <p className="mb-3 text-xs text-mute">{state.total} match{state.total === 1 ? '' : 'es'}</p>
                <MatchList matches={state.items} grouped />
                {state.page < state.pages && (
                  <div className="mt-6 flex justify-center">
                    <button className="btn-ghost" onClick={() => load(state.page + 1)} disabled={state.loading}>{state.loading && <Loader2 size={16} className="animate-spin" />}Load more</button>
                  </div>
                )}
              </>
            )}
    </div>
  );
}
