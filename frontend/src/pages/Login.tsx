import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { session, signIn } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (session) return <Navigate to="/workspace" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setBusy(true);
    try { signIn(await api[mode](email, password)); nav('/workspace'); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <section className="max-w-sm">
      <h1 className="font-serif text-3xl">{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <label className="block text-sm font-medium">Email
          <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">Password
          <input type="password" required minLength={8} maxLength={72} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2" />
          {mode === 'register' && <span className="mt-1 block text-xs font-normal text-charcoal/70">At least 8 characters.</span>}
        </label>
        <button className="btn w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
      <p className="mt-4 text-sm">
        {mode === 'login' ? 'No account yet? ' : 'Already have an account? '}
        <button className="underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create one' : 'Sign in'}</button>
      </p>
    </section>
  );
}
