import React, { useState, useEffect } from 'react';
import { Store, Check, Play, AlertCircle, Plus, Utensils, X, Calendar, PauseCircle, XCircle, Star, Clock, User, Layers } from 'lucide-react';
import { Order, OrderStatus, Restaurant, MenuItem, MenuItemVariant } from '../../types';
import { validateUKPostcode, getStoreClosureReason } from '../../data/restaurants';
import { fetchApi } from '../../api';

interface GoZoonBusinessProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  restaurantsList: Restaurant[];
  closedRestaurants: string[];
  onToggleClosedRestaurant: (id: string) => void;
  outOfStockItems: string[];
  onToggleOutOfStockItem: (id: string) => void;
  onOnboardRestaurant: (restaurant: Restaurant) => void;
  onToggleMinOrderEnforcement: (id: string) => void;
  onAddDishToRestaurant: (restaurantId: string, menuItem: MenuItem) => void;
  onSetRestaurantHoliday: (id: string, startDate: string, endDate: string) => void;
  onClearRestaurantHoliday: (id: string) => void;
  onSetRestaurantPause: (id: string, minutes: number) => void;
  onClearRestaurantPause: (id: string) => void;
  onRejectOrder: (orderId: string, reason: string) => void;
  onAddLog: (event: string, type: 'info' | 'success' | 'warning') => void;
}

// How long the kitchen has to prepare an order before it's flagged overdue -
// drives the live Preparation Timer countdown.
const PREP_DURATION_MINUTES = 15;

