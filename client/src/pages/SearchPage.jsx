import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { Crest, Empty, ErrorState, Skeleton } from '../components/ui';
import { MatchList } from '../components/MatchCard';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [input, setInput] = useState(q);
  useEffect(() => { setInput(q); }, [q]);
  const s = useFetch(async () => {
    if (q.length < 2) return null;
    const [teams, comps, players, matches] = await Promise.all([
      api.teams.list({ q, limit: 12 }), api.competitions.list({ q, limit: 8 }), api.players.list({ q, limit: 12 }), api.matches.list({ q, limit: 8 }),
    ]);
    return { teams: teams.items, comps: comps.items, players: players.items, matches: matches.items };
  }, [q]);
  const total = s.data ? s.data.teams.length + s.data.comps.length + s.data.players.length + s.data.matches.length : 0;

  return (
    <div className="container-x py-10">
      <h1 className="mb-6 font-display text-5xl font-extrabold uppercase">Search</h1>
      <form onSubmit={(e) => { e.preventDefault(); setParams(input.trim() ? { q: input.trim() } : {}); }} className="relative mb-10 max-w-2xl">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Teams, competitions, players…" className="input !py-3.5 pl-11 text-base" maxLength={60} autoFocus />
      </form>
      {q.length < 2 ? <Empty icon={Search} title="Start typing" text="Enter at least 2 characters to search." />
        : s.loading ? <Skeleton rows={4} />
          : s.error ? <ErrorState message={s.error} onRetry={s.reload} />
            : !total ? <Empty icon={Search} title={`No results for “${q}”`} />
              : (
                <div className="space-y-10">
                  {s.data.teams.length > 0 && <div><h2 className="eyebrow mb-3">Teams</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{s.data.teams.map((t) => <Link key={t._id} to={`/team/${t._id}`} className="card flex items-center gap-3 p-4 hover:border-lime/50"><Crest item={t} size={36} /><div className="min-w-0"><p className="truncate font-semibold">{t.name}</p><p className="text-xs text-mute">{t.sportId?.name}</p></div></Link>)}</div></div>}
                  {s.data.comps.length > 0 && <div><h2 className="eyebrow mb-3">Competitions</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{s.data.comps.map((c) => <Link key={c._id} to={`/competitions/${c._id}`} className="card flex items-center gap-3 p-4 hover:border-lime/50"><Crest item={c} size={36} /><div className="min-w-0"><p className="truncate font-semibold">{c.name}</p><p className="text-xs text-mute">{c.sportId?.name}</p></div></Link>)}</div></div>}
                  {s.data.players.length > 0 && <div><h2 className="eyebrow mb-3">Players</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{s.data.players.map((p) => <Link key={p._id} to={`/player/${p._id}`} className="card flex items-center gap-3 p-4 hover:border-lime/50"><Crest item={p.teamId} size={36} /><div className="min-w-0"><p className="truncate font-semibold">{p.name}</p><p className="truncate text-xs text-mute">{p.position} · {p.teamId?.name}</p></div></Link>)}</div></div>}
                  {s.data.matches.length > 0 && <div><h2 className="eyebrow mb-3">Matches</h2><MatchList matches={s.data.matches} /></div>}
                </div>
              )}
    </div>
  );
}
