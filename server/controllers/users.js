import bcrypt from 'bcryptjs';
import { User, Team, Competition, Sport, Match, Activity } from '../models/index.js';
import { HttpError, ah } from '../middleware/error.js';
import { escapeRe, isId, paginate, log } from '../services/query.js';
import { MATCH_POP } from './matches.js';

const FAV = { team: ['favoriteTeams', Team], competition: ['favoriteCompetitions', Competition], sport: ['favoriteSports', Sport] };

// Every route below acts only on req.user — ownership is enforced by never taking a user id from the client.
export const getMe = ah(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('favoriteTeams', 'name shortName logo color country')
    .populate('favoriteCompetitions', 'name shortName logo color season country')
    .populate('favoriteSports', 'name slug')
    .populate({ path: 'recentlyViewed', populate: MATCH_POP });
  const teamIds = user.favoriteTeams.map((t) => t._id);
  const teamFilter = { $or: [{ homeTeamId: { $in: teamIds } }, { awayTeamId: { $in: teamIds } }] };
  const [upcoming, live, results] = teamIds.length ? await Promise.all([
    Match.find({ ...teamFilter, status: 'SCHEDULED' }).sort({ startTime: 1 }).limit(8).populate(MATCH_POP),
    Match.find({ ...teamFilter, status: 'LIVE' }).populate(MATCH_POP),
    Match.find({ ...teamFilter, status: 'COMPLETED' }).sort({ startTime: -1 }).limit(6).populate(MATCH_POP),
  ]) : [[], [], []];
  res.json({ user: { ...user.toJSON(), recentlyViewed: user.recentlyViewed.filter(Boolean) }, upcoming, live, results });
});

export const updateMe = ah(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  const { name, currentPassword, newPassword, favoriteSports } = req.body;
  if (name) user.name = name;
  if (favoriteSports) {
    if ((await Sport.countDocuments({ _id: { $in: favoriteSports } })) !== favoriteSports.length) throw new HttpError(400, 'Unknown sport');
    user.favoriteSports = favoriteSports;
  }
  if (newPassword) {
    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.passwordHash))) throw new HttpError(400, 'Current password is incorrect');
    user.passwordHash = await bcrypt.hash(newPassword, 12);
  }
  await user.save();
  res.json({ user });
});

export const addFavorite = ah(async (req, res) => {
  const [field, Model] = FAV[req.body.type];
  if (!(await Model.exists({ _id: req.body.id }))) throw new HttpError(404, `${req.body.type} not found`);
  const user = await User.findByIdAndUpdate(req.user._id, { $addToSet: { [field]: req.body.id } }, { new: true });
  res.status(201).json({ user });
});

export const removeFavorite = ah(async (req, res) => {
  const entry = FAV[req.params.type];
  if (!entry || !isId(req.params.id)) throw new HttpError(400, 'Invalid favourite');
  const user = await User.findByIdAndUpdate(req.user._id, { $pull: { [entry[0]]: req.params.id } }, { new: true });
  res.json({ user });
});

/* ---------- Admin ---------- */
export const adminDashboard = ah(async (req, res) => {
  const [users, teams, competitions, matches, live, activity, byStatus] = await Promise.all([
    User.countDocuments(), Team.countDocuments(), Competition.countDocuments(), Match.countDocuments(),
    Match.find({ status: 'LIVE' }).populate(MATCH_POP),
    Activity.find().sort({ createdAt: -1 }).limit(12).populate('user', 'name email'),
    Match.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  res.json({ totals: { users, teams, competitions, matches, live: live.length }, live, activity, byStatus });
});

export const adminUsers = ah(async (req, res) => {
  const filter = {};
  if (req.query.q) filter.$or = [{ name: { $regex: escapeRe(req.query.q), $options: 'i' } }, { email: { $regex: escapeRe(req.query.q), $options: 'i' } }];
  if (['USER', 'ADMIN'].includes(req.query.role)) filter.role = req.query.role;
  res.json(await paginate(User, filter, req.query, { sort: { createdAt: -1 } }));
});

export const adminUpdateUser = ah(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw new HttpError(400, 'You cannot change your own role or status');
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!user) throw new HttpError(404, 'User not found');
  log(req.user, 'USER_UPDATED', `${user.email} → ${user.role}${user.isActive ? '' : ' (suspended)'}`);
  res.json(user);
});
