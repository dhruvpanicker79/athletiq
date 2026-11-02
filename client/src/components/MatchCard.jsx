import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { Crest, StatusBadge } from './ui';
import { fmtTime, relDay, scoreLabel, hasScore, groupByDay } from '../utils/format';

const winner = (m, side) => m.status === 'COMPLETED' && (side === 'home' ? m.homeScore > m.awayScore : m.awayScore > m.homeScore);

// Large card used for live / featured matches
export function MatchCard({ match: m }) {
  const H = m.homeTeamId, A = m.awayTeamId;
  const Side = ({ t, side }) => (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <Crest item={t} size={52} />
      <span className={`line-clamp-2 text-sm font-semibold ${m.status === 'COMPLETED' && !winner(m, side) ? 'text-mute' : ''}`}>{t?.name}</span>
    </div>
  );
  return (
    <div className={`card group flex flex-col p-5 transition-colors hover:border-mute/60 ${m.status === 'LIVE' ? 'border-live/30' : ''}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-mute">{m.competitionId?.name}</span>
        <StatusBadge match={m} />
      </div>
      <div className="flex items-center gap-2">
        <Side t={H} side="home" />
        <div className="w-28 shrink-0 text-center">
          {hasScore(m)
            ? <div className={`score text-4xl ${m.status === 'LIVE' ? 'text-ink' : 'text-ink/90'}`}>{scoreLabel(m, 'home')}<span className="mx-1.5 text-mute">–</span>{scoreLabel(m, 'away')}</div>
            : <><div className="score text-3xl text-lime">{fmtTime(m.startTime)}</div><div className="text-xs text-mute">{relDay(m.startTime)}</div></>}
        </div>
        <Side t={A} side="away" />
      </div>
      {m.result && m.status !== 'SCHEDULED' && <p className="mt-4 truncate text-center text-xs text-mute">{m.result}</p>}
      <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-mute"><MapPin size={13} />{m.venue || 'TBC'}</span>
        <Link to={`/match/${m._id}`} className="flex shrink-0 items-center gap-1 text-xs font-bold uppercase tracking-wider text-lime hover:underline">View match <ArrowRight size={14} /></Link>
      </div>
    </div>
  );
}

// Compact row used in lists (fixtures, results)
export function MatchRow({ match: m, showComp = true }) {
  const H = m.homeTeamId, A = m.awayTeamId;
  const Team = ({ t, side }) => (
    <div className={`flex min-w-0 items-center gap-2.5 ${side === 'home' ? 'justify-end text-right' : ''} ${m.status === 'COMPLETED' && !winner(m, side) ? 'text-mute' : ''}`}>
      {side === 'away' && <Crest item={t} size={28} />}
      <span className="truncate text-sm font-semibold"><span className="hidden sm:inline">{t?.name}</span><span className="sm:hidden">{t?.shortName}</span></span>
      {side === 'home' && <Crest item={t} size={28} />}
    </div>
  );
  return (
    <Link to={`/match/${m._id}`} className="grid grid-cols-[64px_1fr_auto_1fr] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-bg2 sm:grid-cols-[88px_1fr_96px_1fr_150px]">
      <div className="text-xs">
        {m.status === 'SCHEDULED' ? <><div className="font-semibold tabular-nums">{fmtTime(m.startTime)}</div><div className="text-mute">{relDay(m.startTime)}</div></> : <StatusBadge match={m} />}
      </div>
      <Team t={H} side="home" />
      <div className="score min-w-[72px] rounded-lg bg-bg2 px-2 py-1 text-center text-lg">
        {hasScore(m) ? <>{scoreLabel(m, 'home')}<span className="mx-1 text-mute">-</span>{scoreLabel(m, 'away')}</> : <span className="text-sm text-mute">vs</span>}
      </div>
      <Team t={A} side="away" />
      {showComp && <span className="hidden truncate text-right text-xs text-mute sm:block">{m.competitionId?.name}</span>}
    </Link>
  );
}

export function MatchList({ matches, grouped = false, showComp }) {
  if (!grouped) return <div className="card divide-y divide-line overflow-hidden">{matches.map((m) => <MatchRow key={m._id} match={m} showComp={showComp} />)}</div>;
  return (
    <div className="space-y-6">
      {Object.entries(groupByDay(matches)).map(([d, list]) => (
        <div key={d}>
          <h3 className="eyebrow mb-2 px-1">{d}</h3>
          <div className="card divide-y divide-line overflow-hidden">{list.map((m) => <MatchRow key={m._id} match={m} showComp={showComp} />)}</div>
        </div>
      ))}
    </div>
  );
}
