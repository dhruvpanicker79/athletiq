import { Link, useParams } from 'react-router-dom';
import { CalendarDays, MapPin, Trophy, Clock } from 'lucide-react';
import { api } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { Crest, DemoBadge, ErrorState, Skeleton, StatusBadge } from '../components/ui';
import { MatchList } from '../components/MatchCard';
import { FootballView, CricketView, BasketballView } from '../components/match/SportViews';
import { fmtLong, fmtTime, hasScore, scoreLabel, sportOf } from '../utils/format';

export default function MatchCentre() {
  const { id } = useParams();
  const state = useFetch(() => api.matches.get(id), [id]);
  if (state.loading && !state.data) return <div className="container-x py-10"><Skeleton rows={1} h="h-72" /><div className="mt-6"><Skeleton rows={3} /></div></div>;
  if (state.error) return <div className="container-x py-10"><ErrorState message={state.error} onRetry={state.reload} /></div>;
  const m = state.data;
  const sport = sportOf(m);
  const View = { football: FootballView, cricket: CricketView, basketball: BasketballView }[sport] || FootballView;
  const H = m.homeTeamId, A = m.awayTeamId;
  const overs = (side) => m.matchStatistics?.innings?.find((i) => i.team === side)?.overs;

  const TeamBlock = ({ t, side }) => (
    <Link to={`/team/${t._id}`} className="group flex min-w-0 flex-1 flex-col items-center gap-3 text-center">
      <Crest item={t} size={84} className="sm:!h-24 sm:!w-24" />
      <span className="font-display text-xl font-bold uppercase leading-tight group-hover:text-lime sm:text-3xl">{t.name}</span>
      {sport === 'cricket' && overs(side) && <span className="text-xs text-mute">({overs(side)} ov)</span>}
    </Link>
  );

  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-bg2/60">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime/50 to-transparent" />
        <div className="container-x py-10">
          <div className="mb-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-mute">
            <Link to={`/competitions/${m.competitionId._id}`} className="flex items-center gap-1.5 font-semibold text-ink hover:text-lime"><Trophy size={14} className="text-lime" />{m.competitionId.name}</Link>
            {m.round && <span>{m.round}</span>}
            <span className="flex items-center gap-1.5"><CalendarDays size={14} />{fmtLong(m.startTime)}</span>
            <span className="flex items-center gap-1.5"><MapPin size={14} />{m.venue || 'Venue TBC'}</span>
            {m.isDemo && <DemoBadge />}
          </div>
          <div className="mx-auto flex max-w-3xl items-start gap-3 sm:gap-8">
            <TeamBlock t={H} side="home" />
            <div className="flex shrink-0 flex-col items-center gap-3 pt-4 sm:pt-6">
              {hasScore(m)
                ? <div className="score whitespace-nowrap text-5xl leading-none sm:text-7xl">{scoreLabel(m, 'home')}<span className="mx-2 text-mute sm:mx-4">:</span>{scoreLabel(m, 'away')}</div>
                : <div className="text-center"><div className="score text-5xl text-lime sm:text-6xl">{fmtTime(m.startTime)}</div><div className="mt-1 flex items-center justify-center gap-1 text-xs text-mute"><Clock size={12} />Kick-off</div></div>}
              <StatusBadge match={m} />
            </div>
            <TeamBlock t={A} side="away" />
          </div>
          {m.result && <p className="mt-6 text-center text-sm text-mute">{m.result}</p>}
        </div>
      </section>

      <div className="container-x py-8">
        <View m={m} />
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h3 className="eyebrow mb-4">Competition</h3>
            <Link to={`/competitions/${m.competitionId._id}`} className="flex items-center gap-4 hover:text-lime">
              <Crest item={m.competitionId} size={48} />
              <div><p className="font-semibold">{m.competitionId.name}</p><p className="text-xs text-mute">{m.competitionId.country} · Season {m.competitionId.season} · {m.sportId.name}</p></div>
            </Link>
          </div>
          <div>
            <h3 className="eyebrow mb-3">Recent head-to-head</h3>
            {m.headToHead?.length ? <MatchList matches={m.headToHead} showComp={false} /> : <div className="card p-6 text-sm text-mute">No previous meetings on record.</div>}
          </div>
        </div>
      </div>
    </>
  );
}
