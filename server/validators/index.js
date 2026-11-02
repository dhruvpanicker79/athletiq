import mongoose from 'mongoose';
import { HttpError } from '../middleware/error.js';
import { MATCH_STATUS } from '../models/index.js';

const isId = (v) => typeof v === 'string' && mongoose.isValidObjectId(v);

// Tiny declarative validator: { field: { type, required, min, max, enum, pattern } }
function check(field, v, r) {
  switch (r.type) {
    case 'string':
      if (typeof v !== 'string') return `${field} must be text`;
      if (r.min && v.trim().length < r.min) return `${field} must be at least ${r.min} characters`;
      if (r.max && v.length > r.max) return `${field} must be at most ${r.max} characters`;
      if (r.pattern && !r.pattern.test(v)) return r.msg || `${field} is invalid`;
      if (r.enum && !r.enum.includes(v)) return `${field} must be one of ${r.enum.join(', ')}`;
      return;
    case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 120 ? undefined : 'A valid email is required';
    case 'int':
      if (!Number.isInteger(Number(v)) || v === true) return `${field} must be a whole number`;
      if (r.min !== undefined && Number(v) < r.min) return `${field} must be ≥ ${r.min}`;
      if (r.max !== undefined && Number(v) > r.max) return `${field} must be ≤ ${r.max}`;
      return;
    case 'bool': return typeof v === 'boolean' ? undefined : `${field} must be true/false`;
    case 'id': return isId(v) ? undefined : `${field} must be a valid id`;
    case 'ids': return Array.isArray(v) && v.every(isId) ? undefined : `${field} must be a list of ids`;
    case 'date': return isNaN(Date.parse(v)) ? `${field} must be a valid date` : undefined;
    case 'url': return v === '' || /^https?:\/\/\S+$/.test(v) ? undefined : `${field} must be an http(s) URL`;
    case 'object': return v && typeof v === 'object' && !Array.isArray(v) ? undefined : `${field} must be an object`;
    case 'array': return Array.isArray(v) && v.length <= (r.max || 200) ? undefined : `${field} must be a list`;
    default: return;
  }
}

export const validate = (rules, { partial = false } = {}) => (req, res, next) => {
  const errors = [];
  const body = req.body || {};
  for (const [field, r] of Object.entries(rules)) {
    const v = body[field];
    if (v === undefined || v === null || v === '') {
      if (r.required && !partial) errors.push(`${field} is required`);
      continue;
    }
    const err = check(field, v, r);
    if (err) errors.push(err);
  }
  // Drop any field not declared in the rules (mass-assignment protection)
  req.body = Object.fromEntries(Object.entries(body).filter(([k]) => k in rules));
  if (errors.length) return next(new HttpError(400, errors[0], errors));
  next();
};

const hex = { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/, msg: 'color must be a hex like #C5F36A' };

export const rules = {
  register: {
    name: { type: 'string', required: true, min: 2, max: 60 },
    email: { type: 'email', required: true },
    password: { type: 'string', required: true, min: 8, max: 100, pattern: /^(?=.*[A-Za-z])(?=.*\d)/, msg: 'Password needs at least one letter and one number' },
    confirmPassword: { type: 'string', required: true },
  },
  login: { email: { type: 'email', required: true }, password: { type: 'string', required: true, max: 100 } },
  profile: {
    name: { type: 'string', min: 2, max: 60 },
    currentPassword: { type: 'string', max: 100 },
    newPassword: { type: 'string', min: 8, max: 100, pattern: /^(?=.*[A-Za-z])(?=.*\d)/, msg: 'Password needs at least one letter and one number' },
    favoriteSports: { type: 'ids' },
  },
  favorite: { type: { type: 'string', required: true, enum: ['team', 'competition', 'sport'] }, id: { type: 'id', required: true } },
  sport: { name: { type: 'string', required: true, min: 2, max: 40 }, slug: { type: 'string', required: true, pattern: /^[a-z0-9-]+$/, msg: 'slug must be lowercase letters, numbers, dashes' } },
  competition: {
    name: { type: 'string', required: true, min: 2, max: 80 },
    shortName: { type: 'string', max: 8 },
    sportId: { type: 'id', required: true },
    country: { type: 'string', required: true, min: 2, max: 60 },
    season: { type: 'string', required: true, min: 2, max: 20 },
    logo: { type: 'url' },
    color: hex,
    format: { type: 'string', enum: ['LEAGUE', 'CUP'] },
  },
  team: {
    name: { type: 'string', required: true, min: 2, max: 80 },
    shortName: { type: 'string', required: true, min: 2, max: 5 },
    country: { type: 'string', required: true, min: 2, max: 60 },
    sportId: { type: 'id', required: true },
    venue: { type: 'string', max: 100 },
    logo: { type: 'url' },
    color: hex,
    competitionIds: { type: 'ids' },
  },
  match: {
    sportId: { type: 'id', required: true },
    competitionId: { type: 'id', required: true },
    homeTeamId: { type: 'id', required: true },
    awayTeamId: { type: 'id', required: true },
    startTime: { type: 'date', required: true },
    venue: { type: 'string', max: 100 },
    round: { type: 'string', max: 40 },
    status: { type: 'string', enum: MATCH_STATUS },
    homeScore: { type: 'int', min: 0, max: 999 },
    awayScore: { type: 'int', min: 0, max: 999 },
    clock: { type: 'string', max: 20 },
    result: { type: 'string', max: 200 },
    matchStatistics: { type: 'object' },
    timeline: { type: 'array', max: 200 },
    lineups: { type: 'object' },
  },
  adminUser: { role: { type: 'string', enum: ['USER', 'ADMIN'] }, isActive: { type: 'bool' } },
};
