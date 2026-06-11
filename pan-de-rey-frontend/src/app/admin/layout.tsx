"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PackageSearch, Kanban, Settings, LogOut, Palette, ClipboardList, Ticket, TrendingUp } from 'lucide-react';

import Image from 'next/image';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const sections = [
    {
      title: 'Seguimiento o Stock',
      items: [
        { name: 'Seguimiento Pedidos', href: '/admin/orders', icon: Kanban },
        { name: 'Catálogo Productos', href: '/admin/products', icon: PackageSearch },
        { name: 'Control de Stock', href: '/admin/stock', icon: ClipboardList },
      ]
    },
    {
      title: 'Marketing y Promo',
      items: [
        { name: 'Campañas & Apariencia', href: '/admin/appearance', icon: Palette },
        { name: 'Cupones de Descuento', href: '/admin/coupons', icon: Ticket },
      ]
    },
    {
      title: 'Análisis y Alertas',
      items: [
        { name: 'Dashboard WMS', href: '/admin', icon: LayoutDashboard },
        { name: 'Performance Promos', href: '/admin/performance', icon: TrendingUp },
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
        <div className="h-20 flex items-center px-5 border-b border-charcoal-border gap-3 bg-[#070707]">
          <div className="relative w-9 h-9 overflow-hidden rounded-full bg-gold/10 flex items-center justify-center border border-gold/20">
            <Image src="/logo.png" alt="Pan de Rey Logo" width={24} height={24} className="invert mix-blend-screen opacity-90" />
          </div>
          <div>
            <span className="font-serif text-[11px] tracking-[0.15em] text-gold uppercase block font-black">Pan de Rey</span>
            <span className="text-[8px] tracking-[0.2em] text-gray-500 uppercase block font-bold mt-0.5">Control Central</span>
          </div>
        </div>
        
        <nav className="flex-1 py-6 px-3.5 space-y-6 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1.5">
              <h3 className="text-[8px] font-bold uppercase tracking-[0.2em] text-gold/40 px-3.5 mb-2.5">{section.title}</h3>
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 py-2.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                      isActive 
                        ? 'bg-[#15120a] text-gold border-l-4 border-gold font-black shadow-[0_0_15px_rgba(212,175,55,0.15)] translate-x-1 pl-3 pr-3.5' 
                        : 'text-gray-400 hover:bg-white/[0.03] hover:text-white hover:translate-x-1 pl-3.5 pr-3.5'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
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
