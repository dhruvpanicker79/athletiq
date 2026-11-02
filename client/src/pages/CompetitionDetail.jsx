import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { Async, Crest, DemoBadge, Empty, ErrorState, Skeleton, Tabs } from '../components/ui';
import { MatchCard, MatchList } from '../components/MatchCard';
import { FollowButton } from '../components/Filters';
import StandingsTable from '../components/StandingsTable';

export default function CompetitionDetail() {
  const { id } = useParams();
  const comp = useFetch(() => api.competitions.get(id), [id]);
  const table = useFetch(() => api.competitions.standings(id), [id]);
  const [tab, setTab] = useState('Overview');

  if (comp.loading && !comp.data) return <div className="container-x py-10"><Skeleton rows={4} h="h-32" /></div>;
  if (comp.error) return <div className="container-x py-10"><ErrorState message={comp.error} onRetry={comp.reload} /></div>;
  const c = comp.data;
  const sport = c.sportId?.slug;

  return (
    <>
      <div className="border-b border-line bg-bg2/60">
        <div className="container-x flex flex-col gap-6 py-10 sm:flex-row sm:items-center">
          <Crest item={c} size={88} />
          <div className="flex-1">
            <p className="eyebrow mb-1">{c.sportId?.name} · {c.country}</p>
            <h1 className="font-display text-5xl font-extrabold uppercase leading-none">{c.name}</h1>
            <p className="mt-2 text-sm text-mute">Season {c.season} · {c.teams.length} teams · {c.format === 'CUP' ? 'Tournament' : 'League'}</p>
          </div>
          <div className="flex items-center gap-3"><DemoBadge /><FollowButton type="competition" id={c._id} /></div>
        </div>
        <div className="container-x"><Tabs tabs={['Overview', 'Standings', 'Fixtures', 'Results', 'Teams']} value={tab} onChange={setTab} /></div>
      </div>

      <div className="container-x py-10">
        {tab === 'Overview' && (
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-8">
              {c.live.length > 0 && <div className="grid gap-4 md:grid-cols-2">{c.live.map((m) => <MatchCard key={m._id} match={m} />)}</div>}
              <div><h3 className="eyebrow mb-3">Upcoming fixtures</h3>{c.upcoming.length ? <MatchList matches={c.upcoming} showComp={false} /> : <Empty title="No upcoming fixtures" />}</div>
              <div><h3 className="eyebrow mb-3">Recent results</h3>{c.results.length ? <MatchList matches={c.results} showComp={false} /> : <Empty title="No results yet" />}</div>
            </div>
            <div>
              <h3 className="eyebrow mb-3">Table</h3>
              <Async state={{ ...table, data: table.data?.table }}>{(d) => <StandingsTable table={d} sport={sport} compact />}</Async>
            </div>
          </div>
        )}
        {tab === 'Standings' && (
          <>
            <Async state={{ ...table, data: table.data?.table }}>{(d) => <StandingsTable table={d} sport={sport} />}</Async>
            <p className="mt-3 text-xs text-mute">Standings are calculated from completed matches. {sport === 'football' ? 'Win 3 pts, draw 1.' : 'Win 2 pts.'}</p>
          </>
        )}
        {tab === 'Fixtures' && (c.upcoming.length ? <MatchList matches={c.upcoming} grouped showComp={false} /> : <Empty title="No upcoming fixtures" />)}
        {tab === 'Results' && (c.results.length ? <MatchList matches={c.results} grouped showComp={false} /> : <Empty title="No results yet" />)}
        {tab === 'Teams' && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {c.teams.map((t) => (
              <Link key={t._id} to={`/team/${t._id}`} className="card flex flex-col items-center gap-3 p-6 text-center transition-colors hover:border-lime/50">
                <Crest item={t} size={60} /><span className="font-semibold">{t.name}</span><span className="text-xs text-mute">{t.country}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
