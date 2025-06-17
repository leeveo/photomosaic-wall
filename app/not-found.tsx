// Ce fichier est nécessaire pour la gestion des routes qui n'existent pas
export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-red-600">404 - Page non trouvée</h1>
        <p className="mt-4 text-gray-600">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <a 
          href="/"
          className="inline-block px-6 py-2 mt-6 text-white bg-indigo-600 rounded hover:bg-indigo-700"
        >
          Retour à l&apos;accueil
        </a>
      </div>
    </div>
  );
}
