import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark, TrendingUp, Users, Store, Bike, FileText, RefreshCw,
  CheckCircle2, XCircle, ShieldCheck, ShieldOff, Pencil, Tag, Percent,
  Search, Download, PauseCircle, PlayCircle, AlertTriangle, X, Save, Ban
} from 'lucide-react';
import { Restaurant, Order, Driver, PromoCode } from '../../types';
import { getStoreClosureReason } from '../../data/restaurants';
import { fetchApi } from '../../api';

interface GoZoonAdminProps {
  orders: Order[];
  restaurantsList: Restaurant[];
  drivers: Driver[];
  closedRestaurants: string[];
  outOfStockItems: string[];
  platformLogs: { time: string; event: string; type: 'info' | 'success' | 'warning' }[];
  onClearLogs: () => void;
  onClearAllOrders: () => void;
  onSetRestaurantApproval: (id: string, approvalStatus: 'pending' | 'approved' | 'rejected') => void;
  onSetRestaurantVerified: (id: string, verified: boolean) => void;
  onSetRestaurantAdminStatus: (id: string, adminStatus: 'active' | 'suspended' | 'deactivated') => void;
  onEditRestaurant: (id: string, updates: Partial<Restaurant>) => void;
  onSetDriverApproval: (phone: string, approvalStatus: 'pending' | 'approved' | 'rejected') => void;
  onSetDriverSuspended: (phone: string, adminSuspended: boolean) => void;
  onCancelOrder: (orderId: string) => void;
}

type AdminTab = 'dashboard' | 'restaurants' | 'riders' | 'promotions' | 'orders' | 'finance';

interface FinanceSummary {
  gmv: number;
  commission: number;
  aov: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalOrders: number;
  byDay: { date: string; gmv: number; commission: number; orders: number }[];
}

const ACTIVE_ORDER_STATUSES: Order['status'][] = ['Placed', 'Preparing', 'ReadyForPickup', 'DriverArrived', 'PickedUp', 'OutForDelivery'];

