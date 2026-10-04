import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(), request: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(),
  session: vi.fn(), effects: [],
}));
vi.mock('./api.js', () => ({ api: { get: mocks.get, request: mocks.request, post: mocks.post, patch: mocks.patch, delete: mocks.delete } }));
vi.mock('./supabase.js', () => ({ supabase: { auth: { getSession: mocks.session } } }));
vi.mock('react', () => ({
  useRef: (value) => ({ current: value }),
  useEffect: (callback) => { mocks.effects.push(callback); },
}));
import { deleteAiResult, generateAi, saveAiResult, useLatestAiDraft, useSavedAiResult } from './aiGenerations.js';

const cleanups = [];
beforeEach(() => {
  vi.clearAllMocks();
  mocks.effects.length = 0;
  mocks.session.mockResolvedValue({ data: { session: { access_token: 'test-session-a' } } });
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup?.();
});
function mount() {
  for (const effect of mocks.effects.splice(0)) cleanups.push(effect());
}

describe('Reprise IA côté navigateur', () => {
  it('effectue uniquement des lectures après plusieurs remontages et restaure depuis le serveur', async () => {
    const result = { synthesis: 'Résultat durable' };
    const generation = { id: 'generation-id', origin: 'ai' };
    mocks.request.mockResolvedValue({ data: { result, generation } });
    const restore = vi.fn();
    for (let i = 0; i < 3; i++) {
      useSavedAiResult('/ai/capa-suggestion', { context: 'Contexte' }, restore, vi.fn());
      mount();
    }
    await vi.waitFor(() => expect(restore).toHaveBeenCalledWith(result, generation));
    expect(mocks.request).toHaveBeenCalledTimes(3);
    expect(mocks.request.mock.calls.every(([config]) => config.url.endsWith('/saved/read') && config.aiReadOnly)).toBe(true);
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('ne génère jamais quand aucun résultat n’existe ou quand sa lecture échoue', async () => {
    const restore = vi.fn();
    const error = vi.fn();
    mocks.request.mockResolvedValueOnce({ data: { result: null } });
    useSavedAiResult('/pdca/test/generate', {}, restore, error);
    mount();
    await vi.waitFor(() => expect(restore).toHaveBeenCalledWith(null));
    mocks.request.mockRejectedValueOnce({ response: { data: { error: 'Lecture indisponible' } } });
    useSavedAiResult('/pdca/test/generate', {}, restore, error);
    mount();
    await vi.waitFor(() => expect(error).toHaveBeenCalledWith('Lecture indisponible'));
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('retrouve un brouillon de création sans sessionStorage, localStorage ni appel IA', async () => {
    const draft = { input: { title: 'Procédure' }, result: { sections: [] } };
    const restore = vi.fn();
    mocks.get.mockResolvedValue({ data: { draft } });
    useLatestAiDraft('/procedures/generate-draft', restore, vi.fn());
    mount();
    await vi.waitFor(() => expect(restore).toHaveBeenCalledWith(draft));
    expect(mocks.get).toHaveBeenCalledWith('/ai/drafts', expect.objectContaining({
      params: { endpoint: '/procedures/generate-draft', service: undefined },
    }));
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('déduplique les clics simultanés et transmet un identifiant stable pour cette action', async () => {
    let finish;
    mocks.post.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const first = generateAi('/ai/capa-suggestion', { context: 'Contexte' });
    const second = generateAi('/ai/capa-suggestion', { context: 'Contexte' });
    await vi.waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    const headers = mocks.post.mock.calls[0][2].headers;
    expect(headers['X-AI-Request-ID']).toMatch(/^[0-9a-f-]{36}$/);
    expect(headers['X-AI-Regenerate']).toBe('false');
    finish({ data: { synthesis: 'Résultat' } });
    expect(await first).toEqual(await second);
    mocks.post.mockResolvedValue({ data: { synthesis: 'Nouveau résultat' } });
    await generateAi('/ai/capa-suggestion', { context: 'Contexte' }, true);
    const regeneration = mocks.post.mock.calls[1][2].headers;
    expect(regeneration['X-AI-Regenerate']).toBe('true');
    expect(regeneration['X-AI-Request-ID']).not.toBe(headers['X-AI-Request-ID']);
  });

  it('sépare les actions en vol entre deux comptes', async () => {
    let finish;
    mocks.post.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const first = generateAi('/ai/capa-suggestion', {});
    await vi.waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    mocks.session.mockResolvedValue({ data: { session: { access_token: 'test-session-b' } } });
    mocks.post.mockResolvedValueOnce({ data: { synthesis: 'Tenant B' } });
    const second = await generateAi('/ai/capa-suggestion', {});
    expect(second.data.synthesis).toBe('Tenant B');
    finish({ data: { synthesis: 'Tenant A' } });
    expect((await first).data.synthesis).toBe('Tenant A');
    expect(mocks.post).toHaveBeenCalledTimes(2);
  });

  it('sauvegarde manuellement et supprime sans passer par le générateur', async () => {
    mocks.patch.mockResolvedValue({ data: { id: 'saved' } });
    mocks.delete.mockResolvedValue({ data: { deleted: true } });
    await saveAiResult('/audits/test/checklist/generate', {}, { questions: ['Correction humaine'] });
    await deleteAiResult('/audits/test/checklist/generate');
    expect(mocks.patch).toHaveBeenCalledTimes(1);
    expect(mocks.delete).toHaveBeenCalledTimes(1);
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('ignore une lecture ancienne si une génération volontaire commence entre-temps', async () => {
    let finishRead;
    mocks.request.mockReturnValue(new Promise((resolve) => { finishRead = resolve; }));
    mocks.post.mockResolvedValue({ data: { synthesis: 'Nouveau résultat' } });
    const restore = vi.fn();
    useSavedAiResult('/ai/capa-suggestion', {}, restore, vi.fn());
    mount();
    await generateAi('/ai/capa-suggestion', {}, true);
    finishRead({ data: { result: { synthesis: 'Ancien résultat' } } });
    await Promise.resolve();
    expect(restore.mock.calls.some(([value]) => value?.synthesis === 'Ancien résultat')).toBe(false);
  });

  it('annule aussi la reprise d’un ancien brouillon lors d’une nouvelle génération explicite', async () => {
    let finishRead;
    mocks.get.mockReturnValue(new Promise((resolve) => { finishRead = resolve; }));
    mocks.post.mockResolvedValue({ data: { sections: ['Nouveau résultat'] } });
    const restore = vi.fn();
    useLatestAiDraft('/procedures/generate-draft', restore, vi.fn());
    mount();
    await generateAi('/procedures/generate-draft', { title: 'Nouvelle procédure' }, true);
    finishRead({ data: { draft: { result: { sections: ['Ancien résultat'] } } } });
    await Promise.resolve();
    expect(restore).not.toHaveBeenCalled();
  });

  it('efface une proposition dont l’objet source n’est plus disponible sans appeler l’IA', () => {
    const restore = vi.fn();
    useSavedAiResult(null, {}, restore, vi.fn());
    mount();
    expect(restore).toHaveBeenCalledWith(null);
    expect(mocks.request).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
