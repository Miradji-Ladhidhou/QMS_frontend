import { AlertTriangle, BookOpen, ExternalLink, Link2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { APP_MODULE_LABELS } from '../lib/appModules.jsx';
import { api } from '../lib/api.js';
import ResourceSourceBadge from '../components/ResourceSourceBadge.jsx';

export default function LiensUtiles() {
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError('');
    api.get('/resources')
      .then(({ data }) => { if (!cancelled) setGroups(data.groups); })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || 'Impossible de charger les liens utiles.');
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary-50 p-2 text-primary">
          <Link2 size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Liens utiles</h1>
          <p className="mt-1 text-sm text-slate-600">
            Retrouvez ici des références en français pour les modules de l’application, regroupées par thème.
          </p>
        </div>
      </div>

      <section aria-labelledby="resources-guide-title" className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <h2 id="resources-guide-title" className="flex items-center gap-2 font-semibold text-slate-900">
          <BookOpen size={18} className="shrink-0 text-primary" aria-hidden="true" />
          Pourquoi ces liens et comment les utiliser ?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Ces ressources complètent les outils de l’application : elles vous aident à comprendre une méthode,
          préparer un audit, structurer une procédure ou consulter un texte de référence. Elles ne remplacent pas
          les procédures et consignes validées de votre entreprise.
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600">
          <li>
            <strong className="font-medium text-slate-800">Choisissez la rubrique de votre module.</strong>{' '}
            Les pastilles indiquent les modules concernés et le nom sous chaque lien indique sa source.
          </li>
          <li>
            <strong className="font-medium text-slate-800">Ouvrez la ressource.</strong>{' '}
            Cliquez sur son titre : le site externe s’ouvre dans un nouvel onglet, sans fermer votre travail dans QMS.
          </li>
          <li>
            <strong className="font-medium text-slate-800">Vérifiez avant d’appliquer.</strong>{' '}
            Contrôlez la date, la version, le pays et le secteur concernés. Un guide pratique, une norme et un règlement
            n’ont pas la même portée.
          </li>
          <li>
            <strong className="font-medium text-slate-800">Adaptez à votre situation.</strong>{' '}
            Revenez au module pour documenter vos constats ou actions et faites valider les changements selon votre
            circuit interne. Pour une décision réglementaire ou de sécurité, sollicitez une personne compétente.
          </li>
        </ol>
      </section>

      <section aria-labelledby="resources-source-title" className="mt-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 id="resources-source-title" className="font-semibold text-slate-900">Identifier la source pour un audit</h2>
        <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
          <li><strong className="font-medium text-emerald-800">Site officiel de l’organisme :</strong>{' '}
            domaine reconnu de l’éditeur (ISO, INRS, CNIL, FAO ou EUR-Lex). Cela ne signifie pas que tous ses contenus
            sont réglementaires ou obligatoires : une norme, une recommandation et un texte légal restent distincts.
          </li>
          <li><strong className="font-medium text-blue-800">Site privé — guide pratique :</strong>{' '}
            contenu pédagogique d’un éditeur privé, utile pour comprendre une méthode, mais pas une référence
            réglementaire officielle.
          </li>
          <li><strong className="font-medium text-amber-800">Source non vérifiée :</strong>{' '}
            domaine absent de notre liste de référence. Ce statut ne signifie pas que le site est faux ou non officiel ;
            vérifiez l’éditeur et l’adresse avant de l’utiliser comme référence.
          </li>
        </ul>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Pour votre dossier d’audit, notez le titre, l’organisme éditeur, la référence et la version du document,
          son URL, la date de consultation et les exigences applicables. Le badge classe le domaine de l’adresse
          publiée : il ne valide ni le contenu, ni une redirection, ni votre conformité.
        </p>
      </section>

      <details className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <summary className="flex min-h-[40px] cursor-pointer items-center gap-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
          Précautions et informations importantes — à lire avant utilisation
        </summary>
        <ul className="mt-2 list-disc space-y-2 pl-5 leading-6">
          <li>
            Ces références sont informatives : leur présence ne garantit ni votre conformité ni une certification,
            et n’implique aucun partenariat avec les organismes cités.
          </li>
          <li>
            Les sites sont gérés par des tiers. Leur contenu, leurs conditions d’accès et leurs adresses peuvent évoluer.
            Si un lien ne fonctionne plus ou semble inadapté, signalez-le à votre administrateur pour transmission au
            super-admin qui gère le catalogue.
          </li>
          <li>
            Les pages ISO présentent les normes ; elles ne donnent pas nécessairement accès à leur texte intégral.
            Certains documents ou services peuvent être payants. Ne reproduisez pas un article ou une norme sans
            vérifier les droits et autorisations applicables.
          </li>
          <li>
            Les sites externes appliquent leurs propres règles de confidentialité et de cookies. Ne transmettez pas de
            données personnelles, de documents internes ou d’informations confidentielles sans autorisation.
          </li>
        </ul>
      </details>

      {error ? (
        <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-2 underline">
            Réessayer
          </button>
        </div>
      ) : groups === null ? (
        <p role="status" className="mt-6 text-sm text-slate-500">Chargement des liens utiles...</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {groups.map((group) => (
            <section key={group.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h2 className="font-semibold text-slate-900">{group.title}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {group.modules.map((module) => (
                  <span key={module} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {APP_MODULE_LABELS[module]}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-sm text-slate-500">{group.description}</p>
              {group.resources.length === 0 && <p className="mt-3 text-sm text-slate-500">Aucun lien publié pour cette rubrique.</p>}
              <ul className="mt-3 divide-y divide-slate-100">
                {group.resources.map((resource) => (
                  <li key={resource.url} className="py-2 first:pt-0 last:pb-0">
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[40px] items-center gap-2 font-medium text-primary hover:underline"
                      title={resource.source}
                    >
                      <span>{resource.label}</span>
                      <ExternalLink size={14} className="shrink-0" aria-hidden="true" />
                    </a>
                    <p className="text-xs text-slate-500">Source : {resource.source}</p>
                    <ResourceSourceBadge url={resource.url} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Ressources externes à titre informatif. Vérifiez toujours leur applicabilité et la version en vigueur des textes.
      </p>
    </div>
  );
}
