import React from 'react';
import { Landmark, TrendingUp, Users, Store, Bike, FileText, Settings, ShieldAlert, Sparkles, RefreshCw, BarChart2 } from 'lucide-react';
import { Restaurant, Order, UKPostcodeZone } from '../../types';

interface GoZoonAdminProps {
  orders: Order[];
  restaurantsList: Restaurant[];
  drivers: { name: string; phone: string; vehicle: string }[];
  closedRestaurants: string[];
  outOfStockItems: string[];
  platformLogs: { time: string; event: string; type: 'info' | 'success' | 'warning' }[];
  onClearLogs: () => void;
  onClearAllOrders: () => void;
}

export default function GoZoonAdmin({
  orders,
  restaurantsList,
  drivers,
  closedRestaurants,
  outOfStockItems,
  platformLogs,
  onClearLogs,
  onClearAllOrders
}: GoZoonAdminProps): React.JSX.Element {
  
  // Calculate aggregate platform stats
  const totalOrdersCount = orders.length;
  const deliveredOrders = orders.filter(o => o.status === 'Delivered');
  const activeOrders = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
  
  // Gross Merchandise Value (GMV)
  const gmv = orders.reduce((sum, o) => sum + o.subtotal, 0);
  
  // Commission collected (5% of GMV)
  const platformFees = orders.reduce((sum, o) => {
    // 5% of subtotal, minimum £0.99
    const serviceFee = o.subtotal > 0 ? Math.max(0.99, Math.round(o.subtotal * 0.05 * 100) / 100) : 0;
    return sum + serviceFee;
  }, 0);

  // Average Order Value
  const aov = totalOrdersCount > 0 ? (gmv / totalOrdersCount) : 0;

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

      {/* 2. Platform KPIs Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-slate-900/50 border border-slate-850 p-4 rounded-xl space-y-2 relative overflow-hidden shadow-xs">
          <TrendingUp className="w-8 h-8 text-emerald-500/10 absolute right-4 bottom-4" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gross merchandise value (GMV)</span>
          <div className="text-2xl font-black text-slate-100 font-display">£{gmv.toFixed(2)}</div>
          <p className="text-[9px] text-slate-400 font-semibold">Aggregate cart values processed</p>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-900/50 border border-slate-850 p-4 rounded-xl space-y-2 relative overflow-hidden shadow-xs">
          <Landmark className="w-8 h-8 text-brand-orange/10 absolute right-4 bottom-4" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Commission Revenue (5%)</span>
          <div className="text-2xl font-black text-brand-orange font-display">£{platformFees.toFixed(2)}</div>
          <p className="text-[9px] text-slate-400 font-semibold">Service fees escrowed on Stripe</p>
        </div>

        {/* KPI 3 */}
        <div className="bg-slate-900/50 border border-slate-850 p-4 rounded-xl space-y-2 relative overflow-hidden shadow-xs">
          <FileText className="w-8 h-8 text-brand-blue/10 absolute right-4 bottom-4" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Average Order Value (AOV)</span>
          <div className="text-2xl font-black text-brand-blue font-display">£{aov.toFixed(2)}</div>
          <p className="text-[9px] text-slate-400 font-semibold">Mean ticket price across system</p>
        </div>

        {/* KPI 4 */}
        <div className="bg-slate-900/50 border border-slate-850 p-4 rounded-xl space-y-2 relative overflow-hidden shadow-xs">
          <Users className="w-8 h-8 text-indigo-500/10 absolute right-4 bottom-4" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Orders Placed</span>
          <div className="text-2xl font-black text-indigo-400 font-display">{totalOrdersCount}</div>
          <p className="text-[9px] text-slate-400 font-semibold">{activeOrders.length} currently active in preparation</p>
        </div>
      </div>

      {/* 3. Directories & Live Logs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Merchant & Driver Fleet */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Merchant Directory Card */}
          <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
                <Store className="w-4 h-4 text-brand-orange" />
                <span>Onboarded Restaurant Directory ({restaurantsList.length})</span>
              </h3>
              <span className="text-[9px] font-mono text-slate-400 font-semibold">London SW1/NW1/EC1</span>
            </div>

            <div className="overflow-x-auto max-h-56 overflow-y-auto no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                    <th className="pb-2">Merchant Name</th>
                    <th className="pb-2">Cuisine</th>
                    <th className="pb-2">Zone</th>
                    <th className="pb-2 text-right">Rating</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/50">
                  {restaurantsList.map(rest => {
                    const isClosed = closedRestaurants.includes(rest.id);
                    return (
                      <tr key={rest.id} className="hover:bg-slate-850/35 transition-colors font-semibold">
                        <td className="py-2.5 text-slate-200">{rest.name}</td>
                        <td className="py-2.5 text-slate-400">{rest.cuisine}</td>
                        <td className="py-2.5 text-slate-400 font-mono text-[10px]">{rest.postcode}</td>
                        <td className="py-2.5 text-right text-amber-400 font-bold">★ {rest.rating.toFixed(1)}</td>
                        <td className="py-2.5 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                            isClosed ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400 animate-pulse'
                          }`}>
                            {isClosed ? 'CLOSED' : 'OPEN'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Courier Fleet Directory Card */}
          <div className="bg-slate-900/50 border border-slate-850 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
                <Bike className="w-4 h-4 text-brand-orange" />
                <span>Rider Dispatch Fleet ({drivers.length})</span>
              </h3>
              <span className="text-[9px] font-mono text-slate-400 font-semibold">GPS Active Units</span>
            </div>

            <div className="overflow-x-auto max-h-56 overflow-y-auto no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                    <th className="pb-2">Rider Name</th>
                    <th className="pb-2">Contact Info</th>
                    <th className="pb-2">Vehicle Type</th>
                    <th className="pb-2 text-right">Job Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/50">
                  {drivers.map((driver, idx) => {
                    // Check if driver has active order assigned
                    const activeJob = orders.find(o => o.driverName === driver.name && o.status !== 'Delivered' && o.status !== 'Cancelled');
                    return (
                      <tr key={idx} className="hover:bg-slate-850/35 transition-colors font-semibold">
                        <td className="py-2.5 text-slate-200">{driver.name}</td>
                        <td className="py-2.5 text-slate-400 font-mono">{driver.phone}</td>
                        <td className="py-2.5 text-slate-400">{driver.vehicle}</td>
                        <td className="py-2.5 text-right">
                          {activeJob ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-brand-orange/20 text-brand-orange border border-brand-orange/10 animate-pulse">
                              DELIVERING #{activeJob.id}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-800 text-slate-400">
                              IDLE (STANDBY)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column: Platform Real-time Terminals */}
        <div className="lg:col-span-5 space-y-6 flex flex-col h-full min-h-[450px]">
          
          {/* Live Node Stream Console Terminal */}
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

            {/* Simulated Live Event Stream */}
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
  );
}
