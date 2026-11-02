import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { useAuth } from './context/AppContext';
import { Spinner } from './components/ui';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import MatchesPage from './pages/MatchesPage';
import Competitions from './pages/Competitions';
import CompetitionDetail from './pages/CompetitionDetail';
import MatchCentre from './pages/MatchCentre';
import { TeamPage, PlayerPage } from './pages/Profiles';
import { Login, Register } from './pages/Auth';
import MyDashboard from './pages/MyDashboard';
import Admin from './pages/Admin';
import SearchPage from './pages/SearchPage';
import NotFound from './pages/NotFound';

function Protected({ admin, children }) {
  const { user, ready, isAdmin } = useAuth();
  const loc = useLocation();
  if (!ready) return <div className="flex justify-center py-32"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (admin && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="live" element={<Dashboard />} />
        <Route path="fixtures" element={<MatchesPage mode="fixtures" />} />
        <Route path="results" element={<MatchesPage mode="results" />} />
        <Route path="competitions" element={<Competitions />} />
        <Route path="competitions/:id" element={<CompetitionDetail />} />
        <Route path="match/:id" element={<MatchCentre />} />
        <Route path="team/:id" element={<TeamPage />} />
        <Route path="player/:id" element={<PlayerPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="me" element={<Protected><MyDashboard /></Protected>} />
        <Route path="admin" element={<Protected admin><Admin /></Protected>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
