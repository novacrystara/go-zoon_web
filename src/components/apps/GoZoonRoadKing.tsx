import React, { useState, useEffect } from 'react';
import { Bike, Check, Play, AlertCircle, MapPin, Map, Navigation, DollarSign, Plus, Phone, Compass, ArrowRight, Eye, RefreshCw } from 'lucide-react';
import { Order, OrderStatus } from '../../types';

interface GoZoonRoadKingProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  drivers: { name: string; phone: string; vehicle: string }[];
  onOnboardDriver: (driver: { name: string; phone: string; vehicle: string }) => void;
  onAddLog: (event: string, type: 'info' | 'success' | 'warning') => void;
}

export default function GoZoonRoadKing({
  orders,
  onUpdateOrderStatus,
  drivers,
  onOnboardDriver,
  onAddLog
}: GoZoonRoadKingProps): React.JSX.Element {
  const [selectedDriverName, setSelectedDriverName] = useState<string>(drivers[0]?.name || 'Dave Henderson');
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'onboard' | 'wallet'>('jobs');

  // Wallet and cash-out state
  const [walletBalance, setWalletBalance] = useState(38.60);
  const [cashoutSuccess, setCashoutSuccess] = useState(false);

  // Rider onboarding state
  const [newRiderName, setNewRiderName] = useState('');
  const [newRiderPhone, setNewRiderPhone] = useState('');
  const [newRiderVehicle, setNewRiderVehicle] = useState('Electric Scooter');
  const [onboardSuccess, setOnboardSuccess] = useState(false);

  // Auto travel animation state for active delivery job
  const [isSimulatingDrive, setIsSimulatingDrive] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);

  const selectedDriver = drivers.find(d => d.name === selectedDriverName) || drivers[0];

  // Retrieve active job for this rider
  // An active job is one that is preparing or outfordelivery and assigned to this driver
  const activeJob = orders.find(o => 
    o.driverName === selectedDriver?.name && 
    (o.status === 'Preparing' || o.status === 'OutForDelivery' || o.status === 'Placed')
  );

  // Available jobs (orders that are Placed or Preparing, but have no assigned driver or are open)
  const openGigs = orders.filter(o => 
    (!o.driverName || o.driverName === '') && 
    (o.status === 'Placed' || o.status === 'Preparing')
  );

  // Filter completed jobs for this driver
  const driverJobHistory = orders.filter(o => o.driverName === selectedDriver?.name && o.status === 'Delivered');

  // Sync wallet balance based on completed deliveries
  useEffect(() => {
    // Each delivery is £4.85 base + £2.50 tip = £7.35
    const computedEarnings = 38.60 + (driverJobHistory.length * 7.35);
    setWalletBalance(computedEarnings);
  }, [driverJobHistory.length]);

  // Handle accepting an open gig
  const handleAcceptGig = (orderId: string) => {
    // Assign driver name and phone to order
    // In our simplified App.tsx handler, we update the status, but let's assign the driver
    // We can do this by calling a custom action or we will just update status and let local tracking know
    onUpdateOrderStatus(orderId, 'Preparing'); // keeps status as preparing but assigns
    onAddLog(`DRIVER_ASSIGNED: Courier ${selectedDriver.name} accepted job for order #${orderId}`, 'info');
  };

  // Simulating the ride across London street GPS
  useEffect(() => {
    let timer: any;
    if (isSimulatingDrive && activeJob) {
      timer = setInterval(() => {
        setSimulationProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer);
            setIsSimulatingDrive(false);
            // Trigger Delivered Status!
            onUpdateOrderStatus(activeJob.id, 'Delivered');
            onAddLog(`COURIER_HANDOVER: Courier ${selectedDriver.name} delivered order #${activeJob.id} directly to customer`, 'success');
            return 100;
          }
          return prev + 10; // 10% steps
        });
      }, 1000); // 10s total simulation
    }
    return () => clearInterval(timer);
  }, [isSimulatingDrive, activeJob]);

  const handleStartSimulation = () => {
    if (!activeJob || activeJob.status !== 'OutForDelivery') return;
    setIsSimulatingDrive(true);
    setSimulationProgress(0);
    onAddLog(`DRIVE_SIMULATOR: Rider ${selectedDriver.name} ignited vehicle. Auto-moving across GPS path...`, 'info');
    onAddLog(`FIRESTORE_TELEMETRY: Streaming real-time coordinates for Driver "${selectedDriver.name}" on Order #${activeJob.id} to Firestore collection "/telemetry"`, 'success');
  };

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRiderName.trim()) return;

    onOnboardDriver({
      name: newRiderName,
      phone: newRiderPhone || '+44 7700 900222',
      vehicle: newRiderVehicle
    });

    onAddLog(`ONBOARD_COURIER: New courier dispatcher "${newRiderName}" joined the fleet`, 'success');
    setSelectedDriverName(newRiderName);
    setOnboardSuccess(true);
    setNewRiderName('');
    setNewRiderPhone('');
    setTimeout(() => setOnboardSuccess(false), 4000);
    setActiveTab('jobs');
  };

  const handleCashout = () => {
    if (walletBalance <= 0) return;
    setCashoutSuccess(true);
    onAddLog(`PAYOUT_DISPATCHED: Instant cash-out of £${walletBalance.toFixed(2)} dispatched to ${selectedDriver.name}'s bank account`, 'success');
    setTimeout(() => {
      setWalletBalance(0);
      setCashoutSuccess(false);
    }, 3000);
  };

  return (
    <div className="h-full bg-stone-900 flex flex-col overflow-y-auto no-scrollbar text-stone-100 font-sans select-none" id="road-king-view">
      
      {/* 1. Header with Rider Selector */}
      <div className="bg-stone-950 p-4 border-b border-stone-800 space-y-3 flex-shrink-0 sticky top-0 z-30 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Compass className="w-4.5 h-4.5 text-orange-500 animate-spin" />
            <span className="font-extrabold text-[11px] text-orange-500 tracking-widest uppercase">Go-Zoon Road King</span>
          </div>

          <button
            onClick={() => setIsOnDuty(!isOnDuty)}
            className={`px-3 py-1 rounded-full text-[10px] font-extrabold cursor-pointer transition-all ${
              isOnDuty 
                ? 'bg-orange-950 text-orange-400 border border-orange-800 animate-pulse' 
                : 'bg-stone-800 text-stone-500 border border-stone-700'
            }`}
          >
            ● {isOnDuty ? 'DUTY ONLINE' : 'DUTY OFFLINE'}
          </button>
        </div>

        {/* Driver Account Picker */}
        <div>
          <label className="block text-[8px] font-bold text-stone-500 uppercase tracking-wider mb-1">Rider Dispatch Account</label>
          <select
            value={selectedDriverName}
            onChange={(e) => {
              setSelectedDriverName(e.target.value);
              setIsSimulatingDrive(false);
              setSimulationProgress(0);
            }}
            className="w-full bg-stone-900 border border-stone-800 text-xs px-2.5 py-1.5 rounded-lg text-stone-100 outline-hidden font-bold"
          >
            {drivers.map((d, idx) => (
              <option key={idx} value={d.name}>{d.name} ({d.vehicle})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-stone-950 border-b border-stone-850 p-1 flex-shrink-0">
        {[
          { id: 'jobs', label: `Gig Board (${openGigs.length || '0'})` },
          { id: 'wallet', label: 'Wallet' },
          { id: 'onboard', label: 'Register' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 text-[11px] font-black tracking-wide rounded-md transition-all cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-stone-800 text-orange-500 shadow-xs' 
                : 'text-stone-400 hover:text-stone-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 p-3 space-y-4">
        
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            
            {/* OFFLINE COVER */}
            {!isOnDuty && (
              <div className="p-8 text-center border border-stone-800 rounded-xl bg-stone-950/40 text-stone-500 text-xs space-y-2 flex flex-col items-center justify-center">
                <AlertCircle className="w-8 h-8 text-stone-600" />
                <span className="font-extrabold text-stone-400 text-sm">You are Off-Duty</span>
                <span className="text-[10px] text-stone-600 max-w-[200px] mx-auto">Toggle "DUTY ONLINE" at the top to receive gig deliveries in London.</span>
              </div>
            )}

            {/* ACTIVE DISPATCH GIG CONTROLS */}
            {isOnDuty && activeJob && (
              <div className="space-y-2.5">
                <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest block px-1">
                  Active Dispatched Job
                </span>

                <div className="bg-stone-950 border border-orange-500/40 p-4 rounded-xl space-y-4 shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[8px] font-mono text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-sm font-bold">ACTIVE ROUTE</span>
                      <h4 className="font-black text-sm text-stone-100 mt-2">Pick up: {activeJob.restaurantName}</h4>
                      <p className="text-[10px] text-stone-400 font-bold">To: {activeJob.deliveryAddress} ({activeJob.deliveryPostcode})</p>
                    </div>
                    <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-2.5 py-0.5 rounded-full uppercase animate-pulse">
                      {activeJob.status}
                    </span>
                  </div>

                  {/* Items list to pack */}
                  <div className="bg-stone-900 border border-stone-800 p-3 rounded-lg text-xs space-y-2">
                    <span className="text-[9px] font-black text-stone-500 uppercase tracking-wider block">Kitchen Checklist</span>
                    <div className="space-y-1.5">
                      {activeJob.items.map(item => (
                        <div key={item.id} className="flex justify-between items-center font-semibold text-stone-300">
                          <span>{item.quantity}x {item.menuItem.name}</span>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gig earnings breakout */}
                  <div className="bg-stone-900/60 p-2.5 border border-stone-800 rounded-lg text-[11px] font-semibold flex justify-between">
                    <span>Expected Payout:</span>
                    <span className="text-orange-500 font-black">£7.35 (£4.85 standard + £2.50 tip)</span>
                  </div>

                  {/* ACTIONS */}
                  {activeJob.status === 'Preparing' && (
                    <div className="p-3 bg-stone-900 border border-stone-800 rounded-lg text-center text-xs text-orange-400 font-bold flex items-center justify-center gap-1.5 animate-pulse">
                      <Compass className="w-4 h-4 text-orange-500 animate-spin" />
                      <span>Waiting for restaurant kitchen to bake the food...</span>
                    </div>
                  )}

                  {activeJob.status === 'OutForDelivery' && (
                    <div className="space-y-3">
                      {isSimulatingDrive ? (
                        <div className="space-y-2 bg-stone-900 p-3 border border-stone-800 rounded-lg text-center">
                          <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                            <span>GPS TRACKING LIVE</span>
                            <span>{simulationProgress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${simulationProgress}%` }}></div>
                          </div>
                          <p className="text-[10px] text-orange-400 font-bold">Rider auto-moving through London streets...</p>
                        </div>
                      ) : (
                        <button
                          onClick={handleStartSimulation}
                          className="w-full h-9 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <Compass className="w-4 h-4 text-white animate-spin" />
                          <span>Ignite Engine & Start Auto-Drive GPS</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onUpdateOrderStatus(activeJob.id, 'Delivered');
                          onAddLog(`COURIER_HANDOVER: Courier ${selectedDriver.name} delivered order #${activeJob.id} directly to customer`, 'success');
                        }}
                        disabled={isSimulatingDrive}
                        className="w-full h-9 border border-orange-500/20 hover:bg-orange-500/5 text-orange-500 font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Manual Skip to House Handover</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* OPEN GIGS SECTION (PICK UP FROM THE ROAD) */}
            {isOnDuty && !activeJob && (
              <div className="space-y-2.5">
                <span className="text-[9px] font-black text-stone-500 uppercase tracking-widest block px-1">
                  Open Gigs Near You ({openGigs.length})
                </span>

                {openGigs.length === 0 ? (
                  <div className="p-5 text-center border border-stone-800 rounded-xl bg-stone-950/40 text-stone-500 text-xs flex flex-col items-center justify-center gap-1">
                    <Bike className="w-5 h-5 text-stone-600" />
                    <span className="font-bold text-stone-400">London roads are quiet</span>
                    <span className="text-[10px] text-stone-600 max-w-[200px] mx-auto">No open delivery runs currently. Create and process an order in the Customer app to see a job post here immediately!</span>
                  </div>
                ) : (
                  openGigs.map(order => (
                    <div key={order.id} className="bg-stone-950 border border-stone-850 p-3.5 rounded-xl space-y-3.5 shadow-md hover:border-orange-500/25 transition-all">
                      <div>
                        <span className="text-[8px] font-mono text-orange-500 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-sm font-bold">GIG ID: #{order.id}</span>
                        <h4 className="font-extrabold text-xs text-stone-100 mt-2">Pick up: {order.restaurantName}</h4>
                        <p className="text-[10px] text-stone-400 font-bold">Deliver: {order.deliveryAddress} ({order.deliveryPostcode})</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] bg-stone-900 p-2 rounded-md">
                        <div className="text-stone-400">Est. Distance: <b className="text-stone-200 block text-xs mt-0.5">1.4 miles</b></div>
                        <div className="text-stone-400">Total Payout: <b className="text-orange-500 block text-xs mt-0.5">£7.35</b></div>
                      </div>

                      <button
                        onClick={() => handleAcceptGig(order.id)}
                        className="w-full h-8 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Accept Delivery Gig</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* COMPLETED JOBS */}
            {driverJobHistory.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[9px] font-black text-stone-500 uppercase tracking-widest block px-1">
                  Completed Delivery Runs ({driverJobHistory.length})
                </span>
                <div className="space-y-1.5">
                  {driverJobHistory.map(order => (
                    <div key={order.id} className="flex justify-between items-center p-2 bg-stone-950 border border-stone-850 rounded-lg text-xs">
                      <span className="font-bold text-stone-300">Order #{order.id} ({order.deliveryPostcode})</span>
                      <span className="text-emerald-500 font-bold bg-emerald-950 px-2 py-0.5 rounded-full text-[9px] border border-emerald-900">
                        +£7.35 Earned
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: COURIER WALLET & INSTANT CASH OUT */}
        {activeTab === 'wallet' && (
          <div className="space-y-4">
            
            <div className="bg-stone-950 border border-stone-850 p-5 rounded-2xl text-center space-y-2.5">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">Available Cash Balance</span>
              <div className="text-3xl font-black text-orange-500">£{walletBalance.toFixed(2)}</div>
              <p className="text-[10px] text-stone-400 max-w-[200px] mx-auto leading-relaxed">
                Earned across {driverJobHistory.length} standard deliveries today. Standard rate is £4.85 base plus 100% of the £2.50 customer tip.
              </p>
            </div>

            {cashoutSuccess && (
              <div className="bg-emerald-950 text-emerald-400 border border-emerald-800 p-3 rounded-lg text-[10px] font-bold text-center animate-bounce">
                🚀 Payout Successful! Funds dispatched instantly via Faster Payments to Lloyds.
              </div>
            )}

            <button
              onClick={handleCashout}
              disabled={walletBalance <= 0 || cashoutSuccess}
              className={`w-full h-11 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 shadow-md ${
                walletBalance > 0 && !cashoutSuccess
                  ? 'bg-orange-500 hover:bg-orange-600 text-white cursor-pointer'
                  : 'bg-stone-800 text-stone-600 cursor-not-allowed'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Instant Cash Out to Bank Account</span>
            </button>

          </div>
        )}

        {/* TAB 3: REGISTER NEW ROAD KING PARTNER */}
        {activeTab === 'onboard' && (
          <form onSubmit={handleOnboardSubmit} className="space-y-4 text-xs">
            {onboardSuccess && (
              <div className="bg-emerald-950 text-emerald-400 border border-emerald-800 p-2 rounded-lg text-[10px] font-bold">
                SUCCESS: New rider added to active dispatcher pool!
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-extrabold uppercase text-stone-500 tracking-wide mb-1">Rider Full Name*</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Charlie Brown"
                  value={newRiderName}
                  onChange={(e) => setNewRiderName(e.target.value)}
                  className="w-full h-9 px-3 bg-stone-950 border border-stone-800 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase text-stone-500 tracking-wide mb-1">Rider Phone*</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +44 7700 900333"
                  value={newRiderPhone}
                  onChange={(e) => setNewRiderPhone(e.target.value)}
                  className="w-full h-9 px-3 bg-stone-950 border border-stone-800 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase text-stone-500 tracking-wide mb-1">Vehicle Category*</label>
                <select
                  value={newRiderVehicle}
                  onChange={(e) => setNewRiderVehicle(e.target.value)}
                  className="w-full h-9 px-2 bg-stone-950 border border-stone-800 rounded-lg text-xs font-bold"
                >
                  <option value="Bicycle">Bicycle (Eco Friendly)</option>
                  <option value="Electric Scooter">Electric Scooter (Fast Delivery)</option>
                  <option value="Cargo Moped">Cargo Moped (Heavy Deliveries)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-9.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-lg flex items-center justify-center gap-1 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register & Start Shift</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
