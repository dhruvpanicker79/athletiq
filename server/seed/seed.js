// Seeds the database with clearly-labelled DEMO DATA. Run: npm run seed
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Sport, Competition, Team, Player, Match, Activity } from '../models/index.js';
import { SPORTS, COMPETITIONS, TEAMS, FIRST, LAST, NATIONS, WOMEN } from './data.js';

// Deterministic RNG so demo data is reproducible
let s = 20261102;
const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const goals = () => [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4][int(0, 10)];
const HOUR = 3600000, DAY = 24 * HOUR;

/* ---------- squads ---------- */
const POS = {
  football: ['Goalkeeper', 'Defender', 'Defender', 'Defender', 'Defender', 'Midfielder', 'Midfielder', 'Midfielder', 'Forward', 'Forward', 'Forward', 'Goalkeeper', 'Defender', 'Midfielder', 'Midfielder', 'Forward'],
  cricket: ['Batter', 'Batter', 'Batter', 'Wicketkeeper', 'All-rounder', 'All-rounder', 'All-rounder', 'Bowler', 'Bowler', 'Bowler', 'Bowler', 'Batter', 'Bowler'],
  basketball: ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center', 'Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'],
};
function squad(team, sport, women) {
  return POS[sport].map((position, i) => {
    const stats = sport === 'football'
      ? { appearances: int(4, 14), goals: position === 'Forward' ? int(1, 9) : position === 'Midfielder' ? int(0, 4) : int(0, 1), assists: int(0, 5), yellowCards: int(0, 3) }
      : sport === 'cricket'
        ? { matches: int(5, 14), runs: position === 'Bowler' ? int(10, 80) : int(120, 480), wickets: ['Bowler', 'All-rounder'].includes(position) ? int(4, 20) : 0, strikeRate: int(110, 175) }
        : { games: int(8, 20), points: +(rnd() * 22 + 4).toFixed(1), rebounds: +(rnd() * 9 + 1).toFixed(1), assists: +(rnd() * 7 + 1).toFixed(1) };
    return {
      name: `${pick(women ? WOMEN : FIRST)} ${pick(LAST)}`,
      teamId: team._id, position, number: sport === 'cricket' ? int(1, 99) : i + 1,
      nationality: ['India', 'International'].includes(team.country) || sport === 'cricket' ? team.country : pick(NATIONS),
      statistics: stats,
    };
  });
}

/* ---------- sport-specific match generators ---------- */
function football(m, H, A, minuteNow) {
  const end = minuteNow ?? 90;
  const evs = [];
  const fwd = (sq) => sq.filter((p) => ['Forward', 'Midfielder'].includes(p.position));
  const add = (side, sq, n) => {
    for (let i = 0; i < n; i++) {
      const scorer = pick(fwd(sq.slice(0, 11)));
      const assist = rnd() > 0.3 ? pick(sq.slice(1, 11).filter((p) => p !== scorer)).name : undefined;
      evs.push({ minute: int(3, 90), type: 'GOAL', team: side, player: scorer.name, assist });
    }
    for (let i = 0; i < int(0, 3); i++) evs.push({ minute: int(10, 90), type: 'YELLOW', team: side, player: pick(sq.slice(1, 11)).name });
    if (rnd() < 0.1) evs.push({ minute: int(40, 88), type: 'RED', team: side, player: pick(sq.slice(1, 11)).name });
    for (let i = 0; i < 3; i++) evs.push({ minute: int(56, 85), type: 'SUB', team: side, player: sq[11 + i + (i > 0)].name, playerOut: sq[8 + i].name });
  };
  add('home', H.squad, goals()); add('away', A.squad, goals());
  m.timeline = evs.filter((e) => e.minute <= end).sort((a, b) => a.minute - b.minute);
  const count = (side, type) => m.timeline.filter((e) => e.team === side && e.type === type).length;
  m.homeScore = count('home', 'GOAL'); m.awayScore = count('away', 'GOAL');
  const f = end / 90, pos = int(38, 62);
  const pair = (fn) => [fn('home'), fn('away')];
  const shots = pair((x) => count(x, 'GOAL') + Math.round(int(4, 13) * f));
  m.matchStatistics = {
    possession: [pos, 100 - pos], shots,
    shotsOnTarget: pair((x) => Math.min(shots[x === 'home' ? 0 : 1], count(x, 'GOAL') + Math.round(int(0, 4) * f))),
    corners: pair(() => Math.round(int(1, 9) * f)), fouls: pair(() => Math.round(int(6, 15) * f)),
    yellowCards: pair((x) => count(x, 'YELLOW')), redCards: pair((x) => count(x, 'RED')),
    offsides: pair(() => Math.round(int(0, 4) * f)),
  };
  const lineup = (sq) => ({ formation: pick(['4-3-3', '4-2-3-1', '4-4-2']), starting: sq.slice(0, 11).map(({ name, number, position }) => ({ name, number, position })), subs: sq.slice(11).map(({ name, number, position }) => ({ name, number, position })) });
  m.lineups = { home: lineup(H.squad), away: lineup(A.squad) };
  if (minuteNow) m.clock = `${minuteNow}'`;
  else m.result = m.homeScore === m.awayScore ? `Draw ${m.homeScore}-${m.awayScore}` : `${(m.homeScore > m.awayScore ? H : A).name} won ${Math.max(m.homeScore, m.awayScore)}-${Math.min(m.homeScore, m.awayScore)}`;
}