export default function GoZoonAdmin({
  orders,
  restaurantsList,
  drivers,
  closedRestaurants,
  outOfStockItems,
  platformLogs,
  onClearLogs,
  onClearAllOrders,
  onSetRestaurantApproval,
  onSetRestaurantVerified,
  onSetRestaurantAdminStatus,
  onEditRestaurant,
  onSetDriverApproval,
  onSetDriverSuspended,
  onCancelOrder
}: GoZoonAdminProps): React.JSX.Element {

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Real, backend-computed finance figures (GMV/commission summed from each order's
  // own persisted subtotal/service_fee) instead of re-derived client-side from raw
  // order data - self-fetched here the same way GoZoonBusiness fetches its own
  // rating-summary, so App.tsx doesn't need to carry admin-only state.
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null);
  useEffect(() => {
    const fetchFinance = () => {
      fetchApi('/api/admin/finance-summary')
        .then(res => res.json())
        .then(data => setFinanceSummary(data))
        .catch(err => console.error('[Admin] Failed to fetch finance summary:', err));
    };
    fetchFinance();
    const interval = setInterval(fetchFinance, 10000);
    return () => clearInterval(interval);
  }, [orders.length]);

  // Promo codes (Coupons) - the promo_codes table/checkout validation already
  // existed, this is the first UI that lets anyone manage codes instead of only
  // ever seeding one.
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('10');
  const refreshPromoCodes = () => {
    fetchApi('/api/promo-codes')
      .then(res => res.json())
      .then(data => setPromoCodes(data.promoCodes || []))
      .catch(err => console.error('[Admin] Failed to fetch promo codes:', err));
  };
  useEffect(() => { refreshPromoCodes(); }, []);

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = newCouponCode.trim().toUpperCase();
    const discountPercent = Number(newCouponDiscount);
    if (!code || !Number.isFinite(discountPercent) || discountPercent <= 0) return;
    setPromoCodes(prev => [{ code, discountPercent, active: true }, ...prev.filter(p => p.code !== code)]);
    fetchApi('/api/promo-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, discountPercent })
    }).then(refreshPromoCodes).catch(err => console.error('[Admin] Failed to create promo code:', err));
    setNewCouponCode('');
    setNewCouponDiscount('10');
  };

  const handleTogglePromoActive = (code: string, active: boolean) => {
    setPromoCodes(prev => prev.map(p => p.code === code ? { ...p, active } : p));
    fetchApi(`/api/promo-codes/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active })
    }).catch(err => console.error('[Admin] Failed to toggle promo code:', err));
  };

  const handleDeletePromo = (code: string) => {
    setPromoCodes(prev => prev.filter(p => p.code !== code));
    fetchApi(`/api/promo-codes/${code}`, { method: 'DELETE' })
      .catch(err => console.error('[Admin] Failed to delete promo code:', err));
  };

  // Restaurant Management: inline edit form state
  const [editingRestaurantId, setEditingRestaurantId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; cuisine: string; deliveryFee: string; minOrder: string; postcode: string }>({
    name: '', cuisine: '', deliveryFee: '', minOrder: '', postcode: ''
  });
  const startEditingRestaurant = (rest: Restaurant) => {
    setEditingRestaurantId(rest.id);
    setEditForm({
      name: rest.name,
      cuisine: rest.cuisine,
      deliveryFee: String(rest.deliveryFee),
      minOrder: String(rest.minOrder),
      postcode: rest.postcode
    });
  };
  const saveEditingRestaurant = () => {
    if (!editingRestaurantId) return;
    onEditRestaurant(editingRestaurantId, {
      name: editForm.name.trim(),
      cuisine: editForm.cuisine.trim(),
      deliveryFee: Number(editForm.deliveryFee) || 0,
      minOrder: Number(editForm.minOrder) || 0,
      postcode: editForm.postcode.trim()
    });
    setEditingRestaurantId(null);
  };

  // Promotions: per-restaurant discount offer text drafts (saved on blur/button click)
  const [offerDrafts, setOfferDrafts] = useState<Record<string, string>>({});
  const getOfferDraft = (rest: Restaurant) => offerDrafts[rest.id] !== undefined ? offerDrafts[rest.id] : (rest.discountOffer || '');
  const saveOfferDraft = (rest: Restaurant) => {
    const discountOffer = (offerDrafts[rest.id] ?? rest.discountOffer ?? '').trim();
    onEditRestaurant(rest.id, { discountOffer: discountOffer || undefined });
  };

  // Order Management: search across id, restaurant, postcode, and driver name
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const filteredOrders = useMemo(() => {
    const q = orderSearchQuery.trim().toLowerCase();
    const sorted = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (!q) return sorted.slice(0, 50);
    return sorted.filter(o =>
      o.id.toLowerCase().includes(q) ||
      o.restaurantName.toLowerCase().includes(q) ||
      o.deliveryPostcode.toLowerCase().includes(q) ||
      (o.driverName || '').toLowerCase().includes(q)
    ).slice(0, 50);
  }, [orders, orderSearchQuery]);

  // Calculate aggregate platform stats
  const totalOrdersCount = orders.length;
  const activeOrders = orders.filter(o => ACTIVE_ORDER_STATUSES.includes(o.status));
  const cancelledOrders = orders.filter(o => o.status === 'Cancelled');

  const gmv = financeSummary?.gmv ?? 0;
  const platformFees = financeSummary?.commission ?? 0;
  const aov = financeSummary?.aov ?? 0;

  // Active Drivers aggregate KPI
  const onlineDrivers = drivers.filter(d => d.isOnDuty !== false && !d.adminSuspended);
  const deliveringDrivers = drivers.filter(d => orders.some(o => o.driverName === d.name && ACTIVE_ORDER_STATUSES.includes(o.status)));
  const idleOnlineDrivers = onlineDrivers.filter(d => !deliveringDrivers.includes(d));

  // Open Restaurants aggregate KPI (accounts for manual toggle + holiday + pause)
  const nowForClosure = new Date();
  const openRestaurants = restaurantsList.filter(r => !closedRestaurants.includes(r.id) && !getStoreClosureReason(r, nowForClosure));

  const handleExportCsv = () => {
    if (!financeSummary?.byDay.length) return;
    const header = 'Date,GMV,Commission,Orders\n';
    const rows = financeSummary.byDay.map(d => `${d.date},${d.gmv.toFixed(2)},${d.commission.toFixed(2)},${d.orders}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `go-zoon-commission-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full bg-slate-950 text-slate-100 flex flex-col overflow-y-auto font-sans p-6 space-y-6" id="admin-app-view">

      {/* 1. Dashboard Banner */}
      <div className="bg-linear-to-r from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-brand-orange text-white text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase">
              PLATFORM CONSOLE
            </span>
            <span className="text-slate-500 text-xs font-mono">NODE v1.0.4-PROD</span>
          </div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2 font-display">
            <Landmark className="w-6 h-6 text-brand-orange" />
            <span>Go-Zoon UK Command Center</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Overarching monitoring dashboard. This web application coordinates food logistics, restaurant onboarding directories, courier dispatcher logs, and Stripe gateway transactions.
          </p>
        </div>

        {/* Database Clear Actions */}
        <div className="flex flex-wrap gap-2">
          {orders.length > 0 && (
            <button
              onClick={onClearAllOrders}
              className="px-3 py-2 bg-red-950/45 hover:bg-red-900/30 text-red-400 border border-red-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Flush All Orders
            </button>
          )}
          <button
            onClick={onClearLogs}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Clear Terminal Logs
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900/60 border border-slate-850 rounded-xl p-1 flex-wrap gap-1">
        {([
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'restaurants', label: `Restaurants (${restaurantsList.length})` },
          { id: 'riders', label: `Riders (${drivers.length})` },
          { id: 'promotions', label: 'Promotions' },
          { id: 'orders', label: `Orders (${orders.length})` },
          { id: 'finance', label: 'Finance' }
        ] as { id: AdminTab; label: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 text-[11px] font-black tracking-wide rounded-lg transition-all cursor-pointer ${
              activeTab === tab.id ? 'bg-brand-orange text-white shadow-xs' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-850'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===================== DASHBOARD TAB ===================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">

          {/* Platform KPIs Row 1 - Finance */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 border border-slate-850 p-4 rounded-xl space-y-2 relative overflow-hidden shadow-xs">
              <TrendingUp className="w-8 h-8 text-emerald-500/10 absolute right-4 bottom-4" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gross merchandise value (GMV)</span>
              <div className="text-2xl font-black text-slate-100 font-display">£{gmv.toFixed(2)}</div>
              <p className="text-[9px] text-slate-400 font-semibold">Real total from delivered orders</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-850 p-4 rounded-xl space-y-2 relative overflow-hidden shadow-xs">
              <Landmark className="w-8 h-8 text-brand-orange/10 absolute right-4 bottom-4" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Commission Revenue</span>
              <div className="text-2xl font-black text-brand-orange font-display">£{platformFees.toFixed(2)}</div>
              <p className="text-[9px] text-slate-400 font-semibold">Actual service fees charged at checkout</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-850 p-4 rounded-xl space-y-2 relative overflow-hidden shadow-xs">
              <FileText className="w-8 h-8 text-brand-blue/10 absolute right-4 bottom-4" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Average Order Value (AOV)</span>
              <div className="text-2xl font-black text-brand-blue font-display">£{aov.toFixed(2)}</div>
              <p className="text-[9px] text-slate-400 font-semibold">Mean ticket price, delivered orders only</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-850 p-4 rounded-xl space-y-2 relative overflow-hidden shadow-xs">
              <Users className="w-8 h-8 text-indigo-500/10 absolute right-4 bottom-4" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Orders Placed</span>
              <div className="text-2xl font-black text-indigo-400 font-display">{totalOrdersCount}</div>
              <p className="text-[9px] text-slate-400 font-semibold">{activeOrders.length} currently active in preparation</p>
            </div>
          </div>

          {/* Platform KPIs Row 2 - Ops aggregates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 border border-slate-850 p-4 rounded-xl space-y-2 shadow-xs">
              <div className="flex items-center gap-1.5">
                <Bike className="w-4 h-4 text-brand-orange" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Drivers</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-xl font-black text-emerald-400">{onlineDrivers.length}</span>
                <span className="text-[9px] text-slate-500 font-semibold">online</span>
              </div>
              <p className="text-[9px] text-slate-400 font-semibold">{deliveringDrivers.length} delivering · {idleOnlineDrivers.length} idle · {drivers.length - onlineDrivers.length} offline</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-850 p-4 rounded-xl space-y-2 shadow-xs">
              <div className="flex items-center gap-1.5">
                <Store className="w-4 h-4 text-brand-orange" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Open Restaurants</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-xl font-black text-emerald-400">{openRestaurants.length}</span>
                <span className="text-[9px] text-slate-500 font-semibold">open</span>
              </div>
              <p className="text-[9px] text-slate-400 font-semibold">{restaurantsList.length - openRestaurants.length} closed of {restaurantsList.length} total</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-850 p-4 rounded-xl space-y-2 shadow-xs">
              <div className="flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-red-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cancelled Orders</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-xl font-black text-red-400">{cancelledOrders.length}</span>
                <span className="text-[9px] text-slate-500 font-semibold">of {totalOrdersCount}</span>
              </div>
              <p className="text-[9px] text-slate-400 font-semibold">See Orders tab for full detail</p>
            </div>
          </div>

          {/* Live Orders + Cancelled Orders + Directories */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-6">

              {/* Live Orders individual list */}
              <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-5 space-y-4">
                <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-800 pb-3">
                  <RefreshCw className="w-4 h-4 text-brand-orange" />
                  <span>Live Orders ({activeOrders.length})</span>
                </h3>
                <div className="overflow-x-auto max-h-56 overflow-y-auto no-scrollbar">
                  {activeOrders.length === 0 ? (
                    <p className="text-[10px] text-slate-500 py-4 text-center">No active orders right now.</p>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                          <th className="pb-2">Order</th>
                          <th className="pb-2">Restaurant</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2 text-right">Rider</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/50">
                        {activeOrders.map(o => (
                          <tr key={o.id} className="hover:bg-slate-850/35 transition-colors font-semibold">
                            <td className="py-2.5 text-slate-200 font-mono text-[10px]">#{o.id}</td>
                            <td className="py-2.5 text-slate-300">{o.restaurantName}</td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-orange-500/20 text-orange-400">{o.status}</span>
                            </td>
                            <td className="py-2.5 text-right text-slate-400">{o.driverName || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Cancelled Orders list */}
              <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-5 space-y-4">
                <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-800 pb-3">
                  <Ban className="w-4 h-4 text-red-500" />
                  <span>Cancelled Orders ({cancelledOrders.length})</span>
                </h3>
                <div className="overflow-x-auto max-h-56 overflow-y-auto no-scrollbar">
                  {cancelledOrders.length === 0 ? (
                    <p className="text-[10px] text-slate-500 py-4 text-center">No cancelled orders yet.</p>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                          <th className="pb-2">Order</th>
                          <th className="pb-2">Restaurant</th>
                          <th className="pb-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/50">
                        {cancelledOrders.slice(0, 20).map(o => (
                          <tr key={o.id} className="hover:bg-slate-850/35 transition-colors font-semibold">
                            <td className="py-2.5 text-slate-200 font-mono text-[10px]">#{o.id}</td>
                            <td className="py-2.5 text-slate-300">{o.restaurantName}</td>
                            <td className="py-2.5 text-red-400/80 italic text-[10px]">{o.cancelReason || 'No reason given'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Platform Real-time Terminal */}
            <div className="lg:col-span-5 space-y-6 flex flex-col h-full min-h-[450px]">
              <div className="bg-slate-900/80 border border-slate-850 rounded-xl p-5 flex flex-col flex-1 h-full shadow-2xl relative">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 block"></span>
                    </div>
                    <span className="font-extrabold text-xs text-slate-200 uppercase tracking-wider pl-1 font-mono">Platform Syslog Terminal</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                </div>

                <div className="flex-1 bg-black/90 p-4 rounded-lg font-mono text-[10px] space-y-2 mt-4 overflow-y-auto max-h-[450px] border border-slate-900 no-scrollbar">
                  {platformLogs.length === 0 ? (
                    <div className="text-slate-600 italic">
                      [SYSTEM_IDLE] Listening for UK order dispatches, restaurant toggles, and secure Stripe webhook requests...
                    </div>
                  ) : (
                    platformLogs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed flex gap-1.5">
                        <span className="text-slate-500 font-bold flex-shrink-0">[{log.time}]</span>
                        <span className={
                          log.type === 'success' ? 'text-emerald-400 font-medium' :
                          log.type === 'warning' ? 'text-amber-500 font-bold' : 'text-cyan-400 font-medium'
                        }>
                          {log.event}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 text-[9px] text-slate-500 text-center font-semibold font-mono">
                  Stdout logs synchronize live across customer, business and courier apps.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== RESTAURANT MANAGEMENT TAB ===================== */}
      {activeTab === 'restaurants' && (
        <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-5 space-y-4">
          <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-800 pb-3">
            <Store className="w-4 h-4 text-brand-orange" />
            <span>Restaurant Management ({restaurantsList.length})</span>
          </h3>
          <div className="space-y-3">
            {restaurantsList.map(rest => {
              const approvalStatus = rest.approvalStatus || 'approved';
              const adminStatus = rest.adminStatus || 'active';
              const isEditing = editingRestaurantId === rest.id;
              return (
                <div key={rest.id} className="bg-slate-950/50 border border-slate-850 rounded-lg p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-extrabold text-sm text-slate-100">{rest.name}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{rest.cuisine} · {rest.postcode} · £{rest.deliveryFee.toFixed(2)} delivery · £{rest.minOrder.toFixed(2)} min</div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                        approvalStatus === 'approved' ? 'bg-emerald-950 text-emerald-400' :
                        approvalStatus === 'rejected' ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'
                      }`}>{approvalStatus.toUpperCase()}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${rest.verified ? 'bg-brand-blue/20 text-brand-blue' : 'bg-slate-800 text-slate-500'}`}>
                        {rest.verified ? 'VERIFIED' : 'UNVERIFIED'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                        adminStatus === 'active' ? 'bg-emerald-950 text-emerald-400' :
                        adminStatus === 'suspended' ? 'bg-amber-950 text-amber-400' : 'bg-red-950 text-red-400'
                      }`}>{adminStatus.toUpperCase()}</span>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-900 border border-slate-800 rounded-lg p-3">
                      <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Name" className="col-span-2 h-8 px-2 bg-slate-950 border border-slate-800 rounded-md text-xs" />
                      <input value={editForm.cuisine} onChange={e => setEditForm({ ...editForm, cuisine: e.target.value })} placeholder="Cuisine" className="h-8 px-2 bg-slate-950 border border-slate-800 rounded-md text-xs" />
                      <input value={editForm.postcode} onChange={e => setEditForm({ ...editForm, postcode: e.target.value })} placeholder="Postcode" className="h-8 px-2 bg-slate-950 border border-slate-800 rounded-md text-xs" />
                      <input value={editForm.deliveryFee} onChange={e => setEditForm({ ...editForm, deliveryFee: e.target.value })} type="number" step="0.01" placeholder="Delivery £" className="h-8 px-2 bg-slate-950 border border-slate-800 rounded-md text-xs" />
                      <input value={editForm.minOrder} onChange={e => setEditForm({ ...editForm, minOrder: e.target.value })} type="number" step="0.01" placeholder="Min Order £" className="h-8 px-2 bg-slate-950 border border-slate-800 rounded-md text-xs" />
                      <div className="col-span-2 sm:col-span-5 flex gap-2 justify-end">
                        <button onClick={() => setEditingRestaurantId(null)} className="px-3 h-8 border border-slate-700 text-slate-400 rounded-md text-xs font-bold cursor-pointer">Cancel</button>
                        <button onClick={saveEditingRestaurant} className="px-3 h-8 bg-brand-orange text-white rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer"><Save className="w-3.5 h-3.5" />Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {approvalStatus === 'pending' && (
                        <>
                          <button onClick={() => onSetRestaurantApproval(rest.id, 'approved')} className="px-2.5 h-7 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"><CheckCircle2 className="w-3 h-3" />Approve</button>
                          <button onClick={() => onSetRestaurantApproval(rest.id, 'rejected')} className="px-2.5 h-7 bg-red-950 hover:bg-red-900 text-red-400 border border-red-800 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"><XCircle className="w-3 h-3" />Reject</button>
                        </>
                      )}
                      {approvalStatus === 'rejected' && (
                        <button onClick={() => onSetRestaurantApproval(rest.id, 'approved')} className="px-2.5 h-7 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"><CheckCircle2 className="w-3 h-3" />Approve</button>
                      )}
                      <button onClick={() => onSetRestaurantVerified(rest.id, !rest.verified)} className="px-2.5 h-7 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer">
                        {rest.verified ? <ShieldOff className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                        {rest.verified ? 'Unverify' : 'Verify'}
                      </button>
                      {adminStatus !== 'suspended' && (
                        <button onClick={() => onSetRestaurantAdminStatus(rest.id, 'suspended')} className="px-2.5 h-7 bg-amber-950 hover:bg-amber-900 text-amber-400 border border-amber-800 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"><PauseCircle className="w-3 h-3" />Suspend</button>
                      )}
                      {adminStatus === 'suspended' && (
                        <button onClick={() => onSetRestaurantAdminStatus(rest.id, 'active')} className="px-2.5 h-7 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"><PlayCircle className="w-3 h-3" />Reactivate</button>
                      )}
                      {adminStatus !== 'deactivated' ? (
                        <button onClick={() => onSetRestaurantAdminStatus(rest.id, 'deactivated')} className="px-2.5 h-7 bg-red-950 hover:bg-red-900 text-red-400 border border-red-800 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"><Ban className="w-3 h-3" />Deactivate</button>
                      ) : (
                        <button onClick={() => onSetRestaurantAdminStatus(rest.id, 'active')} className="px-2.5 h-7 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"><PlayCircle className="w-3 h-3" />Reactivate</button>
                      )}
                      <button onClick={() => startEditingRestaurant(rest)} className="px-2.5 h-7 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer ml-auto"><Pencil className="w-3 h-3" />Edit</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== DELIVERY PARTNER MANAGEMENT TAB ===================== */}
      {activeTab === 'riders' && (
        <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-5 space-y-4">
          <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-800 pb-3">
            <Bike className="w-4 h-4 text-brand-orange" />
            <span>Delivery Partner Management ({drivers.length})</span>
          </h3>
          <div className="space-y-3">
            {drivers.map(driver => {
              const approvalStatus = driver.approvalStatus || 'approved';
              return (
                <div key={driver.phone} className="bg-slate-950/50 border border-slate-850 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-extrabold text-sm text-slate-100">{driver.name}</div>
                    <div className="text-[10px] text-slate-500 font-semibold font-mono">{driver.phone} · {driver.vehicle}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                      approvalStatus === 'approved' ? 'bg-emerald-950 text-emerald-400' :
                      approvalStatus === 'rejected' ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'
                    }`}>{approvalStatus.toUpperCase()}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${driver.adminSuspended ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'}`}>
                      {driver.adminSuspended ? 'SUSPENDED' : 'ACTIVE'}
                    </span>
                    {approvalStatus === 'pending' && (
                      <>
                        <button onClick={() => onSetDriverApproval(driver.phone, 'approved')} className="px-2.5 h-7 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"><CheckCircle2 className="w-3 h-3" />Approve</button>
                        <button onClick={() => onSetDriverApproval(driver.phone, 'rejected')} className="px-2.5 h-7 bg-red-950 hover:bg-red-900 text-red-400 border border-red-800 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"><XCircle className="w-3 h-3" />Reject</button>
                      </>
                    )}
                    {approvalStatus === 'rejected' && (
                      <button onClick={() => onSetDriverApproval(driver.phone, 'approved')} className="px-2.5 h-7 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"><CheckCircle2 className="w-3 h-3" />Approve</button>
                    )}
                    {driver.adminSuspended ? (
                      <button onClick={() => onSetDriverSuspended(driver.phone, false)} className="px-2.5 h-7 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"><PlayCircle className="w-3 h-3" />Reinstate</button>
                    ) : (
                      <button onClick={() => onSetDriverSuspended(driver.phone, true)} className="px-2.5 h-7 bg-amber-950 hover:bg-amber-900 text-amber-400 border border-amber-800 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"><PauseCircle className="w-3 h-3" />Suspend</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== PROMOTIONS TAB ===================== */}
      {activeTab === 'promotions' && (
        <div className="space-y-6">

          {/* Coupons */}
          <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-5 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-800 pb-3">
              <Tag className="w-4 h-4 text-brand-orange" />
              <span>Coupons ({promoCodes.length})</span>
            </h3>

            <form onSubmit={handleCreateCoupon} className="flex flex-wrap gap-2 items-end bg-slate-950/50 border border-slate-850 rounded-lg p-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Code</label>
                <input value={newCouponCode} onChange={e => setNewCouponCode(e.target.value.toUpperCase())} placeholder="e.g. SUMMER15" className="h-8 px-2 w-40 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Discount %</label>
                <input value={newCouponDiscount} onChange={e => setNewCouponDiscount(e.target.value)} type="number" min="1" max="100" className="h-8 px-2 w-24 bg-slate-950 border border-slate-800 rounded-md text-xs" />
              </div>
              <button type="submit" className="h-8 px-3 bg-brand-orange text-white rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer"><Percent className="w-3.5 h-3.5" />Add Coupon</button>
            </form>

            <div className="space-y-2">
              {promoCodes.length === 0 ? (
                <p className="text-[10px] text-slate-500 py-2 text-center">No promo codes yet.</p>
              ) : (
                promoCodes.map(promo => (
                  <div key={promo.code} className="flex items-center justify-between bg-slate-950/50 border border-slate-850 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-sm text-slate-100">{promo.code}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{promo.discountPercent}% off</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${promo.active ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                        {promo.active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => handleTogglePromoActive(promo.code, !promo.active)} className="px-2.5 h-7 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-md text-[10px] font-bold cursor-pointer">
                        {promo.active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => handleDeletePromo(promo.code)} className="px-2.5 h-7 bg-red-950 hover:bg-red-900 text-red-400 border border-red-800 rounded-md text-[10px] font-bold cursor-pointer">
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Restaurant Offers + Free Delivery */}
          <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-5 space-y-4">
            <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-800 pb-3">
              <Store className="w-4 h-4 text-brand-orange" />
              <span>Restaurant Offers</span>
            </h3>
            <div className="space-y-2">
              {restaurantsList.map(rest => (
                <div key={rest.id} className="bg-slate-950/50 border border-slate-850 rounded-lg p-3 flex flex-wrap items-center gap-2">
                  <span className="font-bold text-xs text-slate-200 w-40 flex-shrink-0 truncate">{rest.name}</span>
                  <input
                    value={getOfferDraft(rest)}
                    onChange={e => setOfferDrafts({ ...offerDrafts, [rest.id]: e.target.value })}
                    onBlur={() => saveOfferDraft(rest)}
                    placeholder="e.g. Spend £15, get £3 off"
                    className="flex-1 min-w-[180px] h-8 px-2 bg-slate-950 border border-slate-800 rounded-md text-xs"
                  />
                  <button
                    onClick={() => onEditRestaurant(rest.id, { offersFreeDelivery: !rest.offersFreeDelivery })}
                    className={`px-2.5 h-8 rounded-md text-[10px] font-bold border cursor-pointer flex-shrink-0 ${
                      rest.offersFreeDelivery ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {rest.offersFreeDelivery ? 'Free Delivery: ON' : 'Free Delivery: OFF'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== ORDER MANAGEMENT TAB ===================== */}
      {activeTab === 'orders' && (
        <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-5 space-y-4">
          <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-800 pb-3">
            <FileText className="w-4 h-4 text-brand-orange" />
            <span>Order Management</span>
          </h3>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={orderSearchQuery}
              onChange={e => setOrderSearchQuery(e.target.value)}
              placeholder="Search by order ID, restaurant, postcode, or rider..."
              className="w-full h-9 pl-9 pr-3 bg-slate-950 border border-slate-800 rounded-lg text-xs"
            />
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto no-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase text-[9px] tracking-wider sticky top-0 bg-slate-900">
                  <th className="pb-2">Order</th>
                  <th className="pb-2">Restaurant</th>
                  <th className="pb-2">Postcode</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Total</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50">
                {filteredOrders.length === 0 ? (
                  <tr><td colSpan={6} className="py-6 text-center text-slate-500 text-[10px]">No orders match your search.</td></tr>
                ) : (
                  filteredOrders.map(o => {
                    const isTerminal = o.status === 'Delivered' || o.status === 'Cancelled';
                    return (
                      <tr key={o.id} className="hover:bg-slate-850/35 transition-colors font-semibold">
                        <td className="py-2.5 text-slate-200 font-mono text-[10px]">#{o.id}</td>
                        <td className="py-2.5 text-slate-300">{o.restaurantName}</td>
                        <td className="py-2.5 text-slate-400 font-mono text-[10px]">{o.deliveryPostcode}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                            o.status === 'Delivered' ? 'bg-emerald-950 text-emerald-400' :
                            o.status === 'Cancelled' ? 'bg-red-950 text-red-400' : 'bg-orange-500/20 text-orange-400'
                          }`}>{o.status}</span>
                        </td>
                        <td className="py-2.5 text-slate-300">£{o.total.toFixed(2)}</td>
                        <td className="py-2.5 text-right">
                          {!isTerminal && (
                            <button onClick={() => onCancelOrder(o.id)} className="px-2.5 h-7 bg-red-950 hover:bg-red-900 text-red-400 border border-red-800 rounded-md text-[10px] font-bold cursor-pointer">
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== FINANCE TAB (COMMISSION REPORTS) ===================== */}
      {activeTab === 'finance' && (
        <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
              <Landmark className="w-4 h-4 text-brand-orange" />
              <span>Commission Reports (Last 14 Days)</span>
            </h3>
            <button
              onClick={handleExportCsv}
              disabled={!financeSummary?.byDay.length}
              className="px-3 h-8 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 border border-slate-700 rounded-md text-[10px] font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />Export CSV
            </button>
          </div>

          {!financeSummary || financeSummary.byDay.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-slate-600" />
              <span>No delivered orders in the last 14 days to report on.</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                  <th className="pb-2">Date</th>
                  <th className="pb-2 text-right">Orders</th>
                  <th className="pb-2 text-right">GMV</th>
                  <th className="pb-2 text-right">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50">
                {financeSummary.byDay.map(d => (
                  <tr key={d.date} className="hover:bg-slate-850/35 transition-colors font-semibold">
                    <td className="py-2.5 text-slate-200">{d.date}</td>
                    <td className="py-2.5 text-right text-slate-400">{d.orders}</td>
                    <td className="py-2.5 text-right text-slate-300">£{d.gmv.toFixed(2)}</td>
                    <td className="py-2.5 text-right text-brand-orange font-bold">£{d.commission.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

    </div>
  );
}
