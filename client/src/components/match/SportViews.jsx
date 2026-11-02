import { useState } from 'react';
import { ArrowLeftRight, CircleDot, Square } from 'lucide-react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Empty, Tabs } from '../ui';
import { runRate } from '../../utils/format';

const LIME = '#C5F36A', MUTE = '#5B6560';

// Head-to-head comparison bar: home value left, away value right
export function StatBar({ label, home = 0, away = 0, suffix = '' }) {
  const total = home + away || 1;
  const hw = home >= away;
  return (
    <div className="py-2.5">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className={`score text-lg ${hw ? 'text-ink' : 'text-mute'}`}>{home}{suffix}</span>
        <span className="text-xs font-medium uppercase tracking-wider text-mute">{label}</span>
        <span className={`score text-lg ${!hw || home === away ? 'text-ink' : 'text-mute'}`}>{away}{suffix}</span>
      </div>
      <div className="flex gap-1.5">
        <div className="flex h-1.5 flex-1 justify-end overflow-hidden rounded-full bg-bg2"><div className="rounded-full" style={{ width: `${(home / total) * 100}%`, background: hw ? LIME : MUTE }} /></div>
        <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-bg2"><div className="rounded-full" style={{ width: `${(away / total) * 100}%`, background: !hw || home === away ? LIME : MUTE }} /></div>
      </div>
    </div>
  );
}

const chartTip = { contentStyle: { background: '#171C1A', border: '1px solid #303832', borderRadius: 12, fontSize: 12 }, cursor: { fill: 'rgba(255,255,255,0.03)' } };
const noStats = <Empty title="No statistics yet" text="Statistics appear once the match is under way." />;

/* ================= FOOTBALL ================= */
const EVENT = {
  GOAL: { icon: CircleDot, cls: 'text-lime', label: 'Goal' },
  YELLOW: { icon: Square, cls: 'text-yellow-300 fill-yellow-300', label: 'Yellow card' },
  RED: { icon: Square, cls: 'text-live fill-live', label: 'Red card' },
  SUB: { icon: ArrowLeftRight, cls: 'text-sky-300', label: 'Substitution' },
};

