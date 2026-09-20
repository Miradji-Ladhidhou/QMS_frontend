import { Link } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, GraduationCap } from 'lucide-react';
import { QUALIFICATION_LABELS, QUALIFICATION_STYLES, describeQualification, qualificationOf } from '../lib/auditorQualification.js';

// Pastille de qualification d'un auditeur, avec (mode détaillé) la formation d'origine et le lien vers
// la page Formations. `qualifications` : { loading, trainings, byUser } (useAuditorQualifications).
// Rend rien tant que les données chargent ; sans formation qualifiante désignée, invite à en désigner
// une (lien vers Formations) plutôt que d'afficher un « non qualifié » qui n'aurait pas de sens.
export default function AuditorQualification({ userId, qualifications, detailed = false }) {
  if (!userId || qualifications.loading) return null;

  if (qualifications.trainings.length === 0) {
    if (!detailed) return null;
    return (
      <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
        <GraduationCap size={13} className="shrink-0" />
        Aucune formation d'auditeur interne désignée.
        <Link to="/trainings" className="font-medium text-primary hover:underline">
          Désigner une formation
        </Link>
      </p>
    );
  }

  const qualification = qualificationOf(qualifications.byUser, userId);
  const Icon = qualification.status === 'qualified' ? BadgeCheck : AlertTriangle;
  const trainingId = qualification.training_id || qualifications.trainings[0].id;

  const badge = (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${QUALIFICATION_STYLES[qualification.status]}`}>
      <Icon size={12} />
      {QUALIFICATION_LABELS[qualification.status]}
    </span>
  );
  if (!detailed) return badge;

  return (
    <div className="mt-1.5 text-xs text-slate-600">
      {badge}
      <p className="mt-1">{describeQualification(qualification)}</p>
      <Link to={`/trainings?training=${trainingId}`} className="mt-0.5 inline-flex items-center gap-1 font-medium text-primary hover:underline">
        <GraduationCap size={13} />
        {qualification.status === 'qualified' ? 'Voir la formation' : 'Voir la formation / programmer une session'}
      </Link>
    </div>
  );
}
