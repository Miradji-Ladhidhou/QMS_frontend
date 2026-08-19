import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

// Seul mécanisme React qui rattrape une erreur de rendu (composant de classe obligatoire, pas
// d'équivalent en hook) — sans lui, une exception n'importe où dans l'arbre (un champ inattendu
// renvoyé par l'API, une valeur null non gérée...) fait disparaître toute l'application derrière
// un écran blanc, sans aucun message. Emplacement volontairement au-dessus de <App/> (voir
// main.jsx) : une erreur dans le routeur ou l'état de session lui-même reste rattrapée.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Seul point de journalisation aujourd'hui (pas de service de suivi d'erreurs branché) —
    // emplacement naturel pour brancher un Sentry/équivalent plus tard sans toucher au reste.
    console.error('Erreur non rattrapée dans l’application :', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle size={24} />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-900">Une erreur inattendue est survenue.</p>
          <p className="mt-1 text-sm text-slate-500">Rechargez la page — si le problème persiste, contactez votre administrateur.</p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          Recharger la page
        </button>
      </div>
    );
  }
}
