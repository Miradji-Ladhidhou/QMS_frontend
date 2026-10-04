import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { generateAi } from './aiGenerations.js';

const POLL_INTERVAL_MS = 2000;

// Partagé entre AiFullProcedureDraft.jsx (bouton inline dans le formulaire manuel) et
// NewProcedureFullDraftModal.jsx (parcours dédié depuis la liste) — même pipeline backend
// (POST /procedures/generate-full-draft, services/procedureFullDraftJob.js), même mécanique de
// suivi (polling via setTimeout récursif, pas de WebSocket/SSE dans cette app ; EventSource
// n'aurait de toute façon pas pu porter le token Bearer). Un seul endroit à faire évoluer si ce
// mécanisme change plutôt que deux copies divergentes.
export function useProcedureFullDraftJob(subjectFilter = '') {
  const [job, setJob] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const timeoutRef = useRef(null);
  const startingRef = useRef(false);
  const restoreControllerRef = useRef(null);
  const mountedRef = useRef(false);
  const [restored, setRestored] = useState(false);
  const [previousJob, setPreviousJob] = useState(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      restoreControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    restoreControllerRef.current = controller;
    setPreviousJob(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    api.get('/procedures/generation-jobs/latest', { params: { subject: subjectFilter || undefined }, signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted && !startingRef.current && data.job) {
          setJob(data.job);
          setPreviousJob(data.previous_job || null);
          setRestored(true);
          if (['pending', 'running'].includes(data.job.status)) poll(data.job.id);
        } else if (!controller.signal.aborted && !startingRef.current && !data.job) {
          setJob(null);
        }
      }).catch((err) => {
        if (!controller.signal.aborted) setError(err.response?.data?.error || 'Impossible de retrouver la génération.');
      });
    return () => controller.abort();
  }, [subjectFilter]);

  function poll(jobId) {
    timeoutRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/procedures/generation-jobs/${jobId}`);
        if (!mountedRef.current) return;
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
    if (startingRef.current || ['pending', 'running'].includes(job?.status)) return null;
    startingRef.current = true;
    restoreControllerRef.current?.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setRestored(false);
    if (job?.status === 'completed' && job.subject === subject) setPreviousJob(job);
    else if (previousJob?.subject !== subject) setPreviousJob(null);
    setError('');
    setJob(null);
    setStarting(true);
    try {
      const { data } = await generateAi('/procedures/generate-full-draft', { subject }, job?.subject === subject);
      setJob(data);
      if (['pending', 'running'].includes(data.status)) poll(data.id);
      return data;
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de lancer la génération complète.');
      return null;
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }

  function reset() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setJob(null);
    setError('');
    setStarting(false);
    setPreviousJob(null);
    setRestored(false);
    restoreControllerRef.current?.abort();
  }

  const isRunning = Boolean(job && (job.status === 'pending' || job.status === 'running'));
  const progress = job?.total_steps ? Math.round((job.completed_steps / job.total_steps) * 100) : 0;

  return { job, starting, error, isRunning, progress, start, reset, restored, previousJob };
}
