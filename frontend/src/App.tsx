import { Link, Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import Workspace from './pages/Workspace';
import Dataset from './pages/Dataset';
import Reports from './pages/Reports';
import ReportView from './pages/ReportView';
import Login from './pages/Login';
import { RequireAuth, useAuth } from './lib/auth';
export default function App() {
  const { session, signOut } = useAuth();
  return (
    <>
      <header className="border-b border-line print:hidden">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="font-serif text-xl text-forest">InsightFlow</Link>
          <div className="flex gap-5 text-sm font-medium"><Link to="/workspace" className="hover:text-forest">Workspace</Link><Link to="/reports" className="hover:text-forest">Reports</Link>{session ? <button onClick={signOut} className="hover:text-forest" title={session.email}>Sign out</button> : <Link to="/login" className="hover:text-forest">Sign in</Link>}</div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Routes><Route path="/" element={<Landing />} /><Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/datasets/:id" element={<Dataset />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/:id" element={<ReportView />} />
          </Route>
          <Route path="*" element={<p>Page not found.</p>} /></Routes>
      </main>
    </>
  );
}
