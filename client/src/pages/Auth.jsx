import { useState } from 'react';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth, useToast } from '../context/AppContext';
import { Field } from '../components/ui';
import { Logo } from '../layouts/MainLayout';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function AuthShell({ title, sub, children }) {
  return (
    <div className="container-x flex justify-center py-16">
      <div className="card w-full max-w-md p-7 sm:p-9">
        <Logo />
        <h1 className="mt-8 font-display text-4xl font-extrabold uppercase">{title}</h1>
        <p className="mb-7 mt-1 text-sm text-mute">{sub}</p>
        {children}
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} className="input pr-10" maxLength={100} />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
    </div>
  );
}

function useForm(initial) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const bind = (k) => ({ value: form[k], onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })) });
  return { form, errors, setErrors, busy, setBusy, bind };
}

export function Login() {
  const { login, user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const f = useForm({ email: '', password: '' });
  if (user) return <Navigate to="/me" replace />;

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!EMAIL.test(f.form.email)) errs.email = 'Enter a valid email';
    if (!f.form.password) errs.password = 'Password is required';
    f.setErrors(errs);
    if (Object.keys(errs).length) return;
    f.setBusy(true);
    try {
      const u = await login(f.form);
      toast(`Welcome back, ${u.name.split(' ')[0]}`);
      nav(loc.state?.from || (u.role === 'ADMIN' ? '/admin' : '/me'), { replace: true });
    } catch (err) { toast(err.message, 'error'); f.setErrors({ form: err.message }); }
    finally { f.setBusy(false); }
  };

  return (
    <AuthShell title="Log in" sub="Track your teams and personalise your dashboard.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" error={f.errors.email}><input type="email" autoComplete="email" className="input" {...f.bind('email')} maxLength={120} /></Field>
        <Field label="Password" error={f.errors.password}><PasswordInput autoComplete="current-password" {...f.bind('password')} /></Field>
        {f.errors.form && <p className="rounded-xl bg-live/10 px-3 py-2 text-sm text-live">{f.errors.form}</p>}
        <button className="btn-lime w-full !py-3" disabled={f.busy}>{f.busy && <Loader2 size={16} className="animate-spin" />}Log in</button>
      </form>
      <p className="mt-6 text-center text-sm text-mute">New to ATHLETIQ? <Link to="/register" className="font-semibold text-lime hover:underline">Create an account</Link></p>
      <p className="mt-4 rounded-xl bg-bg2 p-3 text-center text-xs text-mute">Demo fan: fan@athletiq.dev / Fan@12345</p>
    </AuthShell>
  );
}

export function Register() {
  const { register, user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const f = useForm({ name: '', email: '', password: '', confirmPassword: '' });
  if (user) return <Navigate to="/me" replace />;

  const submit = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword } = f.form;
    const errs = {};
    if (name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!EMAIL.test(email)) errs.email = 'Enter a valid email';
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) errs.password = 'At least 8 characters with a letter and a number';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    f.setErrors(errs);
    if (Object.keys(errs).length) return;
    f.setBusy(true);
    try {
      await register({ ...f.form, name: name.trim() });
      toast('Account created — welcome to ATHLETIQ!');
      nav('/me', { replace: true });
    } catch (err) { toast(err.message, 'error'); f.setErrors({ form: err.message }); }
    finally { f.setBusy(false); }
  };

  return (
    <AuthShell title="Sign up" sub="Create your free account in seconds.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Full name" error={f.errors.name}><input autoComplete="name" className="input" {...f.bind('name')} maxLength={60} /></Field>
        <Field label="Email" error={f.errors.email}><input type="email" autoComplete="email" className="input" {...f.bind('email')} maxLength={120} /></Field>
        <Field label="Password" error={f.errors.password}><PasswordInput autoComplete="new-password" {...f.bind('password')} /></Field>
        <Field label="Confirm password" error={f.errors.confirmPassword}><PasswordInput autoComplete="new-password" {...f.bind('confirmPassword')} /></Field>
        {f.errors.form && <p className="rounded-xl bg-live/10 px-3 py-2 text-sm text-live">{f.errors.form}</p>}
        <button className="btn-lime w-full !py-3" disabled={f.busy}>{f.busy && <Loader2 size={16} className="animate-spin" />}Create account</button>
      </form>
      <p className="mt-6 text-center text-sm text-mute">Already have an account? <Link to="/login" className="font-semibold text-lime hover:underline">Log in</Link></p>
    </AuthShell>
  );
}
