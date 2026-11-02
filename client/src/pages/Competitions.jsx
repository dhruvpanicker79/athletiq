import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Trophy } from 'lucide-react';
import { api } from '../services/api';
import { useFetch, useDebounce } from '../hooks/useFetch';
import { Async, Crest, Empty, Skeleton } from '../components/ui';
import { SportChips, FollowButton } from '../components/Filters';

export default function Competitions() {
  const [sport, setSport] = useState('');
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const state = useFetch(() => api.competitions.list({ sport: sport || undefined, q: dq || undefined, limit: 100 }).then((r) => r.items), [sport, dq]);
  return (
    <div className="container-x py-10">
      <p className="eyebrow mb-2">Leagues & tournaments</p>
      <h1 className="mb-8 font-display text-5xl font-extrabold uppercase">Competitions</h1>
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SportChips value={sport} onChange={setSport} />
        <div className="relative md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search competitions…" className="input pl-10" aria-label="Search competitions" />
        </div>
      </div>
      <Async state={state} skeleton={<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Skeleton rows={3} h="h-40" /></div>} empty={<Empty icon={Trophy} title="No competitions found" />}>
        {(d) => (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {d.map((c) => (
              <div key={c._id} className="card flex flex-col p-5 transition-colors hover:border-mute/60">
                <div className="flex items-start justify-between">
                  <Crest item={c} size={56} />
                  <FollowButton type="competition" id={c._id} small />
                </div>
                <Link to={`/competitions/${c._id}`} className="mt-5 font-display text-2xl font-bold uppercase leading-tight hover:text-lime">{c.name}</Link>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-mute">
                  <span className="rounded-full bg-bg2 px-2.5 py-1">{c.sportId?.name}</span>
                  <span className="rounded-full bg-bg2 px-2.5 py-1">{c.country}</span>
                  <span className="rounded-full bg-bg2 px-2.5 py-1">Season {c.season}</span>
                </div>
                <Link to={`/competitions/${c._id}`} className="mt-5 text-xs font-bold uppercase tracking-wider text-lime hover:underline">View competition →</Link>
              </div>
            ))}
          </div>
        )}
      </Async>
    </div>
  );
}
