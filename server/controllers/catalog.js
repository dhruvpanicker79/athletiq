// Sports, competitions, teams and players
import { Sport, Competition, Team, Player, Match, User } from '../models/index.js';
import { HttpError, ah } from '../middleware/error.js';
import { escapeRe, isId, paginate, sorting, sportId, log } from '../services/query.js';
import { computeStandings } from '../services/standings.js';

const MATCH_POP = [
  { path: 'competitionId', select: 'name shortName logo color season' },
  { path: 'homeTeamId', select: 'name shortName logo color' },
  { path: 'awayTeamId', select: 'name shortName logo color' },
  { path: 'sportId', select: 'name slug' },
];
const recent = (filter, status, dir, limit = 6) => Match.find({ ...filter, status }).sort({ startTime: dir }).limit(limit).populate(MATCH_POP);

/* ---------- Sports ---------- */
export const listSports = ah(async (req, res) => res.json(await Sport.find().sort({ name: 1 })));
export const getSport = ah(async (req, res) => {
  const sport = await Sport.findOne(isId(req.params.id) ? { _id: req.params.id } : { slug: req.params.id });
  if (!sport) throw new HttpError(404, 'Sport not found');
  const competitions = await Competition.find({ sportId: sport._id }).sort({ name: 1 });
  res.json({ ...sport.toJSON(), competitions });
});
export const createSport = ah(async (req, res) => { const s = await Sport.create(req.body); log(req.user, 'SPORT_CREATED', s.name); res.status(201).json(s); });
export const updateSport = ah(async (req, res) => {
  const s = await Sport.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!s) throw new HttpError(404, 'Sport not found');
  res.json(s);
});
export const deleteSport = ah(async (req, res) => {
  if (await Competition.exists({ sportId: req.params.id })) throw new HttpError(409, 'Delete this sport’s competitions first');
  const s = await Sport.findByIdAndDelete(req.params.id);
  if (!s) throw new HttpError(404, 'Sport not found');
  res.status(204).end();
});

/* ---------- Competitions ---------- */
export const listCompetitions = ah(async (req, res) => {
  const filter = {};
  if (req.query.q) filter.name = { $regex: escapeRe(req.query.q), $options: 'i' };
  if (req.query.sport) filter.sportId = await sportId(req.query.sport);
  const sort = sorting(req.query.sort, ['name', 'country', 'season', 'createdAt'], { name: 1 });
  res.json(await paginate(Competition, filter, req.query, { sort, populate: { path: 'sportId', select: 'name slug' }, defLimit: 50 }));
});

export const getCompetition = ah(async (req, res) => {
  const comp = await Competition.findById(req.params.id).populate('sportId', 'name slug');
  if (!comp) throw new HttpError(404, 'Competition not found');
  const f = { competitionId: comp._id };
  const [teams, upcoming, results, live] = await Promise.all([
    Team.find({ competitionIds: comp._id }).sort({ name: 1 }).select('name shortName logo color country'),
    recent(f, 'SCHEDULED', 1), recent(f, 'COMPLETED', -1), recent(f, 'LIVE', 1),
  ]);
  res.json({ ...comp.toJSON(), teams, upcoming, results, live });
});

export const standings = ah(async (req, res) => {
  const { competition, sport, table } = await computeStandings(req.params.id);
  res.json({ competition: { _id: competition._id, name: competition.name, season: competition.season }, sport, table });
});

async function checkSport(id) { if (!(await Sport.exists({ _id: id }))) throw new HttpError(400, 'Sport does not exist'); }

export const createCompetition = ah(async (req, res) => {
  await checkSport(req.body.sportId);
  const c = await Competition.create(req.body);
  log(req.user, 'COMPETITION_CREATED', c.name);
  res.status(201).json(c);
});
export const updateCompetition = ah(async (req, res) => {
  if (req.body.sportId) await checkSport(req.body.sportId);
  const c = await Competition.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!c) throw new HttpError(404, 'Competition not found');
  log(req.user, 'COMPETITION_UPDATED', c.name);
  res.json(c);
});
export const deleteCompetition = ah(async (req, res) => {
  const c = await Competition.findByIdAndDelete(req.params.id);
  if (!c) throw new HttpError(404, 'Competition not found');
  await Promise.all([
    Match.deleteMany({ competitionId: c._id }),
    Team.updateMany({}, { $pull: { competitionIds: c._id } }),
    User.updateMany({}, { $pull: { favoriteCompetitions: c._id } }),
  ]);
  log(req.user, 'COMPETITION_DELETED', c.name);
  res.status(204).end();
});

