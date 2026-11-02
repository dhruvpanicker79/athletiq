import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Search, Heart, User, Menu, X, LogOut, Shield, LayoutDashboard } from 'lucide-react';
import { useAuth, useToast } from '../context/AppContext';

const NAV = [['/', 'Home'], ['/live', 'Live Scores'], ['/fixtures', 'Fixtures'], ['/results', 'Results'], ['/competitions', 'Competitions']];

export const Logo = () => (
  <Link to="/" className="flex items-center gap-2" aria-label="ATHLETIQ home">
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden><rect width="32" height="32" rx="8" fill="#C5F36A" /><path d="M9 24 16 7l7 17h-4l-3-8-3 8z" fill="#0D1010" /></svg>
    <span className="font-display text-2xl font-extrabold tracking-[0.08em]">ATHLETIQ</span>
  </Link>
);

function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { setOpen(false); setMenu(false); setSearch(false); }, [loc.pathname]);
  useEffect(() => { if (search) inputRef.current?.focus(); }, [search]);

  const submit = (e) => { e.preventDefault(); if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`); };
  const doLogout = async () => { await logout(); toast('Logged out'); nav('/'); };
  const link = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'text-lime' : 'text-mute hover:text-ink'}`;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map(([to, l]) => <NavLink key={to} to={to} end={to === '/'} className={link}>{l}</NavLink>)}
        </nav>
        <div className="flex items-center gap-1">
          <button onClick={() => setSearch((s) => !s)} aria-label="Search" className="rounded-lg p-2.5 text-mute hover:bg-bg2 hover:text-ink"><Search size={19} /></button>
          <Link to={user ? '/me' : '/login'} aria-label="Favourite teams" className="rounded-lg p-2.5 text-mute hover:bg-bg2 hover:text-ink"><Heart size={19} /></Link>
          {user ? (
            <div className="relative">
              <button onClick={() => setMenu((m) => !m)} className="ml-1 flex items-center gap-2 rounded-xl border border-line py-1.5 pl-1.5 pr-3 text-sm hover:bg-bg2" aria-expanded={menu}>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-lime font-bold text-bg">{user.name[0]?.toUpperCase()}</span>
                <span className="hidden max-w-[110px] truncate font-medium sm:inline">{user.name.split(' ')[0]}</span>
              </button>
              {menu && (
                <div className="card absolute right-0 mt-2 w-52 overflow-hidden p-1.5 shadow-2xl">
                  <Link to="/me" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-bg2"><LayoutDashboard size={16} />My dashboard</Link>
                  {isAdmin && <Link to="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-bg2"><Shield size={16} />Admin panel</Link>}
                  <button onClick={doLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-live hover:bg-bg2"><LogOut size={16} />Log out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn-lime ml-1 !py-2"><User size={16} /><span className="hidden sm:inline">Login</span></Link>
          )}
          <button onClick={() => setOpen((o) => !o)} className="rounded-lg p-2.5 text-mute hover:bg-bg2 lg:hidden" aria-label="Menu" aria-expanded={open}>{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {search && (
        <form onSubmit={submit} className="container-x pb-3">
          <div className="relative">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teams, competitions, players…" className="input pl-10" maxLength={60} />
          </div>
        </form>
      )}
      {open && (
        <nav className="container-x flex flex-col gap-1 border-t border-line py-3 lg:hidden">
          {NAV.map(([to, l]) => <NavLink key={to} to={to} end={to === '/'} className={link}>{l}</NavLink>)}
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-bg2/40">
      <div className="container-x grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 font-display text-lg font-semibold uppercase tracking-wider text-lime">Beyond the Scoreboard.</p>
          <p className="mt-2 max-w-md text-sm text-mute">ATHLETIQ is a sports scores and analytics platform for football, cricket and basketball. Built as a MERN-stack web programming project.</p>
          <p className="mt-4 max-w-md rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-100/80">All scores, statistics and players shown are seeded <b>demo data</b> for demonstration only — not live or real-world results.</p>
        </div>
        <div>
          <h4 className="eyebrow mb-3">Navigate</h4>
          <ul className="space-y-2 text-sm">{NAV.map(([to, l]) => <li key={to}><Link to={to} className="text-mute hover:text-ink">{l}</Link></li>)}</ul>
        </div>
        <div>
          <h4 className="eyebrow mb-3">About & contact</h4>
          <ul className="space-y-2 text-sm text-mute">
            <li><Link to="/me" className="hover:text-ink">My dashboard</Link></li>
            <li><a href="mailto:hello@athletiq.dev" className="hover:text-ink">hello@athletiq.dev</a></li>
            <li>Web Programming Project</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-mute">© {new Date().getFullYear()} ATHLETIQ. All rights reserved.</div>
    </footer>
  );
}

export default function MainLayout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
