import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const ref = (name) => ({ type: Schema.Types.ObjectId, ref: name });
const clean = { transform: (_, r) => { delete r.__v; delete r.passwordHash; return r; } };

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^\S+@\S+\.\S+$/ },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER', index: true },
  favoriteTeams: [ref('Team')],
  favoriteCompetitions: [ref('Competition')],
  favoriteSports: [ref('Sport')],
  recentlyViewed: [ref('Match')],
  isActive: { type: Boolean, default: true },
}, { timestamps: true, toJSON: clean });

const sportSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 40 },
  slug: { type: String, required: true, unique: true, lowercase: true, match: /^[a-z0-9-]+$/ },
}, { toJSON: clean });

const competitionSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  shortName: { type: String, trim: true, maxlength: 8 },
  sportId: { ...ref('Sport'), required: true, index: true },
  country: { type: String, required: true, trim: true, maxlength: 60 },
  logo: { type: String, trim: true, maxlength: 500, default: '' },
  color: { type: String, match: /^#[0-9a-fA-F]{6}$/, default: '#C5F36A' },
  season: { type: String, required: true, trim: true, maxlength: 20 },
  format: { type: String, enum: ['LEAGUE', 'CUP'], default: 'LEAGUE' },
}, { timestamps: true, toJSON: clean });
competitionSchema.index({ name: 1, season: 1 }, { unique: true });

const teamSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  shortName: { type: String, required: true, trim: true, uppercase: true, minlength: 2, maxlength: 5 },
  logo: { type: String, trim: true, maxlength: 500, default: '' },
  color: { type: String, match: /^#[0-9a-fA-F]{6}$/, default: '#303832' },
  country: { type: String, required: true, trim: true, maxlength: 60 },
  venue: { type: String, trim: true, maxlength: 100, default: '' },
  sportId: { ...ref('Sport'), required: true, index: true },
  competitionIds: { type: [ref('Competition')], index: true },
}, { timestamps: true, toJSON: clean });
teamSchema.index({ name: 1, sportId: 1 }, { unique: true });

const playerSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  teamId: { ...ref('Team'), required: true, index: true },
  position: { type: String, trim: true, maxlength: 40 },
  number: { type: Number, min: 0, max: 99 },
  nationality: { type: String, trim: true, maxlength: 60 },
  image: { type: String, trim: true, maxlength: 500, default: '' },
  statistics: { type: Schema.Types.Mixed, default: {} },
}, { toJSON: clean });

export const MATCH_STATUS = ['SCHEDULED', 'LIVE', 'COMPLETED', 'POSTPONED', 'CANCELLED'];
const matchSchema = new Schema({
  sportId: { ...ref('Sport'), required: true },
  competitionId: { ...ref('Competition'), required: true, index: true },
  homeTeamId: { ...ref('Team'), required: true, index: true },
  awayTeamId: { ...ref('Team'), required: true, index: true },
  homeScore: { type: Number, min: 0, max: 999, default: 0 },
  awayScore: { type: Number, min: 0, max: 999, default: 0 },
  status: { type: String, enum: MATCH_STATUS, default: 'SCHEDULED' },
  clock: { type: String, trim: true, maxlength: 20, default: '' }, // e.g. 67', Q3 04:12, 14.2 ov
  result: { type: String, trim: true, maxlength: 200, default: '' },
  startTime: { type: Date, required: true },
  venue: { type: String, trim: true, maxlength: 100, default: '' },
  round: { type: String, trim: true, maxlength: 40, default: '' },
  matchStatistics: { type: Schema.Types.Mixed, default: {} }, // sport-specific shape
  timeline: [{ _id: false, minute: Number, type: { type: String }, team: String, player: String, assist: String, playerOut: String }],
  lineups: { type: Schema.Types.Mixed, default: {} },
  isDemo: { type: Boolean, default: true },
}, { timestamps: true, toJSON: clean });
matchSchema.index({ status: 1, startTime: 1 });
matchSchema.index({ sportId: 1, startTime: -1 });

const activitySchema = new Schema({
  user: ref('User'),
  action: { type: String, required: true },
  detail: String,
}, { timestamps: true, toJSON: clean });

export const User = model('User', userSchema);
export const Sport = model('Sport', sportSchema);
export const Competition = model('Competition', competitionSchema);
export const Team = model('Team', teamSchema);
export const Player = model('Player', playerSchema);
export const Match = model('Match', matchSchema);
export const Activity = model('Activity', activitySchema);
