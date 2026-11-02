import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { jwtSecret } from '../config/db.js';
import { HttpError, ah } from './error.js';

async function userFromToken(req) {
  const token = req.cookies?.token;
  if (!token) return null;
  try {
    const { id } = jwt.verify(token, jwtSecret());
    const user = await User.findById(id);
    return user && user.isActive ? user : null;
  } catch { return null; }
}

export const protect = ah(async (req, res, next) => {
  const user = await userFromToken(req);
  if (!user) throw new HttpError(401, 'Please log in to continue');
  req.user = user;
  next();
});

export const optionalAuth = ah(async (req, res, next) => {
  req.user = await userFromToken(req);
  next();
});

export const adminOnly = (req, res, next) =>
  req.user?.role === 'ADMIN' ? next() : next(new HttpError(403, 'Admin access required'));

export const admin = [protect, adminOnly];
