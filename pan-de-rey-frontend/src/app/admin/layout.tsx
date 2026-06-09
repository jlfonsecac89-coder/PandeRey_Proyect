"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PackageSearch, Kanban, Settings, LogOut, Palette } from 'lucide-react';

import Image from 'next/image';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const sections = [
    {
      title: 'Seguimiento o Stock',
      items: [
        { name: 'Seguimiento Pedidos', href: '/admin/orders', icon: Kanban },
        { name: 'Inventario & Stock', href: '/admin/products', icon: PackageSearch },
      ]
    },
    {
      title: 'Marketing y Promo',
      items: [
        { name: 'Campañas & Apariencia', href: '/admin/appearance', icon: Palette },
      ]
    },
    {
      title: 'Análisis y Alertas',
      items: [
        { name: 'Dashboard WMS', href: '/admin', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Configuraciones y Diseño',
      items: [
        { name: 'Ajustes del Sistema', href: '/admin/settings', icon: Settings },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      {/* Sidebar */}
      <aside className="w-64 bg-charcoal-light border-r border-charcoal-border flex flex-col">
        <div className="h-20 flex items-center px-4 border-b border-charcoal-border gap-3">
          <Image src="/logo.png" alt="Pan de Rey Logo" width={40} height={40} className="invert mix-blend-screen" />
          <span className="font-serif text-sm tracking-widest text-gold uppercase">Admin CMS</span>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-6 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              <h3 className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-500 px-3 mb-2">{section.title}</h3>
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-gold/10 text-gold border-r-2 border-gold font-semibold' 
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          ))}
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
