import React, { useState } from 'react';
import { Store, Check, Play, AlertCircle, ShoppingBag, Plus, Utensils, Award, TrendingUp, DollarSign, X, HelpCircle, EyeOff } from 'lucide-react';
import { Order, OrderStatus, Restaurant, MenuItem } from '../../types';

interface GoZoonBusinessProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  restaurantsList: Restaurant[];
  closedRestaurants: string[];
  onToggleClosedRestaurant: (id: string) => void;
  outOfStockItems: string[];
  onToggleOutOfStockItem: (id: string) => void;
  onOnboardRestaurant: (restaurant: Restaurant) => void;
  onAddDishToRestaurant: (restaurantId: string, menuItem: MenuItem) => void;
  onAddLog: (event: string, type: 'info' | 'success' | 'warning') => void;
}

export default function GoZoonBusiness({
  orders,
  onUpdateOrderStatus,
  restaurantsList,
  closedRestaurants,
  onToggleClosedRestaurant,
  outOfStockItems,
  onToggleOutOfStockItem,
  onOnboardRestaurant,
  onAddDishToRestaurant,
  onAddLog
}: GoZoonBusinessProps): React.JSX.Element {
  // Business app allows choosing which restaurant profile we are logged into
  const [selectedRestId, setSelectedRestId] = useState<string>(restaurantsList[0]?.id || 'rest-1');
  const [activeTab, setActiveTab] = useState<'incoming' | 'menu' | 'finances' | 'onboard'>('incoming');

  // New onboarding shop state
  const [restName, setRestName] = useState('');
  const [restCuisine, setRestCuisine] = useState('British Comfort');
  const [restPostcode, setRestPostcode] = useState('NW1 0NE');
  const [restDeliveryFee, setRestDeliveryFee] = useState('2.49');
  const [restMinOrder, setRestMinOrder] = useState('10.00');
  const [restAddress, setRestAddress] = useState('22 Parkway, Camden, London');
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
  const [newDishDesc, setNewDishDesc] = useState('');
  const [newDishDietary, setNewDishDietary] = useState<('Vegan' | 'Vegetarian' | 'Gluten-Free' | 'Halal')[]>([]);
  const [customOptions, setCustomOptions] = useState<{
    name: string;
    type: 'select' | 'checkbox';
    required: boolean;
    choices: { name: string; price: number }[];
  }[]>([]);

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

    const newMenuItem: MenuItem = {
      id: `m-${Date.now()}`,
      name: newDishName.trim(),
      description: newDishDesc.trim(),
      price: parseFloat(newDishPrice) || 0,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
      category: newDishCategory,
      dietary: newDishDietary.length > 0 ? newDishDietary : undefined,
      options: formattedOptions.length > 0 ? formattedOptions : undefined
    };

    onAddDishToRestaurant(activeMerchant.id, newMenuItem);
    onAddLog(`MENU_ADD_DISH: "${newDishName}" added to "${activeMerchant.name}" menu`, 'success');

    // Reset Form
    setNewDishName('');
    setNewDishPrice('');
    setNewDishCategory('Mains');
    setNewDishDesc('');
    setNewDishDietary([]);
    setCustomOptions([]);
    setIsAddDishFormOpen(false);
  };

  const activeMerchant = restaurantsList.find(r => r.id === selectedRestId) || restaurantsList[0];
  const isClosed = closedRestaurants.includes(activeMerchant?.id);

  // Filter orders for this restaurant
  const merchantOrders = orders.filter(o => o.restaurantId === activeMerchant?.id);
  const incomingOrders = merchantOrders.filter(o => o.status === 'Placed');
  const activePreps = merchantOrders.filter(o => o.status === 'Preparing');
  const historyOrders = merchantOrders.filter(o => o.status === 'Delivered' || o.status === 'Cancelled' || o.status === 'OutForDelivery');

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restName.trim()) return;

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
      image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=300&q=80',
      bannerImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
      address: restAddress,
      postcode: restPostcode.toUpperCase(),
      featured: false,
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
    onAddLog(`ONBOARD_RESTAURANT: New restaurant "${restName}" onboarded to zone ${restPostcode}`, 'success');
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
      <div className="bg-slate-950 p-4 border-b border-slate-800 space-y-3 flex-shrink-0 sticky top-0 z-30 shadow-md">
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
                          <span>{item.quantity}x {item.menuItem.name}</span>
                          <span className="text-brand-orange font-bold">£{(item.menuItem.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        onUpdateOrderStatus(order.id, 'Preparing');
                        onAddLog(`KITCHEN_ACCEPTED: Order #${order.id} is now in preparation at ${activeMerchant.name}`, 'info');
                      }}
                      className="w-full h-8.5 bg-brand-orange hover:bg-brand-orange/95 text-white font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>Accept Ticket & Begin Cooking</span>
                    </button>
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
                activePreps.map(order => (
                  <div key={order.id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-3 shadow-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-mono text-brand-blue bg-brand-blue/10 border border-brand-blue/20 px-2 py-0.5 rounded-sm font-bold">PREP ID: #{order.id}</span>
                        <div className="text-[10px] text-slate-400 font-bold mt-1.5">Zone: {order.deliveryPostcode}</div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-full animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-ping"></span>
                        <span>Cooking...</span>
                      </div>
                    </div>

                    <div className="border-t border-b border-slate-850 py-2 text-xs space-y-1">
                      {order.items.map(item => (
                        <div key={item.id} className="flex justify-between text-slate-300">
                          <span>{item.quantity}x {item.menuItem.name}</span>
                          <span>£{(item.menuItem.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        onUpdateOrderStatus(order.id, 'OutForDelivery');
                        onAddLog(`ORDER_DISPATCHED: Order #${order.id} dispatched from ${activeMerchant.name} to Courier ${order.driverName}`, 'success');
                      }}
                      className="w-full h-8.5 bg-brand-blue hover:bg-brand-blue/95 text-white font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Ready! Dispatch to Road King Rider</span>
                    </button>
                  </div>
                ))
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
                      </div>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                        order.status === 'OutForDelivery' ? 'bg-brand-orange/10 text-brand-orange border border-brand-orange/20 animate-pulse' :
                        order.status === 'Cancelled' ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'
                      }`}>
                        {order.status === 'OutForDelivery' ? 'In Transit' : order.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: MENU STOCK CONTROLLER */}
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
                      <label className="block text-[8px] font-extrabold uppercase text-slate-500 tracking-wide mb-0.5">Price (£)*</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={newDishPrice}
                        onChange={(e) => setNewDishPrice(e.target.value)}
                        placeholder="5.50"
                        className="w-full h-8 px-2 bg-slate-900 border border-slate-800 rounded-lg text-[11px] font-mono text-white outline-hidden focus:border-brand-blue"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] font-extrabold uppercase text-slate-500 tracking-wide mb-0.5">Category*</label>
                      <select
                        value={newDishCategory}
                        onChange={(e) => setNewDishCategory(e.target.value)}
                        className="w-full h-8 px-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[11px] text-white font-bold outline-hidden focus:border-brand-blue"
                      >
                        <option value="Mains">Mains</option>
                        <option value="Sides">Sides</option>
                        <option value="Desserts">Desserts</option>
                        <option value="Drinks">Drinks</option>
                      </select>
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
                      No customizations added. Default option (Size: Standard/Large) will apply.<br/>
                      <span className="text-slate-400 font-bold">Click "Add Option Group" to configure custom toppings/toppings.</span>
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
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">£{item.price.toFixed(2)} • {item.category}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onToggleOutOfStockItem(item.id);
                          onAddLog(`MENU_STOCK_TOGGLE: "${item.name}" stock status updated`, 'info');
                        }}
                        className={`h-7 px-3 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
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

            <div className="space-y-2.5">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-extrabold uppercase text-slate-500 tracking-wide mb-1">Zone Postcode*</label>
                  <select
                    value={restPostcode}
                    onChange={(e) => setRestPostcode(e.target.value)}
                    className="w-full h-8 px-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold"
                  >
                    <option value="SW1A 1AA">SW1A 1AA (Westminster)</option>
                    <option value="EC1A 1BB">EC1A 1BB (City)</option>
                    <option value="NW1 0NE">NW1 0NE (Camden)</option>
                    <option value="E1 6QL">E1 6QL (Shoreditch)</option>
                  </select>
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

              {/* Dish */}
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
