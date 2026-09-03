import { lazy, Suspense, useEffect, useState } from 'react';
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

// Chargées à la demande plutôt qu'au démarrage : ces ~26 pages ne sont utiles qu'une fois
// connecté, et une session ne visite jamais qu'une poignée d'entre elles — les regrouper dans
// le bundle initial (1,3 Mo avant ce changement, voir l'audit) pénalise le premier chargement
// de TOUT le monde (y compris la page vitrine publique, chargée eagerly ci-dessus) pour un
// gain que seule une fraction des visiteurs (déjà connectés) utilise réellement.
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Planning = lazy(() => import('./pages/Planning.jsx'));
const Documents = lazy(() => import('./pages/Documents.jsx'));
const DocumentDetail = lazy(() => import('./pages/DocumentDetail.jsx'));
const Capas = lazy(() => import('./pages/Capas.jsx'));
const CapaDetail = lazy(() => import('./pages/CapaDetail.jsx'));
const Trainings = lazy(() => import('./pages/Trainings.jsx'));
const SkillMatrix = lazy(() => import('./pages/SkillMatrix.jsx'));
const Kpis = lazy(() => import('./pages/Kpis.jsx'));
const Qqoqccp = lazy(() => import('./pages/Qqoqccp.jsx'));
const QqoqccpDetail = lazy(() => import('./pages/QqoqccpDetail.jsx'));
const Audits = lazy(() => import('./pages/Audits.jsx'));
const AuditDetail = lazy(() => import('./pages/AuditDetail.jsx'));
const ManagementReviews = lazy(() => import('./pages/ManagementReviews.jsx'));
const ManagementReviewDetail = lazy(() => import('./pages/ManagementReviewDetail.jsx'));
const Procedures = lazy(() => import('./pages/Procedures.jsx'));
const ProcedureDetail = lazy(() => import('./pages/ProcedureDetail.jsx'));
const Complaints = lazy(() => import('./pages/Complaints.jsx'));
const ComplaintDetail = lazy(() => import('./pages/ComplaintDetail.jsx'));
const Risks = lazy(() => import('./pages/Risks.jsx'));
const RiskDetail = lazy(() => import('./pages/RiskDetail.jsx'));
const Haccp = lazy(() => import('./pages/Haccp.jsx'));
const HaccpDetail = lazy(() => import('./pages/HaccpDetail.jsx'));
const Suppliers = lazy(() => import('./pages/Suppliers.jsx'));
const SupplierDetail = lazy(() => import('./pages/SupplierDetail.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Services = lazy(() => import('./pages/Services.jsx'));
const Employees = lazy(() => import('./pages/Employees.jsx'));
const MyApprovals = lazy(() => import('./pages/MyApprovals.jsx'));
const GettingStarted = lazy(() => import('./pages/GettingStarted.jsx'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin.jsx'));

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-sm text-slate-400">Chargement...</p>
    </div>
  );
}

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
      <Suspense fallback={<RouteFallback />}>
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
              <Route path="complaints" element={<Complaints />} />
              <Route path="complaints/:id" element={<ComplaintDetail />} />
              <Route path="trainings" element={<Trainings />} />
              <Route path="trainings/matrix" element={<SkillMatrix />} />
              <Route path="kpis" element={<Kpis />} />
              <Route path="qqoqccp" element={<Qqoqccp />} />
              <Route path="qqoqccp/:id" element={<QqoqccpDetail />} />
              <Route path="audits" element={<Audits />} />
              <Route path="audits/:id" element={<AuditDetail />} />
              <Route path="risks" element={<Risks />} />
              <Route path="risks/:id" element={<RiskDetail />} />
              <Route path="haccp" element={<Haccp />} />
              <Route path="haccp/:id" element={<HaccpDetail />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="suppliers/:id" element={<SupplierDetail />} />
              <Route path="management-reviews" element={<ManagementReviews />} />
              <Route path="management-reviews/:id" element={<ManagementReviewDetail />} />
              <Route path="procedures" element={<Procedures />} />
              <Route path="procedures/:id" element={<ProcedureDetail />} />
              <Route path="settings" element={<Settings />} />
              <Route path="services" element={<Services />} />
              <Route path="employees" element={<Employees />} />
              <Route path="my-approvals" element={<MyApprovals />} />
              <Route path="prise-en-main" element={<GettingStarted />} />
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
      </Suspense>
    </BrowserRouter>
  );
}
