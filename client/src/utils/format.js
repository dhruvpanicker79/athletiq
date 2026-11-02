const day = (d) => new Date(d).toDateString();

export const localISODate = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
export const tz = () => new Date().getTimezoneOffset();
export const addDays = (n, d = new Date()) => new Date(new Date(d).getTime() + n * 86400000);

export const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
export const fmtDate = (d) => new Date(d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtLong = (d) => new Date(d).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const relDay = (d) => {
  if (day(d) === day(new Date())) return 'Today';
  if (day(d) === day(addDays(1))) return 'Tomorrow';
  if (day(d) === day(addDays(-1))) return 'Yesterday';
  return fmtDate(d);
};
export const timeAgo = (d) => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export const sportOf = (m) => m?.sportId?.slug || 'football';
export const hasScore = (m) => ['LIVE', 'COMPLETED'].includes(m?.status);

// Score label per sport: cricket shows runs/wickets, others plain numbers
export function scoreLabel(m, side) {
  if (!hasScore(m)) return '';
  if (sportOf(m) === 'cricket') {
    const inn = m.matchStatistics?.innings?.find((i) => i.team === side);
    return inn ? `${inn.runs}/${inn.wickets}` : side === 'home' ? m.homeScore : m.awayScore;
  }
  return side === 'home' ? m.homeScore : m.awayScore;
}

export const groupByDay = (matches) => matches.reduce((acc, m) => {
  const k = relDay(m.startTime);
  (acc[k] ||= []).push(m);
  return acc;
}, {});

export const ballsOf = (ov) => { const [o, b = 0] = String(ov).split('.').map(Number); return o * 6 + b; };
export const runRate = (runs, overs) => { const b = ballsOf(overs); return b ? ((runs * 6) / b).toFixed(2) : '0.00'; };
