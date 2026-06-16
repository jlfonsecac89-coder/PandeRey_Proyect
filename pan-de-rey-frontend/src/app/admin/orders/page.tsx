"use client";

import { useState, useEffect } from 'react';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  RefreshCw, 
  MessageSquare, 
  ShieldCheck, 
  Check, 
  Search, 
  Printer, 
  Eye, 
  Filter, 
  Calendar,
  Layers,
  Inbox,
  UserCheck,
  TrendingUp,
  FileText,
  User,
  ArrowRight,
  XCircle
} from 'lucide-react';
import { formatPrice } from '@/utils/format';
import { 
  getLocalOrders, 
  updateLocalOrderStatus, 
  incrementLocalOrderLabel, 
  seedLocalDb,
  getLocalSettings
} from '@/utils/dbSim';

// Tipos
type OrderStatus = 'Nuevo' | 'Preparación' | 'Listo' | 'Enviado';

type OrderItemRaw = {
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  price: number;
  subtotal: number;
};

type Order = {
  id: string;
  realId?: string;
  customerName: string;
  email: string;
  phone: string;
  items: string[];
  itemsRaw?: OrderItemRaw[];
  total: number;
  status: string; // Estado real de base de datos
  time: string;
  createdAt: string;
  shippingMethod: string;
  slaStartedAt?: string | null;
  slaPausedAt?: string | null;
  slaPausedTime?: number;
  deliveryPin?: string | null;
  
  // Nuevos campos
  pickupTime?: string;
  completenessPercent?: number;
  orderState?: 'Pendiente' | 'Aceptado';
  labelPrintedCount?: number;
  actualDeliveryTime?: string | null;
};

// Catálogo de variantes fijas de la panadería para la sustitución de stock
const productVariantsCatalog = [
  { id: 'var-prod-1', name: 'Pan de Masa Madre Clásico (Clásico)', price: 4500 },
  { id: 'var-prod-2', name: 'Focaccia al Romero (Clásico)', price: 3800 },
  { id: 'var-prod-3', name: 'Baguette Tradicional (Clásico)', price: 1800 },
  { id: 'var-prod-6', name: 'Croissant de Mantequilla (Clásico)', price: 2200 },
  { id: 'var-prod-7', name: 'Pain au Chocolat (Clásico)', price: 2500 },
  { id: 'var-prod-10', name: 'Brownie Sin Gluten (Clásico)', price: 2500 },
  { id: 'var-prod-13', name: 'Café Latte XL (Clásico)', price: 3500 },
  { id: 'var-prod-1-semillas', name: 'Pan de Masa Madre Clásico (Con Semillas)', price: 6500 }
];

const getApiUrl = (path: string) => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://localhost:3001${path}`;
    }
  }
  return path;
};

// Componente del Cronómetro del SLA para la grilla Kanban
function SlaTimer({ startedAt, pausedAt, pausedTime, status }: { startedAt?: string | null, pausedAt?: string | null, pausedTime?: number, status: string }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!startedAt) return;

    const calculateTime = () => {
      const startTime = new Date(startedAt).getTime();
      const now = pausedAt ? new Date(pausedAt).getTime() : Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000) - (pausedTime || 0);
      const totalSla = 40 * 60; // 40 minutos de SLA
      setTimeLeft(totalSla - elapsedSeconds);
    };

    calculateTime();
    if (pausedAt || status === 'Entregado' || status === 'Cancelado') {
      return;
    }

    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [startedAt, pausedAt, pausedTime, status]);

  if (timeLeft === null) return null;

  const isExceeded = timeLeft < 0;
  const absSeconds = Math.abs(timeLeft);
  const minutes = Math.floor(absSeconds / 60);
  const seconds = absSeconds % 60;
  const timeString = `${isExceeded ? '-' : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold leading-none w-fit ${
      isExceeded 
        ? 'bg-red-500/10 text-red-500 border border-red-500/30' 
        : pausedAt 
          ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 animate-pulse'
          : 'bg-gold/10 text-gold border border-gold/30'
    }`}>
      <Clock className="w-3 h-3" />
      {pausedAt ? `Pausado: ${timeString}` : timeString}
    </div>
  );
}

// Componente Celda de SLA Dinámico para la Tabla Principal de Seguimiento
function SlaTableCell({ order }: { order: Order }) {
  const [slaData, setSlaData] = useState<{
    timeString: string;
    label: string;
    class: string;
  } | null>(null);

  useEffect(() => {
    const calculateSla = () => {
      const { status, slaStartedAt, slaPausedAt, slaPausedTime, shippingMethod } = order;

      if (status === 'Entregado' || status === 'Cancelado') {
        setSlaData({
          timeString: '--:--',
          label: status === 'Entregado' ? 'Entregado' : 'Cancelado',
          class: 'text-gray-500 bg-gray-500/10 border border-gray-500/20'
        });
        return;
      }

      if (!slaStartedAt) {
        setSlaData({
          timeString: '--:--',
          label: 'Sin SLA',
          class: 'text-gray-400 bg-white/5 border border-white/5'
        });
        return;
      }

      const startTime = new Date(slaStartedAt).getTime();
      const now = slaPausedAt ? new Date(slaPausedAt).getTime() : Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000) - (slaPausedTime || 0);
      const totalSla = (shippingMethod === 'Delivery' ? 60 : 40) * 60; // 60m delivery, 40m retiro
      const timeLeft = totalSla - elapsedSeconds;

      const isExceeded = timeLeft < 0;
      const absSeconds = Math.abs(timeLeft);
      const minutes = Math.floor(absSeconds / 60);
      const seconds = absSeconds % 60;
      const timeString = `${isExceeded ? '-' : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      let label = 'Normal';
      let colorClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';

      if (slaPausedAt) {
        label = 'Pausado';
        colorClass = 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 animate-pulse';
      } else if (isExceeded) {
        label = 'Vencido';
        colorClass = 'bg-red-950/20 text-red-500 border border-red-900/30';
      } else if (timeLeft <= 60) {
        label = 'Crítico';
        colorClass = 'bg-red-500/15 text-red-500 border border-red-500/30 animate-pulse';
      } else if (timeLeft <= 300) {
        label = 'Urgente';
        colorClass = 'bg-orange-500/15 text-orange-500 border border-orange-500/30';
      } else if (timeLeft <= 600) {
        label = 'Alerta';
        colorClass = 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30';
      }

      setSlaData({
        timeString,
        label,
        class: colorClass
      });
    };

    calculateSla();
    if (order.status === 'Entregado' || order.status === 'Cancelado' || order.slaPausedAt) {
      return;
    }

    const interval = setInterval(calculateSla, 1000);
    return () => clearInterval(interval);
  }, [order]);

  if (!slaData) return <span className="text-gray-600 text-[10px]">--:--</span>;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold leading-none ${slaData.class}`}>
      <Clock className="w-3 h-3" />
      <span>{slaData.timeString} ({slaData.label})</span>
    </div>
  );
}