/* ---------- Teams ---------- */
export const listTeams = ah(async (req, res) => {
  const filter = {};
  if (req.query.q) filter.$or = [{ name: { $regex: escapeRe(req.query.q), $options: 'i' } }, { shortName: { $regex: escapeRe(req.query.q), $options: 'i' } }];
  if (req.query.sport) filter.sportId = await sportId(req.query.sport);
  if (isId(req.query.competition)) filter.competitionIds = req.query.competition;
  const sort = sorting(req.query.sort, ['name', 'country', 'createdAt'], { name: 1 });
  res.json(await paginate(Team, filter, req.query, { sort, defLimit: 50, populate: [{ path: 'sportId', select: 'name slug' }, { path: 'competitionIds', select: 'name shortName' }] }));
});

export const getTeam = ah(async (req, res) => {
  const team = await Team.findById(req.params.id).populate('sportId', 'name slug').populate('competitionIds', 'name shortName logo color season format');
  if (!team) throw new HttpError(404, 'Team not found');
  const f = { $or: [{ homeTeamId: team._id }, { awayTeamId: team._id }] };
  const league = team.competitionIds.find((c) => c.format === 'LEAGUE');
  const [players, upcoming, results, live, table] = await Promise.all([
    Player.find({ teamId: team._id }).sort({ number: 1 }),
    recent(f, 'SCHEDULED', 1, 5), recent(f, 'COMPLETED', -1, 5), recent(f, 'LIVE', 1, 2),
    league ? computeStandings(league._id) : null,
  ]);
  const pos = table?.table.find((r) => String(r.team._id) === String(team._id));
  res.json({ ...team.toJSON(), players, upcoming, results, live, leaguePosition: pos ? { competition: league.name, competitionId: league._id, position: pos.position, points: pos.points, played: pos.played } : null });
});

async function checkTeam(body) {
  await checkSport(body.sportId);
  if (body.competitionIds?.length) {
    const n = await Competition.countDocuments({ _id: { $in: body.competitionIds }, sportId: body.sportId });
    if (n !== body.competitionIds.length) throw new HttpError(400, 'Competitions must exist and belong to the team’s sport');
  }
}
export const createTeam = ah(async (req, res) => {
  await checkTeam(req.body);
  const t = await Team.create(req.body);
  log(req.user, 'TEAM_CREATED', t.name);
  res.status(201).json(t);
});
export const updateTeam = ah(async (req, res) => {
  const existing = await Team.findById(req.params.id);
  if (!existing) throw new HttpError(404, 'Team not found');
  await checkTeam({ sportId: String(existing.sportId), ...req.body });
  Object.assign(existing, req.body);
  await existing.save();
  log(req.user, 'TEAM_UPDATED', existing.name);
  res.json(existing);
});
export const deleteTeam = ah(async (req, res) => {
  const t = await Team.findById(req.params.id);
  if (!t) throw new HttpError(404, 'Team not found');
  if (await Match.exists({ $or: [{ homeTeamId: t._id }, { awayTeamId: t._id }] })) throw new HttpError(409, 'This team has matches — delete them first');
  await Promise.all([t.deleteOne(), Player.deleteMany({ teamId: t._id }), User.updateMany({}, { $pull: { favoriteTeams: t._id } })]);
  log(req.user, 'TEAM_DELETED', t.name);
  res.status(204).end();
});

/* ---------- Players ---------- */
export const listPlayers = ah(async (req, res) => {
  const filter = {};
  if (isId(req.query.team)) filter.teamId = req.query.team;
  if (req.query.q) filter.name = { $regex: escapeRe(req.query.q), $options: 'i' };
  res.json(await paginate(Player, filter, req.query, { sort: { name: 1 }, populate: { path: 'teamId', select: 'name shortName logo color' } }));
});
export const getPlayer = ah(async (req, res) => {
  const p = await Player.findById(req.params.id).populate({ path: 'teamId', select: 'name shortName logo color country sportId', populate: { path: 'sportId', select: 'name slug' } });
  if (!p) throw new HttpError(404, 'Player not found');
  res.json(p);
});
