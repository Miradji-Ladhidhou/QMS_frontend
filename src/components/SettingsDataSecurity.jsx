import { useEffect, useState } from 'react';
import { Download, ExternalLink, KeyRound, Loader2, LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { supabase } from '../lib/supabase.js';
import { useTenant } from '../lib/useTenant.js';

export default function SettingsDataSecurity({ isAdmin, isSuperAdmin, canContactSupport }) {
  const tenant = useTenant();
  const [signingOut, setSigningOut] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmationName, setConfirmationName] = useState('');
  const [factors, setFactors] = useState([]);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketStatus, setTicketStatus] = useState('');
  const [supportTickets, setSupportTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  async function loadSupportTickets() {
    if (!canContactSupport) return;
    setTicketsLoading(true);
    try {
      const { data } = await api.get('/support');
      setSupportTickets(data || []);
    } catch {
      setError('Impossible de charger vos tickets support.');
    } finally {
      setTicketsLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => setFactors(data?.totp || [])).catch(() => {});
    loadSupportTickets();
  }, [canContactSupport]);

  async function signOutEverywhere() {
    if (!window.confirm('Déconnecter ce compte de tous les appareils ?')) return;
    setError('');
    setSigningOut(true);
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
    if (signOutError) {
      setError('Impossible de déconnecter les autres sessions.');
      setSigningOut(false);
      return;
    }
    window.location.assign('/login');
  }

  async function exportData() {
    setError('');
    setExporting(true);
    try {
      const { data } = await api.get('/tenant/data-export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `qms-export-${tenant?.slug || 'entreprise'}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'exporter les données.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (!tenant?.name || confirmationName !== tenant.name) {
      setError("Saisissez exactement le nom de l'entreprise pour confirmer.");
      return;
    }
    if (!window.confirm('Cette suppression est définitive. Continuer ?')) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete('/tenant/account', { data: { confirmation_name: confirmationName } });
      await supabase.auth.signOut({ scope: 'global' });
      window.location.assign('/login');
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de supprimer l'entreprise.");
      setDeleting(false);
    }
  }

  async function enrollMfa() {
    setError('');
    setEnrolling(true);
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'QMS SaaS' });
    setEnrolling(false);
    if (enrollError) setError("Impossible d'activer la double authentification.");
    else setEnrollData(data);
  }

  async function verifyMfa() {
    if (!enrollData || !mfaCode.trim()) return;
    setError('');
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: enrollData.id });
    if (challengeError) return setError('Impossible de démarrer la vérification MFA.');
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: enrollData.id, challengeId: challenge.id, code: mfaCode.trim() });
    if (verifyError) return setError('Code MFA invalide.');
    setFactors((current) => [...current, enrollData]);
    setEnrollData(null);
    setMfaCode('');
  }

  async function disableMfa(factorId) {
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
    if (unenrollError) setError('Impossible de désactiver la double authentification.');
    else setFactors((current) => current.filter((factor) => factor.id !== factorId));
  }

  async function createTicket(event) {
    event.preventDefault();
    setTicketStatus('');
    try {
      await api.post('/support', { subject: ticketSubject, message: ticketMessage });
      setTicketSubject('');
      setTicketMessage('');
      setTicketStatus('Ticket envoyé au support.');
      await loadSupportTickets();
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de créer le ticket.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Données et sécurité</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Les données sont isolées par entreprise. Votre mot de passe se modifie dans « Mon profil » et les sessions peuvent
          être révoquées ici.
        </p>
        {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={signOutEverywhere}
          disabled={signingOut}
          className="mt-4 flex min-h-[40px] items-center gap-2 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {signingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
          {signingOut ? 'Déconnexion...' : 'Déconnecter tous les appareils'}
        </button>
      </div>

      {canContactSupport && <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Contacter le support</h2>
        <p className="mt-2 text-sm text-slate-600">Décrivez votre problème. Un super administrateur pourra suivre et traiter votre demande.</p>
        <form onSubmit={createTicket} className="mt-4 space-y-3">
          <input required maxLength={200} value={ticketSubject} onChange={(event) => setTicketSubject(event.target.value)} placeholder="Sujet" className="w-full rounded-md border border-slate-300 px-3 py-2 text-base" />
          <textarea required maxLength={5000} rows={4} value={ticketMessage} onChange={(event) => setTicketMessage(event.target.value)} placeholder="Décrivez votre demande" className="w-full rounded-md border border-slate-300 px-3 py-2 text-base" />
          <button type="submit" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">Envoyer au support</button>
        </form>
        {ticketStatus && <p className="mt-3 text-sm text-emerald-700">{ticketStatus}</p>}
        <div className="mt-5 border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Mes tickets</h3>
            <button type="button" onClick={loadSupportTickets} className="text-xs font-medium text-primary hover:underline">Actualiser</button>
          </div>
          {ticketsLoading ? <p className="mt-3 text-sm text-slate-500">Chargement...</p> : supportTickets.length === 0 ? <p className="mt-3 text-sm text-slate-500">Aucun ticket créé.</p> : (
            <ul className="mt-3 space-y-2">
              {supportTickets.map((ticket) => (
                <li key={ticket.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{ticket.subject}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {{ open: 'Ouvert', in_progress: 'En cours', resolved: 'Résolu', closed: 'Fermé' }[ticket.status] || ticket.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Priorité : {ticket.priority} · {new Date(ticket.updated_at || ticket.created_at).toLocaleString('fr-FR')}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{ticket.message}</p>
                  {ticket.admin_note && <p className="mt-2 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">Réponse du support : {ticket.admin_note}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>}

      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <KeyRound size={18} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Double authentification</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">Ajoutez une validation par application d'authentification à votre compte.</p>
        {factors.length === 0 && !enrollData ? (
          <button type="button" onClick={enrollMfa} disabled={enrolling} className="mt-4 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60">
            {enrolling ? 'Préparation...' : 'Activer la double authentification'}
          </button>
        ) : factors.length > 0 ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <span>Double authentification activée</span>
            <button type="button" onClick={() => disableMfa(factors[0].id)} className="text-xs font-medium underline">Désactiver</button>
          </div>
        ) : null}
        {enrollData && (
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
            {enrollData.totp?.qr_code && <img src={enrollData.totp.qr_code} alt="QR code de configuration MFA" className="h-40 w-40 bg-white p-2" />}
            <label className="mt-3 block text-sm font-medium text-slate-700">Code de vérification</label>
            <div className="mt-1 flex gap-2">
              <input value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} inputMode="numeric" className="w-40 rounded-md border border-slate-300 px-3 py-2 text-base" />
              <button type="button" onClick={verifyMfa} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white">Vérifier</button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-slate-900 sm:text-base">Documents légaux et données</h2>
        <p className="mt-2 text-sm text-slate-600">
          Consultez les informations relatives à la confidentialité et aux conditions d'utilisation. Les administrateurs
          peuvent exporter les données de l'entreprise ; sa suppression reste réservée au Super Admin.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
          <Link to="/legal/confidentialite" className="inline-flex items-center gap-1 text-primary hover:underline">
            Politique de confidentialité <ExternalLink size={14} />
          </Link>
          <Link to="/legal/cgu" className="inline-flex items-center gap-1 text-primary hover:underline">
            Conditions d'utilisation <ExternalLink size={14} />
          </Link>
        </div>
        {isAdmin && (
          <>
            <button type="button" onClick={exportData} disabled={exporting} className="mt-4 flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              <Download size={16} />
              {exporting ? 'Export...' : 'Exporter les données de l’entreprise'}
            </button>
            {isSuperAdmin && <div className="mt-5 border-t border-red-200 pt-4">
              <p className="text-sm font-semibold text-red-800">Supprimer définitivement l’entreprise</p>
              <p className="mt-1 text-xs text-red-700">Cette action supprime les données du tenant et les comptes associés.</p>
              <input value={confirmationName} onChange={(event) => setConfirmationName(event.target.value)} placeholder={tenant?.name || "Nom de l'entreprise"} className="mt-3 w-full rounded-md border border-red-300 px-3 py-2 text-base sm:max-w-sm" />
              <button type="button" onClick={deleteAccount} disabled={deleting} className="mt-2 flex items-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60">
                <Trash2 size={16} />
                {deleting ? 'Suppression...' : 'Supprimer l’entreprise'}
              </button>
            </div>}
          </>
        )}
      </div>
    </div>
  );
}
