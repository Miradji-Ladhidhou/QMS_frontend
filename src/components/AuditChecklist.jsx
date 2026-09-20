import { useEffect, useMemo, useState } from 'react';
import { ListChecks, Loader2, Pencil, Plus, Sparkles, Trash2, X, ClipboardPaste, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { CHECKLIST_ANSWERS, conformityTone, summarizeChecklist } from '../lib/auditChecklist.js';
import AutoTextarea from './AutoTextarea.jsx';

const INPUT_CLASS =
  'w-full rounded-md border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary';

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
}

// Une question : énoncé, trois boutons de réponse (un appui recommence pour retirer la réponse), observation
// enregistrée quand on quitte le champ. Lecture seule pour ceux qui ne peuvent pas écrire dans l'audit.
function ChecklistItem({ item, index, canManage, onPatch, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [question, setQuestion] = useState(item.question);
  const [observation, setObservation] = useState(item.observation || '');

  useEffect(() => setObservation(item.observation || ''), [item.observation]);

  async function saveQuestion() {
    const trimmed = question.trim();
    if (!trimmed || trimmed === item.question) {
      setQuestion(item.question);
      setEditing(false);
      return;
    }
    if (await onPatch(item.id, { question: trimmed })) setEditing(false);
  }

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <div className="min-w-0 flex-1 space-y-2">
            <AutoTextarea rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} className={INPUT_CLASS} autoFocus />
            <div className="flex gap-2">
              <button type="button" onClick={saveQuestion} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700">
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuestion(item.question);
                  setEditing(false);
                }}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <p className="min-w-0 break-words text-sm font-medium text-slate-900">
            <span className="mr-1.5 text-slate-400">{index + 1}.</span>
            {item.question}
            {item.source === 'ai' && (
              <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 align-middle text-[10px] font-medium text-violet-700">
                <Sparkles size={10} />
                IA
              </span>
            )}
          </p>
        )}
        {canManage && !editing && (
          <div className="flex shrink-0 gap-0.5">
            <button type="button" onClick={() => setEditing(true)} aria-label="Modifier la question" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary">
              <Pencil size={14} />
            </button>
            <button type="button" onClick={() => onDelete(item)} aria-label="Supprimer la question" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {CHECKLIST_ANSWERS.map((answer) => {
          const selected = item.answer === answer.value;
          return (
            <button
              key={answer.value}
              type="button"
              disabled={!canManage}
              aria-pressed={selected}
              onClick={() => onPatch(item.id, { answer: selected ? null : answer.value })}
              className={`rounded-md border px-1.5 py-2 text-xs font-medium transition-colors sm:text-sm ${selected ? answer.active : answer.idle} disabled:cursor-default ${
                !canManage && !selected ? 'opacity-50' : ''
              }`}
            >
              {answer.label}
            </button>
          );
        })}
      </div>

      {canManage ? (
        <AutoTextarea
          rows={1}
          placeholder="Observation, preuve consultée…"
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
          onBlur={() => observation.trim() !== (item.observation || '') && onPatch(item.id, { observation: observation.trim() })}
          className={`${INPUT_CLASS} mt-2 !py-2 !text-sm`}
        />
      ) : (
        item.observation && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{item.observation}</p>
      )}

      {item.answer && item.answerer?.full_name && (
        <p className="mt-1.5 text-[11px] text-slate-400">
          {item.answerer.full_name} · {formatDateTime(item.answered_at)}
        </p>
      )}
    </li>
  );
}

