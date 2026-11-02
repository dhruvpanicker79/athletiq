import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { api } from '../services/api';

/* ---------- Toasts ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));
  const toast = useCallback((message, type = 'success') => {
    const id = Math.random();
    setToasts((t) => [...t.slice(-3), { id, message, type }]);
    setTimeout(() => dismiss(id), 3800);
  }, []);
  const Icon = { success: CheckCircle2, error: AlertTriangle, info: Info };
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => {
          const I = Icon[t.type];
          return (
            <div key={t.id} className={`card flex items-start gap-3 p-3.5 shadow-2xl ${t.type === 'error' ? 'border-live/50' : 'border-lime/40'}`}>
              <I size={18} className={t.type === 'error' ? 'text-live' : 'text-lime'} />
              <p className="flex-1 text-sm">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-mute hover:text-ink"><X size={16} /></button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Auth ---------- */
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);
const FIELD = { team: 'favoriteTeams', competition: 'favoriteCompetitions', sport: 'favoriteSports' };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { api.auth.me().then((r) => setUser(r.user)).catch(() => setUser(null)).finally(() => setReady(true)); }, []);

  const login = async (body) => { const r = await api.auth.login(body); setUser(r.user); return r.user; };
  const register = async (body) => { const r = await api.auth.register(body); setUser(r.user); return r.user; };
  const logout = async () => { await api.auth.logout().catch(() => {}); setUser(null); };
  const isFollowing = (type, id) => !!user?.[FIELD[type]]?.some((x) => String(x._id || x) === String(id));
  const toggleFollow = async (type, id) => {
    const r = isFollowing(type, id) ? await api.users.unfollow(type, id) : await api.users.follow(type, id);
    setUser(r.user);
    return isFollowing(type, id);
  };

  return (
    <AuthCtx.Provider value={{ user, ready, setUser, login, register, logout, isFollowing, toggleFollow, isAdmin: user?.role === 'ADMIN' }}>
      {children}
    </AuthCtx.Provider>
  );
}
