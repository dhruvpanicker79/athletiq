import { Link } from 'react-router-dom';
import { Crest } from './ui';

const FORM = { W: 'bg-lime text-bg', D: 'bg-mute/40 text-ink', L: 'bg-live/80 text-white' };

export default function StandingsTable({ table, sport = 'football', compact = false, highlight = [] }) {
  const football = sport === 'football';
  const cols = football
    ? [['P', 'played'], ['W', 'won'], ['D', 'drawn'], ['L', 'lost'], ['GD', 'diff']]
    : [['P', 'played'], ['W', 'won'], ['L', 'lost'], [sport === 'cricket' ? 'RD' : 'PD', 'diff']];
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wider text-mute">
            <th className="w-10 py-3 pl-4 text-left">#</th>
            <th className="py-3 text-left">Team</th>
            {cols.map(([h, k]) => <th key={k} className={`w-10 py-3 text-center ${compact && k !== 'played' && k !== 'diff' ? 'hidden sm:table-cell' : ''}`}>{h}</th>)}
            <th className="w-12 py-3 pr-4 text-center text-ink">Pts</th>
            {!compact && <th className="hidden py-3 pr-4 text-left md:table-cell">Form</th>}
          </tr>
        </thead>
        <tbody>
          {table.map((r) => (
            <tr key={r.team._id} className={`border-b border-line/60 last:border-0 hover:bg-bg2 ${highlight.includes(String(r.team._id)) ? 'bg-lime/5' : ''}`}>
              <td className="py-2.5 pl-4">
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold tabular-nums ${r.position <= (football ? 4 : 2) ? 'bg-lime/15 text-lime' : 'text-mute'}`}>{r.position}</span>
              </td>
              <td className="py-2.5">
                <Link to={`/team/${r.team._id}`} className="flex items-center gap-2.5 font-semibold hover:text-lime">
                  <Crest item={r.team} size={24} /><span className="truncate">{compact ? r.team.shortName : r.team.name}</span>
                </Link>
              </td>
              {cols.map(([, k]) => (
                <td key={k} className={`py-2.5 text-center tabular-nums text-mute ${compact && k !== 'played' && k !== 'diff' ? 'hidden sm:table-cell' : ''}`}>{k === 'diff' && r[k] > 0 ? `+${r[k]}` : r[k]}</td>
              ))}
              <td className="py-2.5 pr-4 text-center font-display text-base font-bold tabular-nums">{r.points}</td>
              {!compact && (
                <td className="hidden py-2.5 pr-4 md:table-cell">
                  <div className="flex gap-1">{r.form.map((f, i) => <span key={i} className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${FORM[f]}`}>{f}</span>)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