export default function GoZoonBusiness({
  orders,
  onUpdateOrderStatus,
  restaurantsList,
  closedRestaurants,
  onToggleClosedRestaurant,
  outOfStockItems,
  onToggleOutOfStockItem,
  onOnboardRestaurant,
  onToggleMinOrderEnforcement,
  onAddDishToRestaurant,
  onSetRestaurantHoliday,
  onClearRestaurantHoliday,
  onSetRestaurantPause,
  onClearRestaurantPause,
  onRejectOrder,
  onAddLog
}: GoZoonBusinessProps): React.JSX.Element {
  // Business app allows choosing which restaurant profile we are logged into
  const [selectedRestId, setSelectedRestId] = useState<string>(restaurantsList[0]?.id || 'rest-1');
  const [activeTab, setActiveTab] = useState<'incoming' | 'menu' | 'finances' | 'onboard'>('incoming');

  // Registration - Business Information (the account/owner, distinct from the
  // restaurant's own public profile fields below)
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');

  // Registration - Restaurant Details
  const [restName, setRestName] = useState('');
  const [restCuisine, setRestCuisine] = useState('British Comfort');
  const [restPostcode, setRestPostcode] = useState('NW1 0NE');
  const [restPostcodeError, setRestPostcodeError] = useState('');
  const [restDeliveryFee, setRestDeliveryFee] = useState('2.49');
  const [restMinOrder, setRestMinOrder] = useState('10.00');
  const [restAddress, setRestAddress] = useState('22 Parkway, Camden, London');
  const [restAbout, setRestAbout] = useState('');
  const [restOpeningHours, setRestOpeningHours] = useState('Mon-Sun 11:00 - 22:00');
  const [restImage, setRestImage] = useState('https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=500&q=80');
  const [restBannerImage, setRestBannerImage] = useState('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80');
  const [onboardSuccess, setOnboardSuccess] = useState(false);

  // New dish addition state
  const [dishName, setDishName] = useState('Signature Fish Burger');
  const [dishPrice, setDishPrice] = useState('11.50');
  const [dishDesc, setDishDesc] = useState('Crispy cod patty with homemade tartar sauce and cheddar inside a soft brioche bun.');

  // Dynamic menu addition state
  const [isAddDishFormOpen, setIsAddDishFormOpen] = useState(false);
  const [newDishName, setNewDishName] = useState('');
  const [newDishPrice, setNewDishPrice] = useState('');
  const [newDishCategory, setNewDishCategory] = useState('Mains');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [newDishDesc, setNewDishDesc] = useState('');
  const [newDishDietary, setNewDishDietary] = useState<('Vegan' | 'Vegetarian' | 'Gluten-Free' | 'Halal')[]>([]);
  const [customOptions, setCustomOptions] = useState<{
    name: string;
    type: 'select' | 'checkbox';
    required: boolean;
    choices: { name: string; price: number }[];
  }[]>([]);

  // Variants: a distinct concept from customization option groups above - each
  // variant is an alternate absolute price point for the same dish (e.g. sizes),
  // not an additive extra.
  const [dishVariants, setDishVariants] = useState<{ name: string; price: string }[]>([]);

  const handleAddVariant = () => {
    setDishVariants(prev => [...prev, { name: '', price: '' }]);
  };

  const handleUpdateVariant = (idx: number, key: 'name' | 'price', value: string) => {
    setDishVariants(prev => prev.map((v, i) => i === idx ? { ...v, [key]: value } : v));
  };

  const handleRemoveVariant = (idx: number) => {
    setDishVariants(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddCustomOptionGroup = () => {
    setCustomOptions(prev => [
      ...prev,
      {
        name: '',
        type: 'select',
        required: false,
        choices: [{ name: '', price: 0 }]
      }
    ]);
  };

  const handleUpdateCustomGroup = (groupIdx: number, key: 'name' | 'type' | 'required', value: any) => {
    setCustomOptions(prev => prev.map((g, idx) => {
      if (idx === groupIdx) {
        return { ...g, [key]: value };
      }
      return g;
    }));
  };

  const handleAddChoiceToGroup = (groupIdx: number) => {
    setCustomOptions(prev => prev.map((g, idx) => {
      if (idx === groupIdx) {
        return { ...g, choices: [...g.choices, { name: '', price: 0 }] };
      }
      return g;
    }));
  };

  const handleUpdateChoiceInGroup = (groupIdx: number, choiceIdx: number, key: 'name' | 'price', value: any) => {
    setCustomOptions(prev => prev.map((g, idx) => {
      if (idx === groupIdx) {
        const updatedChoices = g.choices.map((c, cIdx) => {
          if (cIdx === choiceIdx) {
            return { ...c, [key]: value };
          }
          return c;
        });
        return { ...g, choices: updatedChoices };
      }
      return g;
    }));
  };

  const handleRemoveChoiceFromGroup = (groupIdx: number, choiceIdx: number) => {
    setCustomOptions(prev => prev.map((g, idx) => {
      if (idx === groupIdx) {
        return { ...g, choices: g.choices.filter((_, cIdx) => cIdx !== choiceIdx) };
      }
      return g;
    }));
  };

  const handleRemoveCustomOptionGroup = (groupIdx: number) => {
    setCustomOptions(prev => prev.filter((_, idx) => idx !== groupIdx));
  };

  const handleAddDishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMerchant) return;
    if (!newDishName.trim()) return;

    // Filter out invalid/empty customization options
    const formattedOptions = customOptions
      .filter(opt => opt.name.trim() !== '')
      .map(opt => ({
        name: opt.name.trim(),
        type: opt.type,
        required: opt.required,
        choices: opt.choices
          .filter(c => c.name.trim() !== '')
          .map(c => ({
            name: c.name.trim(),
            price: parseFloat(c.price as any) || 0
          }))
      }));

    const formattedVariants: MenuItemVariant[] = dishVariants
      .filter(v => v.name.trim() !== '' && v.price.trim() !== '')
      .map(v => ({ name: v.name.trim(), price: parseFloat(v.price) || 0 }));

    const newMenuItem: MenuItem = {
      id: `m-${Date.now()}`,
      name: newDishName.trim(),
      description: newDishDesc.trim(),
      price: formattedVariants.length > 0 ? formattedVariants[0].price : (parseFloat(newDishPrice) || 0),
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
      category: newDishCategory.trim() || 'Mains',
      dietary: newDishDietary.length > 0 ? newDishDietary : undefined,
      options: formattedOptions.length > 0 ? formattedOptions : undefined,
      variants: formattedVariants.length > 0 ? formattedVariants : undefined
    };

    onAddDishToRestaurant(activeMerchant.id, newMenuItem);
    onAddLog(`MENU_ADD_DISH: "${newDishName}" added to "${activeMerchant.name}" menu`, 'success');

    // Reset Form
    setNewDishName('');
    setNewDishPrice('');
    setNewDishCategory('Mains');
    setIsCustomCategory(false);
    setNewDishDesc('');
    setNewDishDietary([]);
    setCustomOptions([]);
    setDishVariants([]);
    setIsAddDishFormOpen(false);
  };

  const activeMerchant = restaurantsList.find(r => r.id === selectedRestId) || restaurantsList[0];
  const isClosed = closedRestaurants.includes(activeMerchant?.id);

  // Categories already in use on this restaurant's menu, for the category
  // combobox - real category management instead of a fixed 4-option dropdown.
  const existingCategories = Array.from(new Set((activeMerchant?.menu || []).map(m => m.category)));

  // Filter orders for this restaurant
  const merchantOrders = orders.filter(o => o.restaurantId === activeMerchant?.id);
  const incomingOrders = merchantOrders.filter(o => o.status === 'Placed');
  const activePreps = merchantOrders.filter(o => o.status === 'Preparing');
  const historyOrders = merchantOrders.filter(o =>
    ['ReadyForPickup', 'DriverArrived', 'PickedUp', 'OutForDelivery', 'Delivered', 'Cancelled'].includes(o.status)
  );

  // Reject-with-reason flow (inline, not a native confirm/prompt dialog)
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  const handleConfirmReject = (orderId: string) => {
    onRejectOrder(orderId, rejectReasonInput.trim());
    setRejectingOrderId(null);
    setRejectReasonInput('');
  };

  // Live clock tick powering the Preparation Timer and the temporary-pause countdown
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.round(Math.abs(ms) / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Store Management - holiday date range inputs
  const [holidayStartInput, setHolidayStartInput] = useState('');
  const [holidayEndInput, setHolidayEndInput] = useState('');
  const closureReason = activeMerchant ? getStoreClosureReason(activeMerchant, new Date(nowTick)) : null;

  // Reports - real average rating computed from actual reviews (falls back to
  // the seeded static rating when a restaurant has no reviews yet)
  const [ratingSummary, setRatingSummary] = useState<{ averageRating: number; totalReviews: number; computed: boolean } | null>(null);

  useEffect(() => {
    if (!activeMerchant?.id) return;
    setRatingSummary(null);
    fetchApi(`/api/restaurants/${activeMerchant.id}/rating-summary`)
      .then(res => res.json())
      .then(data => setRatingSummary(data))
      .catch(err => console.error('[Reports] Failed to load rating summary:', err));
  }, [activeMerchant?.id]);

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restName.trim()) return;

    const zone = validateUKPostcode(restPostcode);
    if (!zone) {
      setRestPostcodeError('Invalid UK postcode (e.g. SW1A 1AA)');
      return;
    }
    setRestPostcodeError('');

    const newId = `rest-${Date.now()}`;
    const newRest: Restaurant = {
      id: newId,
      name: restName,
      rating: 4.9,
      reviewsCount: 1,
      deliveryTimeRange: [20, 30],
      deliveryFee: parseFloat(restDeliveryFee) || 0,
      minOrder: parseFloat(restMinOrder) || 10.0,
      cuisine: restCuisine,
      image: restImage.trim() || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=500&q=80',
      bannerImage: restBannerImage.trim() || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
      address: restAddress,
      postcode: restPostcode.toUpperCase(),
      about: restAbout.trim() || undefined,
      openingHours: restOpeningHours.trim() || undefined,
      lat: zone.lat,
      lng: zone.lng,
      featured: false,
      ownerName: ownerName.trim() || undefined,
      ownerEmail: ownerEmail.trim() || undefined,
      ownerPhone: ownerPhone.trim() || undefined,
      menu: [
        {
          id: `${newId}-m1`,
          name: dishName,
          description: dishDesc,
          price: parseFloat(dishPrice) || 10.00,
          image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80',
          category: 'Mains'
        }
      ]
    };

    onOnboardRestaurant(newRest);
    onAddLog(`ONBOARD_RESTAURANT: New restaurant "${restName}" onboarded to zone ${restPostcode} by ${ownerName || 'unnamed owner'}`, 'success');
    setSelectedRestId(newId);
    setOnboardSuccess(true);
    setRestName('');
    setTimeout(() => setOnboardSuccess(false), 4000);
    setActiveTab('incoming');
  };

  const calculateEarnings = () => {
    const delivered = merchantOrders.filter(o => o.status === 'Delivered');
    const gross = delivered.reduce((sum, o) => sum + o.subtotal, 0);
    const serviceChargePay = gross * 0.05; // 5% commission
    const net = gross - serviceChargePay;
    return { gross, commission: serviceChargePay, net, count: delivered.length };
  };

  const stats = calculateEarnings();

  return (
    <div className="h-full bg-slate-900 flex flex-col overflow-y-auto no-scrollbar text-slate-100 font-sans select-none" id="business-app-view">

      {/* Top Banner: Profile Selector */}
      <div className="bg-slate-950 px-4 pb-4 pt-4 pt-safe border-b border-slate-800 space-y-3 flex-shrink-0 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Store className="w-4 h-4 text-brand-orange" />
            <span className="font-extrabold text-[11px] text-brand-orange tracking-widest uppercase">Go-Zoon Business</span>
          </div>
          <button
            onClick={() => onToggleClosedRestaurant(activeMerchant?.id)}
            className={`px-3 py-1 rounded-full text-[10px] font-extrabold cursor-pointer transition-all ${
              isClosed
                ? 'bg-red-950 text-red-400 border border-red-800'
                : 'bg-emerald-950 text-emerald-400 border border-emerald-800 animate-pulse'
            }`}
          >
            ● {isClosed ? 'CLOSED (OFFLINE)' : 'ONLINE (RECEIVING)'}
          </button>
        </div>

        {closureReason && (
          <div className="bg-amber-950/50 border border-amber-800 text-amber-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>{closureReason}</span>
          </div>
        )}

        {/* Admin Portal controls override anything the merchant does themselves - these
            banners make Approve/Reject/Suspend/Deactivate visibly consequential here. */}
        {activeMerchant?.approvalStatus === 'pending' && (
          <div className="bg-amber-950/50 border border-amber-800 text-amber-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>Pending Go-Zoon approval - this restaurant won't appear to customers yet.</span>
          </div>
        )}
        {activeMerchant?.approvalStatus === 'rejected' && (
          <div className="bg-red-950/50 border border-red-800 text-red-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>Go-Zoon did not approve this restaurant's listing.</span>
          </div>
        )}
        {activeMerchant?.adminStatus === 'suspended' && (
          <div className="bg-red-950/50 border border-red-800 text-red-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>Suspended by Go-Zoon - orders are paused until this is lifted.</span>
          </div>
        )}
        {activeMerchant?.adminStatus === 'deactivated' && (
          <div className="bg-red-950/50 border border-red-800 text-red-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>Deactivated by Go-Zoon - this restaurant is no longer operating on the platform.</span>
          </div>
        )}

        {/* Dropdown rest selector to test multiple restaurant experiences */}
        <div>
          <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Selected Kitchen Profile</label>
          <select
            value={selectedRestId}
            onChange={(e) => setSelectedRestId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-xs px-2.5 py-1.5 rounded-lg text-slate-100 outline-hidden font-bold"
          >
            {restaurantsList.map(r => (
              <option key={r.id} value={r.id}>{r.name} ({r.postcode})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex bg-slate-950 border-b border-slate-850 p-1 flex-shrink-0">
        {[
          { id: 'incoming', label: `Orders (${incomingOrders.length + activePreps.length})` },
          { id: 'menu', label: 'Stock' },
          { id: 'finances', label: 'Ledger' },
          { id: 'onboard', label: 'Onboard' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 text-[11px] font-black tracking-wide rounded-md transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-slate-800 text-brand-orange shadow-xs'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 p-3 space-y-4">

        {/* TAB 1: LIVE ORDERS TICKET STREAM */}
        {activeTab === 'incoming' && (
          <div className="space-y-4">

            {/* INCOMING TICKETS SECTION (AWAITING ACCEPTANCE) */}
            <div className="space-y-2.5">
              <span className="text-[9px] font-black text-brand-orange uppercase tracking-widest block px-1">
                Awaiting Prep ({incomingOrders.length})
              </span>

              {incomingOrders.length === 0 ? (
                <div className="p-5 text-center border border-slate-800 rounded-xl bg-slate-950/40 text-slate-500 text-xs flex flex-col items-center justify-center gap-1">
                  <AlertCircle className="w-5 h-5 text-slate-600" />
                  <span className="font-bold text-slate-400">No new orders placed yet</span>
                  <span className="text-[10px] text-slate-600 max-w-[200px] mx-auto">Place an order in the Customer app to see the ticket pop up here instantly with notifications!</span>
                </div>
              ) : (
                incomingOrders.map(order => (
                  <div key={order.id} className="bg-slate-950 border border-brand-orange/40 p-3.5 rounded-xl space-y-3.5 shadow-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-mono text-brand-orange bg-brand-orange/10 border border-brand-orange/20 px-2 py-0.5 rounded-sm font-bold">TICKET #{order.id}</span>
                        <div className="text-[10px] text-slate-400 font-bold mt-1">Deliver to: {order.deliveryAddress} ({order.deliveryPostcode})</div>
                      </div>
                      <span className="text-[9px] font-black text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full uppercase">NEW</span>
                    </div>

                    <div className="border-t border-b border-slate-800 py-2 space-y-1 text-xs">
                      {order.items.map(item => (
                        <div key={item.id} className="flex justify-between text-slate-300 font-medium">
                          <span>{item.quantity}x {item.menuItem.name}{item.selectedVariant ? ` (${item.selectedVariant.name})` : ''}</span>
                          <span className="text-brand-orange font-bold">£{((item.selectedVariant?.price ?? item.menuItem.price) * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {rejectingOrderId === order.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={rejectReasonInput}
                          onChange={(e) => setRejectReasonInput(e.target.value)}
                          placeholder="Reason (e.g. out of stock, kitchen too busy)..."
                          className="w-full h-8 px-2.5 bg-slate-900 border border-red-800 rounded-lg text-[11px] text-white outline-hidden"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setRejectingOrderId(null); setRejectReasonInput(''); }}
                            className="flex-1 h-8 bg-slate-900 border border-slate-800 text-slate-300 font-bold text-[10px] rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmReject(order.id)}
                            className="flex-1 h-8 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] rounded-lg cursor-pointer"
                          >
                            Confirm Reject
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRejectingOrderId(order.id)}
                          className="w-9 h-8.5 flex-shrink-0 border border-red-800 text-red-400 hover:bg-red-950/50 rounded-lg flex items-center justify-center cursor-pointer"
                          title="Reject ticket"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            onUpdateOrderStatus(order.id, 'Preparing');
                            onAddLog(`KITCHEN_ACCEPTED: Order #${order.id} is now in preparation at ${activeMerchant.name}`, 'info');
                          }}
                          className="flex-1 h-8.5 bg-brand-orange hover:bg-brand-orange/95 text-white font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>Accept Ticket & Begin Cooking</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* ACTIVE KITCHEN PREPARATION SECTION */}
            <div className="space-y-2.5 pt-2">
              <span className="text-[9px] font-black text-brand-blue uppercase tracking-widest block px-1">
                In Preparation ({activePreps.length})
              </span>

              {activePreps.length === 0 ? (
                <div className="p-4 text-center border border-slate-850 rounded-xl bg-slate-950/20 text-slate-600 text-[11px] font-semibold">
                  No active cooking pots right now
                </div>
              ) : (
                activePreps.map(order => {
                  const startedAtMs = order.preparingStartedAt ? new Date(order.preparingStartedAt).getTime() : null;
                  const remainingMs = startedAtMs !== null ? (PREP_DURATION_MINUTES * 60000) - (nowTick - startedAtMs) : null;
                  const isOverdue = remainingMs !== null && remainingMs < 0;
                  return (
                    <div key={order.id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-3 shadow-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-mono text-brand-blue bg-brand-blue/10 border border-brand-blue/20 px-2 py-0.5 rounded-sm font-bold">PREP ID: #{order.id}</span>
                          <div className="text-[10px] text-slate-400 font-bold mt-1.5">Zone: {order.deliveryPostcode}</div>
                        </div>
                        {remainingMs !== null ? (
                          <div className={`text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-full ${
                            isOverdue ? 'bg-red-950 text-red-400 animate-pulse' : 'bg-slate-900 text-slate-300'
                          }`}>
                            <Clock className="w-3 h-3" />
                            <span>{isOverdue ? `Overdue by ${formatCountdown(remainingMs)}` : `Ready in ${formatCountdown(remainingMs)}`}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-full animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-ping"></span>
                            <span>Cooking...</span>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-b border-slate-850 py-2 text-xs space-y-1">
                        {order.items.map(item => (
                          <div key={item.id} className="flex justify-between text-slate-300">
                            <span>{item.quantity}x {item.menuItem.name}{item.selectedVariant ? ` (${item.selectedVariant.name})` : ''}</span>
                            <span>£{((item.selectedVariant?.price ?? item.menuItem.price) * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          onUpdateOrderStatus(order.id, 'ReadyForPickup');
                          onAddLog(`ORDER_READY: Order #${order.id} ready for pickup at ${activeMerchant.name}${order.driverName ? ` (courier ${order.driverName} assigned)` : ' (awaiting courier)'}`, 'success');
                        }}
                        className="w-full h-8.5 bg-brand-blue hover:bg-brand-blue/95 text-white font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Food Ready - Notify Road King Rider</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* COMPLETED/TRANSIT SECTION */}
            {historyOrders.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block px-1">
                  Active Dispatches & History
                </span>
                <div className="space-y-1.5">
                  {historyOrders.map(order => (
                    <div key={order.id} className="flex justify-between items-center p-2.5 bg-slate-950/80 border border-slate-850 rounded-lg text-xs">
                      <div>
                        <span className="font-bold text-slate-300">Order #{order.id}</span>
                        <span className="text-slate-500 text-[10px]"> • {order.deliveryPostcode}</span>
                        {order.status === 'Cancelled' && order.cancelReason && (
                          <span className="block text-red-400/80 text-[9px] italic">"{order.cancelReason}"</span>
                        )}
                      </div>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        order.status === 'Delivered' ? 'bg-emerald-950 text-emerald-400' :
                        order.status === 'Cancelled' ? 'bg-red-950 text-red-400' :
                        'bg-brand-orange/10 text-brand-orange border border-brand-orange/20 animate-pulse'
                      }`}>
                        {order.status === 'OutForDelivery' ? 'In Transit' :
                         order.status === 'ReadyForPickup' ? 'Ready for Pickup' :
                         order.status === 'DriverArrived' ? 'Courier at Kitchen' :
                         order.status === 'PickedUp' ? 'Picked Up' : order.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: MENU STOCK CONTROLLER + STORE MANAGEMENT */}
        {activeTab === 'menu' && (
          <div className="space-y-3.5">
            {/* Header / Add Dish Button Row */}
            <div className="flex justify-between items-center gap-2">
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 space-y-1 flex-1">
                <span className="text-[9px] font-extrabold text-brand-orange uppercase block">Menu Stock Controller</span>
                <p className="text-[9px] text-slate-500 leading-tight">Add dishes or toggle availability in real-time.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDishFormOpen(!isAddDishFormOpen)}
                className={`h-9 px-3 rounded-lg text-[10px] font-black tracking-wide flex items-center gap-1 cursor-pointer transition-all ${
                  isAddDishFormOpen
                    ? 'bg-red-950 text-red-400 border border-red-800'
                    : 'bg-brand-blue hover:bg-brand-blue/90 text-white shadow-md'
                }`}
              >
                {isAddDishFormOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{isAddDishFormOpen ? 'Close' : 'Add Dish'}</span>
              </button>
            </div>

            {/* Minimum Order Enforcement Toggle */}
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
              <div>
                <span className="text-[9px] font-extrabold text-brand-orange uppercase block">Minimum Order</span>
                <p className="text-[9px] text-slate-500 leading-tight">
                  Stated minimum is £{activeMerchant?.minOrder?.toFixed(2)}. {activeMerchant?.enforceMinOrder ? 'Customers must meet it to check out.' : 'Currently informational only - not enforced.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggleMinOrderEnforcement(activeMerchant?.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[9px] font-extrabold cursor-pointer transition-all ${
                  activeMerchant?.enforceMinOrder
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-slate-900 text-slate-400 border border-slate-700'
                }`}
              >
                {activeMerchant?.enforceMinOrder ? 'ENFORCED' : 'OFF'}
              </button>
            </div>

            {/* Store Management: Holiday Settings + Temporary Pause */}
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 space-y-3">
              <span className="text-[9px] font-extrabold text-brand-orange uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Store Management</span>
              </span>

              {/* Holiday Settings */}
              <div className="space-y-1.5">
                <span className="text-[8px] font-extrabold uppercase text-slate-500 tracking-wide">Holiday Settings</span>
                {activeMerchant?.holidayStart && activeMerchant?.holidayEnd ? (
                  <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-2">
                    <span className="text-[10px] text-slate-300 font-semibold">Closed {activeMerchant.holidayStart} → {activeMerchant.holidayEnd}</span>
                    <button
                      type="button"
                      onClick={() => onClearRestaurantHoliday(activeMerchant.id)}
                      className="text-[9px] font-bold text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="flex items-end gap-1.5">
                    <div className="flex-1">
                      <label className="block text-[7px] font-bold text-slate-500 uppercase mb-0.5">Start</label>
                      <input
                        type="date"
                        value={holidayStartInput}
                        onChange={(e) => setHolidayStartInput(e.target.value)}
                        className="w-full h-7 px-1.5 bg-slate-900 border border-slate-800 rounded-md text-[10px] text-white outline-hidden"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[7px] font-bold text-slate-500 uppercase mb-0.5">End</label>
                      <input
                        type="date"
                        value={holidayEndInput}
                        onChange={(e) => setHolidayEndInput(e.target.value)}
                        className="w-full h-7 px-1.5 bg-slate-900 border border-slate-800 rounded-md text-[10px] text-white outline-hidden"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!holidayStartInput || !holidayEndInput}
                      onClick={() => {
                        onSetRestaurantHoliday(activeMerchant.id, holidayStartInput, holidayEndInput);
                        setHolidayStartInput('');
                        setHolidayEndInput('');
                      }}
                      className="h-7 px-2.5 bg-brand-orange text-white text-[9px] font-black rounded-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      Set
                    </button>
                  </div>
                )}
              </div>

              {/* Temporary Pause */}
              <div className="space-y-1.5 border-t border-slate-850 pt-2.5">
                <span className="text-[8px] font-extrabold uppercase text-slate-500 tracking-wide flex items-center gap-1">
                  <PauseCircle className="w-3 h-3" />
                  <span>Temporary Pause</span>
                </span>
                {activeMerchant?.pausedUntil && new Date(activeMerchant.pausedUntil).getTime() > nowTick ? (
                  <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-2">
                    <span className="text-[10px] text-slate-300 font-semibold">Reopens in {formatCountdown(new Date(activeMerchant.pausedUntil).getTime() - nowTick)}</span>
                    <button
                      type="button"
                      onClick={() => onClearRestaurantPause(activeMerchant.id)}
                      className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      Resume Now
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    {[15, 30, 60].map(minutes => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => onSetRestaurantPause(activeMerchant.id, minutes)}
                        className="flex-1 h-8 bg-slate-900 border border-slate-800 hover:border-brand-orange text-slate-300 text-[10px] font-bold rounded-lg cursor-pointer"
                      >
                        {minutes < 60 ? `${minutes}m` : '1h'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Add Dish Form Panel */}
            {isAddDishFormOpen ? (
              <form onSubmit={handleAddDishSubmit} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3.5 text-xs">
                <h3 className="font-extrabold text-[10px] uppercase text-slate-300 border-b border-slate-850 pb-1.5 flex items-center gap-1">
                  <Utensils className="w-3.5 h-3.5 text-brand-orange" />
                  <span>Create New Menu Dish</span>
                </h3>

                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] font-extrabold uppercase text-slate-500 tracking-wide mb-0.5">Dish Name*</label>
                      <input
                        type="text"
                        required
                        value={newDishName}
                        onChange={(e) => setNewDishName(e.target.value)}
                        placeholder="e.g. Garlic Cheese Bread"
                        className="w-full h-8 px-2 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-white outline-hidden focus:border-brand-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-extrabold uppercase text-slate-500 tracking-wide mb-0.5">Base Price (£)*</label>
                      <input
                        type="number"
                        step="0.01"
                        required={dishVariants.length === 0}
                        disabled={dishVariants.length > 0}
                        value={newDishPrice}
                        onChange={(e) => setNewDishPrice(e.target.value)}
                        placeholder={dishVariants.length > 0 ? 'Set via variants below' : '5.50'}
                        className="w-full h-8 px-2 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-mono text-white outline-hidden focus:border-brand-blue disabled:opacity-40"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] font-extrabold uppercase text-slate-500 tracking-wide mb-0.5">Category*</label>
                      {isCustomCategory ? (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            required
                            autoFocus
                            value={newDishCategory}
                            onChange={(e) => setNewDishCategory(e.target.value)}
                            placeholder="New category name"
                            className="flex-1 h-8 px-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-white outline-hidden focus:border-brand-blue"
                          />
                          <button
                            type="button"
                            onClick={() => { setIsCustomCategory(false); setNewDishCategory(existingCategories[0] || 'Mains'); }}
                            className="w-8 h-8 flex-shrink-0 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 cursor-pointer flex items-center justify-center"
                            title="Pick existing category instead"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <select
                          value={newDishCategory}
                          onChange={(e) => {
                            if (e.target.value === '__new__') { setIsCustomCategory(true); setNewDishCategory(''); }
                            else setNewDishCategory(e.target.value);
                          }}
                          className="w-full h-8 px-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-white font-bold outline-hidden focus:border-brand-blue"
                        >
                          {(existingCategories.length > 0 ? existingCategories : ['Mains', 'Sides', 'Desserts', 'Drinks']).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          <option value="__new__">+ Add new category...</option>
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-[8px] font-extrabold uppercase text-slate-500 tracking-wide mb-0.5">Dietary Tags</label>
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {(['Vegan', 'Vegetarian', 'Gluten-Free', 'Halal'] as const).map(tag => {
                          const isSelected = newDishDietary.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                setNewDishDietary(prev =>
                                  isSelected ? prev.filter(t => t !== tag) : [...prev, tag]
                                );
                              }}
                              className={`px-1.5 py-0.5 rounded-md text-[8px] font-black transition-all border ${
                                isSelected
                                  ? 'bg-brand-blue/15 text-brand-blue border-brand-blue/30'
                                  : 'bg-slate-900 text-slate-400 border-slate-800'
                              }`}
                            >
                              {tag.charAt(0)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] font-extrabold uppercase text-slate-500 tracking-wide mb-0.5">Description</label>
                    <textarea
                      value={newDishDesc}
                      onChange={(e) => setNewDishDesc(e.target.value)}
                      placeholder="Fresh sourdough baguette topped with rich melted mozzarella and garlic."
                      className="w-full h-10 p-2 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-white outline-hidden focus:border-brand-blue resize-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Variants: alternate absolute price points (e.g. sizes) */}
                <div className="border-t border-slate-850 pt-2.5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider flex items-center gap-1">
                      <Layers className="w-3 h-3 text-brand-blue" />
                      <span>Variants (e.g. Small/Medium/Large)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="bg-brand-blue/15 hover:bg-brand-blue/25 text-brand-blue text-[8px] font-black px-2 py-1 rounded-md flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Add Variant</span>
                    </button>
                  </div>

                  {dishVariants.length === 0 ? (
                    <div className="p-2 text-center border border-dashed border-slate-850 rounded-lg text-slate-500 text-[9px] leading-relaxed">
                      No variants - dish sells at the single Base Price above.<br/>
                      <span className="text-slate-400 font-bold">Add variants for dishes with distinct sizes/price points instead of an additive extra.</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {dishVariants.map((variant, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <input
                            type="text"
                            required
                            value={variant.name}
                            onChange={(e) => handleUpdateVariant(idx, 'name', e.target.value)}
                            placeholder="e.g. Large"
                            className="flex-1 h-7 px-2 bg-slate-900 border border-slate-800 rounded-md text-[10px] text-white outline-hidden focus:border-brand-blue"
                          />
                          <div className="w-20 relative">
                            <span className="absolute left-1.5 top-1.5 text-slate-500 font-bold text-[9px]">£</span>
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={variant.price}
                              onChange={(e) => handleUpdateVariant(idx, 'price', e.target.value)}
                              placeholder="9.99"
                              className="w-full h-7 pl-4 pr-1 bg-slate-900 border border-slate-800 rounded-md text-[10px] text-white font-mono outline-hidden focus:border-brand-blue"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(idx)}
                            className="text-slate-500 hover:text-red-400 cursor-pointer flex-shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Customizations options group list */}
                <div className="border-t border-slate-850 pt-2.5 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider block">Dish Customization Choices</span>
                    <button
                      type="button"
                      onClick={handleAddCustomOptionGroup}
                      className="bg-brand-orange/15 hover:bg-brand-orange/25 text-brand-orange text-[8px] font-black px-2 py-1 rounded-md flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Add Option Group</span>
                    </button>
                  </div>

                  {customOptions.length === 0 ? (
                    <div className="p-2 text-center border border-dashed border-slate-850 rounded-lg text-slate-500 text-[9px] leading-relaxed">
                      No customizations added.<br/>
                      <span className="text-slate-400 font-bold">Click "Add Option Group" to configure additive extras (e.g. toppings).</span>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[170px] overflow-y-auto pr-1">
                      {customOptions.map((group, groupIdx) => (
                        <div key={groupIdx} className="bg-slate-900 border border-slate-850 rounded-xl p-2.5 space-y-2 relative">
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomOptionGroup(groupIdx)}
                            className="absolute top-2 right-2 text-slate-500 hover:text-red-400 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          <div className="grid grid-cols-2 gap-2 pr-5">
                            <div>
                              <label className="block text-[8px] font-extrabold uppercase text-slate-500 tracking-wide mb-0.5">Group Name*</label>
                              <input
                                type="text"
                                required
                                value={group.name}
                                onChange={(e) => handleUpdateCustomGroup(groupIdx, 'name', e.target.value)}
                                placeholder="e.g. Extra Toppings"
                                className="w-full h-7 px-2 bg-slate-950 border border-slate-800 rounded-md text-[10px] text-white outline-hidden focus:border-brand-blue"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-extrabold uppercase text-slate-500 tracking-wide mb-0.5">Type*</label>
                              <select
                                value={group.type}
                                onChange={(e) => handleUpdateCustomGroup(groupIdx, 'type', e.target.value)}
                                className="w-full h-7 px-1 bg-slate-950 border border-slate-800 rounded-md text-[10px] text-white font-bold outline-hidden focus:border-brand-blue"
                              >
                                <option value="select">Choose One (Radio)</option>
                                <option value="checkbox">Multi Choose (Checkboxes)</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              id={`group-req-${groupIdx}`}
                              checked={group.required}
                              onChange={(e) => handleUpdateCustomGroup(groupIdx, 'required', e.target.checked)}
                              className="w-3 h-3 accent-brand-orange bg-slate-950 border-slate-800 rounded-sm cursor-pointer"
                            />
                            <label htmlFor={`group-req-${groupIdx}`} className="text-[9px] font-bold text-slate-450 cursor-pointer">
                              Mandatory Customization Group?
                            </label>
                          </div>

                          {/* Choices sublist */}
                          <div className="border-t border-slate-850 pt-2 space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wide block">Option Choices</span>
                              <button
                                type="button"
                                onClick={() => handleAddChoiceToGroup(groupIdx)}
                                className="text-brand-blue text-[8px] font-black hover:underline cursor-pointer flex items-center gap-0.5"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>Add Choice</span>
                              </button>
                            </div>

                            <div className="space-y-1.5">
                              {group.choices.map((choice, choiceIdx) => (
                                <div key={choiceIdx} className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    required
                                    value={choice.name}
                                    onChange={(e) => handleUpdateChoiceInGroup(groupIdx, choiceIdx, 'name', e.target.value)}
                                    placeholder="e.g. Extra Cheese"
                                    className="flex-1 h-7 px-2 bg-slate-950 border border-slate-800 rounded-md text-[10px] text-white outline-hidden focus:border-brand-blue"
                                  />
                                  <div className="w-16 relative">
                                    <span className="absolute left-1.5 top-1.5 text-slate-500 font-bold text-[9px]">£</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      required
                                      value={choice.price || ''}
                                      onChange={(e) => handleUpdateChoiceInGroup(groupIdx, choiceIdx, 'price', e.target.value)}
                                      placeholder="1.50"
                                      className="w-full h-7 pl-4 pr-1 bg-slate-950 border border-slate-800 rounded-md text-[10px] text-white font-mono outline-hidden focus:border-brand-blue"
                                    />
                                  </div>
                                  {group.choices.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveChoiceFromGroup(groupIdx, choiceIdx)}
                                      className="text-slate-500 hover:text-red-450 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2.5 pt-1.5 border-t border-slate-850">
                  <button
                    type="button"
                    onClick={() => setIsAddDishFormOpen(false)}
                    className="flex-1 h-8 bg-slate-900 hover:bg-slate-850 text-slate-300 font-bold rounded-lg border border-slate-850 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-8 bg-brand-orange hover:bg-brand-orange/90 text-white font-black rounded-lg cursor-pointer"
                  >
                    Save Dish to Menu
                  </button>
                </div>
              </form>
            ) : null}

            {/* Current Active Menu Items */}
            <div className="space-y-2 pt-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block px-1">
                Active Menu Stock ({activeMerchant?.menu.length || 0} items)
              </span>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {activeMerchant?.menu.map(item => {
                  const isOutOfStock = outOfStockItems.includes(item.id);
                  return (
                    <div key={item.id} className="bg-slate-950 border border-slate-850 rounded-xl p-3 flex justify-between items-center gap-4">
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <h4 className="font-bold text-xs text-slate-100 truncate">{item.name}</h4>
                          {item.options && item.options.length > 0 && (
                            <span className="text-[7px] bg-brand-orange/20 text-brand-orange px-1 rounded-sm font-black uppercase">customizable</span>
                          )}
                          {item.variants && item.variants.length > 0 && (
                            <span className="text-[7px] bg-brand-blue/20 text-brand-blue px-1 rounded-sm font-black uppercase">{item.variants.length} variants</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">
                          {item.variants && item.variants.length > 0
                            ? `£${Math.min(...item.variants.map(v => v.price)).toFixed(2)}-£${Math.max(...item.variants.map(v => v.price)).toFixed(2)}`
                            : `£${item.price.toFixed(2)}`} • {item.category}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onToggleOutOfStockItem(item.id);
                          onAddLog(`MENU_STOCK_TOGGLE: "${item.name}" stock status updated`, 'info');
                        }}
                        className={`h-7 px-3 rounded-lg text-[10px] font-black transition-all cursor-pointer flex-shrink-0 ${
                          isOutOfStock
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}
                      >
                        {isOutOfStock ? 'OUT OF STOCK' : 'IN STOCK'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BUSINESS FINANCES LEDGER */}
        {activeTab === 'finances' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 text-center space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Completed Meals</span>
                <span className="text-xl font-black text-slate-100">{stats.count}</span>
              </div>
              <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 text-center space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Gross Revenue</span>
                <span className="text-xl font-black text-emerald-400">£{stats.gross.toFixed(2)}</span>
              </div>
              <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 text-center space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Commission (5%)</span>
                <span className="text-xl font-black text-red-400">£{stats.commission.toFixed(2)}</span>
              </div>
              <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 text-center space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Net Earnings</span>
                <span className="text-xl font-black text-brand-orange">£{stats.net.toFixed(2)}</span>
              </div>
              <div className="col-span-2 bg-slate-950 border border-slate-850 rounded-xl p-3 text-center space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>Average Rating</span>
                </span>
                {ratingSummary ? (
                  <>
                    <span className="text-xl font-black text-amber-400">{ratingSummary.averageRating.toFixed(1)} ★</span>
                    <p className="text-[9px] text-slate-500">
                      {ratingSummary.computed
                        ? `Computed from ${ratingSummary.totalReviews} real customer review${ratingSummary.totalReviews === 1 ? '' : 's'}`
                        : 'No reviews yet - showing seeded baseline rating'}
                    </p>
                  </>
                ) : (
                  <span className="text-xl font-black text-slate-600">...</span>
                )}
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-slate-400 space-y-2">
              <span className="font-extrabold text-slate-200 block text-[10px] uppercase">Finance Rules</span>
              <p className="leading-relaxed text-[10px]">
                Platform service fee is locked at <b className="text-slate-200">5% of subtotal</b> for our premier UK restaurant partners. Payouts are computed automatically on delivery handovers and wired to your registered merchant account every Thursday.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: ONBOARD A PARTNER RESTAURANT */}
        {activeTab === 'onboard' && (
          <form onSubmit={handleOnboardSubmit} className="space-y-3.5 text-xs">
            {onboardSuccess && (
              <div className="bg-emerald-950 text-emerald-400 border border-emerald-800 p-2 rounded-lg text-[10px] font-bold">
                SUCCESS: Restaurant launched! Profile loaded.
              </div>
            )}

            {/* Business Information (registration/account details) */}
            <div className="space-y-2.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
              <span className="text-[9px] font-extrabold uppercase text-brand-blue flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>Business Information</span>
              </span>
              <div>
                <label className="block text-[9px] font-extrabold uppercase text-slate-500 tracking-wide mb-1">Owner / Contact Name*</label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Priya Kaur"
                  className="w-full h-8 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500 tracking-wide mb-1">Contact Email*</label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@restaurant.co.uk"
                    className="w-full h-8 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500 tracking-wide mb-1">Contact Phone*</label>
                  <input
                    type="tel"
                    required
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="+44 7700 900123"
                    className="w-full h-8 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Restaurant Details (the restaurant's own public profile) */}
            <div className="space-y-2.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
              <span className="text-[9px] font-extrabold uppercase text-brand-orange block">Restaurant Details</span>

              <div>
                <label className="block text-[9px] font-extrabold uppercase text-slate-500 tracking-wide mb-1">New Shop Name*</label>
                <input
                  type="text"
                  required
                  value={restName}
                  onChange={(e) => setRestName(e.target.value)}
                  placeholder="e.g. Piccadilly Roast Diner"
                  className="w-full h-8 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase text-slate-500 tracking-wide mb-1">Cuisine Specialty*</label>
                <input
                  type="text"
                  required
                  value={restCuisine}
                  onChange={(e) => setRestCuisine(e.target.value)}
                  placeholder="e.g. British Pub Roast"
                  className="w-full h-8 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase text-slate-500 tracking-wide mb-1">Street Address*</label>
                <input
                  type="text"
                  required
                  value={restAddress}
                  onChange={(e) => setRestAddress(e.target.value)}
                  placeholder="e.g. 22 Parkway, Camden, London"
                  className="w-full h-8 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500 tracking-wide mb-1">UK Postcode*</label>
                  <input
                    type="text"
                    required
                    value={restPostcode}
                    onChange={(e) => { setRestPostcode(e.target.value.toUpperCase()); setRestPostcodeError(''); }}
                    placeholder="e.g. SW1A 1AA"
                    className="w-full h-8 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono uppercase"
                  />
                  {restPostcodeError && <p className="text-[9px] text-red-400 font-semibold mt-1">{restPostcodeError}</p>}
                </div>
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500 tracking-wide mb-1">Del Fee (£)*</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={restDeliveryFee}
                    onChange={(e) => setRestDeliveryFee(e.target.value)}
                    className="w-full h-8 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase text-slate-500 tracking-wide mb-1">Opening Hours</label>
                <input
                  type="text"
                  value={restOpeningHours}
                  onChange={(e) => setRestOpeningHours(e.target.value)}
                  placeholder="e.g. Mon-Sun 11:00 - 22:00"
                  className="w-full h-8 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[9px] font-extrabold uppercase text-slate-500 tracking-wide mb-1">About This Restaurant</label>
                <textarea
                  value={restAbout}
                  onChange={(e) => setRestAbout(e.target.value)}
                  placeholder="A short description customers will see on your restaurant page..."
                  className="w-full h-14 p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500 tracking-wide mb-1">Logo / Card Image URL</label>
                  <input
                    type="text"
                    value={restImage}
                    onChange={(e) => setRestImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full h-8 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500 tracking-wide mb-1">Banner Image URL</label>
                  <input
                    type="text"
                    value={restBannerImage}
                    onChange={(e) => setRestBannerImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full h-8 px-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-mono"
                  />
                </div>
              </div>

              {/* Starter Dish */}
              <div className="p-2.5 bg-slate-950/50 border border-slate-850 rounded-lg space-y-2">
                <span className="text-[9px] font-extrabold uppercase text-brand-orange">Starter Dish</span>
                <div>
                  <input
                    type="text"
                    placeholder="Dish Name"
                    value={dishName}
                    onChange={(e) => setDishName(e.target.value)}
                    className="w-full h-7 px-2.5 bg-slate-950 border border-slate-800 rounded-md text-xs mb-1.5"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    value={dishPrice}
                    onChange={(e) => setDishPrice(e.target.value)}
                    className="w-full h-7 px-2.5 bg-slate-950 border border-slate-800 rounded-md text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-8.5 bg-brand-orange hover:bg-brand-orange/95 text-white font-extrabold text-xs rounded-lg flex items-center justify-center gap-1 shadow-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 animate-pulse" />
              <span>Onboard & Open New Shop</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
