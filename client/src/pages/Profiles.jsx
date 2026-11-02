import { Link, useParams } from 'react-router-dom';
import { MapPin, Trophy, Users } from 'lucide-react';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { Crest, DemoBadge, Empty, ErrorState, Section, Skeleton } from '../components/ui';
import { MatchCard, MatchList } from '../components/MatchCard';
import { FollowButton } from '../components/Filters';

const Loading = () => <div className="container-x py-10"><Skeleton rows={1} h="h-40" /><div className="mt-6"><Skeleton rows={4} /></div></div>;

export function TeamPage() {
  const { id } = useParams();
  const s = useFetch(() => api.teams.get(id), [id]);
  if (s.loading && !s.data) return <Loading />;
  if (s.error) return <div className="container-x py-10"><ErrorState message={s.error} onRetry={s.reload} /></div>;
  const t = s.data;
  const lp = t.leaguePosition;
  return (
    <>
      <div className="border-b border-line" style={{ background: `linear-gradient(180deg, ${t.color}22, transparent)` }}>
        <div className="container-x flex flex-col gap-6 py-10 sm:flex-row sm:items-center">
          <Crest item={t} size={96} />
          <div className="flex-1">
            <p className="eyebrow mb-1">{t.sportId?.name} · {t.country}</p>
            <h1 className="font-display text-5xl font-extrabold uppercase leading-none">{t.name}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-mute">
              {t.venue && <span className="flex items-center gap-1 rounded-full bg-bg2 px-2.5 py-1"><MapPin size={12} />{t.venue}</span>}
              {t.competitionIds.map((c) => <Link key={c._id} to={`/competitions/${c._id}`} className="rounded-full bg-bg2 px-2.5 py-1 hover:text-lime">{c.name}</Link>)}
            </div>
          </div>
          <FollowButton type="team" id={t._id} />
        </div>
      </div>
      <div className="container-x grid gap-10 py-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-12">
          {t.live.length > 0 && <div className="grid gap-4 md:grid-cols-2">{t.live.map((m) => <MatchCard key={m._id} match={m} />)}</div>}
          <Section title="Recent results">{t.results.length ? <MatchList matches={t.results} /> : <Empty title="No results yet" />}</Section>
          <Section title="Upcoming matches">{t.upcoming.length ? <MatchList matches={t.upcoming} /> : <Empty title="No upcoming matches" />}</Section>
        </div>
        <aside className="space-y-6">
          <div className="card p-6">
            <p className="eyebrow mb-3 flex items-center gap-2"><Trophy size={13} />League position</p>
            {lp ? (
              <Link to={`/competitions/${lp.competitionId}`} className="flex items-end justify-between hover:text-lime">
                <div><p className="score text-6xl text-lime">{lp.position}<span className="text-2xl">{['th', 'st', 'nd', 'rd'][lp.position % 10 > 3 || Math.floor(lp.position / 10) === 1 ? 0 : lp.position % 10]}</span></p><p className="text-sm text-mute">{lp.competition}</p></div>
                <div className="text-right text-sm"><p className="score text-2xl">{lp.points} pts</p><p className="text-mute">{lp.played} played</p></div>
              </Link>
            ) : <p className="text-sm text-mute">Not in a league table.</p>}
          </div>
          <div className="card p-6">
            <p className="eyebrow mb-3 flex items-center gap-2"><Users size={13} />Squad <DemoBadge className="ml-auto" /></p>
            <ul className="divide-y divide-line/60">
              {t.players.map((p) => (
                <li key={p._id}><Link to={`/player/${p._id}`} className="flex items-center gap-3 py-2 text-sm hover:text-lime"><span className="score w-6 text-mute">{p.number}</span><span className="flex-1 truncate">{p.name}</span><span className="text-xs text-mute">{p.position}</span></Link></li>
              ))}
            </ul>
            {!t.players.length && <p className="text-sm text-mute">No squad information.</p>}
          </div>
        </aside>
      </div>
    </>
  );
}

const LABEL = { appearances: 'Appearances', goals: 'Goals', assists: 'Assists', yellowCards: 'Yellow cards', matches: 'Matches', runs: 'Runs', wickets: 'Wickets', strikeRate: 'Strike rate', games: 'Games', points: 'Points / game', rebounds: 'Rebounds / game' };

export function PlayerPage() {
  const { id } = useParams();
  const s = useFetch(() => api.players.get(id), [id]);
  if (s.loading && !s.data) return <Loading />;
  if (s.error) return <div className="container-x py-10"><ErrorState message={s.error} onRetry={s.reload} /></div>;
  const p = s.data, t = p.teamId;
  const initials = p.name.split(' ').map((x) => x[0]).join('').slice(0, 2);
  return (
    <div className="container-x py-10">
      <div className="card flex flex-col gap-8 overflow-hidden p-6 sm:flex-row sm:items-center sm:p-8" style={{ background: `linear-gradient(120deg, ${t?.color}26, #1D2420 55%)` }}>
        {p.image ? <img src={p.image} alt={p.name} className="h-36 w-36 rounded-2xl object-cover" />
          : <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-2xl bg-bg2 font-display text-6xl font-bold text-lime">{initials}</div>}
        <div className="flex-1">
          <p className="eyebrow mb-1">{p.position} · #{p.number}</p>
          <h1 className="font-display text-5xl font-extrabold uppercase leading-none">{p.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            {t && <Link to={`/team/${t._id}`} className="flex items-center gap-2 font-semibold hover:text-lime"><Crest item={t} size={28} />{t.name}</Link>}
            <span className="text-mute">Nationality: <span className="text-ink">{p.nationality}</span></span>
          </div>
        </div>
        <DemoBadge className="self-start" />
      </div>
      <h2 className="mb-4 mt-10 font-display text-2xl font-bold uppercase">Season statistics</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Object.entries(p.statistics || {}).map(([k, v]) => (
          <div key={k} className="card p-5"><p className="score text-4xl">{v}</p><p className="mt-1 text-xs uppercase tracking-wider text-mute">{LABEL[k] || k}</p></div>
        ))}
      </div>
    </div>
  );
}
