'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase'; // Assure-toi que ce chemin est correct

interface UserProfileMenuProps {
  email: string;
}

export default function UserProfileMenu({ email }: UserProfileMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [userIdFromCookie, setUserIdFromCookie] = useState<string | null>(null);
  const [emailFromCookie, setEmailFromCookie] = useState<string | null>(null);
  const [emailFromDb, setEmailFromDb] = useState<string | null>(null);
  const [userIdFromDb, setUserIdFromDb] = useState<string | null>(null);

  // Récupère l'id utilisateur ET l'email depuis le cookie au montage
  useEffect(() => {
    try {
      const cookies = document.cookie.split(';').map(c => c.trim());
      const tokenCookie = cookies.find(c => c.startsWith('shared_auth_token=')) || cookies.find(c => c.startsWith('admin_session='));
      if (tokenCookie) {
        const token = tokenCookie.split('=')[1];
        const decoded = atob(token);
        const userData = JSON.parse(decoded);
        if (userData.userId) {
          setUserIdFromCookie(userData.userId);
        }
        if (userData.email) {
          setEmailFromCookie(userData.email);
        }
      }
    } catch (e) {
      setUserIdFromCookie(null);
      setEmailFromCookie(null);
    }
  }, []);

  // Va chercher l'email ET l'id dans Supabase si email trouvé dans le cookie
  useEffect(() => {
    const fetchUser = async () => {
      if (emailFromCookie) {
        const { data, error } = await supabase
          .from('admin_users')
          .select('id, email')
          .eq('email', emailFromCookie)
          .single();
        if (data && data.id) {
          setUserIdFromDb(data.id);
          setEmailFromDb(data.email);
        }
      }
    };
    fetchUser();
  }, [emailFromCookie]);

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
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-200 border-2 border-white">
          <span className="text-lg font-semibold">{(emailFromDb || email).charAt(0).toUpperCase()}</span>
        </div>
        <div className="hidden md:flex flex-col items-start">
          <span className="text-sm font-medium text-gray-700">Mon compte</span>
          <span className="text-xs text-gray-500 truncate max-w-[120px]">{emailFromDb || email}</span>
        </div>
        <svg className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 transition-all duration-200 transform origin-top-right">
          <div className="p-4 border-b border-gray-100">
            <p className="text-sm text-gray-500">Connecté en tant que:</p>
            <p className="font-medium text-gray-800 truncate">{emailFromDb || emailFromCookie || email}</p>
            {userIdFromDb && (
              <p className="text-xs text-gray-400 mt-1">ID utilisateur: <span className="font-mono">{userIdFromDb}</span></p>
            )}
          </div>
          <div className="p-2">
            <a 
              href="/api/auth/logout"
              className="flex w-full items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" /></svg>
              <span>Déconnexion</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