// Componente de Pipeline Visual de Progreso del Pedido (Rellena círculos dinámicamente)
function OrderPipelineTracker({ order }: { order: Order }) {
  const isDelivery = order.shippingMethod === 'Delivery';
  const status = order.status;
  
  // Define steps dynamically based on method
  const steps = isDelivery 
    ? [
        { label: 'Recibido', key: 'recibido', statuses: ['nuevo', 'aceptado', 'preparando', 'en preparación', 'listo', 'listo para retiro', 'listo para despacho', 'en ruta', 'en camino', 'entregado'] },
        { label: 'En Cocina', key: 'cocina', statuses: ['preparando', 'en preparación', 'listo', 'listo para retiro', 'listo para despacho', 'en ruta', 'en camino', 'entregado'] },
        { label: 'Listo', key: 'listo', statuses: ['listo', 'listo para retiro', 'listo para despacho', 'en ruta', 'en camino', 'entregado'] },
        { label: 'En Ruta', key: 'ruta', statuses: ['en ruta', 'en camino', 'entregado'] },
        { label: 'Entregado', key: 'entregado', statuses: ['entregado'] },
      ]
    : [
        { label: 'Recibido', key: 'recibido', statuses: ['nuevo', 'aceptado', 'preparando', 'en preparación', 'listo', 'listo para retiro', 'entregado'] },
        { label: 'En Cocina', key: 'cocina', statuses: ['preparando', 'en preparación', 'listo', 'listo para retiro', 'entregado'] },
        { label: 'Listo', key: 'listo', statuses: ['listo', 'listo para retiro', 'entregado'] },
        { label: 'Entregado', key: 'entregado', statuses: ['entregado'] },
      ];

  const statusLower = status.toLowerCase();
  
  // Find active step index
  let activeIndex = 0;
  steps.forEach((step, idx) => {
    if (step.statuses.includes(statusLower)) {
      activeIndex = idx;
    }
  });

  return (
    <div className="flex items-center gap-1 py-1 select-none">
      {steps.map((step, idx) => {
        const isCompleted = step.statuses.includes(statusLower);
        const isActive = idx === activeIndex && statusLower !== 'cancelado';
        
        let circleClass = 'border-gray-700 bg-transparent text-gray-500';
        if (isActive) {
          circleClass = 'border-gold bg-gold text-black font-black scale-105 shadow-[0_0_8px_rgba(212,175,55,0.5)]';
        } else if (isCompleted) {
          circleClass = 'border-emerald-500 bg-emerald-500 text-white';
        }

        // Build list of completed states for tooltip
        const completedStates: string[] = [];
        steps.forEach((s, i) => {
          if (i <= activeIndex) {
            completedStates.push(s.label);
          }
        });
        
        const tooltipText = `Etapa: ${step.label} | Estado actual: ${order.status}\nPasos cumplidos: ${completedStates.join(' → ')}`;

        return (
          <div key={step.key} className="flex items-center shrink-0 group/step relative">
            <div 
              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[7px] font-black transition-all duration-300 ${circleClass} cursor-help`}
              title={tooltipText}
            >
              {isCompleted && !isActive ? '✓' : idx + 1}
            </div>
            
            {idx < steps.length - 1 && (
              <div 
                className={`w-2 h-[2px] transition-all duration-300 ${
                  idx < activeIndex ? 'bg-emerald-500' : 'bg-gray-800'
                }`} 
                title={tooltipText}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [labelPrintOrder, setLabelPrintOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'tracking' | 'kanban' | 'exceptions'>('tracking');
  const [pipelineFilter, setPipelineFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // KPI Click active filters: 'all', 'nuevo', 'preparando', 'listo', 'en_ruta', 'entregado', 'incompleto', 'cancelado'
  const [kpiFilter, setKpiFilter] = useState<string>('all');

  // Bulk selections, pagination & notifications
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Estados de Modales y Formularios
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinOrderId, setPinOrderId] = useState<string>('');
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subOrder, setSubOrder] = useState<Order | null>(null);
  const [variantToRemove, setVariantToRemove] = useState<string>('');
  const [variantToAdd, setVariantToAdd] = useState<string>('');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/orders'));
      if (!res.ok) throw new Error('API offline');
      const data = await res.json();
      setOrders(data);
      setIsLive(true);
    } catch (err) {
      console.warn('Orders API not available, running local simulator.');
      const localData = getLocalOrders();
      setOrders(localData);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    setSettings(getLocalSettings());
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedOrderIds([]);
  }, [kpiFilter, pipelineFilter, searchQuery]);

  // Mover pedido de estado
  const moveOrder = async (id: string, newDbStatus: string, pinCode?: string) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;

    if (isLive) {
      try {
        const payload: any = {
          orderId: order.realId || order.id,
          newStatus: newDbStatus
        };
        if (pinCode) {
          payload.pin = pinCode;
        }

        const res = await fetch(getApiUrl('/api/orders/update-status'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (res.ok) {
          setIsPinModalOpen(false);
          setEnteredPin('');
          setPinError('');
          fetchOrders();
        } else {
          if (newDbStatus === 'Entregado' && order.shippingMethod === 'Delivery') {
            setPinError(data.error || 'Código PIN incorrecto');
          } else {
            alert(data.error || 'Error al actualizar el estado en el servidor');
          }
        }
      } catch (err) {
        console.error('Failed to update status:', err);
        alert('Error de conexión al actualizar estado');
      }
    } else {
      // Simulación offline local
      if (newDbStatus === 'Entregado' && order.shippingMethod === 'Delivery') {
        if (pinCode !== order.deliveryPin) {
          setPinError('Código PIN incorrecto');
          return;
        }
        setIsPinModalOpen(false);
        setEnteredPin('');
        setPinError('');
      }

      // Actualizar estado en el simulador local
      const updated = updateLocalOrderStatus(order.id, newDbStatus);
      
      // Ajuste de campos derivados que no maneja updateLocalOrderStatus por defecto
      const local = getLocalOrders();
      const adjusted = local.map(o => {
        if (o.id === order.id) {
          const nextState = newDbStatus === 'Nuevo' ? 'Pendiente' as const : 'Aceptado' as const;
          const actualTime = newDbStatus === 'Entregado' ? new Date().toISOString() : o.actualDeliveryTime;
          return {
            ...o,
            status: newDbStatus,
            orderState: nextState,
            actualDeliveryTime: actualTime
          };
        }
        return o;
      });
      localStorage.setItem('pan_de_rey_sim_orders', JSON.stringify(adjusted));
      fetchOrders();
    }
  };

  // Auto-advance stages: 40 minutes maximum total prep time
  // Nuevo -> Preparando (20 minutes) -> Listo (40 minutes from creation)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      let changed = false;
      
      const updated = orders.map(order => {
        if (order.status === 'Cancelado' || order.status === 'Entregado' || order.status === 'En Ruta' || order.status === 'En Camino' || order.status === 'Incompleto') {
          return order;
        }
        
        if (!order.createdAt) return order;
        const createdTime = new Date(order.createdAt).getTime();
        const elapsedMinutes = (now - createdTime) / (60 * 1000);
        
        if ((order.status === 'Nuevo' || order.status === 'Aceptado') && elapsedMinutes > 20) {
          changed = true;
          return { ...order, status: 'Preparando' };
        }
        if ((order.status === 'Preparando' || order.status === 'En Preparación') && elapsedMinutes > 40) {
          changed = true;
          return { ...order, status: 'Listo' };
        }
        
        return order;
      });
      
      if (changed) {
        setOrders(updated);
        if (!isLive) {
          localStorage.setItem('pan_de_rey_sim_orders', JSON.stringify(updated));
        }
        showToast('Pedidos actualizados automáticamente según tiempos de armado del SLA (40 mins).');
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [orders, isLive]);

  // Bulk status update handler
  const handleBulkStatusUpdate = (newStatus: string) => {
    if (selectedOrderIds.length === 0) return;
    
    if (isLive) {
      selectedOrderIds.forEach(id => {
        moveOrder(id, newStatus);
      });
      showToast(`Actualizando ${selectedOrderIds.length} pedidos a "${newStatus}"...`);
    } else {
      const local = getLocalOrders();
      const adjusted = local.map(o => {
        if (selectedOrderIds.includes(o.id)) {
          const nextState = newStatus === 'Nuevo' ? 'Pendiente' as const : 'Aceptado' as const;
          const actualTime = newStatus === 'Entregado' ? new Date().toISOString() : o.actualDeliveryTime;
          return {
            ...o,
            status: newStatus,
            orderState: nextState,
            actualDeliveryTime: actualTime
          };
        }
        return o;
      });
      localStorage.setItem('pan_de_rey_sim_orders', JSON.stringify(adjusted));
      fetchOrders();
      showToast(`Actualizados ${selectedOrderIds.length} pedidos a "${newStatus}" con éxito.`);
    }
    setSelectedOrderIds([]);
  };

  // Bulk print handler
  const handleBulkPrint = () => {
    if (selectedOrderIds.length === 0) return;
    
    if (isLive) {
      selectedOrderIds.forEach(async (id) => {
        try {
          await fetch(getApiUrl('/api/orders/increment-label'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: id })
          });
        } catch (e) {
          console.error(e);
        }
      });
      showToast(`Imprimiendo tickets de preparación para ${selectedOrderIds.length} pedidos...`);
    } else {
      selectedOrderIds.forEach(id => {
        incrementLocalOrderLabel(id);
      });
      showToast(`Simulando impresión de ${selectedOrderIds.length} etiquetas de preparación...`);
    }
    fetchOrders();
    setSelectedOrderIds([]);
  };

  // Incrementar copias de etiquetas e imprimir
  const handlePrintLabel = async (order: Order) => {
    if (isLive) {
      try {
        await fetch(getApiUrl('/api/orders/increment-label'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.realId || order.id })
        });
      } catch (err) {
        console.error('Failed to increment label count on server:', err);
      }
    } else {
      incrementLocalOrderLabel(order.id);
    }
    
    setLabelPrintOrder(order);
    fetchOrders();
  };

  // Procesar Sustitución de Producto Faltante
  const handleSubstituteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subOrder || !variantToRemove || !variantToAdd) {
      alert('Por favor selecciona los productos a remover y añadir.');
      return;
    }

    if (isLive) {
      try {
        const res = await fetch(getApiUrl('/api/orders/substitute'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: subOrder.realId || subOrder.id,
            variantIdToRemove: variantToRemove,
            variantIdToAdd: variantToAdd
          })
        });
        
        const data = await res.json();
        if (res.ok) {
          alert(data.message);
          setIsSubModalOpen(false);
          setSubOrder(null);
          setVariantToRemove('');
          setVariantToAdd('');
          fetchOrders();
        } else {
          alert(data.error || 'Error procesando la sustitución.');
        }
      } catch (err) {
        console.error(err);
        alert('Error de red al enviar la sustitución.');
      }
    } else {
      const local = getLocalOrders();
      const updated = local.map(o => {
        if (o.id === subOrder.id) {
          const itemsRaw = o.itemsRaw || [];
          const remainingItems = itemsRaw.filter(it => it.variantId !== variantToRemove);
          const addedVar = productVariantsCatalog.find(v => v.id === variantToAdd);
          
          if (addedVar) {
            remainingItems.push({
              variantId: variantToAdd,
              productName: addedVar.name.split(' (')[0],
              variantName: addedVar.name.includes('(') ? addedVar.name.split('(')[1].replace(')', '') : 'Clásico',
              quantity: 1,
              price: addedVar.price,
              subtotal: addedVar.price
            });
          }
          
          const newSubtotal = remainingItems.reduce((sum, it) => sum + it.subtotal, 0);
          const shippingCost = o.shippingMethod === 'Delivery' ? 3500 : 0;
          const nextStatus = 'Listo';

          return {
            ...o,
            itemsRaw: remainingItems,
            items: remainingItems.map(it => `${it.quantity}x ${it.productName} (${it.variantName})`),
            total: newSubtotal + shippingCost,
            status: nextStatus,
            completenessPercent: 100,
            slaPausedAt: null
          };
        }
        return o;
      });

      localStorage.setItem('pan_de_rey_sim_orders', JSON.stringify(updated));
      alert('Sustitución simulada con éxito. El pedido pasa a Listo.');
      setIsSubModalOpen(false);
      setSubOrder(null);
      setVariantToRemove('');
      setVariantToAdd('');
      fetchOrders();
    }
  };

  // Cálculos de KPIs Superiores (Pipeline States)
  const totalOrders = orders.length;
  const nuevosCount = orders.filter(o => o.status === 'Nuevo' || o.status === 'Aceptado').length;
  const preparandoCount = orders.filter(o => o.status === 'Preparando' || o.status === 'En Preparación').length;
  const listosCount = orders.filter(o => ['listo', 'listo para retiro', 'listo para despacho'].includes(o.status.toLowerCase())).length;
  const enRutaCount = orders.filter(o => o.status === 'En Ruta' || o.status === 'En Camino').length;
  const entregadosCount = orders.filter(o => o.status === 'Entregado').length;
  const incompletosCount = orders.filter(o => o.status === 'Incompleto' || (o.completenessPercent !== undefined && o.completenessPercent < 100)).length;
  const canceladosCount = orders.filter(o => o.status === 'Cancelado').length;

  const incompleteOrders = orders.filter(o => o.status === 'Incompleto' || (o.completenessPercent !== undefined && o.completenessPercent < 100));

  // Filtrado de Pedidos para la grilla
  const getFilteredOrders = () => {
    return orders.filter(order => {
      // 1. KPI active filter toggle
      if (kpiFilter === 'nuevo') {
        if (order.status !== 'Nuevo' && order.status !== 'Aceptado') return false;
      } else if (kpiFilter === 'preparando') {
        if (order.status !== 'Preparando' && order.status !== 'En Preparación') return false;
      } else if (kpiFilter === 'listo') {
        if (!['listo', 'listo para retiro', 'listo para despacho'].includes(order.status.toLowerCase())) return false;
      } else if (kpiFilter === 'en_ruta') {
        if (order.status !== 'En Ruta' && order.status !== 'En Camino') return false;
      } else if (kpiFilter === 'entregado') {
        if (order.status !== 'Entregado') return false;
      } else if (kpiFilter === 'incompleto') {
        const completeness = order.completenessPercent ?? (order.status === 'Incompleto' ? 66 : 100);
        if (completeness >= 100) return false;
      } else if (kpiFilter === 'cancelado') {
        if (order.status !== 'Cancelado') return false;
      }

      // 2. Pipeline status filter
      if (pipelineFilter !== 'all') {
        const statusLower = order.status.toLowerCase();
        if (pipelineFilter === 'nuevo' && order.status !== 'Nuevo' && order.status !== 'Aceptado') return false;
        if (pipelineFilter === 'preparando' && order.status !== 'Preparando' && order.status !== 'En Preparación') return false;
        if (pipelineFilter === 'listo' && !['listo', 'listo para retiro', 'listo para despacho'].includes(statusLower)) return false;
        if (pipelineFilter === 'enviado' && !['en ruta', 'en camino', 'entregado'].includes(statusLower)) return false;
        if (pipelineFilter === 'incompleto' && order.status !== 'Incompleto') return false;
        if (pipelineFilter === 'cancelado' && order.status !== 'Cancelado') return false;
      }

      // 3. Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const idMatches = order.id.toLowerCase().includes(query);
        const nameMatches = order.customerName.toLowerCase().includes(query);
        const phoneMatches = order.phone.includes(query);
        return idMatches || nameMatches || phoneMatches;
      }

      return true;
    });
  };


  // Mapeo del Kanban
  const filterOrdersForKanban = (columnStatus: OrderStatus) => {
    return orders.filter(o => {
      const s = o.status;
      if (columnStatus === 'Nuevo') {
        return s === 'Nuevo' || s === 'Aceptado';
      }
      if (columnStatus === 'Preparación') {
        return s === 'Preparando' || s === 'En Preparación';
      }
      if (columnStatus === 'Listo') {
        return s === 'Listo' || s === 'Listo para Retiro' || s === 'Listo para Despacho';
      }
      if (columnStatus === 'Enviado') {
        return s === 'En Ruta' || s === 'En Camino' || s === 'Entregado';
      }
      return false;
    });
  };

  const columns: { title: string; status: OrderStatus; icon: any }[] = [
    { title: 'Nuevos Pedidos', status: 'Nuevo', icon: Clock },
    { title: 'En Preparación', status: 'Preparación', icon: Package },
    { title: 'Listos para Entrega', status: 'Listo', icon: CheckCircle },
    { title: 'Despachados / Entregados', status: 'Enviado', icon: Truck },
  ];

  return (
    <div className="h-full flex flex-col space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-charcoal-light p-4 rounded-xl border border-charcoal-border shadow-lg">
        <div>
          <h1 className="text-xl font-serif text-white tracking-wide flex items-center gap-2">
            Seguimiento de Pedidos y Operaciones
            {isLive ? (
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full inline-block animate-pulse" title="Servidor Activo (MySQL)" />
            ) : (
              <span className="w-2.5 h-2.5 bg-gold rounded-full inline-block" title="Modo Local Simulado (Offline)" />
            )}
          </h1>
          <p className="text-xs text-gray-400">Panel administrativo centralizado de control de ventas y SLAs</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={fetchOrders} 
            className="flex items-center gap-2 px-3 py-1.5 bg-[#161616] text-gray-400 hover:text-white border border-white/5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
        </div>
      </div>

      {/* Grid de Tarjetas KPI - Representing Pipeline States */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        
        {/* KPI 1: Nuevos */}
        <div 
          onClick={() => setKpiFilter(prev => prev === 'nuevo' ? 'all' : 'nuevo')}
          className={`cursor-pointer bg-[#0d0d0d] border rounded-xl p-3 flex flex-col justify-between shadow-md relative overflow-hidden group transition-all duration-300 ${
            kpiFilter === 'nuevo'
              ? 'border-purple-500 bg-purple-950/10 shadow-[0_0_12px_rgba(168,85,247,0.2)] scale-[1.02]' 
              : 'border-charcoal-border hover:border-purple-500/30'
          }`}
        >
          <p className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">Nuevos</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-serif font-bold text-purple-400">{nuevosCount}</span>
            <Inbox className="w-5 h-5 text-purple-500/30 group-hover:text-purple-400/50 transition-colors" />
          </div>
        </div>

        {/* KPI 2: En Cocina */}
        <div 
          onClick={() => setKpiFilter(prev => prev === 'preparando' ? 'all' : 'preparando')}
          className={`cursor-pointer bg-[#0d0d0d] border rounded-xl p-3 flex flex-col justify-between shadow-md relative overflow-hidden group transition-all duration-300 ${
            kpiFilter === 'preparando'
              ? 'border-blue-500 bg-blue-950/10 shadow-[0_0_12px_rgba(59,130,246,0.2)] scale-[1.02]' 
              : 'border-charcoal-border hover:border-blue-500/30'
          }`}
        >
          <p className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">En Cocina</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-serif font-bold text-blue-400">{preparandoCount}</span>
            <Package className="w-5 h-5 text-blue-500/30 group-hover:text-blue-400/50 transition-colors" />
          </div>
        </div>

        {/* KPI 3: Listos */}
        <div 
          onClick={() => setKpiFilter(prev => prev === 'listo' ? 'all' : 'listo')}
          className={`cursor-pointer bg-[#0d0d0d] border rounded-xl p-3 flex flex-col justify-between shadow-md relative overflow-hidden group transition-all duration-300 ${
            kpiFilter === 'listo'
              ? 'border-yellow-500 bg-yellow-950/10 shadow-[0_0_12px_rgba(234,179,8,0.2)] scale-[1.02]' 
              : 'border-charcoal-border hover:border-yellow-500/30'
          }`}
        >
          <p className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">Listos</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-serif font-bold text-yellow-500">{listosCount}</span>
            <CheckCircle className="w-5 h-5 text-yellow-500/30 group-hover:text-yellow-400/50 transition-colors" />
          </div>
        </div>

        {/* KPI 4: En Ruta */}
        <div 
          onClick={() => setKpiFilter(prev => prev === 'en_ruta' ? 'all' : 'en_ruta')}
          className={`cursor-pointer bg-[#0d0d0d] border rounded-xl p-3 flex flex-col justify-between shadow-md relative overflow-hidden group transition-all duration-300 ${
            kpiFilter === 'en_ruta'
              ? 'border-blue-400 bg-blue-900/10 shadow-[0_0_12px_rgba(96,165,250,0.2)] scale-[1.02]' 
              : 'border-charcoal-border hover:border-blue-400/30'
          }`}
        >
          <p className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">En Ruta</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-serif font-bold text-blue-300">{enRutaCount}</span>
            <Truck className="w-5 h-5 text-blue-400/30 group-hover:text-blue-300/50 transition-colors" />
          </div>
        </div>

        {/* KPI 5: Entregados */}
        <div 
          onClick={() => setKpiFilter(prev => prev === 'entregado' ? 'all' : 'entregado')}
          className={`cursor-pointer bg-[#0d0d0d] border rounded-xl p-3 flex flex-col justify-between shadow-md relative overflow-hidden group transition-all duration-300 ${
            kpiFilter === 'entregado'
              ? 'border-emerald-500 bg-emerald-950/10 shadow-[0_0_12px_rgba(16,185,129,0.2)] scale-[1.02]' 
              : 'border-charcoal-border hover:border-emerald-500/30'
          }`}
        >
          <p className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">Entregados</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-serif font-bold text-emerald-400">{entregadosCount}</span>
            <UserCheck className="w-5 h-5 text-emerald-500/30 group-hover:text-emerald-400/50 transition-colors" />
          </div>
        </div>

        {/* KPI 6: Incompletos */}
        <div 
          onClick={() => setKpiFilter(prev => prev === 'incompleto' ? 'all' : 'incompleto')}
          className={`cursor-pointer bg-[#0d0d0d] border rounded-xl p-3 flex flex-col justify-between shadow-md relative overflow-hidden group transition-all duration-300 ${
            kpiFilter === 'incompleto'
              ? 'border-orange-500 bg-orange-950/10 shadow-[0_0_12px_rgba(249,115,22,0.2)] scale-[1.02]' 
              : 'border-charcoal-border hover:border-orange-500/30'
          }`}
        >
          <p className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">Incompletos</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-serif font-bold text-orange-400">{incompletosCount}</span>
            <AlertTriangle className="w-5 h-5 text-orange-500/30 group-hover:text-orange-400/50 transition-colors" />
          </div>
        </div>

        {/* KPI 7: Cancelados */}
        <div 
          onClick={() => setKpiFilter(prev => prev === 'cancelado' ? 'all' : 'cancelado')}
          className={`cursor-pointer bg-[#0d0d0d] border rounded-xl p-3 flex flex-col justify-between shadow-md relative overflow-hidden group transition-all duration-300 ${
            kpiFilter === 'cancelado'
              ? 'border-red-500 bg-red-950/10 shadow-[0_0_12px_rgba(239,68,68,0.2)] scale-[1.02]' 
              : 'border-charcoal-border hover:border-red-500/30'
          }`}
        >
          <p className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-1">Cancelados</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-serif font-bold text-red-500">{canceladosCount}</span>
            <XCircle className="w-5 h-5 text-red-500/30 group-hover:text-red-400/50 transition-colors" />
          </div>
        </div>

      </div>

      {/* Pestañas (Vistas) */}
      <div className="flex border-b border-charcoal-border">
        <button
          onClick={() => setActiveTab('tracking')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${
            activeTab === 'tracking' 
              ? 'border-gold text-gold bg-gold/5 font-semibold' 
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          Tabla de Seguimiento
        </button>
        <button
          onClick={() => setActiveTab('kanban')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${
            activeTab === 'kanban' 
              ? 'border-gold text-gold bg-gold/5 font-semibold' 
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          Tablero Kanban
        </button>
        <button
          onClick={() => setActiveTab('exceptions')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-bold uppercase tracking-widest transition-all relative cursor-pointer ${
            activeTab === 'exceptions' 
              ? 'border-gold text-gold bg-gold/5 font-semibold' 
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Excepciones de Stock
          {incompleteOrders.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold border-2 border-[#0c0c0c] animate-bounce">
              {incompleteOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab: Tabla de Seguimiento (Compacted 6-column Layout) */}
      {activeTab === 'tracking' && (() => {
        const filteredList = getFilteredOrders();
        const itemsPerPage = 50;
        const totalPages = Math.ceil(filteredList.length / itemsPerPage);
        const paginatedOrders = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

        return (
          <div className="bg-[#111] border border-charcoal-border rounded-xl p-6 shadow-xl space-y-6">
            
            {/* Panel de Acciones Masivas */}
            {selectedOrderIds.length > 0 && (
              <div className="bg-[#1a1710] border border-gold/20 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-gold rounded-full animate-pulse shrink-0" />
                  <span className="text-xs text-gray-300 font-medium">
                    Hay <strong className="text-gold font-bold">{selectedOrderIds.length}</strong> pedidos seleccionados
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    onClick={handleBulkPrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-charcoal-light hover:bg-[#222] border border-white/10 hover:border-gold/30 text-gray-300 hover:text-gold rounded text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimir Detalle
                  </button>
                  
                  <div className="flex items-center gap-2 bg-[#161616] border border-white/15 rounded px-2.5 py-1">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Cambiar a:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleBulkStatusUpdate(e.target.value);
                          e.target.value = ''; // Reset select
                        }
                      }}
                      className="bg-transparent border-0 text-xs text-gold font-bold focus:ring-0 outline-none cursor-pointer"
                    >
                      <option value="" className="bg-[#161616]">Seleccionar Estado</option>
                      <option value="Nuevo" className="bg-[#161616]">Nuevo</option>
                      <option value="Preparando" className="bg-[#161616]">Preparando</option>
                      <option value="Listo" className="bg-[#161616]">Listo</option>
                      <option value="En Ruta" className="bg-[#161616]">En Ruta</option>
                      <option value="Entregado" className="bg-[#161616]">Entregado</option>
                      <option value="Cancelado" className="bg-[#161616]">Cancelado</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setSelectedOrderIds([])}
                    className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest cursor-pointer px-2"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            )}

            {/* Controles y Filtros */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Buscar pedido, cliente, fono..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#161616] border border-white/5 rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:border-gold outline-none transition-colors"
                  />
                </div>
                
                <div className="flex items-center gap-2 bg-[#161616] border border-white/5 rounded-lg px-3 py-2 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-gray-500" />
                  <select 
                    value={pipelineFilter}
                    onChange={(e) => setPipelineFilter(e.target.value)}
                    className="bg-transparent border-0 text-xs text-gray-300 focus:ring-0 outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-[#161616]">Todos los Estados</option>
                    <option value="nuevo" className="bg-[#161616]">Nuevo / Aceptado</option>
                    <option value="preparando" className="bg-[#161616]">En Preparación</option>
                    <option value="listo" className="bg-[#161616]">Listo para Entrega</option>
                    <option value="enviado" className="bg-[#161616]">Enviado / Entregado</option>
                    <option value="incompleto" className="bg-[#161616]">Incompleto</option>
                    <option value="cancelado" className="bg-[#161616]">Cancelado</option>
                  </select>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 self-end">
                Mostrando <strong className="text-white">{filteredList.length}</strong> de <strong className="text-white">{orders.length}</strong> pedidos
              </p>
            </div>

            {/* Tabla de 6 Columnas con Subscroll */}
            <div className="overflow-x-auto rounded-lg border border-white/5 max-h-[550px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-charcoal-border text-gray-400 uppercase tracking-wider text-[9px] bg-charcoal-light/30 sticky top-0 z-10 backdrop-blur-md">
                    <th className="p-4 text-center w-12">
                      <input 
                        type="checkbox"
                        checked={paginatedOrders.length > 0 && paginatedOrders.every(o => selectedOrderIds.includes(o.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const ids = paginatedOrders.map(o => o.id);
                            setSelectedOrderIds(prev => Array.from(new Set([...prev, ...ids])));
                          } else {
                            const ids = paginatedOrders.map(o => o.id);
                            setSelectedOrderIds(prev => prev.filter(id => !ids.includes(id)));
                          }
                        }}
                        className="rounded bg-[#161616] border-white/10 text-gold focus:ring-gold focus:ring-offset-0 cursor-pointer w-3.5 h-3.5"
                      />
                    </th>
                    <th className="p-4 text-center">Pedido</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Entrega</th>
                    <th className="p-4">Detalle & Estado</th>
                    <th className="p-4">Pipeline & SLA</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-500 italic">No se encontraron pedidos con los filtros seleccionados.</td>
                    </tr>
                  ) : (
                    paginatedOrders.map((order) => {
                      const totalQty = order.itemsRaw?.reduce((sum, it) => sum + it.quantity, 0) || order.items.length;
                      const isDelivery = order.shippingMethod === 'Delivery';
                      const completeness = order.completenessPercent ?? (order.status === 'Incompleto' ? 66 : 100);

                      return (
                        <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                          
                          {/* Checkbox */}
                          <td className="p-4 text-center">
                            <input 
                              type="checkbox"
                              checked={selectedOrderIds.includes(order.id)}
                              onChange={() => {
                                setSelectedOrderIds(prev => 
                                  prev.includes(order.id) 
                                    ? prev.filter(id => id !== order.id) 
                                    : [...prev, order.id]
                                );
                              }}
                              className="rounded bg-[#161616] border-white/10 text-gold focus:ring-gold focus:ring-offset-0 cursor-pointer w-3.5 h-3.5"
                            />
                          </td>

                          {/* 1. Pedido (ID + Fecha/Hora) */}
                          <td className="p-4">
                            <div className="flex flex-col items-center">
                              <button 
                                onClick={() => setSelectedOrder(order)}
                                className="font-bold text-gold hover:text-white underline decoration-gold/40 transition-colors uppercase text-[13px] tracking-wide"
                              >
                                #{order.id.substring(0, 8).toUpperCase()}
                              </button>
                              <span className="text-[9px] text-gray-500 mt-1 font-mono font-bold tracking-wider">
                                {order.createdAt ? new Date(order.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' }) : '--/--'} {order.time}
                              </span>
                            </div>
                          </td>

                          {/* 2. Cliente (Nombre + Contacto) */}
                          <td className="p-4">
                            <div className="flex flex-col justify-center">
                              <span className="font-semibold text-white text-sm">{order.customerName}</span>
                              <span className="text-[10px] text-gray-500 mt-0.5 font-mono">{order.phone}</span>
                            </div>
                          </td>

                          {/* 3. Entrega (Método + Hora Estimada) */}
                          <td className="p-4">
                            <div className="flex flex-col justify-center">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider w-fit ${
                                isDelivery 
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                  : 'bg-gold/10 text-gold border border-gold/20'
                              }`}>
                                {isDelivery ? <Truck className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                                {order.shippingMethod}
                              </span>
                              <span className="text-[10px] text-gray-500 mt-1 font-mono">
                                Estimado: <strong className="text-white">{order.pickupTime || '--:--'}</strong>
                              </span>
                            </div>
                          </td>

                          {/* 4. Detalle & Estado (Items + Monto + Barra de completitud) */}
                          <td className="p-4">
                            <div className="flex flex-col gap-1.5 max-w-[150px]">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-gray-300 font-bold">{totalQty} {totalQty === 1 ? 'producto' : 'productos'}</span>
                                <span className="text-white font-mono font-bold">${formatPrice(order.total)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden shrink-0">
                                  <div 
                                    className={`h-full rounded-full ${completeness < 100 ? 'bg-orange-500' : 'bg-gold'}`}
                                    style={{ width: `${completeness}%` }}
                                  />
                                </div>
                                <span className={`font-mono text-[9px] font-bold ${completeness < 100 ? 'text-orange-400' : 'text-gray-500'}`}>
                                  {completeness}%
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 5. Pipeline & SLA (Visual Tracker + Estado + SLA) */}
                          <td className="p-4">
                            <div className="flex flex-col gap-1.5 items-start">
                              <OrderPipelineTracker order={order} />
                              <div className="flex items-center gap-2">
                                <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                                  order.status === 'Nuevo' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                  order.status === 'Preparando' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                  ['Listo', 'Listo para Retiro', 'Listo para Despacho'].includes(order.status) ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                                  order.status === 'Incompleto' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                  order.status === 'Cancelado' ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20' :
                                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {order.status}
                                </span>
                                <SlaTableCell order={order} />
                              </div>
                            </div>
                          </td>

                          {/* 6. Acciones (Impresión + Copias) */}
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-3">
                              <button 
                                onClick={() => handlePrintLabel(order)}
                                className="p-2 rounded bg-charcoal-light hover:bg-gold/10 border border-white/5 hover:border-gold/30 text-gray-400 hover:text-gold transition-all duration-300 cursor-pointer"
                                title="Imprimir ticket preparación (no fiscal)"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <div className="flex flex-col items-start leading-none text-[10px]">
                                <span className="text-gray-300 font-bold font-mono">{order.labelPrintedCount || 0}x</span>
                                <span className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">impreso</span>
                              </div>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-charcoal-border text-xs text-gray-400">
                <span>Página {currentPage} de {totalPages} (Mostrando {paginatedOrders.length} de {filteredList.length} pedidos)</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-[#161616] hover:bg-[#222] border border-white/5 rounded text-xs font-bold uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-[#161616] hover:bg-[#222] border border-white/5 rounded text-xs font-bold uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}

          </div>
        );
      })()}

      {/* Tab: Kanban (Facade WMS Redesign) */}
      {activeTab === 'kanban' && (
        <div className="flex-1 flex gap-5 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-white/10 min-h-[650px]">
          {columns.map(col => {
            const colOrders = filterOrdersForKanban(col.status);
            const Icon = col.icon;
            
            return (
              <div key={col.status} className="w-[360px] flex-shrink-0 flex flex-col bg-[#0d0d0d] rounded-xl border border-charcoal-border/80 shadow-2xl">
                {/* Cabecera Columna */}
                <div className="p-4 border-b border-charcoal-border flex items-center justify-between bg-charcoal-light/20 rounded-t-xl">
                  <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
                    <Icon className="w-4 h-4 text-gold" />
                    {col.title}
                  </div>
                  <span className="bg-gold/10 text-gold border border-gold/20 text-[9px] font-black py-0.5 px-2.5 rounded-full uppercase tracking-wider">
                    {colOrders.length}
                  </span>
                </div>
                
                {/* Contenido Columna */}
                <div className="p-3 flex-1 overflow-y-auto space-y-3.5 max-h-[600px] min-h-[500px]">
                  {colOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-16 text-center text-gray-600">
                      <Inbox className="w-8 h-8 stroke-1 text-gray-700 mb-2" />
                      <p className="text-[11px] uppercase tracking-wider font-semibold">Vacío</p>
                    </div>
                  ) : (
                    colOrders.map(order => {
                      const isDelivery = order.shippingMethod === 'Delivery';
                      const isRetiro = order.shippingMethod === 'Retiro';
                      const completeness = order.completenessPercent ?? (order.status === 'Incompleto' ? 66 : 100);
                      const totalQty = order.itemsRaw?.reduce((sum, it) => sum + it.quantity, 0) || order.items.length;
                      
                      return (
                        <div 
                          key={order.id} 
                          onClick={() => setSelectedOrder(order)}
                          className="bg-charcoal-light/40 hover:bg-charcoal-light/80 p-4 rounded-xl border border-charcoal-border/50 cursor-pointer hover:border-gold/30 transition-all duration-300 shadow-md hover:shadow-black/50 group relative overflow-hidden flex flex-col justify-between"
                        >
                          {/* SLA Timer en la esquina superior derecha */}
                          {(order.status !== 'Entregado' && order.status !== 'Cancelado') && (
                            <div className="absolute top-4 right-4" onClick={(e) => e.stopPropagation()}>
                              <SlaTimer 
                                startedAt={order.slaStartedAt} 
                                pausedAt={order.slaPausedAt} 
                                pausedTime={order.slaPausedTime} 
                                status={order.status} 
                              />
                            </div>
                          )}

                          <div>
                            {/* ID y Tipo de Envío */}
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-mono font-black text-xs text-white group-hover:text-gold transition-colors tracking-widest uppercase">
                                #{order.id.substring(0, 8).toUpperCase()}
                              </span>
                            </div>
                            
                            {/* Info Cliente */}
                            <div className="space-y-0.5 mb-2.5">
                              <p className="text-xs text-white font-bold">{order.customerName}</p>
                              <p className="text-[10px] text-gray-500 font-mono">{order.phone}</p>
                            </div>
                            
                            {/* Detalle Items en Lista Compacta */}
                            <div className="bg-[#0c0c0c]/40 border border-white/5 rounded p-2.5 mb-3.5">
                              <div className="text-[9px] uppercase tracking-widest text-gray-600 font-bold mb-1.5 flex justify-between">
                                <span>Lista a Preparar</span>
                                <span>{totalQty} un.</span>
                              </div>
                              <div className="text-[10px] text-gray-300 font-light max-h-24 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-white/5">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="truncate">• {item}</div>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          {/* Footer Tarjeta */}
                          <div className="flex flex-col gap-3 pt-3 border-t border-charcoal-border/50">
                            
                            {/* Pipeline Tracker */}
                            <div className="flex justify-center py-1 bg-[#161616]/40 rounded-lg">
                              <OrderPipelineTracker order={order} />
                            </div>

                            {/* Monto y Método */}
                            <div className="flex justify-between items-center">
                              <span className="text-white font-mono font-bold text-sm">
                                ${formatPrice(order.total)}
                              </span>
                              
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider ${
                                isDelivery 
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                  : 'bg-gold/10 text-gold border border-gold/20'
                              }`}>
                                {isDelivery ? 'Delivery' : 'Retiro'}
                              </span>
                            </div>

                            {/* Botones de Acción */}
                            <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                              
                              {/* Botones columna: Nuevo */}
                              {col.status === 'Nuevo' && (
                                <button 
                                  onClick={() => moveOrder(order.id, 'Preparando')} 
                                  className="w-full text-[9px] bg-gold text-black px-2.5 py-1.5 rounded font-black uppercase tracking-wider hover:bg-gold-hover transition-colors cursor-pointer"
                                >
                                  Aceptar Pedido
                                </button>
                              )}
                              
                              {/* Botones columna: En Preparación */}
                              {col.status === 'Preparación' && (
                                <>
                                  <button 
                                    onClick={() => moveOrder(order.id, 'Listo')} 
                                    className="flex-1 text-[9px] bg-gold text-black px-2.5 py-1.5 rounded font-black uppercase tracking-wider hover:bg-gold-hover transition-colors cursor-pointer"
                                  >
                                    Terminar
                                  </button>
                                  <button 
                                    onClick={() => moveOrder(order.id, 'Incompleto')} 
                                    className="text-[9px] bg-red-950/20 text-red-500 border border-red-500/20 px-2 py-1 rounded hover:bg-red-500 hover:text-black transition-colors font-bold uppercase cursor-pointer"
                                    title="Reportar falta de stock en cocina"
                                  >
                                    Falta Stock
                                  </button>
                                </>
                              )}
                              
                              {/* Botones columna: Listos */}
                              {col.status === 'Listo' && (
                                <button 
                                  onClick={() => {
                                    if (isDelivery) {
                                      moveOrder(order.id, 'En Camino');
                                    } else {
                                      moveOrder(order.id, 'Entregado');
                                    }
                                  }} 
                                  className="w-full text-[9px] bg-emerald-500 text-black px-2.5 py-1.5 rounded font-black uppercase tracking-wider hover:bg-emerald-400 transition-colors cursor-pointer"
                                >
                                  {isDelivery ? 'Despachar a Ruta' : 'Entregar en Caja'}
                                </button>
                              )}

                              {/* Botones columna: Enviado (Solo Delivery 'En Camino') */}
                              {col.status === 'Enviado' && order.status === 'En Camino' && (
                                <button 
                                  onClick={() => {
                                    setPinOrderId(order.id);
                                    setIsPinModalOpen(true);
                                  }} 
                                  className="w-full text-[9px] bg-blue-500 hover:bg-blue-400 text-white py-1.5 rounded font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  Confirmar PIN
                                </button>
                              )}
                              
                              {/* Estado Entregado fijo */}
                              {order.status === 'Entregado' && (
                                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 w-full bg-emerald-500/5 py-1.5 rounded border border-emerald-500/10">
                                  <Check className="w-3.5 h-3.5" />
                                  Entregado
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Excepciones de Stock */}
      {activeTab === 'exceptions' && (
        <div className="bg-[#111] border border-charcoal-border rounded-xl p-6 shadow-xl">
          <div className="mb-4">
            <h2 className="text-lg font-serif text-white tracking-wide">Pedidos Incompletos (Falta de Stock)</h2>
            <p className="text-xs text-gray-500">Pedidos en pausa de SLA esperando sustitución del producto por parte del administrador.</p>
          </div>
          
          {incompleteOrders.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500 italic">No hay pedidos incompletos en cola de sustitución.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-charcoal-border text-gray-400 uppercase tracking-wider text-[10px] bg-charcoal-light/20">
                    <th className="p-4">Pedido ID</th>
                    <th className="p-4">Cliente / Contacto</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Productos en la Orden</th>
                    <th className="p-4">SLA Pausado</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {incompleteOrders.map(order => (
                    <tr key={order.id} className="border-b border-charcoal-border/50 hover:bg-charcoal-light/10 transition-colors">
                      <td className="p-4 font-bold text-white">
                        #{order.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="p-4 space-y-1">
                        <p className="font-semibold text-gray-200">{order.customerName}</p>
                        <p className="text-[10px] text-gray-500">{order.email}</p>
                        <p className="text-[10px] text-gray-500">{order.phone}</p>
                      </td>
                      <td className="p-4">
                        <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-bold ${
                          order.shippingMethod === 'Delivery' 
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                            : 'bg-gold/10 text-gold border border-gold/20'
                        }`}>
                          {order.shippingMethod}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs">
                        <ul className="list-disc list-inside space-y-0.5 text-gray-400">
                          {order.itemsRaw && order.itemsRaw.length > 0 ? (
                            order.itemsRaw.map((it, idx) => (
                              <li key={idx}>
                                {it.quantity}x {it.productName} ({it.variantName})
                              </li>
                            ))
                          ) : (
                            order.items.map((it, idx) => (
                              <li key={idx}>{it}</li>
                            ))
                          )}
                        </ul>
                      </td>
                      <td className="p-4">
                        <SlaTimer 
                          startedAt={order.slaStartedAt} 
                          pausedAt={order.slaPausedAt} 
                          pausedTime={order.slaPausedTime} 
                          status={order.status} 
                        />
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => {
                              setSubOrder(order);
                              setIsSubModalOpen(true);
                            }}
                            className="bg-gold hover:bg-gold-hover text-black px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors active:scale-95 shadow-md shadow-gold/10 cursor-pointer"
                          >
                            Sustituir
                          </button>
                          
                          {/* WhatsApp Link Directo */}
                          <a
                            href={`https://wa.me/${order.phone.replace(/[^0-9]/g, '')}?text=Hola%20${encodeURIComponent(order.customerName)},%20te%20escribimos%20de%20Pan%20de%20Rey%20sobre%20tu%20pedido%20%23${order.id.substring(0, 8).toUpperCase()}.%20Lamentablemente%20no%20contamos%20con%20stock%20de%20uno%20de%20los%20productos.%20¿Te%20gustaría%20cambiarlo%20por%20otro%20del%20mismo%20valor?`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 border border-green-500/30 text-green-500 hover:bg-green-500 hover:text-black px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-colors"
                          >
                            <MessageSquare className="w-3 h-3" />
                            WhatsApp
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Ingresar PIN de Delivery */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-charcoal-light w-full max-w-sm rounded-lg border border-charcoal-border shadow-2xl flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-gold">
              <ShieldCheck className="w-6 h-6" />
              <h3 className="text-lg font-serif text-white">Validación de Entrega</h3>
            </div>
            
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              El cliente recibió un PIN de seguridad de 4 dígitos vía WhatsApp al momento de salir el repartidor. Ingrésalo a continuación para confirmar la entrega del pedido.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 block mb-2">PIN del Cliente (4 dígitos)</label>
                <input 
                  type="text" 
                  maxLength={4}
                  placeholder="Ej: 1234"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-[#161616] border border-white/10 p-3 rounded text-center text-xl font-mono tracking-[0.5em] text-white focus:border-gold outline-none transition-colors"
                />
              </div>
              
              {pinError && (
                <p className="text-[11px] text-red-500 flex items-center gap-1.5 bg-red-500/10 p-2 rounded border border-red-500/20">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {pinError}
                </p>
              )}
              
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setIsPinModalOpen(false);
                    setEnteredPin('');
                    setPinError('');
                  }}
                  className="flex-1 border border-white/10 hover:bg-white/5 text-gray-300 py-2.5 rounded text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => moveOrder(pinOrderId, 'Entregado', enteredPin)}
                  disabled={enteredPin.length < 4}
                  className="flex-1 bg-gold text-black py-2.5 rounded text-xs font-bold uppercase hover:bg-gold-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Entregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Gestionar Sustitución */}
      {isSubModalOpen && subOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubstituteSubmit} className="bg-charcoal-light w-full max-w-lg rounded-lg border border-charcoal-border shadow-2xl flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-gold">
              <RefreshCw className="w-5 h-5" />
              <h3 className="text-lg font-serif text-white">Sustitución de Producto</h3>
            </div>
            
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              Modifica los ítems del pedido <strong>#{subOrder.id.substring(0, 8).toUpperCase()}</strong>. Se devolverá la cantidad al stock del producto quitado y se descontará del stock del producto de reemplazo.
            </p>
            
            <div className="space-y-4">
              {/* Seleccionar Producto a Quitar */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 block mb-2">1. Producto Faltante (Remover)</label>
                <select 
                  required
                  value={variantToRemove}
                  onChange={(e) => setVariantToRemove(e.target.value)}
                  className="w-full bg-[#161616] border border-white/10 p-3 rounded text-sm text-white focus:border-gold outline-none appearance-none"
                >
                  <option value="">Selecciona el producto agotado...</option>
                  {subOrder.itemsRaw?.map(it => (
                    <option key={it.variantId} value={it.variantId}>
                      {it.quantity}x {it.productName} ({it.variantName}) - ${formatPrice(it.price)} c/u
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Seleccionar Producto Reemplazo */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 block mb-2">2. Producto de Reemplazo (Añadir)</label>
                <select 
                  required
                  value={variantToAdd}
                  onChange={(e) => setVariantToAdd(e.target.value)}
                  className="w-full bg-[#161616] border border-white/10 p-3 rounded text-sm text-white focus:border-gold outline-none appearance-none"
                >
                  <option value="">Selecciona el producto sustituto...</option>
                  {productVariantsCatalog
                    .filter(v => v.id !== variantToRemove) // No duplicar
                    .map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} - ${formatPrice(v.price)}
                      </option>
                    ))
                  }
                </select>
              </div>
              
              <div className="bg-gold/5 border border-gold/15 p-3 rounded flex items-start gap-3 mt-4">
                <AlertCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  <strong className="text-gold">Soporte Operativo:</strong> Al confirmar la sustitución, el SLA en pausa se calculará y registrará en la orden. El estado del pedido se actualizará automáticamente a <strong>Listo</strong> y el pedido regresará al tablero principal.
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setIsSubModalOpen(false);
                    setSubOrder(null);
                    setVariantToRemove('');
                    setVariantToAdd('');
                  }}
                  className="flex-1 border border-white/10 hover:bg-white/5 text-gray-300 py-2.5 rounded text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-gold text-black py-2.5 rounded text-xs font-bold uppercase hover:bg-gold-hover transition-colors shadow-lg shadow-gold/10 cursor-pointer"
                >
                  Procesar Reemplazo
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Impresión de Etiqueta No Fiscal */}
      {labelPrintOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-black w-full max-w-sm rounded-lg shadow-2xl flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecera del modal de etiqueta */}
            <div className="flex justify-between items-center pb-3 border-b border-dashed border-gray-300 mb-4">
              <span className="font-mono text-xs font-bold uppercase text-gray-600">Simulación Ticketera Térmica</span>
              <button 
                onClick={() => setLabelPrintOrder(null)}
                className="text-gray-400 hover:text-black font-bold text-sm cursor-pointer"
              >
                &times; Close
              </button>
            </div>
            
            {/* Cuerpo del ticket (Estilizado como papel térmico) */}
            <div className="border border-gray-200 p-4 bg-[#fcfcfc] rounded font-mono text-xs text-black shadow-inner space-y-3 leading-relaxed">
              <div className="text-center border-b border-dashed border-gray-300 pb-2 space-y-0.5">
                <h4 className="font-bold text-sm tracking-wide">*** {settings?.ticketCompanyName?.toUpperCase() || "PAN DE REY"} ***</h4>
                {settings?.ticketRut && <p className="text-[10px] text-gray-600">RUT: {settings.ticketRut}</p>}
                {settings?.ticketAddress && <p className="text-[9px] text-gray-500">{settings.ticketAddress}</p>}
                {settings?.ticketPhone && <p className="text-[9px] text-gray-500">Fono: {settings.ticketPhone}</p>}
                <p className="text-[9px] text-gray-400 mt-1">Control Interno de Cocina</p>
              </div>
              
              <div className="space-y-0.5 text-[10px] border-b border-dashed border-gray-300 pb-2">
                <p><span className="font-bold">NRO PEDIDO:</span> #{labelPrintOrder.id.substring(0, 8).toUpperCase()}</p>
                <p><span className="font-bold">FECHA:</span> {new Date(labelPrintOrder.createdAt).toLocaleDateString()} {labelPrintOrder.time}</p>
                <p><span className="font-bold">CLIENTE:</span> {labelPrintOrder.customerName}</p>
                <p><span className="font-bold">ENTREGA:</span> {labelPrintOrder.shippingMethod === 'Delivery' ? 'ENVÍO A DOMICILIO' : 'RETIRO EN MOSTRADOR'}</p>
              </div>
              
              {/* Items */}
              <div className="py-2 border-b border-dashed border-gray-300">
                <p className="font-bold mb-2 text-center text-[10px] tracking-widest">PRODUCTOS A PREPARAR</p>
                <table className="w-full text-left">
                  <thead>
                    <tr className="font-bold border-b border-gray-200 text-[9px] text-gray-700">
                      <th className="pb-1">CANT.</th>
                      <th className="pb-1">PRODUCTO / VARIANTE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labelPrintOrder.itemsRaw && labelPrintOrder.itemsRaw.length > 0 ? (
                      labelPrintOrder.itemsRaw.map((it, idx) => (
                        <tr key={idx} className="border-b border-gray-100 last:border-b-0 text-[11px]">
                          <td className="py-1.5 font-bold align-top pr-2">{it.quantity}x</td>
                          <td className="py-1.5">{it.productName} ({it.variantName})</td>
                        </tr>
                      ))
                    ) : (
                      labelPrintOrder.items.map((it, idx) => {
                        const parts = it.split('x ');
                        const qty = parts[0];
                        const name = parts[1] || it;
                        return (
                          <tr key={idx} className="border-b border-gray-100 last:border-b-0 text-[11px]">
                            <td className="py-1.5 font-bold align-top pr-2">{qty}x</td>
                            <td className="py-1.5">{name}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Código de barras simulado */}
              <div className="text-center pt-2">
                {settings?.ticketNotes && (
                  <p className="text-[9px] text-gray-600 italic mb-3 whitespace-pre-wrap">"{settings.ticketNotes}"</p>
                )}
                <p className="font-bold tracking-[0.25em] text-[10px] leading-none mb-1">|||| | | ||| || ||| | ||</p>
                <p className="text-[8px] text-gray-500">#{labelPrintOrder.id.substring(0, 10).toUpperCase()}*</p>
                <p className="text-[8px] text-red-600 font-bold uppercase mt-2 border border-red-200 px-1 py-0.5 rounded inline-block bg-red-50">
                  TICKET NO FISCAL - SOLO LOGÍSTICA
                </p>
              </div>
            </div>

            {/* Controles de impresión */}
            <div className="flex gap-3 pt-4 mt-2">
              <button 
                onClick={() => setLabelPrintOrder(null)}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 py-2.5 rounded text-xs font-bold uppercase tracking-widest transition-colors font-sans cursor-pointer"
              >
                Cerrar
              </button>
              <button 
                onClick={() => {
                  window.print();
                  setLabelPrintOrder(null);
                }}
                className="flex-1 bg-black text-white hover:bg-gray-800 py-2.5 rounded text-xs font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 font-sans cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Real
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle General de Pedido */}
      {selectedOrder && !isPinModalOpen && !isSubModalOpen && !labelPrintOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-charcoal-light w-full max-w-lg rounded-lg border border-charcoal-border shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-charcoal-border flex justify-between items-center bg-charcoal-light/25 rounded-t-lg">
              <h2 className="text-lg text-white font-serif tracking-wide">Pedido #{selectedOrder.id.substring(0, 8).toUpperCase()}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-white font-bold text-sm cursor-pointer">Cerrar</button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Cliente</p>
                  <p className="text-white font-medium text-xs mt-0.5">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Método de Envío</p>
                  <p className="text-gold font-medium text-xs mt-0.5">{selectedOrder.shippingMethod === 'Delivery' ? 'Envío a Domicilio' : 'Retiro en Tienda'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Contacto</p>
                  <p className="text-white text-xs mt-0.5">Email: {selectedOrder.email}</p>
                  <p className="text-white text-xs">Tel: {selectedOrder.phone}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Estado Actual</p>
                  <span className="inline-block bg-[#161616] text-gold border border-gold/20 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded mt-1">
                    {selectedOrder.status}
                  </span>
                </div>
              </div>
              
              {selectedOrder.deliveryPin && selectedOrder.shippingMethod === 'Delivery' && (
                <div className="bg-blue-500/5 border border-blue-500/15 p-3 rounded flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">PIN de Seguridad Delivery</p>
                    <p className="text-xs text-gray-400">Usa este PIN para confirmar la entrega del repartidor.</p>
                  </div>
                  <span className="text-xl font-mono font-bold text-white bg-blue-500/20 border border-blue-500/35 px-4 py-1 rounded tracking-[0.2em]">{selectedOrder.deliveryPin}</span>
                </div>
              )}
              
              <div className="pt-4 border-t border-charcoal-border">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Detalle de Productos</p>
                <div className="bg-[#161616] border border-white/5 rounded p-3">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-white/5">
                        <th className="pb-2">Producto</th>
                        <th className="pb-2 text-center">Cant</th>
                        <th className="pb-2 text-right">Precio</th>
                        <th className="pb-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.itemsRaw && selectedOrder.itemsRaw.length > 0 ? (
                        selectedOrder.itemsRaw.map((it, idx) => (
                          <tr key={idx} className="border-b border-white/5 last:border-b-0">
                            <td className="py-2 text-gray-300 font-medium">{it.productName} <span className="text-[10px] text-gray-500">({it.variantName})</span></td>
                            <td className="py-2 text-center text-white">{it.quantity}</td>
                            <td className="py-2 text-right text-gray-400">${formatPrice(it.price)}</td>
                            <td className="py-2 text-right text-white font-bold">${formatPrice(it.subtotal)}</td>
                          </tr>
                        ))
                      ) : (
                        selectedOrder.items.map((it, idx) => {
                          const parts = it.split('x ');
                          const qty = parts[0];
                          const name = parts[1] || it;
                          // Fallback prices for mock items
                          const price = 2500;
                          const quantity = parseInt(qty, 10) || 1;
                          return (
                            <tr key={idx} className="border-b border-white/5 last:border-b-0">
                              <td className="py-2 text-gray-300 font-medium">{name}</td>
                              <td className="py-2 text-center text-white">{quantity}</td>
                              <td className="py-2 text-right text-gray-400">${formatPrice(price)}</td>
                              <td className="py-2 text-right text-white font-bold">${formatPrice(price * quantity)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="pt-4 border-t border-charcoal-border flex justify-between items-center">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Total del Pedido</p>
                <p className="text-2xl text-gold font-serif font-bold">${formatPrice(selectedOrder.total)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
