'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface UserProfileMenuProps {
  email: string;
}

export default function UserProfileMenu({ email }: UserProfileMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Determine if this is an email or a user ID
  const isEmail = email.includes('@');
  const userInitial = isEmail ? email.charAt(0).toUpperCase() : 'U';
  
  // Generate a consistent color based on the email/ID
  const generateColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 45%)`;
  };
  
  const avatarColor = generateColor(email);
  
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center space-x-2 focus:outline-none"
        aria-expanded={isMenuOpen}
        aria-haspopup="true"
      >
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
          style={{ backgroundColor: avatarColor }}
        >
          {userInitial}
        </div>
        <span className="hidden md:block text-sm font-medium text-gray-700 truncate max-w-[150px]">
          {email}
        </span>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">Connecté en tant que</p>
            <p className="text-sm text-gray-500 truncate">{email}</p>
            {/* Affiche l'ID utilisateur si disponible dans le cookie global */}
            {typeof window !== 'undefined' && (
              (() => {
                try {
                  // Cherche le cookie admin_session ou shared_auth_token
                  const cookies = document.cookie.split(';').map(c => c.trim());
                  const tokenCookie = cookies.find(c => c.startsWith('shared_auth_token=')) || cookies.find(c => c.startsWith('admin_session='));
                  if (tokenCookie) {
                    const token = tokenCookie.split('=')[1];
                    const decoded = atob(token);
                    const userData = JSON.parse(decoded);
                    if (userData.userId) {
                      return <p className="text-xs text-gray-400 mt-1">ID utilisateur: <span className="font-mono">{userData.userId}</span></p>;
                    }
                  }
                } catch (e) {
                  // ignore
                }
                return null;
              })()
            )}
          </div>
          <Link href="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            Dashboard
          </Link>
          <Link href="/admin/setup" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            Créer un projet
          </Link>
          <a href="/api/auth/logout" className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50">
            Déconnexion
          </a>
        </div>
      )}
    </div>
  );
}
