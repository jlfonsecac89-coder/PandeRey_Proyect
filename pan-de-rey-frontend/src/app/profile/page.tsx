'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ProfileAuth from '@/components/profile/ProfileAuth';
import ProfileDashboard from '@/components/profile/ProfileDashboard';

export default function ProfilePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('pan_de_rey_active_customer');
    if (saved) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('pan_de_rey_active_customer');
    setIsAuthenticated(false);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      {isAuthenticated ? (
        <ProfileDashboard onLogout={handleLogout} />
      ) : (
        <ProfileAuth onLogin={handleLogin} />
      )}
    </main>
  );
}

