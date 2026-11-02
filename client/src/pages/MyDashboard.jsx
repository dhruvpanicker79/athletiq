import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, Heart, Loader2, Plus, Radio, Settings, Trophy, X, Search } from 'lucide-react';
import { api } from '../services/api';
import { useFetch, useDebounce, useSports } from '../hooks/useFetch';
import { useAuth, useToast } from '../context/AppContext';
import { Crest, Empty, ErrorState, Field, Section, Skeleton } from '../components/ui';
import { MatchCard, MatchList } from '../components/MatchCard';

function TeamFinder({ onAdded }) {
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const { isFollowing, toggleFollow } = useAuth();
  const toast = useToast();
  const res = useFetch(() => (dq.length >= 2 ? api.teams.list({ q: dq, limit: 6 }).then((r) => r.items) : Promise.resolve([])), [dq]);
  const add = async (t) => { try { await toggleFollow('team', t._id); toast(`Following ${t.name}`); onAdded(); setQ(''); } catch (e) { toast(e.message, 'error'); } };
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3.5 top-3 text-mute" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a team to follow…" className="input pl-10" maxLength={60} />
      {dq.length >= 2 && (
        <div className="card absolute z-20 mt-2 w-full overflow-hidden p-1 shadow-2xl">
          {res.loading ? <div className="p-3"><Loader2 className="animate-spin text-lime" size={18} /></div>
            : res.data?.length ? res.data.map((t) => (
              <button key={t._id} disabled={isFollowing('team', t._id)} onClick={() => add(t)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-bg2 disabled:opacity-50">
                <Crest item={t} size={26} /><span className="flex-1">{t.name}</span>{isFollowing('team', t._id) ? <span className="text-xs text-mute">Following</span> : <Plus size={16} className="text-lime" />}
              </button>
            )) : <p className="p-3 text-sm text-mute">No teams found.</p>}
        </div>
      )}
    </div>
  );
}

function SettingsCard() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (form.newPassword && (form.newPassword.length < 8 || !/\d/.test(form.newPassword) || !/[A-Za-z]/.test(form.newPassword))) return toast('New password needs 8+ characters with a letter and a number', 'error');
    setBusy(true);
    try {
      const body = { name: form.name.trim() };
      if (form.newPassword) Object.assign(body, { currentPassword: form.currentPassword, newPassword: form.newPassword });
      const r = await api.users.update(body);
      setUser(r.user); setForm((f) => ({ ...f, currentPassword: '', newPassword: '' }));
      toast('Profile updated');
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  const b = (k) => ({ value: form[k], onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })) });
  return (
    <form onSubmit={save} className="card space-y-4 p-6">
      <h3 className="eyebrow flex items-center gap-2"><Settings size={13} />Profile settings</h3>
      <Field label="Full name"><input className="input" {...b('name')} maxLength={60} required minLength={2} /></Field>
      <Field label="Email"><input className="input opacity-60" value={user.email} disabled /></Field>
      <Field label="Current password"><input type="password" className="input" autoComplete="current-password" {...b('currentPassword')} /></Field>
      <Field label="New password"><input type="password" className="input" autoComplete="new-password" {...b('newPassword')} placeholder="Leave blank to keep current" /></Field>
      <button className="btn-lime w-full" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}Save changes</button>
    </form>
  );
}

