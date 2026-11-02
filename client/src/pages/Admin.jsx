import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Loader2, Pencil, Plus, Radio, Search, Shield, Trash2, Trophy, Users, Swords, Ban, CheckCircle2 } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { api } from '../services/api';
import { useFetch, useDebounce, useSports, useCompetitions, clearCaches } from '../hooks/useFetch';
import { useAuth, useToast } from '../context/AppContext';
import { Async, Confirm, Crest, Empty, Field, Modal, Skeleton, StatusBadge, Tabs } from '../components/ui';
import { MatchCard } from '../components/MatchCard';
import { fmtDate, fmtTime, timeAgo, scoreLabel, hasScore } from '../utils/format';

const STATUSES = ['SCHEDULED', 'LIVE', 'COMPLETED', 'POSTPONED', 'CANCELLED'];
const toLocalInput = (d) => { const x = new Date(d); return new Date(x - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined));

/* ---------- Overview ---------- */
function Overview() {
  const s = useFetch(() => api.admin.dashboard(), []);
  return (
    <Async state={s} skeleton={<Skeleton rows={3} h="h-28" />}>
      {(d) => (
        <div className="space-y-10">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {[['Users', d.totals.users, Users], ['Teams', d.totals.teams, Shield], ['Competitions', d.totals.competitions, Trophy], ['Matches', d.totals.matches, Swords], ['Live now', d.totals.live, Radio]].map(([l, v, I]) => (
              <div key={l} className="card p-5"><I size={18} className="text-lime" /><p className="score mt-4 text-4xl">{v}</p><p className="text-xs uppercase tracking-wider text-mute">{l}</p></div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-6">
              <h3 className="eyebrow mb-4">Matches by status</h3>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={STATUSES.map((st) => ({ st, n: d.byStatus.find((b) => b._id === st)?.count || 0 }))}>
                    <XAxis dataKey="st" stroke="#929A91" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#929A91" fontSize={11} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#171C1A', border: '1px solid #303832', borderRadius: 12 }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="n" name="Matches" radius={[6, 6, 0, 0]}>{STATUSES.map((st) => <Cell key={st} fill={st === 'LIVE' ? '#FF4D4F' : '#C5F36A'} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card p-6">
              <h3 className="eyebrow mb-4 flex items-center gap-2"><Activity size={13} />Recent activity</h3>
              <ul className="space-y-3 text-sm">
                {d.activity.map((a) => (
                  <li key={a._id} className="flex gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
                    <div className="min-w-0"><p className="font-medium">{a.action.replace(/_/g, ' ').toLowerCase()}</p><p className="truncate text-xs text-mute">{a.detail} · {a.user?.name || 'system'} · {timeAgo(a.createdAt)}</p></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <h3 className="eyebrow mb-4">Live matches</h3>
            {d.live.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{d.live.map((m) => <MatchCard key={m._id} match={m} />)}</div> : <Empty icon={Radio} title="No live matches" />}
          </div>
        </div>
      )}
    </Async>
  );
}

/* ---------- Generic list + CRUD wrapper ---------- */
function useCrud(resource, label, reload) {
  const toast = useToast();
  const [editing, setEditing] = useState(null); // null | {} (new) | item
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async (body) => {
    setBusy(true);
    try {
      if (editing._id) await resource.update(editing._id, body); else await resource.create(body);
      toast(`${label} ${editing._id ? 'updated' : 'created'}`);
      setEditing(null); clearCaches(); reload();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await resource.remove(deleting._id); toast(`${label} deleted`); setDeleting(null); clearCaches(); reload(); }
    catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return { editing, setEditing, deleting, setDeleting, busy, save, remove };
}

const Toolbar = ({ q, setQ, onNew, newLabel, children }) => (
  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
    <div className="relative flex-1">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="input pl-10" maxLength={60} />
    </div>
    {children}
    {onNew && <button className="btn-lime" onClick={onNew}><Plus size={16} />{newLabel}</button>}
  </div>
);
const RowActions = ({ onEdit, onDelete }) => (
  <div className="flex justify-end gap-1">
    <button onClick={onEdit} className="rounded-lg p-2 text-mute hover:bg-bg2 hover:text-lime" aria-label="Edit"><Pencil size={15} /></button>
    {onDelete && <button onClick={onDelete} className="rounded-lg p-2 text-mute hover:bg-bg2 hover:text-live" aria-label="Delete"><Trash2 size={15} /></button>}
  </div>
);
const Th = ({ children, className = '' }) => <th className={`py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-mute ${className}`}>{children}</th>;
const Pager = ({ d, page, setPage }) => d.pages > 1 && (
  <div className="mt-4 flex items-center justify-end gap-2 text-sm">
    <button className="btn-ghost !py-1.5" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
    <span className="text-mute">{page} / {d.pages}</span>
    <button className="btn-ghost !py-1.5" disabled={page >= d.pages} onClick={() => setPage(page + 1)}>Next</button>
  </div>
);

/* ---------- Matches ---------- */
function MatchForm({ initial, onSubmit, busy, onCancel }) {
  const sports = useSports();
  const comps = useCompetitions();
  const [f, setF] = useState(() => ({
    sportId: initial.sportId?._id || '', competitionId: initial.competitionId?._id || '', homeTeamId: initial.homeTeamId?._id || '', awayTeamId: initial.awayTeamId?._id || '',
    startTime: initial.startTime ? toLocalInput(initial.startTime) : '', venue: initial.venue || '', round: initial.round || '', status: initial.status || 'SCHEDULED',
    homeScore: initial.homeScore ?? 0, awayScore: initial.awayScore ?? 0, clock: initial.clock || '', result: initial.result || '',
  }));
  const [err, setErr] = useState('');
  const teams = useFetch(() => (f.competitionId ? api.teams.list({ competition: f.competitionId, limit: 100 }).then((r) => r.items) : Promise.resolve([])), [f.competitionId]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value, ...(k === 'sportId' && { competitionId: '', homeTeamId: '', awayTeamId: '' }), ...(k === 'competitionId' && { homeTeamId: '', awayTeamId: '' }) }));
  const scored = f.status !== 'SCHEDULED';

  const submit = (e) => {
    e.preventDefault();
    if (!f.sportId || !f.competitionId || !f.homeTeamId || !f.awayTeamId || !f.startTime) return setErr('Sport, competition, both teams and start time are required');
    if (f.homeTeamId === f.awayTeamId) return setErr('Home and away teams must be different');
    const hs = Number(f.homeScore), as = Number(f.awayScore);
    if (scored && (!Number.isInteger(hs) || !Number.isInteger(as) || hs < 0 || as < 0 || hs > 999 || as > 999)) return setErr('Scores must be whole numbers between 0 and 999');
    setErr('');
    onSubmit(({ ...f, startTime: new Date(f.startTime).toISOString(), homeScore: scored ? hs : 0, awayScore: scored ? as : 0 }));
  };
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Sport"><select className="input" value={f.sportId} onChange={set('sportId')}><option value="">Select…</option>{sports.data?.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}</select></Field>
      <Field label="Competition"><select className="input" value={f.competitionId} onChange={set('competitionId')} disabled={!f.sportId}><option value="">Select…</option>{comps.data?.filter((c) => c.sportId?._id === f.sportId).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></Field>
      <Field label="Home team"><select className="input" value={f.homeTeamId} onChange={set('homeTeamId')} disabled={!f.competitionId}><option value="">Select…</option>{teams.data?.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}</select></Field>
      <Field label="Away team"><select className="input" value={f.awayTeamId} onChange={set('awayTeamId')} disabled={!f.competitionId}><option value="">Select…</option>{teams.data?.filter((t) => t._id !== f.homeTeamId).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}</select></Field>
      <Field label="Start time"><input type="datetime-local" className="input" value={f.startTime} onChange={set('startTime')} /></Field>
      <Field label="Status"><select className="input" value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
      <Field label="Home score"><input type="number" min="0" max="999" className="input" value={f.homeScore} onChange={set('homeScore')} disabled={!scored} /></Field>
      <Field label="Away score"><input type="number" min="0" max="999" className="input" value={f.awayScore} onChange={set('awayScore')} disabled={!scored} /></Field>
      <Field label="Clock / period"><input className="input" value={f.clock} onChange={set('clock')} placeholder={"67' · Q3 04:12 · 14.2 ov"} maxLength={20} /></Field>
      <Field label="Round"><input className="input" value={f.round} onChange={set('round')} maxLength={40} /></Field>
      <div className="sm:col-span-2"><Field label="Venue"><input className="input" value={f.venue} onChange={set('venue')} maxLength={100} /></Field></div>
      <div className="sm:col-span-2"><Field label="Result note"><input className="input" value={f.result} onChange={set('result')} placeholder="e.g. Arsenal won 2-1" maxLength={200} /></Field></div>
      {err && <p className="rounded-xl bg-live/10 px-3 py-2 text-sm text-live sm:col-span-2">{err}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn-lime" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}Save match</button>
      </div>
    </form>
  );
}

function MatchesAdmin() {
  const [q, setQ] = useState(''); const dq = useDebounce(q);
  const [status, setStatus] = useState(''); const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [dq, status]);
  const s = useFetch(() => api.matches.list({ q: dq || undefined, status: status || undefined, page, limit: 15 }), [dq, status, page]);
  const c = useCrud(api.matches, 'Match', s.reload);
  return (
    <>
      <Toolbar q={q} setQ={setQ} onNew={() => c.setEditing({})} newLabel="New match">
        <select className="input sm:!w-44" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter"><option value="">All statuses</option>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
      </Toolbar>
      <Async state={s} empty={<Empty title="No matches" />}>
        {(d) => (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-line"><tr><Th className="pl-4">Match</Th><Th>Score</Th><Th>Status</Th><Th>Competition</Th><Th>Date</Th><Th /></tr></thead>
                <tbody>{d.items.map((m) => (
                  <tr key={m._id} className="border-b border-line/60 last:border-0 hover:bg-bg2/60">
                    <td className="py-2.5 pl-4"><Link to={`/match/${m._id}`} className="flex items-center gap-2 font-semibold hover:text-lime"><Crest item={m.homeTeamId} size={22} />{m.homeTeamId?.shortName} v {m.awayTeamId?.shortName}<Crest item={m.awayTeamId} size={22} /></Link></td>
                    <td className="score text-base">{hasScore(m) ? `${scoreLabel(m, 'home')} - ${scoreLabel(m, 'away')}` : '–'}</td>
                    <td><StatusBadge match={m} /></td>
                    <td className="text-mute">{m.competitionId?.shortName || m.competitionId?.name}</td>
                    <td className="whitespace-nowrap text-mute">{fmtDate(m.startTime)} {fmtTime(m.startTime)}</td>
                    <td className="pr-3"><RowActions onEdit={() => c.setEditing(m)} onDelete={() => c.setDeleting(m)} /></td>
                  </tr>))}
                </tbody>
              </table>
            </div>
            <Pager d={d} page={page} setPage={setPage} />
          </>
        )}
      </Async>
      <Modal open={!!c.editing} onClose={() => c.setEditing(null)} title={c.editing?._id ? 'Edit match' : 'New match'} wide>
        {c.editing && <MatchForm initial={c.editing} onSubmit={c.save} busy={c.busy} onCancel={() => c.setEditing(null)} />}
      </Modal>
      <Confirm open={!!c.deleting} onClose={() => c.setDeleting(null)} onConfirm={c.remove} busy={c.busy} title="Delete match?"
        text={c.deleting && `${c.deleting.homeTeamId?.name} vs ${c.deleting.awayTeamId?.name} will be permanently removed.`} />
    </>
  );
}

/* ---------- Teams ---------- */
function TeamForm({ initial, onSubmit, busy, onCancel }) {
  const sports = useSports(); const comps = useCompetitions();
  const [f, setF] = useState({ name: initial.name || '', shortName: initial.shortName || '', country: initial.country || '', sportId: initial.sportId?._id || '', venue: initial.venue || '', color: initial.color || '#C5F36A', logo: initial.logo || '', competitionIds: (initial.competitionIds || []).map((x) => x._id || x) });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value, ...(k === 'sportId' && { competitionIds: [] }) }));
  const toggle = (id) => setF((x) => ({ ...x, competitionIds: x.competitionIds.includes(id) ? x.competitionIds.filter((i) => i !== id) : [...x.competitionIds, id] }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...clean(f), logo: f.logo, competitionIds: f.competitionIds }); }} className="grid gap-4 sm:grid-cols-2">
      <Field label="Name"><input className="input" value={f.name} onChange={set('name')} required minLength={2} maxLength={80} /></Field>
      <Field label="Short name"><input className="input uppercase" value={f.shortName} onChange={set('shortName')} required minLength={2} maxLength={5} /></Field>
      <Field label="Sport"><select className="input" value={f.sportId} onChange={set('sportId')} required disabled={!!initial._id}><option value="">Select…</option>{sports.data?.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}</select></Field>
      <Field label="Country"><input className="input" value={f.country} onChange={set('country')} required minLength={2} maxLength={60} /></Field>
      <Field label="Venue"><input className="input" value={f.venue} onChange={set('venue')} maxLength={100} /></Field>
      <Field label="Colour"><div className="flex gap-2"><input type="color" className="h-[42px] w-14 rounded-xl border border-line bg-bg2" value={f.color} onChange={set('color')} /><input className="input" value={f.color} onChange={set('color')} pattern="#[0-9a-fA-F]{6}" /></div></Field>
      <div className="sm:col-span-2"><Field label="Logo URL (optional)"><input type="url" className="input" value={f.logo} onChange={set('logo')} placeholder="https://…" maxLength={500} /></Field></div>
      {f.sportId && <div className="sm:col-span-2"><span className="label">Competitions</span><div className="flex flex-wrap gap-2">{comps.data?.filter((c) => c.sportId?._id === f.sportId).map((c) => <button type="button" key={c._id} onClick={() => toggle(c._id)} className={`chip ${f.competitionIds.includes(c._id) ? 'chip-on' : ''}`}>{c.name}</button>)}</div></div>}
      <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button><button className="btn-lime" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}Save team</button></div>
    </form>
  );
}

