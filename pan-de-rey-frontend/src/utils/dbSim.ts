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
};

export type SimProduct = {
  id: number;
  name: string;
  price: number;
  category: string;
  stock: number;
};

// Seed initial products with varying stock levels to trigger KPI warnings
const initialProducts: SimProduct[] = [
  { id: 1, name: 'Pan de Masa Madre Clásico', price: 4500, category: 'Panadería', stock: 12 },
  { id: 2, name: 'Focaccia al Romero', price: 3800, category: 'Panadería', stock: 8 }, // Alerta
  { id: 3, name: 'Baguette Tradicional', price: 1800, category: 'Panadería', stock: 15 },
  { id: 4, name: 'Pan de Centeno Alemán', price: 4200, category: 'Panadería', stock: 4 }, // Riesgo
  { id: 5, name: 'Ciabatta Rústica', price: 2200, category: 'Panadería', stock: 2 }, // Crítico
  { id: 6, name: 'Croissant de Mantequilla', price: 2200, category: 'Pastelería', stock: 25 },
  { id: 7, name: 'Pain au Chocolat', price: 2500, category: 'Pastelería', stock: 0 }, // Sin Stock
  { id: 8, name: 'Tarta de Limón y Merengue', price: 3800, category: 'Pastelería', stock: 6 }, // Alerta
  { id: 9, name: 'Roll de Canela Glaseado', price: 2800, category: 'Pastelería', stock: 3 }, // Crítico
  { id: 10, name: 'Brownie Sin Gluten', price: 2500, category: 'Sin Gluten', stock: 14 },
  { id: 11, name: 'Pan de Molde Keto', price: 5500, category: 'Sin Gluten', stock: 5 }, // Riesgo
  { id: 12, name: 'Galletas de Almendra', price: 1800, category: 'Sin Gluten', stock: 18 },
  { id: 13, name: 'Café Latte XL', price: 3500, category: 'Bebestibles', stock: 50 },
  { id: 14, name: 'Espresso Doble', price: 2200, category: 'Bebestibles', stock: 60 },
  { id: 15, name: 'Cappuccino Italiano', price: 3200, category: 'Bebestibles', stock: 45 },
];

const customerNames = ['María González', 'Juan Pérez', 'Diego Muñoz', 'Camila Rojas', 'José Fonseca'];
const emails = ['maria.gonzalez@gmail.com', 'juan.perez@yahoo.com', 'diego.munoz@outlook.com', 'camila.rojas@gmail.com', 'jose.fonseca@gmail.com'];
const phones = ['+56987654321', '+56911112222', '+56933334444', '+56955556666', '+56977778888'];

export const seedLocalDb = (force = false): boolean => {
  if (typeof window === 'undefined') return false;
  
  const existingOrders = localStorage.getItem('pan_de_rey_sim_orders');
  if (existingOrders && !force) return false; // Already seeded

  // Seed Products
  localStorage.setItem('pan_de_rey_sim_products', JSON.stringify(initialProducts));

  // Seed 28 Orders
  const orders: SimOrder[] = [];
  const statuses = ['Nuevo', 'Preparando', 'Listo', 'En Ruta', 'Entregado', 'Cancelado', 'Incompleto'];
  const methods: ('Retiro' | 'Delivery')[] = ['Retiro', 'Delivery'];

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
    let total = 0;

    for (let j = 0; j < itemsCount; j++) {
      const prod = initialProducts[(i + j) % initialProducts.length];
      const qty = 1 + (j % 2);
      const sub = prod.price * qty;
      total += sub;
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
      actualDeliveryTime: actualDeliveryTimeFormatted
    });
  }

  // Sort by date desc
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  localStorage.setItem('pan_de_rey_sim_orders', JSON.stringify(orders));
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

