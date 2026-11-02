import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Heart, ListOrdered, Radio, Search, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useFetch, useDebounce, useCompetitions } from '../hooks/useFetch';
import { useAuth } from '../context/AppContext';
import { Async, Crest, DemoBadge, Empty, Section, Skeleton } from '../components/ui';
import { MatchCard, MatchList } from '../components/MatchCard';
import { SportChips, CompetitionSelect } from '../components/Filters';
import StandingsTable from '../components/StandingsTable';
import { localISODate, tz } from '../utils/format';

export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const sport = params.get('sport') || '';
  const [q, setQ] = useState('');
  const [competition, setCompetition] = useState('');
  const dq = useDebounce(q);
  const { user } = useAuth();
  const comps = useCompetitions();
  const filters = { sport: sport || undefined, q: dq || undefined, competition: competition || undefined };
  const key = JSON.stringify(filters);

  const live = useFetch(() => api.matches.live({ ...filters, limit: 30 }).then((r) => r.items), [key]);
  const today = useFetch(async () => {
    const r = await api.matches.upcoming({ ...filters, date: localISODate(), tz: tz(), limit: 12 });
    return r.items.length ? { label: "Today's fixtures", items: r.items } : { label: 'Next fixtures', items: (await api.matches.upcoming({ ...filters, limit: 6 })).items };
  }, [key]);
  const results = useFetch(() => api.matches.results({ ...filters, limit: 8 }).then((r) => r.items), [key]);

  // Standings competition: league in the selected sport (default first league)
  const leagues = (comps.data || []).filter((c) => (!sport || c.sportId?.slug === sport));
  const [tableComp, setTableComp] = useState('');
  useEffect(() => { if (leagues.length && !leagues.some((c) => c._id === tableComp)) setTableComp((leagues.find((c) => c.format === 'LEAGUE') || leagues[0])._id); }, [leagues, tableComp]);
  const standings = useFetch(() => (tableComp ? api.competitions.standings(tableComp) : Promise.resolve(null)), [tableComp]);
  const myTeams = useFetch(() => (user ? api.users.me().then((r) => r.user.favoriteTeams) : Promise.resolve([])), [user?._id, user?.favoriteTeams?.length]);

  const setSport = (s) => { setCompetition(''); setParams(s ? { sport: s } : {}); };

  return (
    <div className="container-x py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Sports dashboard</p>
          <h1 className="font-display text-5xl font-extrabold uppercase">Live scores</h1>
        </div>
        <DemoBadge />
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by team…" className="input pl-10" maxLength={60} aria-label="Search by team" />
          </div>
          <div className="lg:hidden"><SportChips value={sport} onChange={setSport} /></div>
          <div className="hidden lg:block">
            <p className="eyebrow mb-2">Sport</p>
            <div className="flex flex-col gap-1">
              {[['', 'All sports'], ['football', 'Football'], ['cricket', 'Cricket'], ['basketball', 'Basketball']].map(([s, l]) => (
                <button key={s} onClick={() => setSport(s)} className={`rounded-xl px-3 py-2 text-left text-sm font-medium ${sport === s ? 'bg-lime/10 text-lime' : 'text-mute hover:bg-bg2 hover:text-ink'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow mb-2">Competition</p>
            <CompetitionSelect sport={sport} value={competition} onChange={setCompetition} />
          </div>
          <div className="card p-4">
            <p className="eyebrow mb-3 flex items-center gap-2"><Heart size={13} />My teams</p>
            {!user ? <p className="text-sm text-mute"><Link to="/login" className="text-lime hover:underline">Log in</Link> to follow teams.</p>
              : myTeams.loading ? <Skeleton rows={2} h="h-8" />
                : myTeams.data?.length ? (
                  <ul className="space-y-1">{myTeams.data.map((t) => (
                    <li key={t._id}><Link to={`/team/${t._id}`} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-bg2"><Crest item={t} size={24} />{t.name}</Link></li>
                  ))}</ul>
                ) : <p className="text-sm text-mute">You don’t follow any teams yet. Open a team page and tap Follow.</p>}
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 space-y-14">
          <Section title="Live now" icon={Radio} action={<button onClick={live.reload} className="btn-ghost !py-1.5 text-xs"><RefreshCw size={14} className={live.loading ? 'animate-spin' : ''} />Refresh</button>}>
            <Async state={live} skeleton={<div className="grid gap-4 md:grid-cols-2"><Skeleton rows={1} h="h-56" /><Skeleton rows={1} h="h-56" /></div>}
              empty={<Empty icon={Radio} title="No matches live right now" text="Check today’s fixtures below." />}>
              {(d) => <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{d.map((m) => <MatchCard key={m._id} match={m} />)}</div>}
            </Async>
          </Section>

          <Section title={today.data?.label || "Today's fixtures"} icon={CalendarDays} action={<Link to="/fixtures" className="text-sm font-semibold text-lime hover:underline">All fixtures</Link>}>
            <Async state={{ ...today, data: today.data?.items }} empty={<Empty icon={CalendarDays} title="No upcoming fixtures" />}>{(d) => <MatchList matches={d} grouped />}</Async>
          </Section>

          <Section title="Latest results" icon={CheckCircle2} action={<Link to="/results" className="text-sm font-semibold text-lime hover:underline">All results</Link>}>
            <Async state={results} empty={<Empty title="No results match your filters" />}>{(d) => <MatchList matches={d} />}</Async>
          </Section>

          <Section title="League standings" icon={ListOrdered} action={
            <select className="input !w-auto !py-1.5 text-xs" value={tableComp} onChange={(e) => setTableComp(e.target.value)} aria-label="Standings competition">
              {leagues.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>}>
            <Async state={{ ...standings, data: standings.data?.table }}>{(d) => <StandingsTable table={d} sport={standings.data.sport} highlight={(user?.favoriteTeams || []).map(String)} />}</Async>
          </Section>
        </div>
      </div>
    </div>
  );
}
