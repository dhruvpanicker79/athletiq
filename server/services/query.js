import mongoose from 'mongoose';
import { Sport, Activity } from '../models/index.js';

export const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 60);
export const isId = (v) => typeof v === 'string' && mongoose.isValidObjectId(v);

export function paging(q, defLimit = 20) {
  const page = Math.max(1, parseInt(q.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q.limit) || defLimit));
  return { page, limit, skip: (page - 1) * limit };
}

// Accept ?sort=name or ?sort=-startTime, only for allowed fields
export function sorting(raw, allowed, fallback) {
  if (typeof raw !== 'string') return fallback;
  const field = raw.replace(/^-/, '');
  return allowed.includes(field) ? { [field]: raw.startsWith('-') ? -1 : 1 } : fallback;
}

// ?sport= accepts an id or a slug ("football")
export async function sportId(v) {
  if (!v || typeof v !== 'string') return undefined;
  if (isId(v)) return v;
  const s = await Sport.findOne({ slug: v.toLowerCase() }).select('_id');
  return s ? s._id : new mongoose.Types.ObjectId(); // unknown slug → no results
}

export async function paginate(Model, filter, q, { sort, populate, defLimit } = {}) {
  const { page, limit, skip } = paging(q, defLimit);
  let cursor = Model.find(filter).sort(sort).skip(skip).limit(limit);
  if (populate) cursor = cursor.populate(populate);
  const [items, total] = await Promise.all([cursor, Model.countDocuments(filter)]);
  return { items, total, page, pages: Math.ceil(total / limit) || 1 };
}

export const log = (user, action, detail) => Activity.create({ user: user?._id, action, detail }).catch(() => {});
