// Local Browser Database Simulator for Pan de Rey
// Supports 100% client-side offline testing of the Admin Dashboard and Kanban board

export type SimOrder = {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  items: string[];
  itemsRaw?: {
    variantId: string;
    productName: string;
    variantName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
  total: number;
  status: string;
  time: string;
  createdAt: string;
  shippingMethod: 'Retiro' | 'Delivery';
  slaStartedAt?: string | null;
  slaPausedAt?: string | null;
  slaPausedTime?: number;
  deliveryPin?: string | null;
  completenessPercent?: number;
  orderState?: 'Pendiente' | 'Aceptado';
  labelPrintedCount?: number;
  pickupTime?: string;
  actualDeliveryTime?: string | null;
  couponCode?: string | null;
  discountAmount?: number;
};

export type SimProduct = {
  id: number;
  name: string;
  price: number;
  category: string;
  stock: number;
  image?: string;
  description?: string;
  subCategory?: string;
  cobertura?: string;
  relleno?: string;
  estilo?: string;
  tipoSemilla?: string;
  createdAt?: string;
  lastRestockedAt?: string | null;
  lastRestockedBy?: string | null;
  lastRestockQty?: number | null;
  previousStock?: number | null;
};

// Seed initial products with varying stock levels to trigger KPI warnings
const initialProducts: SimProduct[] = [
  { 
    id: 1, 
    name: 'Pan de Masa Madre Clásico', 
    price: 4500, 
    category: 'Panadería', 
    stock: 12,
    image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80',
    description: 'Elaborado con una masa madre de 5 años de antigüedad y harinas orgánicas, con una fermentación lenta de 48 horas.',
    subCategory: 'Masa Madre',
    cobertura: 'Ninguna',
    relleno: 'Ninguno',
    estilo: 'Tradicional',
    tipoSemilla: 'Ninguna'
  },
  { 
    id: 2, 
    name: 'Focaccia al Romero', 
    price: 3800, 
    category: 'Panadería', 
    stock: 8,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
    description: 'Focaccia esponjosa con aceite de oliva extra virgen, sal de mar y romero fresco de nuestro huerto.',
    subCategory: 'Especialidades',
    cobertura: 'Aceite de oliva y romero',
    relleno: 'Ninguno',
    estilo: 'Italiano',
    tipoSemilla: 'Ninguna'
  },
  { 
    id: 3, 
    name: 'Baguette Tradicional', 
    price: 1800, 
    category: 'Panadería', 
    stock: 15,
    image: 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=800&q=80',
    description: 'Baguette parisina clásica de corteza crujiente y miga alveolada y suave.',
    subCategory: 'Rústicos',
    cobertura: 'Harina espolvoreada',
    relleno: 'Ninguno',
    estilo: 'Francés',
    tipoSemilla: 'Ninguna'
  },
  { 
    id: 4, 
    name: 'Pan de Centeno Alemán', 
    price: 4200, 
    category: 'Panadería', 
    stock: 4,
    image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80&crop=edges',
    description: 'Pan denso de centeno integral con semillas de alcaravea, ideal para acompañar quesos maduros.',
    subCategory: 'Centeno',
    cobertura: 'Semillas de alcaravea',
    relleno: 'Ninguno',
    estilo: 'Rústico Alemán',
    tipoSemilla: 'Alcaravea'
  },
  { 
    id: 5, 
    name: 'Ciabatta Rústica', 
    price: 2200, 
    category: 'Panadería', 
    stock: 2,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&crop=faces',
    description: 'Pan italiano de alta hidratación, corteza fina y miga ligera perfecta para sándwiches.',
    subCategory: 'Especialidades',
    cobertura: 'Ninguna',
    relleno: 'Ninguno',
    estilo: 'Italiano',
    tipoSemilla: 'Ninguna'
  },
  { 
    id: 6, 
    name: 'Croissant de Mantequilla', 
    price: 2200, 
    category: 'Pastelería', 
    stock: 25,
    image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80',
    description: 'Hojaldre francés clásico elaborado con 100% mantequilla premium, crujiente por fuera y aireado por dentro.',
    subCategory: 'Hojaldres',
    cobertura: 'Brillo de almíbar',
    relleno: 'Mantequilla',
    estilo: 'Francés',
    tipoSemilla: 'Ninguna'
  },
  { 
    id: 7, 
    name: 'Pain au Chocolat', 
    price: 2500, 
    category: 'Pastelería', 
    stock: 0,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80&sat=1',
    description: 'Hojaldre relleno con dos barras de chocolate belga semi-amargo de alta calidad.',
    subCategory: 'Hojaldres',
    cobertura: 'Ninguna',
    relleno: 'Chocolate semi-amargo',
    estilo: 'Francés',
    tipoSemilla: 'Ninguna'
  },
  { 
    id: 8, 
    name: 'Tarta de Limón y Merengue', 
    price: 3800, 
    category: 'Pastelería', 
    stock: 6,
    image: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=800&q=80',
    description: 'Base de masa sablee crujiente, crema ácida de limón natural y copetes dorados de merengue italiano.',
    subCategory: 'Tartas',
    cobertura: 'Merengue italiano',
    relleno: 'Crema de limón',
    estilo: 'Clásico',
    tipoSemilla: 'Ninguna'
  },
  { 
    id: 9, 
    name: 'Roll de Canela Glaseado', 
    price: 2800, 
    category: 'Pastelería', 
    stock: 3,
    image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80&sat=2',
    description: 'Espiral de masa brioche esponjosa rellena con canela de Ceilán y cubierta con glaseado de queso crema.',
    subCategory: 'Brioche',
    cobertura: 'Glaseado de queso crema',
    relleno: 'Canela y azúcar rubia',
    estilo: 'Americano',
    tipoSemilla: 'Ninguna'
  },
  { 
    id: 10, 
    name: 'Brownie Sin Gluten', 
    price: 2500, 
    category: 'Sin Gluten', 
    stock: 14,
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&q=80',
    description: 'Brownie húmedo e intenso de chocolate negro, elaborado con harina de almendras y nueces picadas.',
    subCategory: 'Dulces',
    cobertura: 'Lluvia de cacao',
    relleno: 'Nueces',
    estilo: 'Fudge',
    tipoSemilla: 'Ninguna'
  },
  { 
    id: 11, 
    name: 'Pan de Molde Keto', 
    price: 5500, 
    category: 'Sin Gluten', 
    stock: 5,
    image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&q=80&bri=1',
    description: 'Pan de molde bajo en carbohidratos elaborado con harina de coco, linaza y huevo, ideal para dietas cetogénicas.',
    subCategory: 'Panes',
    cobertura: 'Semillas de linaza',
    relleno: 'Ninguno',
    estilo: 'Saludable',
    tipoSemilla: 'Linaza y sésamo'
  },
  { 
    id: 12, 
    name: 'Galletas de Almendra', 
    price: 1800, 
    category: 'Sin Gluten', 
    stock: 18,
    image: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=800&q=80&con=1',
    description: 'Crujientes galletas sin gluten elaboradas con harina de almendra y aromatizadas con cáscara de naranja.',
    subCategory: 'Galletas',
    cobertura: 'Almendras fileteadas',
    relleno: 'Ninguno',
    estilo: 'Rústico',
    tipoSemilla: 'Ninguna'
  },
  { 
    id: 13, 
    name: 'Café Latte XL', 
    price: 3500, 
    category: 'Bebestibles', 
    stock: 50,
    image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80',
    description: 'Doble shot de espresso de grano arábica con leche al vapor texturizada.',
    subCategory: 'Cafetería Caliente',
    cobertura: 'Canela espolvoreada',
    relleno: 'Leche texturizada',
    estilo: 'Italiano',
    tipoSemilla: 'Ninguna'
  },
  { 
    id: 14, 
    name: 'Espresso Doble', 
    price: 2200, 
    category: 'Bebestibles', 
    stock: 60,
    image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&q=80',
    description: 'Extracción concentrada e intensa de café de especialidad arábica 100%.',
    subCategory: 'Cafetería Caliente',
    cobertura: 'Crema de café natural',
    relleno: 'Ninguno',
    estilo: 'Italiano',
    tipoSemilla: 'Ninguna'
  },
  { 
    id: 15, 
    name: 'Cappuccino Italiano', 
    price: 3200, 
    category: 'Bebestibles', 
    stock: 45,
    image: 'https://images.unsplash.com/photo-1495474472207-464a8d960c8b?w=800&q=80',
    description: 'Terceras partes iguales de espresso, leche caliente y espuma de leche de textura sedosa.',
    subCategory: 'Cafetería Caliente',
    cobertura: 'Cacao fino en polvo',
    relleno: 'Ninguno',
    estilo: 'Clásico Italiano',
    tipoSemilla: 'Ninguna'
  }
];

const customerNames = ['María González', 'Juan Pérez', 'Diego Muñoz', 'Camila Rojas', 'José Fonseca'];
const emails = ['maria.gonzalez@gmail.com', 'juan.perez@yahoo.com', 'diego.munoz@outlook.com', 'camila.rojas@gmail.com', 'jose.fonseca@gmail.com'];
const phones = ['+56987654321', '+56911112222', '+56933334444', '+56955556666', '+56977778888'];

export const seedLocalDb = (force = false): boolean => {
  if (typeof window === 'undefined') return false;
  
  const existingProducts = localStorage.getItem('pan_de_rey_sim_products');
  if (!existingProducts || force) {
    const seeded = initialProducts.map(p => ({
      ...p,
      createdAt: p.createdAt || new Date().toISOString(),
      previousStock: p.previousStock !== undefined ? p.previousStock : Math.max(0, p.stock - 2),
      lastRestockQty: p.lastRestockQty !== undefined ? p.lastRestockQty : 5,
      lastRestockedAt: p.lastRestockedAt !== undefined ? p.lastRestockedAt : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      lastRestockedBy: p.lastRestockedBy !== undefined ? p.lastRestockedBy : 'Panadero Jefe'
    }));
    localStorage.setItem('pan_de_rey_sim_products', JSON.stringify(seeded));
  }

  const existingOrders = localStorage.getItem('pan_de_rey_sim_orders');
  if (existingOrders && !force) return false; // Already seeded

  // Seed Products
  if (force) {
    const seeded = initialProducts.map(p => ({
      ...p,
      createdAt: p.createdAt || new Date().toISOString(),
      previousStock: p.previousStock !== undefined ? p.previousStock : Math.max(0, p.stock - 2),
      lastRestockQty: p.lastRestockQty !== undefined ? p.lastRestockQty : 5,
      lastRestockedAt: p.lastRestockedAt !== undefined ? p.lastRestockedAt : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      lastRestockedBy: p.lastRestockedBy !== undefined ? p.lastRestockedBy : 'Panadero Jefe'
    }));
    localStorage.setItem('pan_de_rey_sim_products', JSON.stringify(seeded));
  }

  // Seed 28 Orders
  const orders: SimOrder[] = [];
  const statuses = ['Nuevo', 'Preparando', 'Listo', 'En Ruta', 'Entregado', 'Cancelado', 'Incompleto'];
  const methods: ('Retiro' | 'Delivery')[] = ['Retiro', 'Delivery'];

  const currentCoupons = getLocalCoupons();
  const seededCoupons = currentCoupons.map(c => ({ ...c, usedCount: 0 }));

  for (let i = 1; i <= 28; i++) {
    const orderId = `order-sim-${i.toString().padStart(4, '0')}`;
    const custIdx = i % customerNames.length;
    const daysAgo = Math.floor((i / 28) * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    // Pick 1-3 random items
    const itemsCount = 1 + (i % 3);
    const items: string[] = [];
    const itemsRaw: any[] = [];
    let subtotal = 0;

    for (let j = 0; j < itemsCount; j++) {
      const prod = initialProducts[(i + j) % initialProducts.length];
      const qty = 1 + (j % 2);
      const sub = prod.price * qty;
      subtotal += sub;
      items.push(`${qty}x ${prod.name} (Clásico)`);
      itemsRaw.push({
        variantId: `var-prod-${prod.id}`,
        productName: prod.name,
        variantName: 'Clásico',
        quantity: qty,
        price: prod.price,
        subtotal: sub
      });
    }

    const shippingMethod = methods[i % methods.length];
    const shippingCost = shippingMethod === 'Delivery' ? 3500 : 0;
    
    let total = subtotal;
    let couponCode: string | null = null;
    let discountAmount = 0;

    // Apply coupon if shouldHaveCoupon is true (approx 35% of orders)
    const shouldHaveCoupon = (i % 3 === 0);
    if (shouldHaveCoupon) {
      const couponIdx = Math.floor(i / 3) % seededCoupons.length;
      const coupon = seededCoupons[couponIdx];
      
      let eligibleSubtotal = 0;
      itemsRaw.forEach(item => {
        const prod = initialProducts.find(p => item.productName.startsWith(p.name)) || initialProducts[0];
        
        let isAllowed = true;
        if (coupon.limitProductIds && coupon.limitProductIds.length > 0) {
          isAllowed = coupon.limitProductIds.includes(prod.id);
        }
        if (isAllowed && coupon.limitCategories && coupon.limitCategories.length > 0) {
          isAllowed = coupon.limitCategories.includes(prod.category);
        }
        if (isAllowed && coupon.limitSubCategories && coupon.limitSubCategories.length > 0) {
          isAllowed = prod.subCategory ? coupon.limitSubCategories.includes(prod.subCategory) : false;
        }
        
        if (isAllowed) {
          eligibleSubtotal += item.subtotal;
        }
      });
      
      if (subtotal >= coupon.minPurchase && (eligibleSubtotal > 0 || (!coupon.limitProductIds?.length && !coupon.limitCategories?.length && !coupon.limitSubCategories?.length))) {
        const finalEligibleSub = (coupon.limitProductIds?.length || coupon.limitCategories?.length || coupon.limitSubCategories?.length)
          ? eligibleSubtotal
          : subtotal;
        
        if (finalEligibleSub > 0) {
          couponCode = coupon.code;
          if (coupon.type === 'percent') {
            discountAmount = Math.round(finalEligibleSub * (coupon.value / 100));
            if (coupon.maxDiscountAmount !== undefined && coupon.maxDiscountAmount !== null) {
              discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
            }
          } else {
            discountAmount = Math.min(coupon.value, finalEligibleSub);
          }
          
          total = Math.max(0, total - discountAmount);
          coupon.usedCount += 1;
        }
      }
    }

    total += shippingCost;

    // Distribuir estados para que no sean todos iguales
    let status = statuses[i % statuses.length];
    if (i === 1) status = 'Nuevo';
    if (i === 2) status = 'Preparando';
    if (i === 3) status = 'Listo';
    if (i === 4) status = 'Incompleto';

    const timeFormatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Tiempos estimados y reales
    const minutesToAdd = shippingMethod === 'Retiro' ? 40 : 60;
    const estimatedDate = new Date(date.getTime() + minutesToAdd * 60 * 1000);
    const pickupTimeFormatted = estimatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const actualDelDate = status === 'Entregado' ? new Date(date.getTime() + (minutesToAdd - 5) * 60 * 1000) : null;
    const actualDeliveryTimeFormatted = actualDelDate ? actualDelDate.toISOString() : null;

    // Completitud
    const completenessPercent = status === 'Incompleto' ? 66 : 100;
    
    // Estado de Aceptación
    const orderState = status === 'Nuevo' ? 'Pendiente' : 'Aceptado';
    
    // Copias de etiquetas impresas
    const labelPrintedCount = status === 'Nuevo' ? 0 : (i % 3);

    orders.push({
      id: orderId,
      customerName: customerNames[custIdx],
      email: emails[custIdx],
      phone: phones[custIdx],
      items,
      itemsRaw,
      total,
      status,
      time: timeFormatted,
      createdAt: date.toISOString(),
      shippingMethod,
      slaStartedAt: date.toISOString(),
      slaPausedAt: status === 'Incompleto' ? new Date(date.getTime() + 10 * 60 * 1000).toISOString() : null,
      slaPausedTime: status === 'Incompleto' ? 300 : 0,
      deliveryPin: shippingMethod === 'Delivery' ? String(1000 + (i * 27) % 9000) : null,
      completenessPercent,
      orderState,
      labelPrintedCount,
      pickupTime: pickupTimeFormatted,
      actualDeliveryTime: actualDeliveryTimeFormatted,
      couponCode,
      discountAmount
    });
  }

  // Sort by date desc
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  localStorage.setItem('pan_de_rey_sim_orders', JSON.stringify(orders));
  localStorage.setItem('pan_de_rey_sim_coupons', JSON.stringify(seededCoupons));
  return true;
};

export const getLocalOrders = (): SimOrder[] => {
  if (typeof window === 'undefined') return [];
  seedLocalDb(); // Ensure db is seeded
  const raw = localStorage.getItem('pan_de_rey_sim_orders');
  return raw ? JSON.parse(raw) : [];
};

export const updateLocalOrderStatus = (orderId: string, newStatus: string): SimOrder[] => {
  if (typeof window === 'undefined') return [];
  const orders = getLocalOrders();
  const updated = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
  localStorage.setItem('pan_de_rey_sim_orders', JSON.stringify(updated));
  return updated;
};

export const addLocalOrder = (order: Omit<SimOrder, 'id' | 'createdAt' | 'time'>): SimOrder => {
  const orders = getLocalOrders();
  const date = new Date();
  const newOrder: SimOrder = {
    ...order,
    id: `order-sim-${(orders.length + 1).toString().padStart(4, '0')}`,
    createdAt: date.toISOString(),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  orders.unshift(newOrder);
  localStorage.setItem('pan_de_rey_sim_orders', JSON.stringify(orders));
  return newOrder;
};

export const getLocalAnalytics = () => {
  const orders = getLocalOrders();
  
  // Load products to compute inventory warnings
  let products = initialProducts;
  if (typeof window !== 'undefined') {
    const rawProds = localStorage.getItem('pan_de_rey_sim_products');
    if (rawProds) products = JSON.parse(rawProds);
  }

  // Calculate general stats
  const activeOrders = orders.filter(o => o.status !== 'Cancelado');
  const totalSales = activeOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = activeOrders.length;
  
  // Parse units from items strings
  let totalUnits = 0;
  activeOrders.forEach(o => {
    o.items.forEach(it => {
      const match = it.match(/^(\d+)x/);
      if (match) {
        totalUnits += parseInt(match[1]);
      }
    });
  });

  // Calculate stock levels
  let sinStock = 0;
  let critico = 0;
  let riesgo = 0;
  let alerta = 0;

  products.forEach(p => {
    if (p.stock === 0) sinStock++;
    else if (p.stock >= 1 && p.stock <= 3) critico++;
    else if (p.stock >= 4 && p.stock <= 5) riesgo++;
    else if (p.stock >= 6 && p.stock <= 9) alerta++;
  });

  // Pending orders
  const pendientesRetiro = activeOrders.filter(o => o.shippingMethod === 'Retiro' && ['Nuevo', 'Preparando', 'Listo'].includes(o.status)).length;
  const pendientesEnvio = activeOrders.filter(o => o.shippingMethod === 'Delivery' && ['Nuevo', 'Preparando', 'En Ruta'].includes(o.status)).length;

  // Group by Category
  const categorySales: { [key: string]: number } = {};
  const categoryUnits: { [key: string]: number } = {};
  // Group by Product
  const productSalesMap: { [key: string]: { amount: number; units: number } } = {};

  activeOrders.forEach(o => {
    o.items.forEach(it => {
      // e.g. "2x Pan de Masa Madre Clásico (Clásico)"
      const match = it.match(/^(\d+)x\s+([^(]+)/);
      if (match) {
        const qty = parseInt(match[1]);
        const prodName = match[2].trim();
        
        // Find product to get price and category
        const prod = products.find(p => prodName.startsWith(p.name)) || products[0];
        const subtotal = prod.price * qty;

        // Add to product map
        if (!productSalesMap[prod.name]) {
          productSalesMap[prod.name] = { amount: 0, units: 0 };
        }
        productSalesMap[prod.name].amount += subtotal;
        productSalesMap[prod.name].units += qty;

        // Add to category maps
        categorySales[prod.category] = (categorySales[prod.category] || 0) + subtotal;
        categoryUnits[prod.category] = (categoryUnits[prod.category] || 0) + qty;
      }
    });
  });

  // Format Category Distribution
  const categoryDistribution = Object.keys(categorySales).map(catName => ({
    name: catName,
    value: categorySales[catName],
    units: categoryUnits[catName]
  }));

  // Format Product Sales
  const productSales = Object.keys(productSalesMap).map(prodName => ({
    name: prodName,
    totalAmount: productSalesMap[prodName].amount,
    totalUnits: productSalesMap[prodName].units
  })).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 5);

  return {
    kpis: {
      ventas: totalSales,
      pedidos: totalOrders,
      unidades: totalUnits,
      alerta,
      riesgo,
      critico,
      sinStock,
      pendientesRetiro,
      pendientesEnvio
    },
    categoryDistribution,
    productSales,
  };
};

export const incrementLocalOrderLabel = (orderId: string): SimOrder[] => {
  if (typeof window === 'undefined') return [];
  const orders = getLocalOrders();
  const updated = orders.map(o => o.id === orderId ? { ...o, labelPrintedCount: (o.labelPrintedCount || 0) + 1 } : o);
  localStorage.setItem('pan_de_rey_sim_orders', JSON.stringify(updated));
  return updated;
};

// CRUD operations for products
export const getLocalProducts = (): SimProduct[] => {
  if (typeof window === 'undefined') return [];
  seedLocalDb(); // Ensure db is seeded
  const raw = localStorage.getItem('pan_de_rey_sim_products');
  return raw ? JSON.parse(raw) : [];
};

export const saveLocalProducts = (products: SimProduct[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('pan_de_rey_sim_products', JSON.stringify(products));
};

export const addLocalProduct = (product: Omit<SimProduct, 'id'>): SimProduct => {
  const products = getLocalProducts();
  const nextId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
  const newProduct: SimProduct = {
    ...product,
    id: nextId,
    createdAt: new Date().toISOString()
  };
  products.push(newProduct);
  saveLocalProducts(products);
  return newProduct;
};

export const updateLocalProduct = (id: number, updates: Partial<SimProduct>): SimProduct[] => {
  const products = getLocalProducts();
  const updated = products.map(p => p.id === id ? { ...p, ...updates } : p);
  saveLocalProducts(updated);
  return updated;
};

export const deleteLocalProduct = (id: number): SimProduct[] => {
  const products = getLocalProducts();
  const filtered = products.filter(p => p.id !== id);
  saveLocalProducts(filtered);
  return filtered;
};

export const bulkAddLocalProducts = (newProducts: Omit<SimProduct, 'id'>[]): SimProduct[] => {
  const products = getLocalProducts();
  let nextId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
  const now = new Date().toISOString();
  
  const mapped = newProducts.map(p => {
    const item = { 
      ...p, 
      id: nextId,
      createdAt: now
    };
    nextId++;
    return item;
  });
  
  const updated = [...products, ...mapped];
  saveLocalProducts(updated);
  return updated;
};

export const restockProduct = (productId: number, qty: number, user: string): SimProduct[] => {
  const products = getLocalProducts();
  const updated = products.map(p => {
    if (p.id === productId) {
      return {
        ...p,
        previousStock: p.stock,
        stock: p.stock + qty,
        lastRestockedAt: new Date().toISOString(),
        lastRestockedBy: user,
        lastRestockQty: qty
      };
    }
    return p;
  });
  saveLocalProducts(updated);
  return updated;
};

export type SimCoupon = {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minPurchase: number;
  expiryDate: string;
  status: 'active' | 'inactive';
  createdAt: string;
  
  // New Fields
  onlyOncePerEmail?: boolean;
  maxUses?: number | null;
  usedCount: number;
  maxDiscountAmount?: number | null;
  limitProductIds?: number[];
  limitCategories?: string[];
  limitSubCategories?: string[];
};

const defaultCoupons: SimCoupon[] = [
  {
    code: 'REY10',
    type: 'percent',
    value: 10,
    minPurchase: 0,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    usedCount: 0,
    onlyOncePerEmail: false,
    maxUses: 100,
    maxDiscountAmount: 5000,
    limitProductIds: [],
    limitCategories: [],
    limitSubCategories: []
  },
  {
    code: 'MASAMADRE500',
    type: 'fixed',
    value: 500,
    minPurchase: 5000,
    expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    usedCount: 0,
    onlyOncePerEmail: true,
    maxUses: 50,
    maxDiscountAmount: null,
    limitProductIds: [],
    limitCategories: ['Panadería'],
    limitSubCategories: []
  },
  {
    code: 'BIENVENIDA20',
    type: 'percent',
    value: 20,
    minPurchase: 10000,
    expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    usedCount: 0,
    onlyOncePerEmail: true,
    maxUses: 200,
    maxDiscountAmount: 3000,
    limitProductIds: [],
    limitCategories: [],
    limitSubCategories: []
  },
  {
    code: 'PROMOEXPIRADA',
    type: 'percent',
    value: 15,
    minPurchase: 8000,
    expiryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'inactive',
    createdAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    usedCount: 0,
    onlyOncePerEmail: false,
    maxUses: 30,
    maxDiscountAmount: 2000,
    limitProductIds: [],
    limitCategories: [],
    limitSubCategories: []
  }
];

export const getLocalCoupons = (): SimCoupon[] => {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('pan_de_rey_sim_coupons');
  if (!raw) {
    localStorage.setItem('pan_de_rey_sim_coupons', JSON.stringify(defaultCoupons));
    return defaultCoupons;
  }
  return JSON.parse(raw);
};

export const saveLocalCoupons = (coupons: SimCoupon[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('pan_de_rey_sim_coupons', JSON.stringify(coupons));
};

export const addLocalCoupon = (coupon: SimCoupon): SimCoupon[] => {
  const coupons = getLocalCoupons();
  if (coupons.some(c => c.code.toUpperCase() === coupon.code.toUpperCase())) {
    throw new Error('El código de cupón ya existe.');
  }
  const updated = [...coupons, { ...coupon, code: coupon.code.toUpperCase(), createdAt: coupon.createdAt || new Date().toISOString().split('T')[0] }];
  saveLocalCoupons(updated);
  return updated;
};

export const deleteLocalCoupon = (code: string): SimCoupon[] => {
  const coupons = getLocalCoupons();
  const filtered = coupons.filter(c => c.code.toUpperCase() !== code.toUpperCase());
  saveLocalCoupons(filtered);
  return filtered;
};

export const updateLocalCouponStatus = (code: string, status: 'active' | 'inactive'): SimCoupon[] => {
  const coupons = getLocalCoupons();
  const updated = coupons.map(c => c.code.toUpperCase() === code.toUpperCase() ? { ...c, status } : c);
  saveLocalCoupons(updated);
  return updated;
};

export const updateLocalCoupon = (oldCode: string, updatedCoupon: SimCoupon): SimCoupon[] => {
  const coupons = getLocalCoupons();
  if (oldCode.toUpperCase() !== updatedCoupon.code.toUpperCase() && coupons.some(c => c.code.toUpperCase() === updatedCoupon.code.toUpperCase())) {
    throw new Error('El nuevo código de cupón ya existe.');
  }
  const updated = coupons.map(c => c.code.toUpperCase() === oldCode.toUpperCase() ? { ...updatedCoupon, code: updatedCoupon.code.toUpperCase() } : c);
  saveLocalCoupons(updated);
  return updated;
};


