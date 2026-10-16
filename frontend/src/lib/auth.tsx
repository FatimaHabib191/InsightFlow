import { createContext, useContext, useState, type ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const KEY = 'insightflow_session';
export interface Session { token: string; email: string }

export const getSession = (): Session | null => { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { return null; } };
export const clearSession = () => localStorage.removeItem(KEY);

const Ctx = createContext<{ session: Session | null; signIn: (s: Session) => void; signOut: () => void }>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(getSession);
  const signIn = (s: Session) => { localStorage.setItem(KEY, JSON.stringify(s)); setSession(s); };
  const signOut = () => { clearSession(); setSession(null); };
  return <Ctx.Provider value={{ session, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function RequireAuth() {
  return useAuth().session ? <Outlet /> : <Navigate to="/login" replace />;
}
