import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { supabase } from './lib/supabase.js';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Documents from './pages/Documents.jsx';
import DocumentDetail from './pages/DocumentDetail.jsx';
import Capas from './pages/Capas.jsx';
import CapaDetail from './pages/CapaDetail.jsx';
import Trainings from './pages/Trainings.jsx';
import SkillMatrix from './pages/SkillMatrix.jsx';
import Kpis from './pages/Kpis.jsx';
import Qqoqccp from './pages/Qqoqccp.jsx';
import QqoqccpDetail from './pages/QqoqccpDetail.jsx';
import Settings from './pages/Settings.jsx';
import MyApprovals from './pages/MyApprovals.jsx';
import SuperAdmin from './pages/SuperAdmin.jsx';

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Chargement...</p>
      </div>
    );
  }

  // Deux arbres de routes distincts plutôt qu'un ProtectedRoute qui redirige : non connecté,
  // "/" est la page publique (vitrine) ; connecté, "/" est le tableau de bord de l'app. Aucun
  // chemin interne existant (/documents, /capas/:id, etc.) n'est modifié par ce choix.
  return (
    <BrowserRouter>
      {session ? (
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="/super-admin" element={<SuperAdmin />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="documents" element={<Documents />} />
            <Route path="documents/:id" element={<DocumentDetail />} />
            <Route path="capas" element={<Capas />} />
            <Route path="capas/:id" element={<CapaDetail />} />
            <Route path="trainings" element={<Trainings />} />
            <Route path="trainings/matrix" element={<SkillMatrix />} />
            <Route path="kpis" element={<Kpis />} />
            <Route path="qqoqccp" element={<Qqoqccp />} />
            <Route path="qqoqccp/:id" element={<QqoqccpDetail />} />
            <Route path="settings" element={<Settings />} />
            <Route path="my-approvals" element={<MyApprovals />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Landing />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
