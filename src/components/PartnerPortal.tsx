import React, { useState } from 'react';
import { Store, Bike, Check, AlertCircle, RefreshCw, Smartphone, Play, CheckCircle, Plus, Users, Landmark, Utensils, HelpCircle } from 'lucide-react';
import { Order, OrderStatus, Restaurant, MenuItem } from '../types';

interface PartnerPortalProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onClearHistory: () => void;
  restaurants: Restaurant[];
  onOnboardRestaurant: (restaurant: Restaurant) => void;
  drivers: { name: string; phone: string; vehicle: string }[];
  onOnboardDriver: (driver: { name: string; phone: string; vehicle: string }) => void;
}

export default function PartnerPortal({
  orders,
  onUpdateOrderStatus,
  onClearHistory,
  restaurants,
  onOnboardRestaurant,
  drivers,
  onOnboardDriver
}: PartnerPortalProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'kitchen' | 'onboard-restaurant' | 'driver' | 'onboard-driver'>('kitchen');

  // Restaurant Onboarding Form State
  const [restName, setRestName] = useState('');
  const [restCuisine, setRestCuisine] = useState('British / Gastro');
  const [restPostcode, setRestPostcode] = useState('NW1 0NE');
  const [restDeliveryFee, setRestDeliveryFee] = useState('1.99');
  const [restMinOrder, setRestMinOrder] = useState('10.00');
  const [restImage, setRestImage] = useState('https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=500&q=80');
  const [restBanner, setRestBanner] = useState('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80');
  const [restAddress, setRestAddress] = useState('12 Parkway, Camden, London');
  
  // Custom Starter Dishes
  const [dish1Name, setDish1Name] = useState('Signature Fish Fillet & Truffle Chips');
  const [dish1Price, setDish1Price] = useState('14.50');
  const [dish1Desc, setDish1Desc] = useState('Premium cod fillet in golden light tempura batter, served with twice-cooked rosemary truffle chips.');
  
  const [dish2Name, setDish2Name] = useState('Classic Sticky Toffee Pudding');
  const [dish2Price, setDish2Price] = useState('6.20');
  const [dish2Desc, setDish2Desc] = useState('Rich steamed sponge with fresh dates, drenched in dark warm toffee butter sauce.');

  const [onboardSuccess, setOnboardSuccess] = useState(false);

  // Driver Onboarding Form State
  const [driverName, setDriverNameInput] = useState('');
  const [driverPhone, setDriverPhoneInput] = useState('');
  const [driverVehicle, setDriverVehicle] = useState('Electric Scooter');
  const [driverSuccess, setDriverSuccess] = useState(false);

  // Image Presets for Easy Onboarding Clicking
  const foodPresets = [
    {
      thumb: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=500&q=80',
      banner: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
      label: 'Classic Bistro'
    },
    {
      thumb: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=500&q=80',
      banner: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=80',
      label: 'Gourmet Chip Shop'
    },
    {
      thumb: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=500&q=80',
      banner: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80',
      label: 'Vegan Bakery'
    }
  ];

  // Submit Restaurant Handler
  const handleOnboardRestaurantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restName.trim()) return;

    const newId = `rest-custom-${Date.now()}`;
    const newRestaurant: Restaurant = {
      id: newId,
      name: restName,
      rating: 5.0,
      reviewsCount: 1,
      deliveryTimeRange: [20, 30],
      deliveryFee: parseFloat(restDeliveryFee) || 0,
      minOrder: parseFloat(restMinOrder) || 10.0,
      cuisine: restCuisine,
      image: restImage,
      bannerImage: restBanner,
      address: restAddress || 'London Central High St',
      postcode: restPostcode.toUpperCase(),
      featured: true,
      discountOffer: 'Brand New Launch Special',
      menu: [
        {
          id: `${newId}-m1`,
          name: dish1Name || 'Signature Specialty',
          description: dish1Desc || 'Chef recommended special dish, crafted fresh daily.',
          price: parseFloat(dish1Price) || 12.0,
          image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
          category: 'Mains'
        },
        {
          id: `${newId}-m2`,
          name: dish2Name || 'Gourmet Dessert',
          description: dish2Desc || 'Traditional sweet finish made with organic local ingredients.',
          price: parseFloat(dish2Price) || 5.0,
          image: 'https://images.unsplash.com/photo-1508737804141-4c3b688e2546?auto=format&fit=crop&w=300&q=80',
          category: 'Desserts'
        }
      ]
    };

    onOnboardRestaurant(newRestaurant);
    setOnboardSuccess(true);
    // Reset Name
    setRestName('');
    setTimeout(() => setOnboardSuccess(false), 5000);
  };

  // Submit Driver Handler
  const handleOnboardDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim()) return;

    onOnboardDriver({
      name: driverName,
      phone: driverPhone || '+44 7700 900111',
      vehicle: driverVehicle
    });

    setDriverSuccess(true);
    setDriverNameInput('');
    setDriverPhoneInput('');
    setTimeout(() => setDriverSuccess(false), 5000);
  };

  // Filter orders
  const activeOrders = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
  const pastOrders = orders.filter(o => o.status === 'Delivered' || o.status === 'Cancelled');

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6" id="partner-portal-view">
      {/* Intro Header */}
      <div className="bg-brand-blue text-white p-6 sm:p-8 rounded-2xl border border-brand-blue/10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Landmark className="w-48 h-48" />
        </div>
        <div className="relative z-10 space-y-2">
          <span className="bg-brand-orange text-white font-black text-[10px] tracking-widest px-2.5 py-1 rounded-full uppercase">
            GO-ZOON ENGINE
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">
            Onboarding & Driver Portal
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
            Go-Zoon's UK market rollout is powered by direct, real-time sync across three stakeholders. 
            Use this panel to onboard local restaurants, sign up courier dispatchers, and simulate kitchen preps instantly.
          </p>
        </div>
      </div>

      {/* Switch Portal Role Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 bg-gray-100 p-1 rounded-xl gap-1 max-w-3xl mx-auto" id="portal-role-tabs">
        <button
          onClick={() => setActiveTab('kitchen')}
          className={`py-3 rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'kitchen'
              ? 'bg-brand-blue text-white shadow-md'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Kitchen Orders ({activeOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('onboard-restaurant')}
          className={`py-3 rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'onboard-restaurant'
              ? 'bg-brand-blue text-white shadow-md'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Plus className="w-3.5 h-3.5 text-brand-orange" />
          <span>Onboard Shop</span>
        </button>

        <button
          onClick={() => setActiveTab('driver')}
          className={`py-3 rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'driver'
              ? 'bg-brand-blue text-white shadow-md'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Bike className="w-3.5 h-3.5" />
          <span>Courier Fleet</span>
        </button>

        <button
          onClick={() => setActiveTab('onboard-driver')}
          className={`py-3 rounded-lg text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'onboard-driver'
              ? 'bg-brand-blue text-white shadow-md'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-brand-orange" />
          <span>Courier Onboard</span>
        </button>
      </div>

      {/* Main Content Pane */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-sm p-6 sm:p-8">
        
        {/* TAB 1: KITCHEN MANIFEST (EXISTING INCOMING ORDERS) */}
        {activeTab === 'kitchen' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-brand-blue flex items-center gap-2">
                  <Store className="w-5 h-5 text-brand-orange" />
                  <span>Incoming Go-Zoon Merchant Prep Tickets</span>
                </h3>
                <p className="text-xs text-gray-400">Accept and prepare orders received from UK postcode zones.</p>
              </div>
              {orders.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer transition-colors"
                >
                  Clear Simulation Database
                </button>
              )}
            </div>

            {activeOrders.length === 0 ? (
              <div className="py-16 text-center text-gray-400 space-y-4">
                <div className="w-12 h-12 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-800">No active kitchen orders right now</p>
                  <p className="text-xs max-w-md mx-auto text-gray-400">
                    To test the flow: return to the Store, select a restaurant, add some delicious British bites to your basket, checkout, and watch the order appear here instantly!
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeOrders.map(order => (
                  <div key={order.id} className="border border-gray-200 rounded-xl p-4 space-y-4 shadow-2xs relative hover:border-brand-blue/30 transition-all">
                    {/* Header info */}
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono bg-brand-blue/10 text-brand-blue font-bold px-2 py-0.5 rounded-sm">ORDER ID: #{order.id}</span>
                        <h4 className="font-extrabold text-sm text-neutral-900 mt-1.5">{order.restaurantName}</h4>
                        <p className="text-[10px] text-gray-400 font-medium">To: {order.deliveryAddress}, {order.deliveryPostcode}</p>
                      </div>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                        order.status === 'Placed' ? 'bg-orange-100 text-brand-orange' :
                        order.status === 'Preparing' ? 'bg-blue-100 text-brand-blue' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="border-t border-b border-gray-50 py-2.5 text-xs space-y-1.5">
                      {order.items.map(item => (
                        <div key={item.id} className="flex justify-between font-semibold text-gray-700">
                          <span>{item.quantity}x {item.menuItem.name}</span>
                          <span className="text-brand-blue">£{(item.menuItem.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Actions based on current status */}
                    <div className="flex gap-2">
                      {order.status === 'Placed' && (
                        <button
                          onClick={() => onUpdateOrderStatus(order.id, 'Preparing')}
                          className="flex-1 h-10 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Accept & Begin Prep</span>
                        </button>
                      )}
                      {order.status === 'Preparing' && (
                        <button
                          onClick={() => onUpdateOrderStatus(order.id, 'OutForDelivery')}
                          className="flex-1 h-10 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Mark Ready & Page Rider</span>
                        </button>
                      )}
                      {order.status === 'OutForDelivery' && (
                        <div className="flex-1 bg-gray-50 border border-gray-150 rounded-lg py-2 px-3 text-center text-xs text-brand-blue font-semibold flex items-center justify-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-orange" />
                          <span>Courier ({order.driverName || 'Rider'}) is out for delivery...</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ONBOARD A RESTAURANT (DYNAMIC ADDITION) */}
        {activeTab === 'onboard-restaurant' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-extrabold text-lg text-brand-blue flex items-center gap-2">
                <Utensils className="w-5 h-5 text-brand-orange" />
                <span>Onboard a New British Food Partner</span>
              </h3>
              <p className="text-xs text-gray-400">Instantly launch your local merchant kitchen onto the Go-Zoon UK marketplace index.</p>
            </div>

            {onboardSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center gap-2 animate-bounce">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                <span>SUCCESS: Restaurant onboarded! It is now instantly searchable on the main marketplace index list. Try backing out to the store to order!</span>
              </div>
            )}

            <form onSubmit={handleOnboardRestaurantSubmit} className="space-y-6">
              
              {/* Preset Visual Chooser */}
              <div>
                <span className="block text-xs font-extrabold text-brand-blue uppercase tracking-wider mb-2">Preset Image Styling</span>
                <div className="grid grid-cols-3 gap-3">
                  {foodPresets.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setRestImage(p.thumb);
                        setRestBanner(p.banner);
                      }}
                      className={`p-2 border rounded-lg text-left transition-all ${
                        restImage === p.thumb 
                          ? 'border-brand-orange bg-brand-orange/5 ring-1 ring-brand-orange' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="h-10 w-full overflow-hidden rounded bg-gray-100">
                        <img src={p.thumb} alt={p.label} className="h-full w-full object-cover" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-700 mt-1 block truncate">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Two Column details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-brand-blue uppercase tracking-wider mb-1">Restaurant Name*</label>
                  <input
                    type="text"
                    required
                    value={restName}
                    onChange={(e) => setRestName(e.target.value)}
                    placeholder="e.g. Piccadilly Sunday Roast Co."
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-brand-blue uppercase tracking-wider mb-1">Cuisine Specialty*</label>
                  <input
                    type="text"
                    required
                    value={restCuisine}
                    onChange={(e) => setRestCuisine(e.target.value)}
                    placeholder="e.g. British / Pub Roast"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-brand-blue uppercase tracking-wider mb-1">UK Postcode Zone*</label>
                  <select
                    value={restPostcode}
                    onChange={(e) => setRestPostcode(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
                  >
                    <option value="SW1A 1AA">SW1A 1AA (Westminster)</option>
                    <option value="EC1A 1BB">EC1A 1BB (City of London)</option>
                    <option value="NW1 0NE">NW1 0NE (Camden)</option>
                    <option value="E1 6QL">E1 6QL (Shoreditch)</option>
                    <option value="W8 4SG">W8 4SG (Kensington)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-brand-blue uppercase tracking-wider mb-1">Street Address</label>
                  <input
                    type="text"
                    value={restAddress}
                    onChange={(e) => setRestAddress(e.target.value)}
                    placeholder="e.g. 74 Piccadilly, London"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-brand-blue uppercase tracking-wider mb-1">Standard Delivery Fee (£)*</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={restDeliveryFee}
                    onChange={(e) => setRestDeliveryFee(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-brand-blue uppercase tracking-wider mb-1">Minimum Order (£)*</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={restMinOrder}
                    onChange={(e) => setRestMinOrder(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
              </div>

              {/* Starter Menu Builder */}
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <span className="block text-xs font-extrabold text-brand-blue uppercase tracking-wider">Quick Launch Starter Menu</span>
                
                {/* Dish 1 */}
                <div className="p-4 bg-gray-50/50 border border-gray-150 rounded-xl space-y-3">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Primary Dish Name</label>
                      <input
                        type="text"
                        value={dish1Name}
                        onChange={(e) => setDish1Name(e.target.value)}
                        className="w-full h-8 px-2.5 border border-gray-200 rounded-md text-xs"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Price (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={dish1Price}
                        onChange={(e) => setDish1Price(e.target.value)}
                        className="w-full h-8 px-2.5 border border-gray-200 rounded-md text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Dish Description</label>
                    <input
                      type="text"
                      value={dish1Desc}
                      onChange={(e) => setDish1Desc(e.target.value)}
                      className="w-full h-8 px-2.5 border border-gray-200 rounded-md text-xs"
                    />
                  </div>
                </div>

                {/* Dish 2 */}
                <div className="p-4 bg-gray-50/50 border border-gray-150 rounded-xl space-y-3">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Dessert/Side Name</label>
                      <input
                        type="text"
                        value={dish2Name}
                        onChange={(e) => setDish2Name(e.target.value)}
                        className="w-full h-8 px-2.5 border border-gray-200 rounded-md text-xs"
                      />
                    </div>
                    <div className="w-24">
                      <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Price (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={dish2Price}
                        onChange={(e) => setDish2Price(e.target.value)}
                        className="w-full h-8 px-2.5 border border-gray-200 rounded-md text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Dish Description</label>
                    <input
                      type="text"
                      value={dish2Desc}
                      onChange={(e) => setDish2Desc(e.target.value)}
                      className="w-full h-8 px-2.5 border border-gray-200 rounded-md text-xs"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-brand-orange hover:bg-brand-orange/95 text-white font-extrabold text-sm rounded-lg flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Onboard and Launch Shop</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: COURIER MANIFEST & ACTIVE JOBS */}
        {activeTab === 'driver' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-brand-blue flex items-center gap-2">
                  <Bike className="w-5 h-5 text-brand-orange" />
                  <span>Courier Delivery Manifest Simulator</span>
                </h3>
                <p className="text-xs text-gray-400">Dave Henderson, Sarah Jenkins, and your onboarded couriers deliver streetside.</p>
              </div>
            </div>

            {activeOrders.filter(o => o.status === 'Preparing' || o.status === 'OutForDelivery').length === 0 ? (
              <div className="py-16 text-center text-gray-400 space-y-4">
                <div className="w-12 h-12 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto">
                  <Bike className="w-6 h-6 text-gray-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-800">No active street courier jobs right now</p>
                  <p className="text-xs max-w-md mx-auto text-gray-400">
                    Orders must first be accepted and marked as ready in the kitchen "Kitchen Orders" panel, after which couriers are dispatched onto the road!
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeOrders.filter(o => o.status === 'Preparing' || o.status === 'OutForDelivery').map(order => (
                  <div key={order.id} className="border border-brand-orange/20 bg-brand-orange/5 rounded-xl p-4 space-y-4 shadow-2xs hover:border-brand-orange/40 transition-all">
                    <div>
                      <span className="text-[10px] font-mono text-brand-orange font-bold bg-white border border-brand-orange/15 px-2 py-0.5 rounded-sm">JOB ID: #{order.id}</span>
                      <h4 className="font-extrabold text-sm text-neutral-900 mt-2">Pick up: {order.restaurantName}</h4>
                      <p className="text-[10px] text-gray-500 font-semibold">Deliver to: {order.deliveryAddress} ({order.deliveryPostcode})</p>
                    </div>

                    <div className="bg-white border border-gray-150 rounded-lg p-3 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-gray-800">
                        <span>Courier Fee Earned:</span>
                        <span className="text-brand-orange font-extrabold">£4.85</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                        <span>Assigned Rider:</span>
                        <span>{order.driverName} ({order.driverPhone})</span>
                      </div>
                    </div>

                    {order.status === 'Preparing' && (
                      <div className="bg-brand-blue/5 text-brand-blue border border-brand-blue/10 p-3 rounded-lg text-xs font-bold flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 animate-bounce text-brand-orange" />
                        <span>Rider waiting for restaurant kitchen to prepare order...</span>
                      </div>
                    )}

                    {order.status === 'OutForDelivery' && (
                      <button
                        onClick={() => onUpdateOrderStatus(order.id, 'Delivered')}
                        className="w-full h-10 bg-brand-orange hover:bg-brand-orange/95 text-white font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Arrived & Confirm Customer Handover</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: COURIER SIGN UP (ONBOARD DELIVERY PARTNERS) */}
        {activeTab === 'onboard-driver' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-extrabold text-lg text-brand-blue flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-orange" />
                <span>Onboard as a Go-Zoon Delivery Partner</span>
              </h3>
              <p className="text-xs text-gray-400">Join our local courier dispatch fleet. Ride, deliver, and earn flat competitive fees across central London hubs.</p>
            </div>

            {driverSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center gap-2 animate-bounce">
                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                <span>SUCCESS: Courier profile created and added to available driver dispatcher pool! New orders can now be dynamically assigned to this rider.</span>
              </div>
            )}

            <form onSubmit={handleOnboardDriverSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-brand-blue uppercase tracking-wider mb-1">Rider Full Name*</label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverNameInput(e.target.value)}
                    placeholder="e.g. Liam Fitzpatrick"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-brand-blue uppercase tracking-wider mb-1">Contact Phone Number*</label>
                  <input
                    type="text"
                    required
                    value={driverPhone}
                    onChange={(e) => setDriverPhoneInput(e.target.value)}
                    placeholder="e.g. +44 7911 889933"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-brand-blue uppercase tracking-wider mb-1">Vehicle Category*</label>
                  <select
                    value={driverVehicle}
                    onChange={(e) => setDriverVehicle(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
                  >
                    <option value="Bicycle">Bicycle (Eco Friendly)</option>
                    <option value="Electric Scooter">Electric Scooter (Camden Hubs)</option>
                    <option value="Cargo Moped">Cargo Moped (Westminster Fast Delivery)</option>
                    <option value="Tesla EV">Tesla Electric Car (Gourmet Catering)</option>
                  </select>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-brand-orange flex-shrink-0 mt-0.5" />
                  <div className="text-[11px] text-gray-500 leading-relaxed font-semibold">
                    <span className="font-extrabold text-brand-blue block mb-0.5">Flat Rates Incentive</span>
                    Earn £4.85 base fee on every delivery under 2.5 miles with 100% customer tips. Equipment (glowing orange Go-Zoon thermal bags) provided free during launch week.
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-brand-orange hover:bg-brand-orange/95 text-white font-extrabold text-sm rounded-lg flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register and Join Courier Pool</span>
              </button>
            </form>

            <div className="pt-4 border-t border-gray-150">
              <span className="block text-xs font-extrabold text-brand-blue uppercase tracking-wider mb-3">Onboarded Active Dispatchers</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {drivers.map((d, idx) => (
                  <div key={idx} className="border border-gray-200 p-3 rounded-lg text-xs space-y-1">
                    <div className="font-bold text-gray-800 truncate">{d.name}</div>
                    <div className="text-[10px] text-gray-400 font-semibold">{d.vehicle}</div>
                    <div className="text-[10px] text-brand-blue font-bold truncate">{d.phone}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* History Log */}
        {pastOrders.length > 0 && (
          <div className="mt-8 border-t border-gray-150 pt-6">
            <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-3">Go-Zoon Completed Deliveries Archive</h4>
            <div className="space-y-2">
              {pastOrders.map(order => (
                <div key={order.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg bg-gray-50/50 text-xs hover:border-emerald-200 transition-all">
                  <div>
                    <span className="font-bold text-brand-blue">Order #{order.id}</span>
                    <span className="text-gray-400 font-medium"> • {order.restaurantName} to {order.deliveryPostcode} by {order.driverName || 'Rider'}</span>
                  </div>
                  <span className="font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    <span>Delivered</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
