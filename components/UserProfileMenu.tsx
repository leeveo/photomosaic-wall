'use client';

import { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiLogOut } from 'react-icons/fi';

interface UserProfileMenuProps {
  email: string;
}

export default function UserProfileMenu({ email }: UserProfileMenuProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleLogout = async () => {
    try {
      // Call logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      // Redirect to main app login
      window.location.href = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 'https://photobooth.waibooth.app/photobooth-ia/admin/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  return (
    <div className="relative" ref={userMenuRef}>
      <button 
        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
        className="flex items-center space-x-2 focus:outline-none"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-200 border-2 border-white">
          <span className="text-lg font-semibold">{email.charAt(0).toUpperCase()}</span>
        </div>
        <div className="hidden md:flex flex-col items-start">
          <span className="text-sm font-medium text-gray-700">Mon compte</span>
          <span className="text-xs text-gray-500 truncate max-w-[120px]">{email}</span>
        </div>
        <FiChevronDown className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : 'rotate-0'}`} />
      </button>

      {/* Dropdown Menu */}
      {isUserMenuOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 transition-all duration-200 transform origin-top-right">
          <div className="p-4 border-b border-gray-100">
            <p className="text-sm text-gray-500">Connecté en tant que:</p>
            <p className="font-medium text-gray-800 truncate">{email}</p>
          </div>
          <div className="p-2">
            <button 
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <FiLogOut className="w-5 h-5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