// Fenêtre de génération par l'IA : nombre de questions → propositions à relire (cocher, corriger) → ajout.
// Rien n'est enregistré tant que l'auditeur n'a pas validé.
function AiGenerateModal({ auditId, onClose, onAdded }) {
  const [count, setCount] = useState('10');
  const [suggestions, setSuggestions] = useState(null); // [{ text, keep }]
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setError('');
    setGenerating(true);
    try {
      const { data } = await api.post(`/audits/${auditId}/checklist/generate`, { count: Number(count) });
      setSuggestions(data.questions.map((text) => ({ text, keep: true })));
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de générer les questions.");
    } finally {
      setGenerating(false);
    }
  }

  const kept = (suggestions || []).filter((suggestion) => suggestion.keep && suggestion.text.trim());

  async function add() {
    setError('');
    setSaving(true);
    try {
      await api.post(`/audits/${auditId}/checklist/items/bulk`, { questions: kept.map((suggestion) => suggestion.text.trim()), source: 'ai' });
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'ajouter les questions.");
      setSaving(false);
      return;
    }
    setSaving(false);
    onAdded();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92vh] w-full overflow-y-auto overflow-x-hidden rounded-t-xl bg-white p-5 sm:max-w-xl sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Sparkles size={18} className="text-violet-600" />
              Générer avec l'IA
            </h2>
            <p className="text-sm text-slate-500">Questions proposées d'après le titre, le type, le périmètre, le service et les constats de l'audit.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="shrink-0 p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {suggestions === null ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nombre de questions</label>
              <input type="number" min="3" max="25" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} className={`${INPUT_CLASS} sm:max-w-[10rem]`} />
              <p className="mt-1 text-xs text-slate-400">Entre 3 et 25. Vous relisez et corrigez les propositions avant de les ajouter.</p>
            </div>
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Plus le <strong>périmètre</strong> de l'audit est précis, plus les questions sont pertinentes. Les questions déjà présentes ne sont pas reproposées.
            </p>
            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? 'Génération en cours...' : 'Générer les questions'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Décochez ce que vous ne voulez pas, corrigez le texte si besoin.</p>
            <ul className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={suggestion.keep}
                    onChange={(e) => setSuggestions((prev) => prev.map((item, i) => (i === index ? { ...item, keep: e.target.checked } : item)))}
                    aria-label={`Garder la question ${index + 1}`}
                    className="mt-3 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <AutoTextarea
                    rows={2}
                    value={suggestion.text}
                    onChange={(e) => setSuggestions((prev) => prev.map((item, i) => (i === index ? { ...item, text: e.target.value } : item)))}
                    className={`${INPUT_CLASS} !py-2 !text-sm ${suggestion.keep ? '' : 'opacity-50'}`}
                  />
                </li>
              ))}
            </ul>
            {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={add}
                disabled={saving || kept.length === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
              >
                <Check size={16} />
                {saving ? 'Ajout...' : `Ajouter ${kept.length} question${kept.length > 1 ? 's' : ''}`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuggestions(null);
                  setError('');
                }}
                disabled={saving}
                className="rounded-md border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Regénérer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Fenêtre « coller une liste » : une question par ligne (puces et numéros retirés côté serveur).
function PasteListModal({ auditId, onClose, onAdded }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const lines = useMemo(() => text.split('\n').filter((line) => line.trim()), [text]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post(`/audits/${auditId}/checklist/items/bulk`, { questions: lines, source: 'manual' });
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'ajouter les questions.");
      setSaving(false);
      return;
    }
    setSaving(false);
    onAdded();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Coller une liste de questions</h2>
            <p className="text-sm text-slate-500">Une question par ligne ; les puces et numéros sont retirés.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="shrink-0 p-1 text-slate-500 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <AutoTextarea rows={8} autoFocus placeholder={'1. Les bons de commande sont-ils signés ?\n2. Les fournisseurs critiques sont-ils évalués ?'} value={text} onChange={(e) => setText(e.target.value)} className={INPUT_CLASS} />
          {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving || lines.length === 0} className="w-full rounded-md bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-60">
            {saving ? 'Ajout...' : `Ajouter ${lines.length} question${lines.length > 1 ? 's' : ''}`}
          </button>
        </form>
      </div>
    </div>
  );
}