const balls = (o) => Math.floor(o) * 6 + Math.round((o % 1) * 10);
const ovStr = (b) => `${Math.floor(b / 6)}.${b % 6}`;
function innings(side, bat, bowl, runs, wkts, ballsBowled) {
  const extras = int(4, 12), n = Math.min(11, wkts + 2);
  const w = Array.from({ length: n }, (_, i) => (n - i) * (0.6 + rnd()));
  const tw = w.reduce((a, b) => a + b, 0);
  let left = runs - extras;
  const bowlers = bowl.filter((p) => ['Bowler', 'All-rounder'].includes(p.position)).slice(0, 5);
  const batting = bat.slice(0, n).map((p, i) => {
    const r = i === n - 1 ? Math.max(0, left) : Math.min(left, Math.round(((runs - extras) * w[i]) / tw));
    left -= r;
    const out = i < wkts;
    const b = pick(bowlers).name;
    return { name: p.name, r, b: Math.max(1, Math.round(r / (1 + rnd() * 0.7)) + int(0, 3)), fours: Math.floor(r / 9), sixes: Math.floor(r / 22), how: out ? pick([`c ${pick(bowl).name} b ${b}`, `b ${b}`, `lbw b ${b}`, 'run out']) : 'not out' };
  });
  let bl = ballsBowled, rl = runs - extras, wl = wkts;
  const bowling = bowlers.map((p, i) => {
    const bb = i === bowlers.length - 1 ? bl : Math.min(24, bl); bl -= bb;
    const r = i === bowlers.length - 1 ? rl : Math.round(((runs - extras) * bb) / ballsBowled); rl -= r;
    const wk = i === bowlers.length - 1 ? wl : Math.min(wl, int(0, 2)); wl -= wk;
    return { name: p.name, o: ovStr(bb), m: rnd() < 0.1 ? 1 : 0, r: Math.max(0, r), w: wk };
  }).filter((x) => x.o !== '0.0');
  return { team: side, runs, wickets: wkts, overs: ovStr(ballsBowled), extras, batting, bowling };
}
function cricket(m, H, A, live) {
  const r1 = int(142, 212), w1 = int(3, 10), b1 = w1 === 10 ? int(100, 118) : 120;
  const i1 = innings('home', H.squad, A.squad, r1, w1, b1);
  let r2, w2, b2;
  if (live) { b2 = balls(14.2); w2 = int(2, 6); r2 = Math.round(r1 * 0.68); m.clock = `${ovStr(b2)} ov`; }
  else if (rnd() < 0.5) { r2 = r1 + int(1, 6); w2 = int(2, 8); b2 = int(96, 119); }
  else { w2 = int(6, 10); r2 = r1 - int(3, 38); b2 = w2 === 10 ? int(98, 118) : 120; }
  const i2 = innings('away', A.squad, H.squad, r2, w2, b2);
  m.homeScore = r1; m.awayScore = r2;
  m.matchStatistics = { format: 'T20', toss: `${H.name} elected to bat`, innings: [i1, i2] };
  if (live) m.result = `${A.name} need ${r1 + 1 - r2} runs from ${120 - b2} balls`;
  else m.result = r2 > r1 ? `${A.name} won by ${10 - w2} wickets` : r1 > r2 ? `${H.name} won by ${r1 - r2} runs` : 'Match tied';
}

function basketball(m, H, A, live) {
  const qs = () => Array.from({ length: 4 }, () => int(20, 34));
  const q = { home: qs(), away: qs() };
  if (live) { q.home = [q.home[0], q.home[1], Math.round(q.home[2] * 0.6)]; q.away = [q.away[0], q.away[1], Math.round(q.away[2] * 0.6)]; m.clock = 'Q3 04:12'; }
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  if (!live && sum(q.home) === sum(q.away)) q.home[3] += 2;
  m.homeScore = sum(q.home); m.awayScore = sum(q.away);
  const f = live ? 0.65 : 1, pair = (a, b) => [Math.round(int(a, b) * f), Math.round(int(a, b) * f)];
  const leader = (sq) => ({ name: pick(sq.slice(0, 5)).name, pts: Math.round(int(18, 38) * f), reb: int(3, 13), ast: int(2, 11) });
  m.matchStatistics = {
    quarters: q, rebounds: pair(36, 54), assists: pair(18, 31), fouls: pair(14, 24),
    turnovers: pair(8, 17), threePointers: pair(8, 18), fieldGoalPct: [int(41, 54), int(41, 54)],
    leaders: { home: leader(H.squad), away: leader(A.squad) },
  };
  if (!live) m.result = `${(m.homeScore > m.awayScore ? H : A).name} won by ${Math.abs(m.homeScore - m.awayScore)}`;
}

