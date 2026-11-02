import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { jwtSecret } from '../config/db.js';
import { HttpError, ah } from '../middleware/error.js';
import { log } from '../services/query.js';

const cookieOpts = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
});

function sendSession(res, user, status = 200) {
  const token = jwt.sign({ id: user._id, role: user.role }, jwtSecret(), { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  res.cookie('token', token, cookieOpts()).status(status).json({ user });
}

export const register = ah(async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  if (password !== confirmPassword) throw new HttpError(400, 'Passwords do not match');
  if (await User.exists({ email: email.toLowerCase() })) throw new HttpError(409, 'An account with this email already exists');
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
  log(user, 'USER_REGISTERED', user.email);
  sendSession(res, user, 201);
});

export const login = ah(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) throw new HttpError(401, 'Invalid email or password');
  if (!user.isActive) throw new HttpError(403, 'This account has been suspended');
  sendSession(res, user);
});

export const logout = (req, res) => {
  const { maxAge, ...opts } = cookieOpts();
  res.clearCookie('token', opts).json({ message: 'Logged out' });
};

export const me = (req, res) => res.json({ user: req.user });