// Check-list (QCM) d'audit : questions saisies à la main, collées ou générées par l'IA, réponses de l'auditeur
// (Conforme / Non conforme / Sans objet) et taux de conformité. `onChanged` prévient la page parente (utile
// pour recharger ce qui en dépend).
export default function AuditChecklist({ auditId, canManage, onChanged }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [adding, setAdding] = useState(false);
  const [modal, setModal] = useState(null); // 'ai' | 'paste' | null

  async function load() {
    try {
      const { data } = await api.get(`/audits/${auditId}/checklist`);
      setItems(data.items);
    } catch {
      setError('Impossible de charger la check-list.');
      setItems([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId]);

  const summary = useMemo(() => summarizeChecklist(items || []), [items]);

  // Retourne true si l'enregistrement a réussi (le champ d'édition se referme alors).
  async function patchItem(itemId, patch) {
    setError('');
    try {
      const { data } = await api.patch(`/audits/${auditId}/checklist/items/${itemId}`, patch);
      setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, ...data } : item)));
      onChanged?.();
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible d\'enregistrer la modification.');
      return false;
    }
  }

  async function deleteItem(item) {
    if (!window.confirm(`Supprimer la question « ${item.question} » ?`)) return;
    setError('');
    try {
      await api.delete(`/audits/${auditId}/checklist/items/${item.id}`);
    } catch {
      setError('Impossible de supprimer la question.');
      return;
    }
    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    onChanged?.();
  }

  async function addQuestion(event) {
    event.preventDefault();
    if (!newQuestion.trim()) return;
    setError('');
    setAdding(true);
    try {
      await api.post(`/audits/${auditId}/checklist/items`, { question: newQuestion.trim() });
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'ajouter la question.");
      setAdding(false);
      return;
    }
    setAdding(false);
    setNewQuestion('');
    await load();
    onChanged?.();
  }

  async function handleAdded() {
    setModal(null);
    await load();
    onChanged?.();
  }

  const progress = summary.total === 0 ? 0 : Math.round((summary.answered / summary.total) * 100);

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 sm:text-base">
          <ListChecks size={18} className="text-primary" />
          Check-list d'audit (QCM) {items !== null && `(${summary.total})`}
        </h2>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setModal('ai')}
              className="flex items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
            >
              <Sparkles size={15} />
              Générer avec l'IA
            </button>
            <button type="button" onClick={() => setModal('paste')} className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <ClipboardPaste size={15} />
              Coller une liste
            </button>
          </div>
        )}
      </div>

      {summary.total > 0 && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            <span className="font-medium text-slate-800">
              {summary.answered}/{summary.total} répondue{summary.answered > 1 ? 's' : ''}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${conformityTone(summary.conformity_percent)}`}>
              {summary.conformity_percent === null ? 'Conformité : —' : `Conformité : ${summary.conformity_percent} %`}
            </span>
            <span className="text-xs text-slate-500">
              {summary.conform} conforme · {summary.nonconform} non conforme · {summary.na} sans objet
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {items === null ? (
        <div className="mt-3 h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
      ) : items.length === 0 ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
          Aucune question pour l'instant.{' '}
          {canManage
            ? "Ajoutez vos questions ci-dessous, collez une liste, ou laissez l'IA proposer une check-list adaptée à cet audit."
            : "L'auditeur n'a pas encore préparé de check-list."}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((item, index) => (
            <ChecklistItem key={item.id} item={item} index={index} canManage={canManage} onPatch={patchItem} onDelete={deleteItem} />
          ))}
        </ul>
      )}

      {canManage && (
        <form onSubmit={addQuestion} className="mt-3 flex items-start gap-2">
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Ajouter une question (ex : Les enregistrements sont-ils signés ?)"
            className={`${INPUT_CLASS} min-w-0 flex-1`}
          />
          <button
            type="submit"
            disabled={adding || !newQuestion.trim()}
            aria-label="Ajouter la question"
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Ajouter</span>
          </button>
        </form>
      )}

      {modal === 'ai' && <AiGenerateModal auditId={auditId} onClose={() => setModal(null)} onAdded={handleAdded} />}
      {modal === 'paste' && <PasteListModal auditId={auditId} onClose={() => setModal(null)} onAdded={handleAdded} />}
    </section>
  );
}