function TeamsAdmin() {
  const [q, setQ] = useState(''); const dq = useDebounce(q); const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [dq]);
  const s = useFetch(() => api.teams.list({ q: dq || undefined, page, limit: 15 }), [dq, page]);
  const c = useCrud(api.teams, 'Team', s.reload);
  return (
    <>
      <Toolbar q={q} setQ={setQ} onNew={() => c.setEditing({})} newLabel="Add team" />
      <Async state={s} empty={<Empty title="No teams" />}>
        {(d) => (<>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="border-b border-line"><tr><Th className="pl-4">Team</Th><Th>Sport</Th><Th>Country</Th><Th>Competitions</Th><Th /></tr></thead>
              <tbody>{d.items.map((t) => (
                <tr key={t._id} className="border-b border-line/60 last:border-0 hover:bg-bg2/60">
                  <td className="py-2.5 pl-4"><Link to={`/team/${t._id}`} className="flex items-center gap-2.5 font-semibold hover:text-lime"><Crest item={t} size={26} />{t.name}</Link></td>
                  <td className="text-mute">{t.sportId?.name}</td><td className="text-mute">{t.country}</td>
                  <td className="text-xs text-mute">{t.competitionIds.map((x) => x.shortName || x.name).join(', ')}</td>
                  <td className="pr-3"><RowActions onEdit={() => c.setEditing(t)} onDelete={() => c.setDeleting(t)} /></td>
                </tr>))}
              </tbody>
            </table>
          </div>
          <Pager d={d} page={page} setPage={setPage} />
        </>)}
      </Async>
      <Modal open={!!c.editing} onClose={() => c.setEditing(null)} title={c.editing?._id ? 'Edit team' : 'Add team'} wide>
        {c.editing && <TeamForm initial={c.editing} onSubmit={c.save} busy={c.busy} onCancel={() => c.setEditing(null)} />}
      </Modal>
      <Confirm open={!!c.deleting} onClose={() => c.setDeleting(null)} onConfirm={c.remove} busy={c.busy} title="Delete team?" text={c.deleting && `${c.deleting.name} and its squad will be removed. Teams with matches cannot be deleted.`} />
    </>
  );
}