export function FootballView({ m }) {
  const [tab, setTab] = useState('Overview');
  const s = m.matchStatistics || {};
  const H = m.homeTeamId, A = m.awayTeamId;
  const has = !!s.possession;
  const goals = (side) => (m.timeline || []).filter((e) => e.type === 'GOAL' && e.team === side);
  return (
    <>
      <Tabs tabs={['Overview', 'Statistics', 'Timeline', 'Lineups']} value={tab} onChange={setTab} />
      <div className="pt-8">
        {tab === 'Overview' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-6">
              <h3 className="eyebrow mb-4">Score summary</h3>
              <div className="grid grid-cols-2 gap-6 text-sm">
                {['home', 'away'].map((side) => (
                  <div key={side} className={side === 'away' ? 'text-right' : ''}>
                    <p className="mb-2 font-semibold">{(side === 'home' ? H : A).name}</p>
                    {goals(side).length ? goals(side).map((g, i) => <p key={i} className="text-mute"><CircleDot size={12} className="mr-1 inline text-lime" />{g.player} <span className="tabular-nums">{g.minute}'</span></p>) : <p className="text-mute">—</p>}
                  </div>
                ))}
              </div>
              {m.result && <p className="mt-6 border-t border-line pt-4 text-sm"><span className="text-mute">Result: </span>{m.result}</p>}
            </div>
            <div className="card p-6">
              <h3 className="eyebrow mb-2">Possession</h3>
              {has ? (
                <div className="flex items-center gap-6">
                  <div className="h-40 w-40 shrink-0">
                    <ResponsiveContainer><PieChart><Pie data={[{ name: H.shortName, value: s.possession[0] }, { name: A.shortName, value: s.possession[1] }]} dataKey="value" innerRadius={48} outerRadius={70} stroke="none" startAngle={90} endAngle={-270}><Cell fill={LIME} /><Cell fill={MUTE} /></Pie><Tooltip {...chartTip} /></PieChart></ResponsiveContainer>
                  </div>
                  <div className="space-y-3 text-sm">
                    <p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-lime" />{H.name} <b className="score ml-1 text-lg">{s.possession[0]}%</b></p>
                    <p><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: MUTE }} />{A.name} <b className="score ml-1 text-lg">{s.possession[1]}%</b></p>
                  </div>
                </div>
              ) : <p className="text-sm text-mute">Available once the match starts.</p>}
            </div>
          </div>
        )}
        {tab === 'Statistics' && (has ? (
          <div className="card mx-auto max-w-2xl p-6">
            <div className="mb-3 flex justify-between text-xs font-bold uppercase tracking-wider text-mute"><span>{H.shortName}</span><span>{A.shortName}</span></div>
            <StatBar label="Possession" home={s.possession[0]} away={s.possession[1]} suffix="%" />
            {[['Total shots', 'shots'], ['Shots on target', 'shotsOnTarget'], ['Corners', 'corners'], ['Fouls', 'fouls'], ['Offsides', 'offsides'], ['Yellow cards', 'yellowCards'], ['Red cards', 'redCards']]
              .filter(([, k]) => s[k]).map(([l, k]) => <StatBar key={k} label={l} home={s[k][0]} away={s[k][1]} />)}
          </div>
        ) : noStats)}
        {tab === 'Timeline' && ((m.timeline || []).length ? (
          <div className="card mx-auto max-w-2xl p-4 sm:p-6">
            <ol className="relative space-y-1">
              {m.timeline.map((e, i) => {
                const ev = EVENT[e.type] || EVENT.GOAL;
                const home = e.team === 'home';
                return (
                  <li key={i} className={`flex items-center gap-3 rounded-xl px-2 py-2.5 ${home ? '' : 'flex-row-reverse text-right'}`}>
                    <span className="score w-10 shrink-0 text-center text-base text-mute">{e.minute}'</span>
                    <ev.icon size={16} className={`shrink-0 ${ev.cls}`} />
                    <div className="min-w-0 text-sm">
                      <p className="font-semibold">{e.player}{e.type === 'GOAL' && <span className="ml-2 text-xs font-bold text-lime">GOAL</span>}</p>
                      <p className="truncate text-xs text-mute">
                        {e.type === 'GOAL' && (e.assist ? `Assist: ${e.assist}` : 'Unassisted')}
                        {e.type === 'SUB' && `Replaces ${e.playerOut}`}
                        {['YELLOW', 'RED'].includes(e.type) && ev.label}
                        {' · '}{home ? H.shortName : A.shortName}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : <Empty title="No events yet" />)}
        {tab === 'Lineups' && (m.lineups?.home ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[['home', H], ['away', A]].map(([side, t]) => {
              const l = m.lineups[side];
              return (
                <div key={side} className="card p-6">
                  <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">{t.name}</h3><span className="score rounded-lg bg-lime/10 px-2.5 py-1 text-lime">{l.formation}</span></div>
                  <p className="eyebrow mb-2">Starting XI</p>
                  <ul className="mb-5 divide-y divide-line/60 text-sm">{l.starting.map((p) => <li key={p.name + p.number} className="flex items-center gap-3 py-2"><span className="score w-6 text-mute">{p.number}</span><span className="flex-1">{p.name}</span><span className="text-xs text-mute">{p.position}</span></li>)}</ul>
                  <p className="eyebrow mb-2">Substitutes</p>
                  <ul className="divide-y divide-line/60 text-sm text-mute">{l.subs.map((p) => <li key={p.name + p.number} className="flex items-center gap-3 py-2"><span className="score w-6">{p.number}</span><span className="flex-1">{p.name}</span><span className="text-xs">{p.position}</span></li>)}</ul>
                </div>
              );
            })}
          </div>
        ) : <Empty title="Lineups not announced" text="Lineups are usually confirmed an hour before kickoff." />)}
      </div>
    </>
  );
}

/* ================= CRICKET ================= */
export function CricketView({ m }) {
  const inns = m.matchStatistics?.innings || [];
  const [tab, setTab] = useState('Overview');
  const team = (side) => (side === 'home' ? m.homeTeamId : m.awayTeamId);
  if (!inns.length) return <Empty title="Match not started" text="The scorecard will appear when play begins." />;
  return (
    <>
      <Tabs tabs={['Overview', ...inns.map((i) => `${team(i.team).shortName} innings`)]} value={tab} onChange={setTab} />
      <div className="pt-8">
        {tab === 'Overview' ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-6">
              <h3 className="eyebrow mb-4">Innings summary</h3>
              {inns.map((i) => (
                <div key={i.team} className="flex items-center justify-between border-b border-line/60 py-3 last:border-0">
                  <span className="font-semibold">{team(i.team).name}</span>
                  <span className="text-right"><span className="score text-2xl">{i.runs}/{i.wickets}</span><span className="ml-2 text-xs text-mute">({i.overs} ov · RR {runRate(i.runs, i.overs)})</span></span>
                </div>
              ))}
              {m.matchStatistics.toss && <p className="mt-4 text-xs text-mute">Toss: {m.matchStatistics.toss} · Format: {m.matchStatistics.format}</p>}
              {m.result && <p className="mt-4 rounded-xl bg-lime/10 px-4 py-3 text-sm font-semibold text-lime">{m.result}</p>}
            </div>
            <div className="card p-6">
              <h3 className="eyebrow mb-4">Runs & wickets</h3>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={inns.map((i) => ({ name: team(i.team).shortName, Runs: i.runs, Wickets: i.wickets, Extras: i.extras }))}>
                    <XAxis dataKey="name" stroke="#929A91" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#929A91" fontSize={12} tickLine={false} axisLine={false} width={32} />
                    <Tooltip {...chartTip} /><Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Runs" fill={LIME} radius={[6, 6, 0, 0]} /><Bar dataKey="Extras" fill={MUTE} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (() => {
          const i = inns.find((x) => tab.startsWith(team(x.team).shortName + ' '));
          if (!i) return null;
          return (
            <div className="space-y-6">
              <div className="card overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead><tr className="border-b border-line text-[11px] uppercase tracking-wider text-mute"><th className="py-3 pl-4 text-left">Batter</th><th className="text-left"></th><th>R</th><th>B</th><th>4s</th><th>6s</th><th className="pr-4">SR</th></tr></thead>
                  <tbody>{i.batting.map((b) => (
                    <tr key={b.name} className="border-b border-line/60 text-center tabular-nums last:border-0">
                      <td className="py-2.5 pl-4 text-left font-semibold">{b.name}</td><td className="text-left text-xs text-mute">{b.how}</td>
                      <td className="font-display text-base font-bold">{b.r}</td><td className="text-mute">{b.b}</td><td className="text-mute">{b.fours}</td><td className="text-mute">{b.sixes}</td><td className="pr-4 text-mute">{((b.r / b.b) * 100).toFixed(1)}</td>
                    </tr>))}
                  </tbody>
                </table>
                <div className="flex justify-between border-t border-line px-4 py-3 text-sm"><span className="text-mute">Extras {i.extras}</span><span className="font-semibold">Total {i.runs}/{i.wickets} ({i.overs} ov)</span></div>
              </div>
              <div className="card overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead><tr className="border-b border-line text-[11px] uppercase tracking-wider text-mute"><th className="py-3 pl-4 text-left">Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th className="pr-4">Econ</th></tr></thead>
                  <tbody>{i.bowling.map((b) => (
                    <tr key={b.name} className="border-b border-line/60 text-center tabular-nums last:border-0">
                      <td className="py-2.5 pl-4 text-left font-semibold">{b.name}</td><td className="text-mute">{b.o}</td><td className="text-mute">{b.m}</td><td className="text-mute">{b.r}</td><td className="font-display text-base font-bold text-lime">{b.w}</td><td className="pr-4 text-mute">{runRate(b.r, b.o)}</td>
                    </tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
}

/* ================= BASKETBALL ================= */
export function BasketballView({ m }) {
  const s = m.matchStatistics || {};
  const [tab, setTab] = useState('Overview');
  const H = m.homeTeamId, A = m.awayTeamId;
  if (!s.quarters) return <Empty title="Game not started" text="Box score appears at tip-off." />;
  const n = Math.max(4, s.quarters.home.length);
  const data = Array.from({ length: s.quarters.home.length }, (_, i) => ({ q: `Q${i + 1}`, [H.shortName]: s.quarters.home[i], [A.shortName]: s.quarters.away[i] }));
  return (
    <>
      <Tabs tabs={['Overview', 'Statistics']} value={tab} onChange={setTab} />
      <div className="pt-8">
        {tab === 'Overview' ? (
          <div className="space-y-6">
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead><tr className="border-b border-line text-[11px] uppercase tracking-wider text-mute"><th className="py-3 pl-4 text-left">Team</th>{Array.from({ length: n }, (_, i) => <th key={i}>Q{i + 1}</th>)}<th className="pr-4 text-ink">T</th></tr></thead>
                <tbody>{[['home', H, m.homeScore], ['away', A, m.awayScore]].map(([side, t, tot]) => (
                  <tr key={side} className="border-b border-line/60 text-center tabular-nums last:border-0">
                    <td className="py-3 pl-4 text-left font-semibold">{t.name}</td>
                    {Array.from({ length: n }, (_, i) => <td key={i} className="text-mute">{s.quarters[side][i] ?? '–'}</td>)}
                    <td className="score pr-4 text-xl">{tot}</td>
                  </tr>))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card p-6">
                <h3 className="eyebrow mb-4">Points by quarter</h3>
                <div className="h-56">
                  <ResponsiveContainer>
                    <BarChart data={data}>
                      <XAxis dataKey="q" stroke="#929A91" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#929A91" fontSize={12} tickLine={false} axisLine={false} width={28} />
                      <Tooltip {...chartTip} /><Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey={H.shortName} fill={LIME} radius={[6, 6, 0, 0]} /><Bar dataKey={A.shortName} fill={MUTE} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {s.leaders && (
                <div className="card p-6">
                  <h3 className="eyebrow mb-4">Top performers</h3>
                  {[['home', H], ['away', A]].map(([side, t]) => (
                    <div key={side} className="flex items-center justify-between border-b border-line/60 py-3 last:border-0">
                      <div><p className="font-semibold">{s.leaders[side].name}</p><p className="text-xs text-mute">{t.name}</p></div>
                      <div className="flex gap-4 text-center">{[['PTS', 'pts'], ['REB', 'reb'], ['AST', 'ast']].map(([l, k]) => <div key={k}><p className="score text-xl">{s.leaders[side][k]}</p><p className="text-[10px] text-mute">{l}</p></div>)}</div>
                    </div>
                  ))}
                  {m.result && <p className="mt-4 rounded-xl bg-lime/10 px-4 py-3 text-sm font-semibold text-lime">{m.result}</p>}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card mx-auto max-w-2xl p-6">
            <div className="mb-3 flex justify-between text-xs font-bold uppercase tracking-wider text-mute"><span>{H.shortName}</span><span>{A.shortName}</span></div>
            <StatBar label="Total points" home={m.homeScore} away={m.awayScore} />
            {[['Rebounds', 'rebounds'], ['Assists', 'assists'], ['Three pointers', 'threePointers'], ['Turnovers', 'turnovers'], ['Fouls', 'fouls']]
              .filter(([, k]) => s[k]).map(([l, k]) => <StatBar key={k} label={l} home={s[k][0]} away={s[k][1]} />)}
            {s.fieldGoalPct && <StatBar label="Field goal %" home={s.fieldGoalPct[0]} away={s.fieldGoalPct[1]} suffix="%" />}
          </div>
        )}
      </div>
    </>
  );
}
