import { useNavigate } from 'react-router-dom';
import { Heart, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useSports, useCompetitions } from '../hooks/useFetch';
import { useAuth, useToast } from '../context/AppContext';

export function SportChips({ value, onChange }) {
  const { data } = useSports();
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto">
      <button className={`chip ${!value ? 'chip-on' : ''}`} onClick={() => onChange('')}>All sports</button>
      {data?.map((s) => <button key={s._id} className={`chip ${value === s.slug ? 'chip-on' : ''}`} onClick={() => onChange(s.slug)}>{s.name}</button>)}
    </div>
  );
}

export function CompetitionSelect({ sport, value, onChange, allLabel = 'All competitions', className = '' }) {
  const { data } = useCompetitions();
  const list = (data || []).filter((c) => !sport || c.sportId?.slug === sport);
  return (
    <select className={`input ${className}`} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Competition">
      {allLabel && <option value="">{allLabel}</option>}
      {list.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
    </select>
  );
}

export function FollowButton({ type, id, small }) {
  const { user, isFollowing, toggleFollow } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const on = isFollowing(type, id);
  const click = async () => {
    if (!user) { toast('Log in to follow and save favourites', 'info'); return nav('/login'); }
    setBusy(true);
    try { await toggleFollow(type, id); toast(on ? 'Removed from favourites' : 'Added to favourites'); }
    catch (e) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };
  return (
    <button onClick={click} disabled={busy} aria-pressed={on} className={`${on ? 'btn-lime' : 'btn-ghost'} ${small ? '!px-3 !py-1.5 text-xs' : ''}`}>
      {busy ? <Loader2 size={15} className="animate-spin" /> : <Heart size={15} fill={on ? 'currentColor' : 'none'} />}
      {on ? 'Following' : 'Follow'}
    </button>
  );
}
