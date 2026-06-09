"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Download, 
  Upload, 
  X, 
  XCircle,
  AlertCircle, 
  AlertTriangle, 
  Check, 
  Image as ImageIcon,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import Image from 'next/image';
import { 
  getLocalProducts, 
  addLocalProduct, 
  updateLocalProduct, 
  deleteLocalProduct, 
  bulkAddLocalProducts,
  SimProduct 
} from '@/utils/dbSim';
import { formatPrice } from '@/utils/format';

// Unsplash premium image presets for the quick picker
const IMAGE_PRESETS = [
  { name: 'Masa Madre', url: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80' },
  { name: 'Focaccia', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80' },
  { name: 'Baguette', url: 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=800&q=80' },
  { name: 'Croissant', url: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80' },
  { name: 'Tarta Merengue', url: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=800&q=80' },
  { name: 'Brownie Húmedo', url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80' },
  { name: 'Café de Especialidad', url: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80' }
];

export default function CatalogManager() {
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<SimProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  
  // Drawer States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SimProduct | null>(null);
  
  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // CSV file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    category: 'Panadería',
    stock: 0,
    image: '',
    description: '',
    subCategory: '',
    cobertura: '',
    relleno: '',
    estilo: '',
    tipoSemilla: ''
  });

  useEffect(() => {
    setMounted(true);
    loadProducts();
  }, []);

  const loadProducts = () => {
    const data = getLocalProducts();
    setProducts(data);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  if (!mounted) return null;

  // Stock KPI Calculations
  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const criticalStockCount = products.filter(p => p.stock > 0 && p.stock < 3).length;
  const alertStockCount = products.filter(p => p.stock >= 3 && p.stock < 6).length;

  // Category and subcategory lists for dropdown filters
  const categories = Array.from(new Set(products.map(p => p.category)));

  // Filtered Products List
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.subCategory && product.subCategory.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;

    let matchesStock = true;
    if (stockFilter === 'out_of_stock') matchesStock = product.stock === 0;
    else if (stockFilter === 'critical') matchesStock = product.stock > 0 && product.stock < 3;
    else if (stockFilter === 'alert') matchesStock = product.stock >= 3 && product.stock < 6;
    else if (stockFilter === 'in_stock') matchesStock = product.stock >= 6;

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Open Drawer for Create
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      price: 0,
      category: 'Panadería',
      stock: 5,
      image: IMAGE_PRESETS[0].url,
      description: '',
      subCategory: '',
      cobertura: 'Ninguna',
      relleno: 'Ninguno',
      estilo: 'Tradicional',
      tipoSemilla: 'Ninguna'
    });
    setIsDrawerOpen(true);
  };

  // Open Drawer for Edit
  const handleOpenEdit = (product: SimProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      category: product.category,
      stock: product.stock,
      image: product.image || '',
      description: product.description || '',
      subCategory: product.subCategory || '',
      cobertura: product.cobertura || '',
      relleno: product.relleno || '',
      estilo: product.estilo || '',
      tipoSemilla: product.tipoSemilla || ''
    });
    setIsDrawerOpen(true);
  };

  // Delete product
  const handleDelete = (id: number, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el producto "${name}"?`)) {
      const updated = deleteLocalProduct(id);
      setProducts(updated);
      showToast('Producto eliminado exitosamente.');
    }
  };

  // Form Submit (Save / Create)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('El nombre del producto es obligatorio.', 'error');
      return;
    }
    if (formData.price <= 0) {
      showToast('El precio debe ser un número mayor a cero.', 'error');
      return;
    }
    if (formData.stock < 0) {
      showToast('El stock no puede ser un número negativo.', 'error');
      return;
    }

    if (editingProduct) {
      const updated = updateLocalProduct(editingProduct.id, formData);
      setProducts(updated);
      showToast(`Producto "${formData.name}" actualizado con éxito.`);
    } else {
      const newProduct = addLocalProduct(formData);
      setProducts(getLocalProducts());
      showToast(`Producto "${newProduct.name}" creado con éxito.`);
    }
    setIsDrawerOpen(false);
  };

  // CSV Template Download
  const handleDownloadCSVModel = () => {
    const headers = [
      'Nombre',
      'Precio',
      'Stock',
      'Categoria',
      'SubCategoria',
      'Descripcion',
      'ImagenUrl',
      'Cobertura',
      'Relleno',
      'Estilo',
      'TipoSemilla'
    ];
    
    const sampleRows = [
      [
        'Focaccia Suprema',
        '4200',
        '10',
        'Panadería',
        'Especiales',
        'Focaccia esponjosa horneada con sal marina gruesa y hierbas frescas.',
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
        'Aceite de Oliva y Romero',
        'Ninguno',
        'Italiano',
        'Ninguna'
      ],
      [
        'Volcán de Chocolate',
        '3200',
        '2',
        'Pastelería',
        'Individuales',
        'Bizcocho de chocolate semi-amargo con interior líquido derretido.',
        'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80',
        'Polvo de cacao',
        'Fudge de chocolate',
        'Francés',
        'Ninguna'
      ]
    ];

    const csvContent = 
      "\uFEFF" + // UTF-8 BOM for Excel Spanish compatibility
      [headers.join(','), ...sampleRows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modelo_datos_productos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Modelo de datos CSV descargado.');
  };

  // CSV Upload Parser and Seeder
  const handleUploadCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        showToast('Error al leer el archivo CSV.', 'error');
        return;
      }

      try {
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length <= 1) {
          showToast('El archivo CSV está vacío o le falta la fila de datos.', 'error');
          return;
        }

        // Quote-aware CSV parser
        const parseRow = (line: string) => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim().replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim().replace(/^"|"$/g, ''));
          return result;
        };

        const headers = parseRow(lines[0]);
        
        // Find positions of headers
        const getIndex = (name: string) => headers.findIndex(h => h.toLowerCase().trim().replace(/_/g, '') === name.toLowerCase());

        const idxName = getIndex('nombre');
        const idxPrice = getIndex('precio');
        const idxStock = getIndex('stock');
        const idxCategory = getIndex('categoria');
        const idxSubCategory = getIndex('subcategoria');
        const idxDesc = getIndex('descripcion');
        const idxImage = getIndex('imagenurl');
        const idxCobertura = getIndex('cobertura');
        const idxRelleno = getIndex('relleno');
        const idxEstilo = getIndex('estilo');
        const idxTipoSemilla = getIndex('tiposemilla');

        if (idxName === -1 || idxPrice === -1 || idxStock === -1 || idxCategory === -1) {
          showToast('Columnas requeridas faltantes. Asegúrate de usar las columnas del modelo original.', 'error');
          return;
        }

        const newProducts: Omit<SimProduct, 'id'>[] = [];
        let parsedCorrectly = 0;
        let errorsFound = 0;

        for (let i = 1; i < lines.length; i++) {
          const rowVals = parseRow(lines[i]);
          if (rowVals.length < 4) continue; // Skip malformed rows

          const name = rowVals[idxName];
          const price = parseFloat(rowVals[idxPrice]);
          const stock = parseInt(rowVals[idxStock], 10);
          const category = rowVals[idxCategory] || 'Panadería';

          if (!name || isNaN(price) || isNaN(stock)) {
            errorsFound++;
            continue;
          }

          newProducts.push({
            name,
            price,
            stock,
            category,
            subCategory: idxSubCategory !== -1 ? rowVals[idxSubCategory] : '',
            description: idxDesc !== -1 ? rowVals[idxDesc] : '',
            image: idxImage !== -1 && rowVals[idxImage] ? rowVals[idxImage] : IMAGE_PRESETS[0].url,
            cobertura: idxCobertura !== -1 ? rowVals[idxCobertura] : 'Ninguna',
            relleno: idxRelleno !== -1 ? rowVals[idxRelleno] : 'Ninguno',
            estilo: idxEstilo !== -1 ? rowVals[idxEstilo] : 'Tradicional',
            tipoSemilla: idxTipoSemilla !== -1 ? rowVals[idxTipoSemilla] : 'Ninguna'
          });
          parsedCorrectly++;
        }

        if (newProducts.length > 0) {
          const updatedList = bulkAddLocalProducts(newProducts);
          setProducts(updatedList);
          showToast(`¡Carga masiva completada! Se importaron ${parsedCorrectly} productos correctamente.${errorsFound > 0 ? ` Se omitieron ${errorsFound} filas erróneas.` : ''}`);
        } else {
          showToast('No se pudieron procesar filas válidas del archivo.', 'error');
        }

      } catch (err) {
        console.error(err);
        showToast('Error al analizar la estructura del archivo CSV.', 'error');
      }

      // Reset file input value to allow uploading the same file again
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 pb-12 relative animate-in fade-in duration-300">
      
      {/* Toast Alert popup */}
      {toast && (
        <div className={`fixed bottom-5 right-5 px-6 py-4 rounded shadow-2xl border z-[300] flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 ${
          toast.type === 'error' 
            ? 'bg-red-950/80 border-red-500 text-red-200' 
            : 'bg-[#121008]/90 border-gold/40 text-gold-hover'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <Check className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-6">
        <div>
          <h1 className="text-3xl font-serif text-white mb-2 tracking-wide">Gestión de Catálogo</h1>
          <p className="text-gray-400 text-sm">Controla la existencia de productos, carga nuevos panes de especialidad, pastelería y define sus características premium.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Invisible file input for Bulk Upload */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleUploadCSV} 
            accept=".csv" 
            className="hidden" 
          />
          
          <button 
            onClick={handleDownloadCSVModel}
            className="flex items-center gap-2 border border-gold/30 hover:border-gold bg-charcoal-light/30 text-gold px-4 py-2.5 text-xs font-bold uppercase tracking-widest rounded transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Descargar Modelo
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 border border-gold/30 hover:border-gold bg-charcoal-light/30 text-gold px-4 py-2.5 text-xs font-bold uppercase tracking-widest rounded transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Carga Masiva (CSV)
          </button>
          
          <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-gold hover:bg-gold-hover text-black px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded shadow-[0_4px_15px_rgba(212,175,55,0.15)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* KPI Cards section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI: Sin Stock */}
        <div className="bg-[#1c1212]/30 border border-red-500/10 rounded p-6 flex items-center justify-between shadow-lg hover:border-red-500/20 transition-all duration-300">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1">Sin Stock</p>
            <h3 className="text-3xl font-serif text-white font-semibold">{outOfStockCount}</h3>
            <p className="text-xs text-gray-500 mt-2">Productos con 0 unidades en inventario</p>
          </div>
          <div className="w-12 h-12 rounded bg-red-950/20 border border-red-500/20 flex items-center justify-center text-red-500 shadow-inner">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        {/* KPI: Críticos */}
        <div className="bg-[#1c1612]/30 border border-orange-500/10 rounded p-6 flex items-center justify-between shadow-lg hover:border-orange-500/20 transition-all duration-300">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400 mb-1">Stock Crítico</p>
            <h3 className="text-3xl font-serif text-white font-semibold">{criticalStockCount}</h3>
            <p className="text-xs text-gray-500 mt-2">Productos con menos de 3 unidades</p>
          </div>
          <div className="w-12 h-12 rounded bg-orange-950/20 border border-orange-500/20 flex items-center justify-center text-orange-500 shadow-inner">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* KPI: Alerta */}
        <div className="bg-[#1c1b12]/30 border border-yellow-500/10 rounded p-6 flex items-center justify-between shadow-lg hover:border-yellow-500/20 transition-all duration-300">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400 mb-1">Stock en Alerta</p>
            <h3 className="text-3xl font-serif text-white font-semibold">{alertStockCount}</h3>
            <p className="text-xs text-gray-500 mt-2">Productos con menos de 6 unidades</p>
          </div>
          <div className="w-12 h-12 rounded bg-yellow-950/20 border border-yellow-500/20 flex items-center justify-center text-yellow-400 shadow-inner">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-charcoal-light/20 border border-charcoal-border rounded p-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-md">
        {/* Search input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar por nombre, categoría o subcategoría..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 placeholder-gray-600 pl-10 pr-4 py-2.5 text-xs rounded outline-none focus:border-gold/40 transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-gray-500 hover:text-white absolute right-3.5 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Categoría:</span>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3 py-2.5 rounded outline-none focus:border-gold/40 transition-colors"
            >
              <option value="all">Todas las Categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Estado Inventario:</span>
            <select 
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3 py-2.5 rounded outline-none focus:border-gold/40 transition-colors"
            >
              <option value="all">Todos los Stocks</option>
              <option value="out_of_stock">Sin Stock (0)</option>
              <option value="critical">Stock Crítico {"(< 3)"}</option>
              <option value="alert">Stock Alerta {"(< 6)"}</option>
              <option value="in_stock">Disponible {"(>= 6)"}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products table */}
      <div className="bg-charcoal-light/10 rounded border border-charcoal-border overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#0d0d0d]/80 text-[10px] text-gray-400 uppercase font-bold tracking-widest border-b border-charcoal-border">
              <tr>
                <th className="px-6 py-4.5 w-80">Producto</th>
                <th className="px-6 py-4.5">Clasificación</th>
                <th className="px-6 py-4.5">Fórmula & Atributos</th>
                <th className="px-6 py-4.5">Precio</th>
                <th className="px-6 py-4.5 w-48">Stock disponible</th>
                <th className="px-6 py-4.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-gray-500 bg-charcoal-light/5">
                    <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                    <p className="text-xs uppercase tracking-widest text-white/50 font-bold mb-1">No se encontraron productos</p>
                    <p className="text-[11px] text-gray-600">Prueba modificando la búsqueda o eliminando los filtros aplicados</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  // Stock visual helper
                  let stockColor = 'text-green-400 border-green-500/20 bg-green-500/5';
                  let progressColor = 'bg-green-500';
                  let stockText = 'Disponible';
                  let progressWidth = '100%';

                  if (product.stock === 0) {
                    stockColor = 'text-red-400 border-red-500/20 bg-red-500/5';
                    progressColor = 'bg-red-500';
                    stockText = 'Sin Stock';
                    progressWidth = '0%';
                  } else if (product.stock < 3) {
                    stockColor = 'text-orange-400 border-orange-500/20 bg-orange-500/5';
                    progressColor = 'bg-orange-500';
                    stockText = 'Stock Crítico';
                    progressWidth = '20%';
                  } else if (product.stock < 6) {
                    stockColor = 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5';
                    progressColor = 'bg-yellow-500';
                    stockText = 'Stock Alerta';
                    progressWidth = '50%';
                  }

                  return (
                    <tr key={product.id} className="border-b border-charcoal-border/40 hover:bg-white/[0.02] transition-colors group">
                      {/* Name & description */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="relative w-12 h-12 rounded overflow-hidden bg-charcoal-light border border-charcoal-border/50 shrink-0">
                            {product.image ? (
                              <Image 
                                src={product.image} 
                                alt={product.name} 
                                fill 
                                className="object-cover" 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-600">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-serif text-white text-base group-hover:text-gold transition-colors truncate">{product.name}</h4>
                            <p className="text-[11px] text-gray-500 line-clamp-1 mt-1 font-light">{product.description || 'Sin descripción'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category & Subcategory */}
                      <td className="px-6 py-5">
                        <div>
                          <span className="text-xs text-white/90 block font-medium">{product.category}</span>
                          <span className="text-[10px] text-gray-500 block mt-0.5">{product.subCategory || 'Sin Subcategoría'}</span>
                        </div>
                      </td>

                      {/* Attributes list */}
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {product.cobertura && product.cobertura !== 'Ninguna' && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-purple-500/10 bg-purple-500/5 text-purple-400" title="Cobertura">
                              Cob: {product.cobertura}
                            </span>
                          )}
                          {product.relleno && product.relleno !== 'Ninguno' && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-rose-500/10 bg-rose-500/5 text-rose-400" title="Relleno">
                              Rel: {product.relleno}
                            </span>
                          )}
                          {product.estilo && product.estilo !== 'Tradicional' && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-blue-500/10 bg-blue-500/5 text-blue-400" title="Estilo">
                              Est: {product.estilo}
                            </span>
                          )}
                          {product.tipoSemilla && product.tipoSemilla !== 'Ninguna' && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-amber-500/10 bg-amber-500/5 text-amber-400" title="Semillas">
                              Sem: {product.tipoSemilla}
                            </span>
                          )}
                          {(!product.cobertura || product.cobertura === 'Ninguna') && 
                           (!product.relleno || product.relleno === 'Ninguno') && 
                           (!product.estilo || product.estilo === 'Tradicional') && 
                           (!product.tipoSemilla || product.tipoSemilla === 'Ninguna') && (
                            <span className="text-[10px] text-gray-600 font-light italic">Atributos básicos</span>
                          )}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-6 py-5">
                        <span className="font-serif text-gold font-bold text-base">${formatPrice(product.price)}</span>
                      </td>

                      {/* Stock Level indicator */}
                      <td className="px-6 py-5">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${stockColor}`}>
                              {stockText}
                            </span>
                            <span className="font-bold text-white">{product.stock} un.</span>
                          </div>
                          <div className="w-full h-1 bg-[#141414] rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                              style={{ width: progressWidth }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-3.5">
                          <button 
                            onClick={() => handleOpenEdit(product)}
                            className="text-gray-500 hover:text-gold transition-colors cursor-pointer"
                            title="Editar Producto"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(product.id, product.name)}
                            className="text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
                            title="Eliminar Producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Drawer Panel */}
      {isDrawerOpen && (
        <>
          {/* Backdrop blur overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] transition-opacity duration-300 animate-in fade-in"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer body */}
          <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-charcoal-light border-l border-charcoal-border z-[201] flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-charcoal-border bg-[#0d0d0d] flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl text-white tracking-wide">
                  {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
                </h3>
                <p className="text-gray-500 text-[11px] mt-0.5">Completa las características técnicas y comerciales del producto.</p>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Form Scroll Area */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Image URL & Preset Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                  Imágenes del Producto
                  <span title="Ingresa un enlace de imagen o escoge uno de nuestros presets artesanales.">
                    <HelpCircle className="w-3.5 h-3.5 text-gray-600 cursor-help" />
                  </span>
                </label>
                
                {/* Image preview */}
                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-charcoal-border bg-[#0d0d0d] flex items-center justify-center">
                  {formData.image ? (
                    <>
                      <Image 
                        src={formData.image} 
                        alt="Product preview" 
                        fill 
                        className="object-cover opacity-80" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                        <span className="text-[10px] text-gray-300 truncate font-light w-full">{formData.image}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-gray-600 space-y-2">
                      <ImageIcon className="w-8 h-8 mx-auto stroke-1" />
                      <p className="text-xs">Sin vista previa de imagen</p>
                    </div>
                  )}
                </div>

                {/* Input text URL */}
                <input 
                  type="url" 
                  placeholder="Pegar enlace de imagen (https://...)" 
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3 py-2.5 rounded outline-none focus:border-gold/40 transition-colors"
                />

                {/* Presets selection grid */}
                <div className="space-y-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Selección Rápida de Imagen:</span>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {IMAGE_PRESETS.map((preset) => {
                      const isSelected = formData.image === preset.url;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setFormData({ ...formData, image: preset.url })}
                          className={`relative aspect-square rounded overflow-hidden border transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-gold scale-95 shadow-[0_0_8px_rgba(212,175,55,0.4)]' 
                              : 'border-charcoal-border hover:border-gray-500'
                          }`}
                          title={preset.name}
                        >
                          <Image src={preset.url} alt={preset.name} fill className="object-cover" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <hr className="border-charcoal-border/50" />

              {/* General Fields Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nombre del Producto *</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Baguette de Centeno rústico"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40 transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Precio Base ($) *</label>
                  <input 
                    type="number" 
                    placeholder="4500"
                    min="0"
                    value={formData.price || ''}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40 transition-colors font-serif font-bold text-gold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Stock Inicial *</label>
                  <input 
                    type="number" 
                    placeholder="10"
                    min="0"
                    value={formData.stock === null ? '' : formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40 transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Categoría *</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40 transition-colors"
                  >
                    <option value="Panadería">Panadería</option>
                    <option value="Pastelería">Pastelería</option>
                    <option value="Sin Gluten">Sin Gluten</option>
                    <option value="Bebestibles">Bebestibles</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">SubCategoría</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Masa Madre / Hojaldres"
                    value={formData.subCategory}
                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Descripción del Producto</label>
                <textarea 
                  rows={3}
                  placeholder="Detalles sobre fermentación lenta, harinas orgánicas u otros aspectos de sabor..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40 transition-colors resize-none font-light leading-relaxed"
                />
              </div>

              <hr className="border-charcoal-border/50" />

              {/* Crafting / Special Attributes Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-serif text-gold uppercase tracking-wider font-semibold">Atributos del Panificador / Especiales</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Cobertura</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Romero y sal / Glaseado / Harina"
                      value={formData.cobertura}
                      onChange={(e) => setFormData({ ...formData, cobertura: e.target.value })}
                      className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Relleno</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Crema de almendras / Chocolate"
                      value={formData.relleno}
                      onChange={(e) => setFormData({ ...formData, relleno: e.target.value })}
                      className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Estilo</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Rústico / Italiano / Francés"
                      value={formData.estilo}
                      onChange={(e) => setFormData({ ...formData, estilo: e.target.value })}
                      className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tipo de Semilla</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Sésamo / Linaza / Alcaravea"
                      value={formData.tipoSemilla}
                      onChange={(e) => setFormData({ ...formData, tipoSemilla: e.target.value })}
                      className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40 transition-colors"
                    />
                  </div>
                </div>
              </div>

            </form>

            {/* Drawer Actions footer */}
            <div className="p-6 border-t border-charcoal-border bg-[#0d0d0d] flex items-center justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-5 py-2.5 border border-charcoal-border hover:border-gray-500 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest rounded transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                type="submit"
                className="px-6 py-2.5 bg-gold hover:bg-gold-hover text-black text-xs font-bold uppercase tracking-widest rounded shadow-lg transition-colors cursor-pointer"
              >
                {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
              </button>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
