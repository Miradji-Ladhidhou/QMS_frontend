import { useEffect, useRef } from 'react';
import { api } from './api.js';
import { supabase } from './supabase.js';

const actions = new Map();
const readers = new Map();

function trackReader(endpoint, controller) {
  const pending = readers.get(endpoint) || new Set();
  pending.add(controller);
  readers.set(endpoint, pending);
  return () => {
    controller.abort();
    pending.delete(controller);
    if (!pending.size) readers.delete(endpoint);
  };
}

export async function saveAiResult(endpoint, input, result) {
  const { data: session } = await supabase.auth.getSession();
  const key = JSON.stringify([session.session?.access_token, 'edit', endpoint, input, result]);
  if (actions.has(key)) return actions.get(key);
  const action = api.patch(`${endpoint}/saved`, { input: input || {}, result });
  actions.set(key, action);
  try {
    return await action;
  } finally {
    if (actions.get(key) === action) actions.delete(key);
  }
}

export function deleteAiResult(endpoint, input = {}) {
  return api.delete(`${endpoint}/saved`, { data: { input } });
}

export function useLatestAiDraft(endpoint, onRestore, onError, service) {
  const callbacks = useRef({ onRestore, onError });
  callbacks.current = { onRestore, onError };
  useEffect(() => {
    if (!endpoint) return;
    const controller = new AbortController();
    const cleanup = trackReader(endpoint, controller);
    api.get('/ai/drafts', { params: { endpoint, service }, signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted && data.draft) callbacks.current.onRestore(data.draft);
      }).catch((error) => {
        if (!controller.signal.aborted) callbacks.current.onError?.(error.response?.data?.error || 'Impossible de retrouver le brouillon IA.');
      });
    return cleanup;
  }, [endpoint, service]);
}

export async function generateAi(endpoint, input = {}, regenerate = false) {
  const { data: session } = await supabase.auth.getSession();
  const key = JSON.stringify([session.session?.access_token, endpoint, input]);
  if (actions.has(key)) return actions.get(key);
  for (const controller of readers.get(endpoint) || []) controller.abort();
  const action = api.post(endpoint, input, {
    headers: { 'X-AI-Request-ID': crypto.randomUUID(), 'X-AI-Regenerate': String(regenerate) },
  });
  actions.set(key, action);
  try {
    return await action;
  } finally {
    if (actions.get(key) === action) actions.delete(key);
  }
}

export function useSavedAiResult(endpoint, input, onRestore, onError) {
  const callbacks = useRef({ onRestore, onError });
  callbacks.current = { onRestore, onError };
  const serialized = JSON.stringify(input || {});
  useEffect(() => {
    callbacks.current.onRestore(null);
    if (!endpoint) return;
    const controller = new AbortController();
    const cleanup = trackReader(endpoint, controller);
    api.request({ method: 'post', url: `${endpoint}/saved/read`, data: JSON.parse(serialized),
      signal: controller.signal, aiReadOnly: true })
      .then(({ data }) => {
        if (!controller.signal.aborted) callbacks.current.onRestore(data.result, data.generation);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          callbacks.current.onError?.(error.response?.data?.error || 'Impossible de lire le résultat IA enregistré.');
        }
      });
    return cleanup;
  }, [endpoint, serialized]);
}
