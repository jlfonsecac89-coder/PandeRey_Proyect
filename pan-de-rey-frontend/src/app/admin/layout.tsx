"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PackageSearch, Kanban, Settings, LogOut, Palette } from 'lucide-react';

import Image from 'next/image';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard WMS', href: '/admin', icon: LayoutDashboard },
    { name: 'Pedidos (Kanban)', href: '/admin/orders', icon: Kanban },
    { name: 'Catálogo', href: '/admin/products', icon: PackageSearch },
    { name: 'Apariencia Web', href: '/admin/appearance', icon: Palette },
    { name: 'Configuración', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="w-64 bg-charcoal-light border-r border-charcoal-border flex flex-col">
        <div className="h-20 flex items-center px-4 border-b border-charcoal-border gap-3">
          <Image src="/logo.png" alt="Pan de Rey Logo" width={40} height={40} className="invert mix-blend-screen" />
          <span className="font-serif text-sm tracking-widest text-gold uppercase">Admin CMS</span>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-gold/10 text-gold border-r-2 border-gold' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-charcoal-border">
          <Link href="/" className="flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-red-400 transition-colors">
            <LogOut className="w-5 h-5" />
            Volver a la Tienda
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 flex items-center justify-between px-8 bg-charcoal-light border-b border-charcoal-border">
          <h2 className="text-white text-lg font-medium">Pan de Rey - Gestión Central</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">Usuario Administrador</span>
            <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-black font-bold">
              A
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