/* ---------- Competitions ---------- */
function CompetitionForm({ initial, onSubmit, busy, onCancel }) {
  const sports = useSports();
  const [f, setF] = useState({ name: initial.name || '', shortName: initial.shortName || '', sportId: initial.sportId?._id || '', country: initial.country || '', season: initial.season || '', format: initial.format || 'LEAGUE', color: initial.color || '#C5F36A', logo: initial.logo || '' });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...clean(f), logo: f.logo }); }} className="grid gap-4 sm:grid-cols-2">
      <Field label="Name"><input className="input" value={f.name} onChange={set('name')} required minLength={2} maxLength={80} /></Field>
      <Field label="Short name"><input className="input" value={f.shortName} onChange={set('shortName')} maxLength={8} /></Field>
      <Field label="Sport"><select className="input" value={f.sportId} onChange={set('sportId')} required><option value="">Select…</option>{sports.data?.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}</select></Field>
      <Field label="Country / region"><input className="input" value={f.country} onChange={set('country')} required minLength={2} maxLength={60} /></Field>
      <Field label="Season"><input className="input" value={f.season} onChange={set('season')} required placeholder="2026/27" maxLength={20} /></Field>
      <Field label="Format"><select className="input" value={f.format} onChange={set('format')}><option>LEAGUE</option><option>CUP</option></select></Field>
      <Field label="Colour"><div className="flex gap-2"><input type="color" className="h-[42px] w-14 rounded-xl border border-line bg-bg2" value={f.color} onChange={set('color')} /><input className="input" value={f.color} onChange={set('color')} /></div></Field>
      <Field label="Logo URL (optional)"><input type="url" className="input" value={f.logo} onChange={set('logo')} maxLength={500} /></Field>
      <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button><button className="btn-lime" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}Save competition</button></div>
    </form>
  );
}

