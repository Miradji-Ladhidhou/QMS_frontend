import CategoryManager from '../components/CategoryManager.jsx';

export default function Settings() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Paramètres</h1>
      <div className="mt-4">
        <CategoryManager />
      </div>
    </div>
  );
}
