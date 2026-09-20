import { useEffect, useRef, useState } from 'react';
import { ImagePlus, PenLine, Trash2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import { imageFileToSignaturePng } from '../../lib/signatureImage.js';
import SignaturePad from '../SignaturePad.jsx';

// Signature du formateur, enregistrée une fois pour la formation : elle est ajoutée automatiquement
// sur le compte rendu Word de chaque QCM RÉUSSI. Enregistrement immédiat (indépendant du bouton
// « Enregistrer » du formulaire de la formation) : c'est une image, pas un champ de formulaire.
export default function InstructorSignatureField({ training, onChanged }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(Boolean(training.has_instructor_signature));
  const [mode, setMode] = useState('view'); // view | draw
  const [drawn, setDrawn] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!training.has_instructor_signature) return;
    api
      .get(`/trainings/${training.id}/instructor-signature`)
      .then(({ data }) => setImage(data?.image || null))
      .catch(() => setError('Impossible de charger la signature.'))
      .finally(() => setLoading(false));
  }, [training.id, training.has_instructor_signature]);

  async function save(dataUrl) {
    setError('');
    setBusy(true);
    try {
      await api.put(`/trainings/${training.id}/instructor-signature`, { image: dataUrl });
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer la signature.");
      setBusy(false);
      return;
    }
    setBusy(false);
    setImage(dataUrl);
    setMode('view');
    setDrawn(null);
    onChanged(true);
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      await save(await imageFileToSignaturePng(file));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Supprimer la signature du formateur ? Les prochains QCM réussis n\'en porteront plus.')) return;
    setError('');
    setBusy(true);
    try {
      await api.delete(`/trainings/${training.id}/instructor-signature`);
    } catch {
      setError('Impossible de supprimer la signature.');
      setBusy(false);
      return;
    }
    setBusy(false);
    setImage(null);
    onChanged(false);
  }

  const buttonClass =
    'flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50';

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">Signature du formateur</label>
      <p className="mb-2 text-xs text-slate-400">
        Ajoutée automatiquement, avec son nom, sur le compte rendu Word d'un QCM <strong>réussi</strong>. Jamais sur un QCM non réussi.
      </p>

      {loading ? (
        <div className="h-16 animate-pulse rounded-md bg-slate-100" />
      ) : mode === 'draw' ? (
        <div className="space-y-2">
          <SignaturePad onChange={setDrawn} disabled={busy} label="Le formateur signe ici" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => save(drawn)}
              disabled={!drawn || busy}
              className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {busy ? 'Enregistrement...' : 'Enregistrer la signature'}
            </button>
            <button type="button" onClick={() => { setMode('view'); setDrawn(null); }} disabled={busy} className={buttonClass}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {image ? (
            <img src={image} alt="Signature du formateur" className="h-16 max-w-full rounded-md border border-slate-200 bg-white p-1 object-contain" />
          ) : (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">Aucune signature enregistrée.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setMode('draw')} disabled={busy} className={buttonClass}>
              <PenLine size={13} />
              {image ? 'Redessiner' : 'Dessiner'}
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy} className={buttonClass}>
              <ImagePlus size={13} />
              Importer une image
            </button>
            {image && (
              <button type="button" onClick={handleDelete} disabled={busy} className={`${buttonClass} hover:text-red-600`}>
                <Trash2 size={13} />
                Supprimer
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} className="hidden" />
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
