'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Create a client with the anon key for debugging
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function DebugUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userIdToCheck, setUserIdToCheck] = useState('');
  const [userCheckResult, setUserCheckResult] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        
        // Try to get current user token ID
        const token = localStorage.getItem('auth_token') || '';
        if (token) {
          try {
            // For base64 tokens
            if (!token.includes('.')) {
              const decoded = atob(token);
              const userData = JSON.parse(decoded);
              if (userData.userId) {
                setCurrentUserId(userData.userId);
              }
            } 
            // For JWT tokens
            else if (token.split('.').length === 3) {
              const payload = JSON.parse(atob(token.split('.')[1]));
              if (payload.sub) {
                setCurrentUserId(payload.sub);
              }
            }
          } catch (e) {
            console.error('Error parsing token:', e);
          }
        }
        
        // Try to list users via the API first (preferred approach)
        const apiResponse = await fetch('/api/debug/users');
        if (apiResponse.ok) {
          const data = await apiResponse.json();
          setUsers(data.users || []);
          setLoading(false);
          return;
        }
        
        // Fallback to direct Supabase query if API fails
        // This will only work with public data due to anon key limitations
        const { data, error } = await supabase
          .from('admin_users')
          .select('id, email, created_at, name')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setUsers(data || []);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    fetchUsers();
  }, []);
  
  async function checkUserById() {
    if (!userIdToCheck) return;
    
    try {
      setUserCheckResult({ loading: true });
      
      // Try API endpoint first
      const apiResponse = await fetch(`/api/debug/users/${userIdToCheck}`);
      if (apiResponse.ok) {
        const data = await apiResponse.json();
        setUserCheckResult({ data, source: 'api' });
        return;
      }
      
      // Fallback to direct query
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', userIdToCheck)
        .single();
        
      if (error) throw error;
      
      setUserCheckResult({ data, source: 'direct' });
    } catch (err) {
      setUserCheckResult({ 
        error: err instanceof Error ? err.message : 'Unknown error',
        source: 'error'
      });
    }
  }
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Users Debug</h1>
      
      {currentUserId && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Current User</h2>
          <p><strong>User ID:</strong> {currentUserId}</p>
          <p className="text-sm text-gray-500 mt-2">
            This is the ID extracted from your current authentication token.
          </p>
        </div>
      )}
      
      <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Check User by ID</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={userIdToCheck}
            onChange={(e) => setUserIdToCheck(e.target.value)}
            placeholder="Enter user ID to check"
            className="flex-1 px-3 py-2 border border-gray-300 rounded"
          />
          <button
            onClick={checkUserById}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Check
          </button>
        </div>
        
        {userCheckResult && (
          <div className="mt-4 p-4 bg-white border border-gray-300 rounded-lg overflow-auto">
            <h3 className="font-medium mb-2">Result:</h3>
            <pre className="text-xs bg-gray-50 p-3 rounded">
              {JSON.stringify(userCheckResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Users in admin_users Table</h2>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">Loading users...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">
            Error: {error}
            <p className="mt-2 text-sm text-gray-500">
              Note: This may fail if you don't have permission to access the admin_users table directly.
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center">
            No users found in the admin_users table.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className={currentUserId === user.id ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {user.id}
                      {currentUserId === user.id && <span className="ml-2 text-xs text-blue-500">(current)</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.name || '-'}</td>
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
    </div>
  );
}