function CompetitionsAdmin() {
  const [q, setQ] = useState(''); const dq = useDebounce(q);
  const s = useFetch(() => api.competitions.list({ q: dq || undefined, limit: 100 }), [dq]);
  const c = useCrud(api.competitions, 'Competition', s.reload);
  return (
    <>
      <Toolbar q={q} setQ={setQ} onNew={() => c.setEditing({})} newLabel="New competition" />
      <Async state={s} empty={<Empty title="No competitions" />}>
        {(d) => (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="border-b border-line"><tr><Th className="pl-4">Competition</Th><Th>Sport</Th><Th>Country</Th><Th>Season</Th><Th>Format</Th><Th /></tr></thead>
              <tbody>{d.items.map((x) => (
                <tr key={x._id} className="border-b border-line/60 last:border-0 hover:bg-bg2/60">
                  <td className="py-2.5 pl-4"><Link to={`/competitions/${x._id}`} className="flex items-center gap-2.5 font-semibold hover:text-lime"><Crest item={x} size={26} />{x.name}</Link></td>
                  <td className="text-mute">{x.sportId?.name}</td><td className="text-mute">{x.country}</td><td className="text-mute">{x.season}</td><td className="text-xs text-mute">{x.format}</td>
                  <td className="pr-3"><RowActions onEdit={() => c.setEditing(x)} onDelete={() => c.setDeleting(x)} /></td>
                </tr>))}
              </tbody>
            </table>
          </div>
        )}
      </Async>
      <Modal open={!!c.editing} onClose={() => c.setEditing(null)} title={c.editing?._id ? 'Edit competition' : 'New competition'} wide>
        {c.editing && <CompetitionForm initial={c.editing} onSubmit={c.save} busy={c.busy} onCancel={() => c.setEditing(null)} />}
      </Modal>
      <Confirm open={!!c.deleting} onClose={() => c.setDeleting(null)} onConfirm={c.remove} busy={c.busy} title="Delete competition?" text={c.deleting && `${c.deleting.name} and ALL of its matches will be permanently deleted.`} />
    </>
  );
}

