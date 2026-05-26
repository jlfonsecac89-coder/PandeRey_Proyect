"use client";

import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const mockProducts = [
  { id: '1', name: 'Pan de Masa Madre Clásico', category: 'Panadería', basePrice: 12.00, variants: 3, stock: 15 },
  { id: '2', name: 'Focaccia de Romero', category: 'Para Compartir', basePrice: 15.00, variants: 2, stock: 3 },
  { id: '3', name: 'Croissant Francés', category: 'Pastelería', basePrice: 4.50, variants: 1, stock: 25 },
];

export default function CatalogManager() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-2">Gestor de Catálogo</h1>
          <p className="text-gray-400">Administra los productos, categorías y variantes.</p>
        </div>
        <button className="flex items-center gap-2 bg-gold text-black px-4 py-2 font-medium rounded-sm hover:bg-gold-hover transition-colors">
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </button>
      </div>

      <div className="bg-charcoal-light rounded-sm border border-charcoal-border overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-[#141414] text-gray-400 uppercase font-medium border-b border-charcoal-border">
            <tr>
              <th className="px-6 py-4">Producto</th>
              <th className="px-6 py-4">Categoría</th>
              <th className="px-6 py-4">Precio Base</th>
              <th className="px-6 py-4">Variantes</th>
              <th className="px-6 py-4">Stock General</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {mockProducts.map((product) => (
              <tr key={product.id} className="border-b border-charcoal-border/50 hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-medium text-white">{product.name}</td>
                <td className="px-6 py-4">{product.category}</td>
                <td className="px-6 py-4 text-gold">${product.basePrice.toFixed(2)}</td>
                <td className="px-6 py-4">{product.variants}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs border ${product.stock < 5 ? 'border-orange-500/50 text-orange-500' : 'border-green-500/50 text-green-500'}`}>
                    {product.stock} un.
                  </span>
                </td>
                <td className="px-6 py-4 flex justify-end gap-3">
                  <button className="text-gray-400 hover:text-gold transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
