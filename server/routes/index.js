import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { protect, optionalAuth, admin } from '../middleware/auth.js';
import { validate, rules } from '../validators/index.js';
import * as auth from '../controllers/auth.js';
import * as c from '../controllers/catalog.js';
import * as m from '../controllers/matches.js';
import * as u from '../controllers/users.js';

const r = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many attempts, try again in 15 minutes' } });
const writeLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false });
const P = { partial: true };

// Auth
r.post('/auth/register', authLimiter, validate(rules.register), auth.register);
r.post('/auth/login', authLimiter, validate(rules.login), auth.login);
r.post('/auth/logout', auth.logout);
r.get('/auth/me', optionalAuth, auth.me); // { user: null } when logged out

// Sports
r.get('/sports', c.listSports);
r.get('/sports/:id', c.getSport);
r.post('/sports', admin, validate(rules.sport), c.createSport);
r.put('/sports/:id', admin, validate(rules.sport, P), c.updateSport);
r.delete('/sports/:id', admin, c.deleteSport);

// Competitions
r.get('/competitions', c.listCompetitions);
r.get('/competitions/:id', c.getCompetition);
r.get('/competitions/:id/standings', c.standings);
r.post('/competitions', admin, writeLimiter, validate(rules.competition), c.createCompetition);
r.put('/competitions/:id', admin, writeLimiter, validate(rules.competition, P), c.updateCompetition);
r.delete('/competitions/:id', admin, c.deleteCompetition);

// Teams & players
r.get('/teams', c.listTeams);
r.get('/teams/:id', c.getTeam);
r.post('/teams', admin, writeLimiter, validate(rules.team), c.createTeam);
r.put('/teams/:id', admin, writeLimiter, validate(rules.team, P), c.updateTeam);
r.delete('/teams/:id', admin, c.deleteTeam);
r.get('/players', c.listPlayers);
r.get('/players/:id', c.getPlayer);

// Matches
r.get('/matches', m.listMatches);
r.get('/matches/live', m.liveMatches);
r.get('/matches/upcoming', m.upcomingMatches);
r.get('/matches/results', m.resultMatches);
r.get('/matches/:id', optionalAuth, m.getMatch);
r.post('/matches', admin, writeLimiter, validate(rules.match), m.createMatch);
r.put('/matches/:id', admin, writeLimiter, validate(rules.match, P), m.updateMatch);
r.delete('/matches/:id', admin, m.deleteMatch);

// Users (self)
r.get('/users/me', protect, u.getMe);
r.put('/users/me', protect, validate(rules.profile), u.updateMe);
r.post('/users/favorites', protect, validate(rules.favorite), u.addFavorite);
r.delete('/users/favorites/:type/:id', protect, u.removeFavorite);

// Admin
r.get('/admin/dashboard', admin, u.adminDashboard);
r.get('/admin/users', admin, u.adminUsers);
r.put('/admin/users/:id', admin, validate(rules.adminUser, P), u.adminUpdateUser);

export default r;