/* ---------- Users ---------- */
function UsersAdmin() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState(''); const dq = useDebounce(q); const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [dq]);
  const s = useFetch(() => api.admin.users({ q: dq || undefined, page, limit: 15 }), [dq, page]);
  const [pending, setPending] = useState(null); // { user, change, text }
  const [busy, setBusy] = useState(false);
  const apply = async () => {
    setBusy(true);
    try { await api.admin.updateUser(pending.user._id, pending.change); toast('User updated'); setPending(null); s.reload(); }
    catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <>
      <Toolbar q={q} setQ={setQ} />
      <Async state={s} empty={<Empty icon={Users} title="No users found" />}>
        {(d) => (<>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-line"><tr><Th className="pl-4">User</Th><Th>Role</Th><Th>Status</Th><Th>Joined</Th><Th /></tr></thead>
              <tbody>{d.items.map((u) => {
                const self = u._id === me._id;
                return (
                  <tr key={u._id} className="border-b border-line/60 last:border-0 hover:bg-bg2/60">
                    <td className="py-2.5 pl-4"><p className="font-semibold">{u.name}{self && <span className="ml-2 text-xs text-lime">(you)</span>}</p><p className="text-xs text-mute">{u.email}</p></td>
                    <td>
                      <select className="input !w-28 !py-1.5 text-xs" value={u.role} disabled={self} aria-label="Role"
                        onChange={(e) => setPending({ user: u, change: { role: e.target.value }, text: `Change ${u.name}'s role to ${e.target.value}?` })}>
                        <option>USER</option><option>ADMIN</option>
                      </select>
                    </td>
                    <td>{u.isActive ? <span className="text-xs font-semibold text-lime">Active</span> : <span className="text-xs font-semibold text-live">Suspended</span>}</td>
                    <td className="text-mute">{fmtDate(u.createdAt)}</td>
                    <td className="pr-3 text-right">
                      {!self && (u.isActive
                        ? <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setPending({ user: u, change: { isActive: false }, text: `Suspend ${u.name}? They will be unable to log in.`, danger: true })}><Ban size={14} />Suspend</button>
                        : <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setPending({ user: u, change: { isActive: true }, text: `Reactivate ${u.name}?` })}><CheckCircle2 size={14} />Reactivate</button>)}
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
          <Pager d={d} page={page} setPage={setPage} />
        </>)}
      </Async>
      <Confirm open={!!pending} onClose={() => setPending(null)} onConfirm={apply} busy={busy} title="Confirm change" text={pending?.text} confirmLabel="Confirm" />
    </>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('Overview');
  const View = { Overview, Matches: MatchesAdmin, Teams: TeamsAdmin, Competitions: CompetitionsAdmin, Users: UsersAdmin }[tab];
  return (
    <div className="container-x py-10">
      <p className="eyebrow mb-2 flex items-center gap-2"><Shield size={13} className="text-lime" />Administrator</p>
      <h1 className="mb-6 font-display text-5xl font-extrabold uppercase">Admin panel</h1>
      <Tabs tabs={['Overview', 'Matches', 'Teams', 'Competitions', 'Users']} value={tab} onChange={setTab} />
      <div className="pt-8"><View /></div>
    </div>
  );
}
