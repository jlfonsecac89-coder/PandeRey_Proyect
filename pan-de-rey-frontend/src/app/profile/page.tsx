'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import ProfileAuth from '@/components/profile/ProfileAuth';
import ProfileDashboard from '@/components/profile/ProfileDashboard';

export default function ProfilePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      {isAuthenticated ? (
        <ProfileDashboard onLogout={() => setIsAuthenticated(false)} />
      ) : (
        <ProfileAuth onLogin={() => setIsAuthenticated(true)} />
      )}
    </main>
  );
}
