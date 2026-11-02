import { Competition, Team, Match } from '../models/index.js';
import { HttpError } from '../middleware/error.js';

// League table derived purely from COMPLETED matches in the competition.
export async function computeStandings(competitionId) {
  const comp = await Competition.findById(competitionId).populate('sportId', 'slug');
  if (!comp) throw new HttpError(404, 'Competition not found');
  const football = comp.sportId?.slug === 'football';
  const [teams, matches] = await Promise.all([
    Team.find({ competitionIds: comp._id }).select('name shortName logo color'),
    Match.find({ competitionId: comp._id, status: 'COMPLETED' }).sort({ startTime: 1 }).populate('homeTeamId awayTeamId', 'name shortName logo color'),
  ]);

  const rows = new Map();
  const row = (t) => {
    const k = String(t._id);
    if (!rows.has(k)) rows.set(k, { team: t, played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, diff: 0, points: 0, form: [] });
    return rows.get(k);
  };
  teams.forEach(row);

  for (const m of matches) {
    if (!m.homeTeamId || !m.awayTeamId) continue;
    const h = row(m.homeTeamId), a = row(m.awayTeamId);
    const hs = m.homeScore, as = m.awayScore;
    h.played++; a.played++;
    h.for += hs; h.against += as; a.for += as; a.against += hs;
    if (hs > as) { h.won++; a.lost++; h.form.push('W'); a.form.push('L'); }
    else if (hs < as) { a.won++; h.lost++; a.form.push('W'); h.form.push('L'); }
    else { h.drawn++; a.drawn++; h.form.push('D'); a.form.push('D'); }
  }

  const table = [...rows.values()].map((r) => ({
    ...r,
    diff: r.for - r.against,
    points: football ? r.won * 3 + r.drawn : r.won * 2 + r.drawn,
    form: r.form.slice(-5),
  }));
  table.sort((x, y) => y.points - x.points || y.diff - x.diff || y.for - x.for || x.team.name.localeCompare(y.team.name));
  return { competition: comp, sport: comp.sportId?.slug, table: table.map((r, i) => ({ position: i + 1, ...r })) };
}
