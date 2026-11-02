import { Match, Team, Competition, User } from '../models/index.js';
import { HttpError, ah } from '../middleware/error.js';
import { escapeRe, isId, paginate, sorting, sportId, log } from '../services/query.js';

export const MATCH_POP = [
  { path: 'sportId', select: 'name slug' },
  { path: 'competitionId', select: 'name shortName logo color season country' },
  { path: 'homeTeamId', select: 'name shortName logo color' },
  { path: 'awayTeamId', select: 'name shortName logo color' },
];

async function buildFilter(q) {
  const f = {};
  if (q.sport) f.sportId = await sportId(q.sport);
  if (isId(q.competition)) f.competitionId = q.competition;
  if (typeof q.status === 'string') f.status = { $in: q.status.toUpperCase().split(',').slice(0, 5) };
  const or = [];
  if (isId(q.team)) or.push({ homeTeamId: q.team }, { awayTeamId: q.team });
  if (q.q) {
    const ids = await Team.find({ $or: [{ name: { $regex: escapeRe(q.q), $options: 'i' } }, { shortName: { $regex: escapeRe(q.q), $options: 'i' } }] }).distinct('_id');
    if (or.length) f.$and = [{ $or: or }, { $or: [{ homeTeamId: { $in: ids } }, { awayTeamId: { $in: ids } }] }];
    else or.push({ homeTeamId: { $in: ids } }, { awayTeamId: { $in: ids } });
  }
  if (or.length && !f.$and) f.$or = or;
  // ?date=YYYY-MM-DD (with ?tz offset in minutes from the browser) or ?from/&to
  const tz = Number.isFinite(+q.tz) ? +q.tz : 0;
  if (typeof q.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.date)) {
    const start = new Date(Date.parse(q.date + 'T00:00:00Z') + tz * 60000);
    f.startTime = { $gte: start, $lt: new Date(start.getTime() + 86400000) };
  } else if (q.from || q.to) {
    f.startTime = {};
    if (q.from && !isNaN(Date.parse(q.from))) f.startTime.$gte = new Date(q.from);
    if (q.to && !isNaN(Date.parse(q.to))) f.startTime.$lte = new Date(q.to);
  }
  return f;
}

const SORTABLE = ['startTime', 'createdAt', 'updatedAt', 'status'];
const lister = (preset, defSort) => ah(async (req, res) => {
  const filter = { ...(await buildFilter(req.query)), ...preset };
  const sort = sorting(req.query.sort, SORTABLE, defSort);
  res.json(await paginate(Match, filter, req.query, { sort, populate: MATCH_POP, defLimit: 20 }));
});

export const listMatches = lister({}, { startTime: -1 });
export const liveMatches = lister({ status: 'LIVE' }, { startTime: 1 });
export const upcomingMatches = lister({ status: 'SCHEDULED' }, { startTime: 1 });
export const resultMatches = lister({ status: 'COMPLETED' }, { startTime: -1 });

export const getMatch = ah(async (req, res) => {
  const match = await Match.findById(req.params.id).populate(MATCH_POP);
  if (!match) throw new HttpError(404, 'Match not found');
  if (req.user) {
    // Track recently viewed (deduped, newest first, max 10)
    await User.updateOne({ _id: req.user._id }, { $pull: { recentlyViewed: match._id } });
    await User.updateOne({ _id: req.user._id }, { $push: { recentlyViewed: { $each: [match._id], $position: 0, $slice: 10 } } });
  }
  const h2h = await Match.find({
    _id: { $ne: match._id }, status: 'COMPLETED',
    $or: [{ homeTeamId: match.homeTeamId._id, awayTeamId: match.awayTeamId._id }, { homeTeamId: match.awayTeamId._id, awayTeamId: match.homeTeamId._id }],
  }).sort({ startTime: -1 }).limit(5).populate(MATCH_POP);
  res.json({ ...match.toJSON(), headToHead: h2h });
});

// Server-side integrity checks — never trust the client
async function checkMatch(d) {
  if (String(d.homeTeamId) === String(d.awayTeamId)) throw new HttpError(400, 'Home and away teams must be different');
  const comp = await Competition.findById(d.competitionId);
  if (!comp) throw new HttpError(400, 'Competition does not exist');
  if (String(comp.sportId) !== String(d.sportId)) throw new HttpError(400, 'Competition does not belong to the selected sport');
  const teams = await Team.find({ _id: { $in: [d.homeTeamId, d.awayTeamId] }, sportId: d.sportId });
  if (teams.length !== 2) throw new HttpError(400, 'Both teams must exist and play the selected sport');
  if (d.status === 'SCHEDULED' && (d.homeScore > 0 || d.awayScore > 0)) throw new HttpError(400, 'A scheduled match cannot have a score');
  if (d.sportId && d.matchStatistics) {
    const ms = d.matchStatistics;
    if (ms.possession && (ms.possession.length !== 2 || ms.possession[0] + ms.possession[1] !== 100)) throw new HttpError(400, 'Possession must add up to 100');
  }
}

export const createMatch = ah(async (req, res) => {
  await checkMatch(req.body);
  const m = await Match.create({ ...req.body, isDemo: false });
  log(req.user, 'MATCH_CREATED', String(m._id));
  res.status(201).json(await m.populate(MATCH_POP));
});

export const updateMatch = ah(async (req, res) => {
  const m = await Match.findById(req.params.id);
  if (!m) throw new HttpError(404, 'Match not found');
  const merged = { ...m.toObject(), ...req.body };
  await checkMatch(merged);
  const prev = `${m.homeScore}-${m.awayScore} ${m.status}`;
  Object.assign(m, req.body);
  await m.save();
  await m.populate(MATCH_POP);
  log(req.user, 'MATCH_UPDATED', `${m.homeTeamId.shortName} v ${m.awayTeamId.shortName}: ${prev} → ${m.homeScore}-${m.awayScore} ${m.status}`);
  res.json(m);
});

export const deleteMatch = ah(async (req, res) => {
  const m = await Match.findByIdAndDelete(req.params.id);
  if (!m) throw new HttpError(404, 'Match not found');
  await User.updateMany({}, { $pull: { recentlyViewed: m._id } });
  log(req.user, 'MATCH_DELETED', String(m._id));
  res.status(204).end();
});
