'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DebugPage() {
  const [cookies, setCookies] = useState<string>('Loading cookies...');
  const [authStatus, setAuthStatus] = useState<any>('Checking...');
  const [localStorageData, setLocalStorageData] = useState<string>('Loading...');
  const [debugData, setDebugData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Get and display all cookies
    setCookies(document.cookie || 'No cookies found');
    
    // Get localStorage auth token
    try {
      const localToken = localStorage.getItem('auth_token');
      setLocalStorageData(localToken || 'No token in localStorage');
    } catch (e) {
      setLocalStorageData(`Error accessing localStorage: ${e.message}`);
    }
    
    // Fetch detailed debug info
    fetch('/api/auth/debug')
      .then(res => res.json())
      .then(data => {
        setDebugData(data);
      })
      .catch(err => {
        setDebugData({ error: err.message });
      });
      
    // Check auth status
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => {
        setAuthStatus(data);
      })
      .catch(err => {
        setAuthStatus({ error: err.message });
      });
  }, []);

  // Function to set auth cookie manually
  function setAuthCookie() {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        document.cookie = `shared_auth_token=${token}; path=/; max-age=${60*60*24*30}`;
        alert('Cookie set from localStorage token');
        window.location.reload();
      } else {
        const manualToken = prompt('No token found in localStorage. Enter token manually:');
        if (manualToken) {
          document.cookie = `shared_auth_token=${manualToken}; path=/; max-age=${60*60*24*30}`;
          localStorage.setItem('auth_token', manualToken);
          alert('Cookie set from manual token input');
          window.location.reload();
        }
      }
    } catch (e) {
      alert(`Error setting cookie: ${e.message}`);
    }
  }

  // Function to clear auth cookies
  function clearAuthCookies() {
    try {
      document.cookie = 'shared_auth_token=; path=/; max-age=0';
      document.cookie = 'shared_auth_token_secure=; path=/; max-age=0';
      document.cookie = 'shared_auth_token_js=; path=/; max-age=0';
      localStorage.removeItem('auth_token');
      alert('All auth cookies and localStorage cleared');
      window.location.reload();
    } catch (e) {
      alert(`Error clearing cookies: ${e.message}`);
    }
  }

  // Function to force authentication
  function forceLogin() {
    const returnUrl = encodeURIComponent(window.location.origin + '/admin');
    const callbackUrl = encodeURIComponent(`${window.location.origin}/api/auth/callback`);
    const loginUrl = `https://photobooth.waibooth.app/photobooth-ia/admin/login?returnUrl=${returnUrl}&callbackUrl=${callbackUrl}&shared=true`;
    
    window.location.href = loginUrl;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Authentication Debug Page</h1>
      
      <div className="mb-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={setAuthCookie}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Set Cookie from localStorage
          </button>
          <button 
            onClick={clearAuthCookies}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Clear All Auth Cookies
          </button>
          <button 
            onClick={forceLogin}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Force Login Redirect
          </button>
          <button 
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Go to Admin Page
          </button>
        </div>
      </div>
      
      <div className="mb-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Client-Side Cookies</h2>
        <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-40 text-sm">{cookies}</pre>
      </div>
      
      <div className="mb-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">localStorage Data</h2>
        <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-40 text-sm">{localStorageData}</pre>
      </div>
      
      <div className="mb-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Detailed Auth Status</h2>
        <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-60 text-sm">
          {JSON.stringify(authStatus, null, 2)}
        </pre>
      </div>
      
      {debugData && (
        <div className="mb-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Server-Side Debug Data</h2>
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-80 text-sm">
            {JSON.stringify(debugData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
