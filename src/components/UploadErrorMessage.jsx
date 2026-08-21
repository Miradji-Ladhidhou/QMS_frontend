import { Link } from 'react-router-dom';

// Erreur créée au prompt B3 (resolveTenantStorageProvider, documents.js) : la connexion
// Google Drive du tenant a expiré ou a été révoquée, l'upload échoue avec
// code: 'drive_connection_error'. Message actionnable plutôt que générique — reste une erreur
// localisée au formulaire d'upload (création de document, nouvelle version), jamais un crash
// de page (Prompt F3). ?drive= fait atterrir Settings.jsx directement sur l'onglet Documents,
// où vit DriveStorageSettings (voir Settings.jsx#activeTab).
export default function UploadErrorMessage({ error }) {
  if (!error) return null;

  if (error.code === 'drive_connection_error') {
    return (
      <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
        La connexion à Google Drive a expiré.{' '}
        <Link to="/settings?drive=reconnect" className="font-medium underline">
          Reconnectez-vous depuis les paramètres
        </Link>
      </p>
    );
  }

  return <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error.message}</p>;
}
