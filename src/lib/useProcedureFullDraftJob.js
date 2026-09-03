import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';

const POLL_INTERVAL_MS = 2000;

// Partagé entre AiFullProcedureDraft.jsx (bouton inline dans le formulaire manuel) et
// NewProcedureFullDraftModal.jsx (parcours dédié depuis la liste) — même pipeline backend
// (POST /procedures/generate-full-draft, services/procedureFullDraftJob.js), même mécanique de
// suivi (polling via setTimeout récursif, pas de WebSocket/SSE dans cette app ; EventSource
// n'aurait de toute façon pas pu porter le token Bearer). Un seul endroit à faire évoluer si ce
// mécanisme change plutôt que deux copies divergentes.
export function useProcedureFullDraftJob() {
  const [job, setJob] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function poll(jobId) {
    timeoutRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/procedures/generation-jobs/${jobId}`);
        setJob(data);
        if (data.status !== 'completed' && data.status !== 'failed') {
          poll(jobId);
        }
      } catch {
        setError('Impossible de suivre la génération.');
      }
    }, POLL_INTERVAL_MS);
  }

  async function start(subject) {
    setError('');
    setJob(null);
    setStarting(true);
    try {
      const { data } = await api.post('/procedures/generate-full-draft', { subject });
      setJob(data);
      poll(data.id);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de lancer la génération complète.');
      return null;
    } finally {
      setStarting(false);
    }
  }

  function reset() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setJob(null);
    setError('');
    setStarting(false);
  }

  const isRunning = Boolean(job && (job.status === 'pending' || job.status === 'running'));
  const progress = job?.total_steps ? Math.round((job.completed_steps / job.total_steps) * 100) : 0;

  return { job, starting, error, isRunning, progress, start, reset };
}