export default function MyDashboard() {
  const { user, setUser, toggleFollow } = useAuth();
  const toast = useToast();
  const sports = useSports();
  const me = useFetch(() => api.users.me(), [user.favoriteTeams.length, user.favoriteCompetitions.length]);

  const unfollow = async (type, id, name) => { try { await toggleFollow(type, id); toast(`Unfollowed ${name}`); } catch (e) { toast(e.message, 'error'); } };
  const toggleSport = async (id) => {
    const cur = user.favoriteSports.map(String);
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    try { const r = await api.users.update({ favoriteSports: next }); setUser(r.user); toast('Preferences saved'); } catch (e) { toast(e.message, 'error'); }
  };

  const d = me.data;
  return (
    <div className="container-x py-10">
      <p className="eyebrow mb-2">My dashboard</p>
      <h1 className="font-display text-5xl font-extrabold uppercase">Welcome back, <span className="text-lime">{user.name.split(' ')[0]}</span></h1>
      <p className="mt-2 text-mute">Your teams, competitions and matches — all in one place.</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-12">
          {me.error ? <ErrorState message={me.error} onRetry={me.reload} /> : !d ? <Skeleton rows={4} /> : (
            <>
              {d.live.length > 0 && (
                <Section title="Your teams live" icon={Radio}><div className="grid gap-4 md:grid-cols-2">{d.live.map((m) => <MatchCard key={m._id} match={m} />)}</div></Section>
              )}
              <Section title="Upcoming for your teams" icon={CalendarDays}>
                {d.upcoming.length ? <MatchList matches={d.upcoming} grouped /> : <Empty icon={CalendarDays} title="No upcoming matches" text="Follow teams to see their fixtures here." />}
              </Section>
              <Section title="Recent results" icon={Trophy}>
                {d.results.length ? <MatchList matches={d.results} /> : <Empty title="No recent results for your teams" />}
              </Section>
              <Section title="Recently viewed" icon={Clock}>
                {d.user.recentlyViewed.length ? <MatchList matches={d.user.recentlyViewed.slice(0, 6)} /> : <Empty icon={Clock} title="No matches viewed yet" text="Open any match centre and it will appear here." />}
              </Section>
            </>
          )}
        </div>

        <aside className="space-y-6">
          <div className="card space-y-4 p-6">
            <h3 className="eyebrow flex items-center gap-2"><Heart size={13} />Favourite teams</h3>
            <TeamFinder onAdded={me.reload} />
            {d?.user.favoriteTeams.length ? (
              <ul className="space-y-1">{d.user.favoriteTeams.map((t) => (
                <li key={t._id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-bg2">
                  <Link to={`/team/${t._id}`} className="flex flex-1 items-center gap-2.5 text-sm font-medium"><Crest item={t} size={26} />{t.name}</Link>
                  <button onClick={() => unfollow('team', t._id, t.name)} aria-label={`Unfollow ${t.name}`} className="rounded p-1 text-mute hover:text-live"><X size={15} /></button>
                </li>
              ))}</ul>
            ) : <p className="text-sm text-mute">No favourite teams yet.</p>}
          </div>
          <div className="card space-y-3 p-6">
            <h3 className="eyebrow flex items-center gap-2"><Trophy size={13} />Favourite competitions</h3>
            {d?.user.favoriteCompetitions.length ? (
              <ul className="space-y-1">{d.user.favoriteCompetitions.map((c) => (
                <li key={c._id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-bg2">
                  <Link to={`/competitions/${c._id}`} className="flex flex-1 items-center gap-2.5 text-sm font-medium"><Crest item={c} size={26} />{c.name}</Link>
                  <button onClick={() => unfollow('competition', c._id, c.name)} aria-label={`Unfollow ${c.name}`} className="rounded p-1 text-mute hover:text-live"><X size={15} /></button>
                </li>
              ))}</ul>
            ) : <p className="text-sm text-mute">Follow competitions from the <Link to="/competitions" className="text-lime hover:underline">competitions page</Link>.</p>}
          </div>
          <div className="card p-6">
            <h3 className="eyebrow mb-3">Followed sports</h3>
            <div className="flex flex-wrap gap-2">
              {sports.data?.map((s) => <button key={s._id} onClick={() => toggleSport(s._id)} className={`chip ${user.favoriteSports.map(String).includes(s._id) ? 'chip-on' : ''}`}>{s.name}</button>)}
            </div>
          </div>
          <SettingsCard />
        </aside>
      </div>
    </div>
  );
}
