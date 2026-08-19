import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { supabase } from './lib/supabase.js';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import LegalTerms from './pages/LegalTerms.jsx';
import LegalPrivacy from './pages/LegalPrivacy.jsx';
import CookieNotice from './components/CookieNotice.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Planning from './pages/Planning.jsx';
import Documents from './pages/Documents.jsx';
import DocumentDetail from './pages/DocumentDetail.jsx';
import Capas from './pages/Capas.jsx';
import CapaDetail from './pages/CapaDetail.jsx';
import Trainings from './pages/Trainings.jsx';
import SkillMatrix from './pages/SkillMatrix.jsx';
import Kpis from './pages/Kpis.jsx';
import Qqoqccp from './pages/Qqoqccp.jsx';
import QqoqccpDetail from './pages/QqoqccpDetail.jsx';
import Audits from './pages/Audits.jsx';
import AuditDetail from './pages/AuditDetail.jsx';
import ManagementReviews from './pages/ManagementReviews.jsx';
import ManagementReviewDetail from './pages/ManagementReviewDetail.jsx';
import Settings from './pages/Settings.jsx';
import Services from './pages/Services.jsx';
import Employees from './pages/Employees.jsx';
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
      <CookieNotice />
      {session ? (
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/legal/cgu" element={<LegalTerms />} />
          <Route path="/legal/confidentialite" element={<LegalPrivacy />} />
          <Route path="/super-admin" element={<SuperAdmin />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="planning" element={<Planning />} />
            <Route path="documents" element={<Documents />} />
            <Route path="documents/:id" element={<DocumentDetail />} />
            <Route path="capas" element={<Capas />} />
            <Route path="capas/:id" element={<CapaDetail />} />
            <Route path="trainings" element={<Trainings />} />
            <Route path="trainings/matrix" element={<SkillMatrix />} />
            <Route path="kpis" element={<Kpis />} />
            <Route path="qqoqccp" element={<Qqoqccp />} />
            <Route path="qqoqccp/:id" element={<QqoqccpDetail />} />
            <Route path="audits" element={<Audits />} />
            <Route path="audits/:id" element={<AuditDetail />} />
            <Route path="management-reviews" element={<ManagementReviews />} />
            <Route path="management-reviews/:id" element={<ManagementReviewDetail />} />
            <Route path="settings" element={<Settings />} />
            <Route path="services" element={<Services />} />
            <Route path="employees" element={<Employees />} />
            <Route path="my-approvals" element={<MyApprovals />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/legal/cgu" element={<LegalTerms />} />
          <Route path="/legal/confidentialite" element={<LegalPrivacy />} />
          <Route path="/" element={<Landing />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
