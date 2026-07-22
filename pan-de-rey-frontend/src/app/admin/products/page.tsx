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
  Check, 
  Image as ImageIcon,
  HelpCircle,
  Package,
  Layers,
  Settings,
  Folder,
  ChevronRight,
  ChevronDown,
  Tag,
  Link as LinkIcon
} from 'lucide-react';
import { supabase } from '@/utils/supabase';
import Image from 'next/image';
import { formatPrice } from '@/utils/format';

const IMAGE_PRESETS = [
  { name: 'Masa Madre', url: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80' },
  { name: 'Focaccia', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80' },
  { name: 'Baguette', url: 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=800&q=80' },
  { name: 'Croissant', url: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80' },
  { name: 'Tarta Merengue', url: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=800&q=80' },
  { name: 'Brownie Húmedo', url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80' },
  { name: 'Café de Especialidad', url: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80' }
];

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  is_active: number | boolean;
}

interface AttributeGroup {
  id: number;
  name: string;
}

interface AttributeValue {
  id: number;
  group_id: number;
  value: string;
}

interface Product {
  id: string;
  categoryId: number;
  categoryName: string;
  category: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  description: string | null;
  isActive: number | boolean;
  variantId: string | null;
  sku?: string | null;
  stock: number;
  attributes: number[] | null; // Value IDs
}

export default function CatalogManager() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  
  // Lists
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>([]);
  const [attributeValues, setAttributeValues] = useState<AttributeValue[]>([]);
  
  // Loading states
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  
  // Drawers & Modals
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedLinkCategory, setSelectedLinkCategory] = useState<number | null>(null);
  const [selectedLinkGroup, setSelectedLinkGroup] = useState<number | null>(null);
  
  // Quick Add Attribute Value State
  const [quickAddValue, setQuickAddValue] = useState<{ [groupId: number]: string }>({});
  
  interface CSVReviewItem {
    name: string;
    price: number;
    stock: number;
    categoryId: number;
    description: string;
    image: string;
    status: 'new' | 'has_change' | 'no_change';
    changeDetails: string;
    approved: boolean;
  }

  const [csvReviewItems, setCsvReviewItems] = useState<CSVReviewItem[]>([]);
  const [isCsvReviewOpen, setIsCsvReviewOpen] = useState(false);
  const [submittingBulk, setSubmittingBulk] = useState(false);

  // Form states
  const [productForm, setProductForm] = useState({
    name: '',
    price: 0,
    categoryId: '',
    stock: 0,
    image: '',
    description: '',
    attributes: [] as number[]
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    parentId: '' as string | number,
    isActive: true
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      loadProducts(),
      loadCategories(),
      loadAttributes()
    ]);
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/catalog/products?all=true');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
      showToast('Error al conectar con el catálogo de productos.', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch('/api/catalog/categories?all=true');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error(err);
      showToast('Error al conectar con la taxonomía de categorías.', 'error');
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadAttributes = async () => {
    setLoadingAttributes(true);
    try {
      const [groupsRes, valuesRes] = await Promise.all([
        fetch('/api/catalog/attributes/groups'),
        fetch('/api/catalog/attributes/values')
      ]);
      if (groupsRes.ok && valuesRes.ok) {
        setAttributeGroups(await groupsRes.json());
        setAttributeValues(await valuesRes.json());
      }
    } catch (err) {
      console.error(err);
      showToast('Error al conectar con el catálogo de atributos.', 'error');
    } finally {
      setLoadingAttributes(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  if (!mounted) return null;

  // Visual helper for category tree
  const buildCategoryTree = (parentId: number | null = null, depth = 0): any[] => {
    return categories
      .filter(c => c.parent_id === parentId)
      .map(c => ({
        ...c,
        depth,
        children: buildCategoryTree(c.id, depth + 1)
      }));
  };

  const categoryTree = buildCategoryTree(null);

  // Business check: is a category a Leaf node ("Tipo")?
  // We define "Tipo" as a category that has a parent (i.e. parent_id is not null) and has no subcategories (no children).
  const isLeafCategory = (catId: number): boolean => {
    const cat = categories.find(c => c.id === catId);
    if (!cat || cat.parent_id === null) return false; // Must have parent
    const hasChildren = categories.some(c => c.parent_id === catId);
    return !hasChildren; // Must not have children
  };

  // Find all category IDs down the tree
  const getSubcategoryIds = (catId: number): number[] => {
    const directChildren = categories.filter(c => c.parent_id === catId).map(c => c.id);
    return [catId, ...directChildren.flatMap(id => getSubcategoryIds(id))];
  };

  // Handle Product Save
  const handleProductSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      showToast('El nombre del producto es obligatorio.', 'error');
      return;
    }
    if (productForm.price <= 0) {
      showToast('El precio debe ser un número mayor a cero.', 'error');
      return;
    }
    if (!productForm.categoryId) {
      showToast('Debes seleccionar una categoría.', 'error');
      return;
    }

    const payload = {
      id: editingProduct?.id,
      name: productForm.name,
      slug: productForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      price: productForm.price,
      categoryId: parseInt(productForm.categoryId),
      stock: productForm.stock,
      image: productForm.image,
      description: productForm.description,
      attributes: productForm.attributes
    };

    const url = editingProduct ? '/api/catalog/products/update' : '/api/catalog/products';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(editingProduct ? 'Producto actualizado con éxito.' : 'Producto creado con éxito.');
        setIsProductDrawerOpen(false);
        loadProducts();
      } else {
        const data = await res.json();
        showToast(data.error || 'Ocurrió un error al guardar el producto.', 'error');
      }
    } catch (err) {
      showToast('Error de red al intentar guardar.', 'error');
    }
  };

  // Handle Product Delete
  const handleProductDelete = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas desactivar el producto "${name}"?`)) {
      try {
        const res = await fetch('/api/catalog/products/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        if (res.ok) {
          showToast('Producto desactivado exitosamente.');
          loadProducts();
        } else {
          showToast('Error al desactivar el producto.', 'error');
        }
      } catch (err) {
        showToast('Error de red al desactivar.', 'error');
      }
    }
  };

  // Handle Category Save
  const handleCategorySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      showToast('El nombre es obligatorio.', 'error');
      return;
    }
    const slug = categoryForm.slug.trim() || categoryForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const payload = {
      id: editingCategory?.id,
      name: categoryForm.name,
      slug,
      parentId: categoryForm.parentId ? parseInt(categoryForm.parentId as string) : null,
      isActive: categoryForm.isActive
    };

    const url = editingCategory ? '/api/catalog/categories/update' : '/api/catalog/categories';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(editingCategory ? 'Categoría actualizada con éxito.' : 'Categoría creada con éxito.');
        setIsCategoryModalOpen(false);
        loadCategories();
      } else {
        const data = await res.json();
        showToast(data.error || 'Error al guardar la categoría.', 'error');
      }
    } catch (err) {
      showToast('Error de red al guardar la categoría.', 'error');
    }
  };

  // Handle Quick Add Attribute Value
  const handleQuickAddValue = async (groupId: number) => {
    const val = quickAddValue[groupId]?.trim();
    if (!val) return;

    try {
      const res = await fetch('/api/catalog/attributes/values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, value: val })
      });
      if (res.ok) {
        showToast('Valor agregado con éxito.');
        setQuickAddValue({ ...quickAddValue, [groupId]: '' });
        loadAttributes();
      } else {
        showToast('Error al agregar valor.', 'error');
      }
    } catch (err) {
      showToast('Error de red.', 'error');
    }
  };

  // Handle Attribute Group Creation
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const res = await fetch('/api/catalog/attributes/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim() })
      });
      if (res.ok) {
        showToast('Grupo de atributos creado.');
        setNewGroupName('');
        setIsGroupModalOpen(false);
        loadAttributes();
      } else {
        showToast('Error al crear el grupo.', 'error');
      }
    } catch (err) {
      showToast('Error de red.', 'error');
    }
  };

  // Handle Category Attribute Group Link
  const handleLinkCategoryGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLinkCategory || !selectedLinkGroup) return;

    try {
      const res = await fetch('/api/catalog/categories/attributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedLinkCategory,
          attributeGroupId: selectedLinkGroup
        })
      });
      if (res.ok) {
        showToast('Asociación guardada exitosamente.');
        setIsLinkModalOpen(false);
        loadCategories();
        loadAttributes();
      } else {
        const data = await res.json();
        showToast(data.error || 'Error al guardar asociación.', 'error');
      }
    } catch (err) {
      showToast('Error de red.', 'error');
    }
  };

  // Toggle Category Active Status
  const handleToggleCategoryActive = async (cat: Category) => {
    const nextStatus = !cat.is_active;
    try {
      const res = await fetch('/api/catalog/categories/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          parentId: cat.parent_id,
          isActive: nextStatus
        })
      });
      if (res.ok) {
        showToast(`Categoría ${nextStatus ? 'activada' : 'desactivada'} con éxito.`);
        loadCategories();
      }
    } catch (err) {
      showToast('Error al cambiar estado.', 'error');
    }
  };

  // Download CSV Model for Carga Masiva
  const handleDownloadCSVModel = () => {
    const headers = [
      'Nombre',
      'Precio',
      'Stock',
      'Categoria_ID',
      'Descripcion',
      'ImagenUrl'
    ];
    
    const sampleRows = [
      [
        'Volcán de Fresa',
        '3800',
        '15',
        '2', // Pastelería / Torta ID
        'Delicioso postre con bizcocho premium y relleno de salsa de fresa natural.',
        'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=800&q=80'
      ]
    ];

    const csvContent = 
      "\uFEFF" + // UTF-8 BOM
      [headers.join(','), ...sampleRows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modelo_productos_pan_de_rey.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Modelo de datos CSV descargado.');
  };

  // CSV mass upload
  const handleUploadCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length <= 1) {
          showToast('El archivo CSV está vacío.', 'error');
          return;
        }

        const parseRow = (line: string) => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
              result.push(current.trim().replace(/^"|"$/g, ''));
              current = '';
            } else current += char;
          }
          result.push(current.trim().replace(/^"|"$/g, ''));
          return result;
        };

        const headers = parseRow(lines[0]);
        const getIndex = (name: string) => headers.findIndex(h => h.toLowerCase().trim() === name.toLowerCase());

        const idxName = getIndex('nombre');
        const idxPrice = getIndex('precio');
        const idxStock = getIndex('stock');
        const idxCatId = getIndex('categoria_id');
        const idxDesc = getIndex('descripcion');
        const idxImage = getIndex('imagenurl');

        if (idxName === -1 || idxPrice === -1 || idxStock === -1 || idxCatId === -1) {
          showToast('Formato de CSV incorrecto. Faltan columnas obligatorias.', 'error');
          return;
        }

        const itemsToReview: CSVReviewItem[] = [];
        for (let i = 1; i < lines.length; i++) {
          const rowVals = parseRow(lines[i]);
          if (rowVals.length < 4) continue;

          const name = rowVals[idxName];
          const price = parseFloat(rowVals[idxPrice]);
          const stock = parseInt(rowVals[idxStock], 10);
          const categoryId = parseInt(rowVals[idxCatId], 10);
          const description = idxDesc !== -1 ? rowVals[idxDesc] : '';
          const image = idxImage !== -1 && rowVals[idxImage] ? rowVals[idxImage] : '';

          if (!name || isNaN(price) || isNaN(stock) || isNaN(categoryId)) continue;

          // Match against existing products
          const existing = products.find(p => p.name.toLowerCase().trim() === name.toLowerCase().trim());

          let status: 'new' | 'has_change' | 'no_change' = 'new';
          let changeDetails = '';
          let approved = true;

          if (existing) {
            const hasPriceChange = existing.price !== price;
            const hasStockChange = existing.stock !== stock;
            const hasCategoryChange = existing.categoryId !== categoryId;

            if (hasPriceChange || hasStockChange || hasCategoryChange) {
              status = 'has_change';
              const details: string[] = [];
              if (hasPriceChange) details.push(`Precio: $${existing.price} → $${price}`);
              if (hasStockChange) details.push(`Stock: ${existing.stock} → ${stock}`);
              if (hasCategoryChange) details.push(`Categoría: ${existing.categoryId} → ${categoryId}`);
              changeDetails = details.join(', ');
              approved = true;
            } else {
              status = 'no_change';
              changeDetails = 'Sin cambios detectados.';
              approved = false;
            }
          } else {
            status = 'new';
            changeDetails = 'Producto nuevo.';
            approved = true;
          }

          itemsToReview.push({
            name,
            price,
            stock,
            categoryId,
            description,
            image,
            status,
            changeDetails,
            approved
          });
        }

        if (itemsToReview.length > 0) {
          setCsvReviewItems(itemsToReview);
          setIsCsvReviewOpen(true);
          showToast(`CSV analizado. ${itemsToReview.length} filas listas para revisión.`);
        } else {
          showToast('No se encontraron filas válidas para importar.', 'error');
        }
      } catch (err) {
        showToast('Error al parsear el CSV.', 'error');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleConfirmBulkUpload = async () => {
    const approvedProducts = csvReviewItems.filter(item => item.approved);
    if (approvedProducts.length === 0) {
      showToast('No seleccionaste ningún producto para importar.', 'error');
      return;
    }

    setSubmittingBulk(true);
    try {
      const res = await fetch('/api/catalog/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: approvedProducts })
      });
      if (res.ok) {
        showToast(`¡Carga masiva exitosa! Se procesaron ${approvedProducts.length} productos.`);
        setIsCsvReviewOpen(false);
        setCsvReviewItems([]);
        loadProducts();
      } else {
        showToast('Error en la carga masiva en el servidor.', 'error');
      }
    } catch (err) {
      showToast('Error de red durante la carga masiva.', 'error');
    } finally {
      setSubmittingBulk(false);
    }
  };

  const toggleCsvItemApproval = (index: number) => {
    setCsvReviewItems(prev => prev.map((item, idx) => 
      idx === index ? { ...item, approved: !item.approved } : item
    ));
  };

  const handleUploadImagesBySku = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Match file name format: sku-index.ext or name-index.ext
      const match = file.name.match(/^(.+)-(\d+)\.(jpe?g|png|webp)$/i);
      if (!match) {
        failCount++;
        continue;
      }

      const fileSku = match[1].toLowerCase().trim();
      const index = parseInt(match[2], 10);

      // Match against local products by sku or slug
      const matchedProd = products.find(p => 
        (p.sku && p.sku.toLowerCase().trim() === fileSku) || 
        p.slug.toLowerCase().trim() === fileSku
      );

      if (!matchedProd) {
        failCount++;
        continue;
      }

      try {
        const fileExt = file.name.split('.').pop();
        const filePath = `${matchedProd.id}/${index}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('products')
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type
          });

        if (error) {
          console.error(`Error uploading ${file.name}:`, error.message);
          failCount++;
          continue;
        }

        if (index === 1) {
          const publicUrlRes = supabase.storage.from('products').getPublicUrl(filePath);
          const publicUrl = publicUrlRes.data.publicUrl;

          await fetch('/api/catalog/products/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: matchedProd.id,
              categoryId: matchedProd.categoryId,
              name: matchedProd.name,
              price: matchedProd.price,
              image: publicUrl,
              description: matchedProd.description,
              stock: matchedProd.stock,
              attributes: matchedProd.attributes
            })
          });
        }
        successCount++;
      } catch (err) {
        console.error(err);
        failCount++;
      }
    }

    showToast(`Asociación de imágenes completada. Éxito: ${successCount}, Error/Omitido: ${failCount}.`);
    loadProducts();
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // Open Product Drawer
  const handleOpenProductCreate = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      price: 0,
      categoryId: categories.find(c => isLeafCategory(c.id))?.id.toString() || '',
      stock: 10,
      image: IMAGE_PRESETS[0].url,
      description: '',
      attributes: []
    });
    setIsProductDrawerOpen(true);
  };

  const handleOpenProductEdit = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: product.price,
      categoryId: product.categoryId.toString(),
      stock: product.stock,
      image: product.image || '',
      description: product.description || '',
      attributes: product.attributes || []
    });
    setIsProductDrawerOpen(true);
  };

  // Open Category Modals
  const handleOpenCategoryCreate = (parentId: number | null = null) => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      slug: '',
      parentId: parentId ? parentId.toString() : '',
      isActive: true
    });
    setIsCategoryModalOpen(true);
  };

  const handleOpenCategoryEdit = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parent_id ? cat.parent_id.toString() : '',
      isActive: cat.is_active === 1 || cat.is_active === true
    });
    setIsCategoryModalOpen(true);
  };

  // Filter products list
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.categoryName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesCategory = true;
    if (selectedCategoryFilter !== 'all') {
      const selectedId = parseInt(selectedCategoryFilter);
      const allowedIds = getSubcategoryIds(selectedId);
      matchesCategory = allowedIds.includes(product.categoryId);
    }

    let matchesStock = true;
    if (stockFilter === 'out_of_stock') matchesStock = product.stock === 0;
    else if (stockFilter === 'critical') matchesStock = product.stock > 0 && product.stock < 3;
    else if (stockFilter === 'alert') matchesStock = product.stock >= 3 && product.stock < 6;
    else if (stockFilter === 'in_stock') matchesStock = product.stock >= 6;

    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div className="space-y-8 pb-12 relative animate-in fade-in duration-300">
      
      {/* Toast Alert */}
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

      {/* Tabs Selector */}
      <div className="flex border-b border-charcoal-border gap-6">
        <button 
          onClick={() => setActiveTab('products')}
          className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all ${
            activeTab === 'products' ? 'border-b-2 border-gold text-gold font-black' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Productos
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all ${
            activeTab === 'categories' ? 'border-b-2 border-gold text-gold font-black' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Categorías y Atributos
          </span>
        </button>
      </div>

      {activeTab === 'products' ? (
        <>
          {/* Header section */}
          <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-6">
            <div>
              <h1 className="text-3xl font-serif text-white mb-2 tracking-wide">Gestión de Catálogo</h1>
              <p className="text-gray-400 text-sm">Administra los productos de Pan de Rey vinculados a su stock físico y variante de atributos.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
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

              <input 
                type="file" 
                ref={imageInputRef} 
                onChange={handleUploadImagesBySku} 
                accept="image/jpeg,image/png,image/webp" 
                multiple
                className="hidden" 
              />
              
              <button 
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-2 border border-gold/30 hover:border-gold bg-charcoal-light/30 text-gold px-4 py-2.5 text-xs font-bold uppercase tracking-widest rounded transition-all cursor-pointer"
              >
                <ImageIcon className="w-4 h-4" />
                Subir Fotos por SKU
              </button>
              
              <button 
                onClick={handleOpenProductCreate}
                className="flex items-center gap-2 bg-gold hover:bg-gold-hover text-black px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded shadow-[0_4px_15px_rgba(212,175,55,0.15)] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nuevo Producto
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-charcoal-light/25 border border-charcoal-border rounded p-6 flex items-center justify-between shadow-lg">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total Catálogo</p>
                <h3 className="text-3xl font-serif text-white font-semibold">{products.length}</h3>
              </div>
              <div className="w-12 h-12 rounded bg-gold/5 border border-gold/20 flex items-center justify-center text-gold">
                <Package className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-charcoal-light/25 border border-charcoal-border rounded p-6 flex items-center justify-between shadow-lg">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1">Quiebre de Stock</p>
                <h3 className="text-3xl font-serif text-white font-semibold">{products.filter(p => p.stock === 0).length}</h3>
              </div>
              <div className="w-12 h-12 rounded bg-red-950/20 border border-red-500/20 flex items-center justify-center text-red-500">
                <XCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Filters controls */}
          <div className="bg-charcoal-light/20 border border-charcoal-border rounded p-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-md">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar por nombre, descripción o categoría..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 placeholder-gray-600 pl-10 pr-4 py-2.5 text-xs rounded outline-none focus:border-gold/40 transition-colors"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Filtrar por Categoría:</span>
              <select 
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3 py-2.5 rounded outline-none focus:border-gold/40"
              >
                <option value="all">Todas las Categorías</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
                ))}
              </select>

              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Estado Stock:</span>
              <select 
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3 py-2.5 rounded outline-none focus:border-gold/40"
              >
                <option value="all">Todos los Stocks</option>
                <option value="out_of_stock">Sin Stock (0)</option>
                <option value="critical">Crítico {"(< 3)"}</option>
                <option value="alert">Alerta {"(< 6)"}</option>
                <option value="in_stock">Disponible</option>
              </select>
            </div>
          </div>

          {/* Products table */}
          <div className="bg-charcoal-light/10 rounded border border-charcoal-border overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-[#0d0d0d]/80 text-[10px] text-gray-400 uppercase font-bold tracking-widest border-b border-charcoal-border">
                  <tr>
                    <th className="px-6 py-4.5 w-80">Producto</th>
                    <th className="px-6 py-4.5">Categoría</th>
                    <th className="px-6 py-4.5">Atributos Seleccionados</th>
                    <th className="px-6 py-4.5">Precio Base</th>
                    <th className="px-6 py-4.5">Stock</th>
                    <th className="px-6 py-4.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingProducts ? (
                    <tr>
                      <td colSpan={6} className="text-center py-20 text-gray-500">Cargando catálogo desde la base de datos...</td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-20 text-gray-500">No se encontraron productos.</td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="border-b border-charcoal-border/40 hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="relative w-12 h-12 rounded overflow-hidden bg-charcoal-light border border-charcoal-border/50 shrink-0">
                              {product.image ? (
                                <Image src={product.image} alt={product.name} fill className="object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-600"><ImageIcon className="w-5 h-5" /></div>
                              )}
                            </div>
                            <div>
                              <h4 className="font-serif text-white text-base font-bold">{product.name}</h4>
                              <p className="text-[11px] text-gray-500 line-clamp-1 mt-1 font-light">{product.description || 'Sin descripción'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs text-white/90 font-medium">{product.categoryName}</span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {product.attributes && product.attributes.length > 0 ? (
                              product.attributes.map(valId => {
                                const valObj = attributeValues.find(v => v.id === valId);
                                const grpObj = valObj ? attributeGroups.find(g => g.id === valObj.group_id) : null;
                                if (!valObj || !grpObj) return null;
                                return (
                                  <span key={valId} className="text-[9px] font-bold px-2 py-0.5 rounded border border-gold/10 bg-gold/5 text-gold-hover">
                                    {grpObj.name}: {valObj.value}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-[10px] text-gray-600 italic font-light">Sin atributos asociados</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="font-serif text-gold font-bold text-base">${formatPrice(product.price)}</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`font-bold ${product.stock === 0 ? 'text-red-500' : 'text-white'}`}>{product.stock} un.</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-3.5">
                            <button onClick={() => handleOpenProductEdit(product)} className="text-gray-500 hover:text-gold transition-colors cursor-pointer"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleProductDelete(product.id, product.name)} className="text-gray-500 hover:text-red-500 transition-colors cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Categorías y Atributos Hierarchy Tab (Fase 1 Taxonomía) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left panel: Category hierarchical tree */}
          <div className="lg:col-span-7 bg-charcoal-light/10 border border-charcoal-border rounded p-6 shadow-xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-serif text-xl text-white tracking-wide">Árbol de Taxonomía</h3>
                <p className="text-gray-400 text-xs">Visualiza y configura la jerarquía recursiva del catálogo.</p>
              </div>
              <button 
                onClick={() => handleOpenCategoryCreate(null)}
                className="flex items-center gap-2 bg-gold hover:bg-gold-hover text-black px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nueva Categoría Raíz
              </button>
            </div>

            <div className="border border-charcoal-border/50 rounded overflow-hidden">
              <div className="bg-[#0d0d0d] px-4 py-3 border-b border-charcoal-border text-[10px] text-gray-500 font-bold uppercase tracking-widest grid grid-cols-12">
                <span className="col-span-7">Estructura Organizacional</span>
                <span className="col-span-2 text-center">Estado</span>
                <span className="col-span-3 text-right">Acciones</span>
              </div>
              <div className="divide-y divide-charcoal-border/30 bg-[#070707]/30">
                {categories.length === 0 ? (
                  <p className="text-center py-10 text-gray-600 text-xs font-light">No hay categorías configuradas en Supabase.</p>
                ) : (
                  // Custom rendering of the tree recursively in HTML
                  categories.filter(c => c.parent_id === null).map(rootCat => {
                    const children = categories.filter(c => c.parent_id === rootCat.id);
                    return (
                      <div key={rootCat.id} className="space-y-1">
                        <div className="px-4 py-3.5 grid grid-cols-12 items-center hover:bg-white/[0.01]">
                          <div className="col-span-7 flex items-center gap-2 pl-0">
                            <Folder className="w-4 h-4 text-gold/80" />
                            <span className="text-sm font-medium text-white">{rootCat.name}</span>
                            <span className="text-[9px] text-gray-500 font-mono">({rootCat.slug})</span>
                          </div>
                          <div className="col-span-2 text-center">
                            <button 
                              onClick={() => handleToggleCategoryActive(rootCat)}
                              className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                                rootCat.is_active ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-red-500/20 bg-red-500/5 text-red-400'
                              }`}
                            >
                              {rootCat.is_active ? 'Activa' : 'Inactiva'}
                            </button>
                          </div>
                          <div className="col-span-3 text-right space-x-2">
                            <button onClick={() => handleOpenCategoryCreate(rootCat.id)} className="text-[10px] text-gray-500 hover:text-gold transition-colors font-bold uppercase tracking-wider">Subnivel</button>
                            <button onClick={() => handleOpenCategoryEdit(rootCat)} className="text-gray-500 hover:text-gold transition-colors inline-block align-middle"><Edit2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>

                        {/* Level 2 Subcategories */}
                        {children.map(subCat => {
                          const leafTypes = categories.filter(c => c.parent_id === subCat.id);
                          return (
                            <div key={subCat.id} className="space-y-1 bg-charcoal-light/5">
                              <div className="px-4 py-3 grid grid-cols-12 items-center hover:bg-white/[0.01]">
                                <div className="col-span-7 flex items-center gap-2 pl-6 border-l border-charcoal-border/40">
                                  <ChevronRight className="w-3 h-3 text-gray-600" />
                                  <span className="text-xs font-medium text-gray-300">{subCat.name}</span>
                                  <span className="text-[9px] text-gray-500 font-mono">({subCat.slug})</span>
                                </div>
                                <div className="col-span-2 text-center">
                                  <button 
                                    onClick={() => handleToggleCategoryActive(subCat)}
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                                      subCat.is_active ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-red-500/20 bg-red-500/5 text-red-400'
                                    }`}
                                  >
                                    {subCat.is_active ? 'Activa' : 'Inactiva'}
                                  </button>
                                </div>
                                <div className="col-span-3 text-right space-x-2">
                                  <button onClick={() => handleOpenCategoryCreate(subCat.id)} className="text-[10px] text-gray-500 hover:text-gold transition-colors font-bold uppercase tracking-wider">Tipo</button>
                                  <button onClick={() => handleOpenCategoryEdit(subCat)} className="text-gray-500 hover:text-gold transition-colors inline-block align-middle"><Edit2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>

                              {/* Level 3 Leaves ("Tipo" leaf node category) */}
                              {leafTypes.map(leafCat => (
                                <div key={leafCat.id} className="px-4 py-2.5 grid grid-cols-12 items-center hover:bg-white/[0.01] bg-[#121008]/10">
                                  <div className="col-span-7 flex items-center gap-2 pl-12 border-l-2 border-gold/20">
                                    <Tag className="w-3 h-3 text-gold/60" />
                                    <span className="text-xs font-bold text-gold-hover">{leafCat.name}</span>
                                    <span className="text-[9px] text-gray-500 font-mono">({leafCat.slug})</span>
                                    <span className="text-[8px] bg-gold/10 text-gold border border-gold/20 px-1 rounded uppercase tracking-wider">Tipo</span>
                                  </div>
                                  <div className="col-span-2 text-center">
                                    <button 
                                      onClick={() => handleToggleCategoryActive(leafCat)}
                                      className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                                        leafCat.is_active ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' : 'border-red-500/20 bg-red-500/5 text-red-400'
                                      }`}
                                    >
                                      {leafCat.is_active ? 'Activa' : 'Inactiva'}
                                    </button>
                                  </div>
                                  <div className="col-span-3 text-right space-x-2">
                                    <button onClick={() => handleOpenCategoryEdit(leafCat)} className="text-gray-500 hover:text-gold transition-colors inline-block align-middle"><Edit2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right panel: Attributes groups and quick value assignment */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-charcoal-light/10 border border-charcoal-border rounded p-6 shadow-xl space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-serif text-xl text-white tracking-wide">Grupos de Atributos</h3>
                  <p className="text-gray-400 text-xs">Propiedades aplicables a variantes de tipo de producto.</p>
                </div>
                <button 
                  onClick={() => setIsGroupModalOpen(true)}
                  className="flex items-center gap-2 bg-charcoal-light border border-gold/30 hover:border-gold text-gold px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nuevo Grupo
                </button>
              </div>

              <div className="space-y-4">
                {attributeGroups.length === 0 ? (
                  <p className="text-center py-6 text-gray-500 text-xs font-light">Cargando grupos de atributos...</p>
                ) : (
                  attributeGroups.map(group => {
                    const values = attributeValues.filter(v => v.group_id === group.id);
                    return (
                      <div key={group.id} className="bg-[#0c0c0c] border border-charcoal-border/50 rounded p-4 space-y-3.5">
                        <div className="flex justify-between items-center border-b border-charcoal-border/30 pb-2">
                          <span className="font-serif text-sm font-bold text-white uppercase tracking-wider">{group.name}</span>
                          <span className="text-[10px] text-gray-500">ID: {group.id}</span>
                        </div>

                        {/* Values list */}
                        <div className="flex flex-wrap gap-2">
                          {values.length === 0 ? (
                            <span className="text-[11px] text-gray-600 italic">No hay valores cargados.</span>
                          ) : (
                            values.map(val => (
                              <span key={val.id} className="text-xs bg-charcoal-light border border-charcoal-border px-2.5 py-1 rounded text-gray-300 font-light flex items-center gap-1.5">
                                {val.value}
                              </span>
                            ))
                          )}
                        </div>

                        {/* Quick add inline value */}
                        <div className="flex items-center gap-2 mt-2">
                          <input 
                            type="text" 
                            placeholder="Agregar nuevo valor..." 
                            value={quickAddValue[group.id] || ''}
                            onChange={(e) => setQuickAddValue({ ...quickAddValue, [group.id]: e.target.value })}
                            className="bg-[#050505] border border-charcoal-border/80 text-gray-300 text-xs px-3 py-1.5 rounded outline-none focus:border-gold/30 flex-1"
                          />
                          <button 
                            onClick={() => handleQuickAddValue(group.id)}
                            className="bg-gold hover:bg-gold-hover text-black px-3 py-1.5 text-xs font-bold uppercase rounded transition-colors"
                          >
                            Añadir
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick association: Category <-> Attribute Group */}
            <div className="bg-charcoal-light/10 border border-charcoal-border rounded p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-serif text-lg text-gold tracking-wide">Vincular Atributos a Tipo</h3>
                  <p className="text-gray-400 text-xs">Asigna propiedades exclusivas a subcategorías del nivel "Tipo".</p>
                </div>
                <button 
                  onClick={() => setIsLinkModalOpen(true)}
                  className="bg-gold hover:bg-gold-hover text-black px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider rounded transition-colors"
                >
                  <LinkIcon className="w-3.5 h-3.5 inline mr-1" />
                  Asociar
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Slide-out Drawer Panel for Products */}
      {isProductDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]" onClick={() => setIsProductDrawerOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-charcoal-light border-l border-charcoal-border z-[201] flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-charcoal-border bg-[#0d0d0d] flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl text-white tracking-wide">
                  {editingProduct ? 'Editar Producto en Supabase' : 'Crear Nuevo Producto en Supabase'}
                </h3>
              </div>
              <button onClick={() => setIsProductDrawerOpen(false)} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/5 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleProductSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Image URL Picker */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Imagen del Producto (URL)</label>
                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-charcoal-border bg-[#0d0d0d] flex items-center justify-center">
                  {productForm.image ? (
                    <Image src={productForm.image} alt="Product preview" fill className="object-cover opacity-80" />
                  ) : (
                    <div className="text-center text-gray-600"><ImageIcon className="w-8 h-8 mx-auto stroke-1 mb-2" /><p className="text-xs">Sin imagen</p></div>
                  )}
                </div>
                <input 
                  type="url" 
                  placeholder="Enlace HTTPS de la imagen..." 
                  value={productForm.image}
                  onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3 py-2.5 rounded outline-none focus:border-gold/40"
                />
              </div>

              {/* General Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nombre del Producto *</label>
                  <input 
                    type="text" 
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Precio Base ($) *</label>
                  <input 
                    type="number" 
                    value={productForm.price || ''}
                    onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40 font-serif font-bold text-gold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Stock Inicial *</label>
                  <input 
                    type="number" 
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40"
                    required
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Categoría Asociada *</label>
                  <select 
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value, attributes: [] })}
                    className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40"
                    required
                  >
                    <option value="">Seleccione Categoría...</option>
                    {categories.map(cat => {
                      const isLeaf = isLeafCategory(cat.id);
                      return (
                        <option key={cat.id} value={cat.id.toString()}>
                          {cat.parent_id ? '  ↳ ' : ''}{cat.name} {!isLeaf && cat.parent_id ? '(Grupo)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Descripción del Producto</label>
                <textarea 
                  rows={3}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40 resize-none font-light"
                />
              </div>

              {/* Dynamic taxonomy attributes configuration */}
              {productForm.categoryId && isLeafCategory(parseInt(productForm.categoryId)) && (
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-serif text-gold uppercase tracking-wider font-semibold">Atributos Dinámicos del Tipo</h4>
                  
                  {/* Find associated groups */}
                  <div className="space-y-3.5">
                    {attributeGroups.map(group => {
                      // Fetch all values of this group
                      const values = attributeValues.filter(v => v.group_id === group.id);
                      if (values.length === 0) return null;

                      return (
                        <div key={group.id} className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{group.name}</label>
                          <select
                            value={productForm.attributes.find(valId => values.some(v => v.id === valId)) || ''}
                            onChange={(e) => {
                              const selectedValId = e.target.value ? parseInt(e.target.value) : null;
                              // Remove any value from the same group
                              const filtered = productForm.attributes.filter(valId => !values.some(v => v.id === valId));
                              if (selectedValId) {
                                filtered.push(selectedValId);
                              }
                              setProductForm({ ...productForm, attributes: filtered });
                            }}
                            className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2.5 rounded outline-none focus:border-gold/40"
                          >
                            <option value="">No aplica / Ninguno</option>
                            {values.map(val => (
                              <option key={val.id} value={val.id.toString()}>{val.value}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </form>

            <div className="p-6 border-t border-charcoal-border bg-[#0d0d0d] flex items-center justify-end gap-3">
              <button type="button" onClick={() => setIsProductDrawerOpen(false)} className="px-5 py-2.5 border border-charcoal-border hover:border-gray-500 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest rounded transition-colors">Cancelar</button>
              <button onClick={handleProductSave} type="submit" className="px-6 py-2.5 bg-gold hover:bg-gold-hover text-black text-xs font-bold uppercase tracking-widest rounded shadow-lg transition-colors">Guardar Producto</button>
            </div>
          </div>
        </>
      )}

      {/* Category Creation / Edit Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-charcoal-light border border-charcoal-border rounded-lg max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4.5 border-b border-charcoal-border bg-[#0d0d0d] flex justify-between items-center">
              <h3 className="font-serif text-lg text-white font-bold">{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCategorySave} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nombre *</label>
                <input 
                  type="text" 
                  value={categoryForm.name} 
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="Ej. Tartas y Tortas" 
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2 rounded outline-none focus:border-gold/40"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Slug (Opcional)</label>
                <input 
                  type="text" 
                  value={categoryForm.slug} 
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  placeholder="ej. tartas-y-tortas" 
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2 rounded outline-none focus:border-gold/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Categoría Padre (Jerarquía)</label>
                <select 
                  value={categoryForm.parentId} 
                  onChange={(e) => setCategoryForm({ ...categoryForm, parentId: e.target.value })}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2 rounded outline-none focus:border-gold/40"
                >
                  <option value="">Ninguna (Nivel Superior / Raíz)</option>
                  {categories.filter(c => c.parent_id === null && (!editingCategory || c.id !== editingCategory.id)).map(cat => (
                    <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
                  ))}
                  {/* Subcategories (Level 2) */}
                  {categories.filter(c => c.parent_id !== null && (!editingCategory || c.id !== editingCategory.id)).map(cat => {
                    const parent = categories.find(p => p.id === cat.parent_id);
                    if (parent && parent.parent_id === null) {
                      return (
                        <option key={cat.id} value={cat.id.toString()}>
                          &nbsp;&nbsp;{parent.name} → {cat.name}
                        </option>
                      );
                    }
                    return null;
                  })}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="cat_active"
                  checked={categoryForm.isActive} 
                  onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                  className="accent-gold"
                />
                <label htmlFor="cat_active" className="text-xs text-gray-300">Categoría Activa (visible en tienda)</label>
              </div>

              <div className="pt-4 border-t border-charcoal-border/50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 border border-charcoal-border text-gray-400 hover:text-white text-xs font-bold uppercase rounded">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-gold hover:bg-gold-hover text-black text-xs font-bold uppercase rounded">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attribute Group Creation Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-charcoal-light border border-charcoal-border rounded-lg max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4.5 border-b border-charcoal-border bg-[#0d0d0d] flex justify-between items-center">
              <h3 className="font-serif text-lg text-white font-bold">Nuevo Grupo de Atributos</h3>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nombre del Grupo *</label>
                <input 
                  type="text" 
                  value={newGroupName} 
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ej. Tipo de Leche o Relleno" 
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2 rounded outline-none focus:border-gold/40"
                  required
                />
              </div>
              <div className="pt-4 border-t border-charcoal-border/50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsGroupModalOpen(false)} className="px-4 py-2 border border-charcoal-border text-gray-400 hover:text-white text-xs font-bold uppercase rounded">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-gold hover:bg-gold-hover text-black text-xs font-bold uppercase rounded">Crear Grupo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Category & Attribute Group Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-charcoal-light border border-charcoal-border rounded-lg max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4.5 border-b border-charcoal-border bg-[#0d0d0d] flex justify-between items-center">
              <h3 className="font-serif text-lg text-white font-bold">Vincular Grupo a Tipo</h3>
              <button onClick={() => setIsLinkModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleLinkCategoryGroup} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Categoría ("Tipo" Hoja) *</label>
                <select 
                  value={selectedLinkCategory || ''} 
                  onChange={(e) => setSelectedLinkCategory(parseInt(e.target.value) || null)}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2 rounded outline-none focus:border-gold/40"
                  required
                >
                  <option value="">Seleccione Tipo...</option>
                  {categories.map(c => {
                    const isLeaf = isLeafCategory(c.id);
                    return (
                      <option key={c.id} value={c.id.toString()} disabled={!isLeaf}>
                        {c.parent_id ? '  ↳ ' : ''}{c.name} {!isLeaf ? '(No es nodo Tipo / Hoja)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Grupo de Atributos *</label>
                <select 
                  value={selectedLinkGroup || ''} 
                  onChange={(e) => setSelectedLinkGroup(parseInt(e.target.value) || null)}
                  className="w-full bg-[#0d0d0d] border border-charcoal-border text-gray-300 text-xs px-3.5 py-2 rounded outline-none focus:border-gold/40"
                  required
                >
                  <option value="">Seleccione Grupo...</option>
                  {attributeGroups.map(g => (
                    <option key={g.id} value={g.id.toString()}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-charcoal-border/50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsLinkModalOpen(false)} className="px-4 py-2 border border-charcoal-border text-gray-400 hover:text-white text-xs font-bold uppercase rounded">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-gold hover:bg-gold-hover text-black text-xs font-bold uppercase rounded">Asociar Atributo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Review & Confirmation Modal */}
      {isCsvReviewOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-charcoal-light border border-charcoal-border rounded-lg max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4.5 border-b border-charcoal-border bg-[#0d0d0d] flex justify-between items-center">
              <div>
                <h3 className="font-serif text-lg text-white font-bold">Revisión de Carga Masiva (CSV)</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Compara los productos del archivo con la base de datos de Pan de Rey.</p>
              </div>
              <button onClick={() => setIsCsvReviewOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="overflow-x-auto border border-charcoal-border rounded">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-charcoal-border bg-[#0d0d0d] text-gray-400 uppercase tracking-wider text-[10px]">
                      <th className="p-3 w-12 text-center">Aprobar</th>
                      <th className="p-3">Producto</th>
                      <th className="p-3">Categoría ID</th>
                      <th className="p-3">Estado</th>
                      <th className="p-3">Detalle del Cambio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvReviewItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-charcoal-border/50 last:border-b-0 hover:bg-charcoal-light/10 transition-colors">
                        <td className="p-3 text-center">
                          <input 
                            type="checkbox"
                            checked={item.approved}
                            onChange={() => toggleCsvItemApproval(idx)}
                            disabled={item.status === 'no_change'}
                            className="accent-gold h-4 w-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="p-3 font-semibold text-white">
                          <div>
                            {item.name}
                            {item.description && <span className="block text-[10px] text-gray-500 font-normal truncate max-w-xs">{item.description}</span>}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-gray-400">{item.categoryId}</td>
                        <td className="p-3">
                          {item.status === 'new' && (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Nuevo</span>
                          )}
                          {item.status === 'has_change' && (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Modificar</span>
                          )}
                          {item.status === 'no_change' && (
                            <span className="bg-gray-500/10 text-gray-400 border border-gray-500/20 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Sin Cambios</span>
                          )}
                        </td>
                        <td className="p-3 text-[10px] text-gray-300 font-mono">
                          {item.changeDetails}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-charcoal-border bg-[#0d0d0d] flex justify-between items-center">
              <span className="text-[10px] text-gray-400 font-mono">
                Seleccionados para procesar: {csvReviewItems.filter(i => i.approved).length} de {csvReviewItems.length}
              </span>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsCsvReviewOpen(false)} 
                  className="px-4 py-2 border border-charcoal-border text-gray-400 hover:text-white text-xs font-bold uppercase rounded cursor-pointer"
                  disabled={submittingBulk}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={handleConfirmBulkUpload} 
                  className="px-5 py-2 bg-gold hover:bg-gold-hover text-black text-xs font-bold uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-lg shadow-gold/10"
                  disabled={submittingBulk}
                >
                  {submittingBulk ? 'Guardando...' : 'Confirmar Carga Masiva'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
