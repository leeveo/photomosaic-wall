'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Créer un client avec la clé anon pour le débogage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function DebugUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  
  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        
        // Récupérer le token actuel
        const token = localStorage.getItem('auth_token') || '';
        if (token) {
          setCurrentToken(token.substring(0, 15) + '...');
          
          try {
            // Pour les tokens base64
            if (!token.includes('.')) {
              const decoded = atob(token);
              const userData = JSON.parse(decoded);
              if (userData.userId) {
                setCurrentUserId(userData.userId);
              }
            } 
            // Pour les tokens JWT
            else if (token.split('.').length === 3) {
              const payload = JSON.parse(atob(token.split('.')[1]));
              if (payload.sub) {
                setCurrentUserId(payload.sub);
              } else if (payload.userId) {
                setCurrentUserId(payload.userId);
              }
            }
          } catch (e) {
            console.error('Erreur lors de l\'analyse du token:', e);
          }
        }
        
        // Essayer d'obtenir les utilisateurs via l'API
        const apiResponseData = await fetch('/api/users/me');
        if (apiResponseData.ok) {
          const data = await apiResponseData.json();
          setApiResponse(data);
        }
        
        // Essayer de lister les utilisateurs via l'API
        const usersResponse = await fetch('/api/debug/users');
        if (usersResponse.ok) {
          const data = await usersResponse.json();
          setUsers(data.users || []);
          setLoading(false);
          return;
        }
        
        // Fallback vers une requête Supabase directe
        const { data, error } = await supabase
          .from('admin_users')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setUsers(data || []);
      } catch (err) {
        console.error('Erreur lors de la récupération des utilisateurs:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    }
    
    fetchUsers();
  }, []);
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Débogage des utilisateurs admin</h1>
      
      {currentUserId && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Utilisateur actuel</h2>
          <p><strong>Token (partiel):</strong> {currentToken}</p>
          <p><strong>ID Utilisateur:</strong> {currentUserId}</p>
          <p className="text-sm text-gray-500 mt-2">
            Il s'agit de l'ID extrait de votre token d'authentification actuel.
          </p>
        </div>
      )}
      
      {apiResponse && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Réponse de l'API /api/users/me</h2>
          <pre className="bg-white p-3 rounded text-sm overflow-auto">{JSON.stringify(apiResponse, null, 2)}</pre>
        </div>
      )}
      
      <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Utilisateurs dans la table admin_users</h2>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">Chargement des utilisateurs...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">
            Erreur: {error}
            <p className="mt-2 text-sm text-gray-500">
              Note: Cela peut échouer si vous n'avez pas les permissions pour accéder directement à la table admin_users.
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center">
            Aucun utilisateur trouvé dans la table admin_users.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Créé le</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className={currentUserId === user.id ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {user.id}
                      {currentUserId === user.id && <span className="ml-2 text-xs text-blue-500">(actuel)</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.created_at ? new Date(user.created_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-medium mb-2">Instructions de débogage:</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Vérifiez que votre token d'authentification contient bien un ID utilisateur valide</li>
          <li>Vérifiez que cet ID existe dans la table admin_users</li>
          <li>Vérifiez que le SUPABASE_SERVICE_ROLE_KEY dans .env.local contient "role" et non "rose"</li>
          <li>Vérifiez la réponse de l'API /api/users/me pour voir les erreurs potentielles</li>
        </ol>
      </div>
    </div>
  );
}