/* ---------- main ---------- */
export async function seed() {
  s = 20261102;
  console.log('… Seeding DEMO DATA');
  await Promise.all([User, Sport, Competition, Team, Player, Match, Activity].map((M) => M.deleteMany({})));

  const sports = Object.fromEntries((await Sport.insertMany(SPORTS)).map((x) => [x.slug, x]));
  const comps = {};
  for (const [key, name, shortName, sport, country, season, color, format, live] of COMPETITIONS)
    comps[key] = Object.assign(await Competition.create({ name, shortName, sportId: sports[sport]._id, country, season, color, format }), { key, live, sport });

  const teamsByComp = {};
  let playerDocs = [];
  for (const [sport, list] of Object.entries(TEAMS)) {
    for (const [name, shortName, color, country, venue, ck] of list) {
      const t = await Team.create({ name, shortName, color, country, venue, sportId: sports[sport]._id, competitionIds: ck.map((k) => comps[k]._id) });
      t.squad = squad(t, sport, ck.includes('WNBA'));
      playerDocs = playerDocs.concat(t.squad);
      ck.forEach((k) => (teamsByComp[k] ||= []).push(t));
    }
  }
  await Player.insertMany(playerDocs);

  const now = Date.now();
  const matches = [];
  for (const comp of Object.values(comps)) {
    const teams = teamsByComp[comp.key];
    const pairs = [];
    for (let i = 0; i < teams.length; i++) for (let j = i + 1; j < teams.length; j++) pairs.push([teams[i], teams[j]]);
    if (teams.length <= 4 && comp.format === 'LEAGUE') pairs.push(...pairs.map(([a, b]) => [b, a])); // double round-robin
    pairs.sort(() => rnd() - 0.5);
    const nDone = Math.round(pairs.length * 0.55);
    pairs.forEach(([H, A], idx) => {
      const m = { sportId: sports[comp.sport]._id, competitionId: comp._id, homeTeamId: H._id, awayTeamId: A._id, venue: H.venue, isDemo: true, round: `Matchday ${idx + 1}` };
      const gen = { football, cricket, basketball }[comp.sport];
      const kickoff = (dayOffset) => { const d = new Date(now + dayOffset * DAY); d.setUTCHours(pick([11, 14, 16, 19]), pick([0, 30]), 0, 0); return d; };
      if (idx < nDone) {
        m.status = 'COMPLETED'; m.startTime = kickoff(-(1 + idx * 2 + int(0, 1)));
        gen(m, H, A, comp.sport === 'football' ? undefined : false);
      } else if (idx < nDone + comp.live) {
        m.status = 'LIVE';
        if (comp.sport === 'football') { const min = int(24, 84); m.startTime = new Date(now - (min + (min > 45 ? 15 : 0)) * 60000); football(m, H, A, min); }
        else { m.startTime = new Date(now - (comp.sport === 'cricket' ? 150 : 80) * 60000); gen(m, H, A, true); }
      } else {
        const k = idx - nDone - comp.live;
        m.status = comp.key === 'LALIGA' && k === 1 ? 'POSTPONED' : 'SCHEDULED';
        m.startTime = k === 0 ? new Date(Math.ceil((now + int(2, 6) * HOUR) / (30 * 60000)) * 30 * 60000) : kickoff(k * 2 + int(0, 1));
        if (m.status === 'POSTPONED') m.result = 'Postponed — demo data';
      }
      matches.push(m);
    });
  }
  await Match.insertMany(matches);

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@athletiq.dev';
  const admin = await User.create({ name: process.env.ADMIN_NAME || 'Athletiq Admin', email: adminEmail, role: 'ADMIN', passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@12345', 12) });
  const fav = await Team.find({ shortName: { $in: ['ARS', 'RMA', 'MI', 'LAL'] } });
  await User.create({ name: 'Demo Fan', email: 'fan@athletiq.dev', passwordHash: await bcrypt.hash('Fan@12345', 12), favoriteTeams: fav.map((t) => t._id), favoriteCompetitions: [comps.EPL._id, comps.IPL._id], favoriteSports: [sports.football._id] });
  await Activity.create({ user: admin._id, action: 'DATABASE_SEEDED', detail: `${matches.length} demo matches generated` });
  console.log(`✓ Seeded 3 sports, ${Object.keys(comps).length} competitions, ${Object.values(TEAMS).flat().length} teams, ${playerDocs.length} players, ${matches.length} matches`);
  console.log(`  Admin: ${adminEmail}  ·  Demo fan: fan@athletiq.dev / Fan@12345`);
}

// Run directly: node seed/seed.js
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { connectDB } = await import('../config/db.js');
  await connectDB();
  await seed();
  await new Promise((r) => setTimeout(r, 800)); // let the local DB flush to disk
  await mongoose.disconnect();
  process.exit(0);
}
