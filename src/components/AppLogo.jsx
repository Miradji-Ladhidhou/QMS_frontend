// Marque de l'application : un "Q" dont la boucle se prolonge en coche, plutôt qu'un bouclier
// générique — lisible même en tout petit (favicon), voir public/favicon.svg pour la version
// statique utilisée par le navigateur/l'écran d'accueil (mêmes coordonnées, gardées en phase).
export default function AppLogo({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="QMS SaaS">
      <rect width="64" height="64" rx="14" fill="#1F3864" />
      <circle cx="28" cy="30" r="14" fill="none" stroke="#FFFFFF" strokeWidth="6" />
      <path
        d="M36 40 L45 49 L58 32"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
