import { AlertTriangle, Camera, Info, OctagonAlert } from 'lucide-react';

// Affichage structuré du contenu d'une version de procédure — remplace l'empilement de
// libellé+paragraphe répété pour chaque champ. Une section dont le contenu a été généré via
// "Brouillon complet" (voir services/procedureFullDraftJob.js) porte un tableau `subsections`
// ({ title, intro, actions: [{text, sub_bullets}], callout: {severity, text}|null,
// photo_placeholders: [] }) — le PDF et le Word l'utilisent déjà pour se mettre en forme (voir
// services/procedurePdf.js#drawGeneratedSection, procedureWord.js#subsectionParagraphs) ; cet
// affichage écran fait de même. Une section sans subsections (procédure tapée à la main, ou
// générée en mode rapide à un seul appel IA) retombe sur son `content` en texte brut, exactement
// comme le PDF/Word le font déjà pour ce même cas — jamais de régression pour ces procédures-là.

const CALLOUT_STYLES = {
  info: { icon: Info, box: 'bg-blue-50 border-blue-200 text-blue-700', label: 'Important' },
  warning: { icon: AlertTriangle, box: 'bg-amber-50 border-amber-200 text-amber-700', label: 'Attention' },
  danger: { icon: OctagonAlert, box: 'bg-red-50 border-red-200 text-red-700', label: 'Danger' },
};

function Callout({ callout }) {
  if (!callout) return null;
  const style = CALLOUT_STYLES[callout.severity] || CALLOUT_STYLES.info;
  const Icon = style.icon;
  return (
    <div className={`mt-3 flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm ${style.box}`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <p>
        <span className="font-semibold">{style.label} : </span>
        <span className="text-slate-700">{callout.text}</span>
      </p>
    </div>
  );
}

function PhotoPlaceholder({ caption }) {
  return (
    <div className="mt-2 flex items-center gap-2.5 rounded-md border border-dashed border-slate-300 px-3 py-2.5 text-xs text-slate-500">
      <Camera size={16} className="shrink-0 text-slate-400" />
      Emplacement réservé à une photo — {caption}
    </div>
  );
}

function ActionList({ actions }) {
  if (!actions?.length) return null;
  return (
    <ul className="mt-3 space-y-2">
      {actions.map((action, i) => (
        <li key={i} className="flex gap-2.5 text-sm">
          <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded bg-primary/10 text-[10.5px] font-semibold text-primary-700">
            {i + 1}
          </span>
          <div>
            <p className="text-slate-700">{action.text}</p>
            {action.sub_bullets?.length > 0 && (
              <ul className="mt-1 space-y-0.5 pl-1">
                {action.sub_bullets.map((bullet, j) => (
                  <li key={j} className="text-xs text-slate-500">
                    – {bullet}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// Une étape par subsection — numérotation continue à travers TOUTE la procédure (pas
// redémarrée à 1 par section), pour que le numéro affiché corresponde à un ordre réel de
// déroulement plutôt qu'à un simple index local à sa section.
function StepCard({ number, subsection }) {
  return (
    <div className="mt-3 grid grid-cols-[34px_1fr] gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
        {number}
      </div>
      <div className="min-w-0">
        <h4 className="text-sm font-semibold text-slate-900">{subsection.title}</h4>
        {subsection.generation_status === 'failed' ? (
          <p className="mt-1.5 text-sm italic text-slate-500">
            À compléter manuellement — la génération automatique de cette étape a échoué.
          </p>
        ) : (
          <>
            {subsection.intro && <p className="mt-1.5 text-sm text-slate-600">{subsection.intro}</p>}
            <ActionList actions={subsection.actions} />
            <Callout callout={subsection.callout} />
            {(subsection.photo_placeholders || []).map((caption, i) => (
              <PhotoPlaceholder key={i} caption={caption} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function FieldBlock({ id, label, text }) {
  if (!text) return null;
  return (
    <div id={id} className="scroll-mt-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{text}</p>
    </div>
  );
}

export default function ProcedureContentView({ content }) {
  if (!content) return null;
  const sections = content.sections || [];
  const documentsAssocies = content.documents_associes || [];

  // Sommaire compact : seulement s'il y a de quoi naviguer (une seule section + objet/domaine
  // n'a pas besoin d'ancre pour "sauter" à un endroit déjà visible sans défiler).
  const tocItems = [
    content.objet && { id: 'objet', label: 'Objet' },
    content.domaine_application && { id: 'domaine', label: "Domaine d'application" },
    content.responsabilites && { id: 'responsabilites', label: 'Responsabilités' },
    ...sections.map((s) => ({ id: `section-${s.key}`, label: s.label })),
    documentsAssocies.length > 0 && { id: 'documents-associes', label: 'Documents associés' },
  ].filter(Boolean);

  let stepCounter = 0;

  return (
    <div className="space-y-4">
      {tocItems.length >= 3 && (
        <nav className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
          {tocItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-primary/40 hover:bg-primary/5 hover:text-primary-700"
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}

      <FieldBlock id="objet" label="Objet" text={content.objet} />
      <FieldBlock id="domaine" label="Domaine d'application" text={content.domaine_application} />
      <FieldBlock id="responsabilites" label="Responsabilités" text={content.responsabilites} />

      {sections.map((section) => (
        <div key={section.key} id={`section-${section.key}`} className="scroll-mt-16">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{section.label}</p>
          {section.subsections?.length > 0 ? (
            section.subsections.map((subsection, i) => {
              stepCounter += 1;
              return <StepCard key={i} number={stepCounter} subsection={subsection} />;
            })
          ) : (
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{section.content}</p>
          )}
        </div>
      ))}

      {documentsAssocies.length > 0 && (
        <div id="documents-associes" className="scroll-mt-16">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documents associés</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
            {documentsAssocies.map((doc, i) => (
              <li key={i}>{doc}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
