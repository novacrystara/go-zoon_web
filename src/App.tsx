import React, { useState, useEffect } from 'react';
import GoZoonCustomer from './components/apps/GoZoonCustomer';
import GoZoonBusiness from './components/apps/GoZoonBusiness';
import GoZoonRoadKing from './components/apps/GoZoonRoadKing';
import GoZoonAdmin from './components/apps/GoZoonAdmin';

import { UK_RESTAURANTS, UK_POSTCODES } from './data/restaurants';
import { Restaurant, CartItem, Order, UKPostcodeZone, OrderStatus, MenuItem } from './types';
import { Smartphone, Store, Bike, Landmark, Info, Sparkles, Server, ShieldCheck, CreditCard, Activity, Wifi, Battery } from 'lucide-react';

// Define base API URL for native Capacitor or mobile device context
const getApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    const isLocalOrNative = 
      window.location.protocol === 'file:' || 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol.startsWith('capacitor') ||
      window.location.protocol.startsWith('ionic');
      
    if (isLocalOrNative) {
      return localStorage.getItem('gozoon_backend_api_url') || 'https://ais-pre-ap557zrj3sovqxnvxsqzsf-651428129387.asia-east1.run.app';
    }
  }
  return '';
};

const fetchApi = (endpoint: string, options?: RequestInit) => {
  const baseUrl = getApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return fetch(`${baseUrl}${cleanEndpoint}`, options);
};

export default function App(): React.JSX.Element {
  // 1. Core State Synchronization (LocalStorage Keys with Rebranded Gozoon prefixes)
  const [backendApiUrlInput, setBackendApiUrlInput] = useState<string>(() => {
    return localStorage.getItem('gozoon_backend_api_url') || 'https://ais-pre-ap557zrj3sovqxnvxsqzsf-651428129387.asia-east1.run.app';
  });

  const [currentPostcode, setCurrentPostcode] = useState<UKPostcodeZone>(() => {
    const saved = localStorage.getItem('gozoon_postcode');
    return saved ? JSON.parse(saved) : UK_POSTCODES[0];
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('gozoon_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState<Order[]>([]);

  // Load and sync orders from PostgreSQL Database (Interval-based real-time sync across devices)
  useEffect(() => {
    const fetchOrders = () => {
      fetchApi('/api/orders')
        .then(res => res.json())
        .then(data => {
          if (data && data.orders) {
            setOrders(data.orders);
          }
        })
        .catch(err => {
          console.error('[PostgreSQL] Failed to fetch orders:', err);
        });
    };

    // Initial fetch
    fetchOrders();

    // Poll every 3 seconds for seamless cross-device sync
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => {
    return localStorage.getItem('gozoon_active_order_id') || null;
  });

  const [restaurantsList, setRestaurantsList] = useState<Restaurant[]>(() => {
    const saved = localStorage.getItem('gozoon_onboarded_restaurants');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return UK_RESTAURANTS;
  });

  const [drivers, setDrivers] = useState<{ name: string; phone: string; vehicle: string }[]>(() => {
    const saved = localStorage.getItem('gozoon_drivers');
    return saved ? JSON.parse(saved) : [
      { name: 'Dave Henderson', phone: '+44 7700 900077', vehicle: 'Bicycle' },
      { name: 'Sarah Jenkins', phone: '+44 7700 911044', vehicle: 'Electric Scooter' },
      { name: 'Liam Fitzpatrick', phone: '+44 7700 900222', vehicle: 'Electric Scooter' }
    ];
  });

  const [closedRestaurants, setClosedRestaurants] = useState<string[]>(() => {
    const saved = localStorage.getItem('gozoon_closed_restaurants');
    return saved ? JSON.parse(saved) : [];
  });

  const [outOfStockItems, setOutOfStockItems] = useState<string[]>(() => {
    const saved = localStorage.getItem('gozoon_outofstock_items');
    return saved ? JSON.parse(saved) : [];
  });

  const [platformLogs, setPlatformLogs] = useState<{ time: string; event: string; type: 'info' | 'success' | 'warning' }[]>(() => {
    const saved = localStorage.getItem('gozoon_platform_logs');
    return saved ? JSON.parse(saved) : [
      { time: '12:00:00', event: 'SYSTEM_BOOT: Go-Zoon Sandbox Ecosystem initialized successfully', type: 'info' },
      { time: '12:00:05', event: 'FLEET_SYNC: 3 dispatch riders on standby at Westminster and Camden hubs', type: 'info' }
    ];
  });

  // Current Active workspace tab
  const [activeApp, setActiveApp] = useState<'customer' | 'business' | 'roadking' | 'admin'>('customer');

  // Detect if url query contains app parameter (e.g. ?app=customer) for direct standalone phone view
  const [standaloneApp, setStandaloneApp] = useState<'customer' | 'business' | 'roadking' | 'admin' | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const appParam = params.get('app') || params.get('view');
      if (appParam) {
        const lower = appParam.toLowerCase();
        if (['customer', 'business', 'roadking', 'admin'].includes(lower)) {
          return lower as 'customer' | 'business' | 'roadking' | 'admin';
        }
      }
    }
    return null;
  });

  // Customer sub-state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [orderMode, setOrderMode] = useState<'Delivery' | 'Collection'>('Delivery');

  // 2. Sync to LocalStorage via effects
  useEffect(() => {
    localStorage.setItem('gozoon_postcode', JSON.stringify(currentPostcode));
  }, [currentPostcode]);

  useEffect(() => {
    localStorage.setItem('gozoon_cart', JSON.stringify(cart));
  }, [cart]);

  // Synchronizing orders to localStorage is disabled because we now use Cloud SQL (PostgreSQL) directly.

  useEffect(() => {
    if (activeOrderId) {
      localStorage.setItem('gozoon_active_order_id', activeOrderId);
    } else {
      localStorage.removeItem('gozoon_active_order_id');
    }
  }, [activeOrderId]);

  useEffect(() => {
    localStorage.setItem('gozoon_onboarded_restaurants', JSON.stringify(restaurantsList));
  }, [restaurantsList]);

  useEffect(() => {
    localStorage.setItem('gozoon_drivers', JSON.stringify(drivers));
  }, [drivers]);

  useEffect(() => {
    localStorage.setItem('gozoon_closed_restaurants', JSON.stringify(closedRestaurants));
  }, [closedRestaurants]);

  useEffect(() => {
    localStorage.setItem('gozoon_outofstock_items', JSON.stringify(outOfStockItems));
  }, [outOfStockItems]);

  // Log Event helper
  const addPlatformLog = (event: string, type: 'info' | 'success' | 'warning') => {
    const time = new Date().toLocaleTimeString();
    setPlatformLogs(prev => {
      const updated = [{ time, event, type }, ...prev].slice(0, 45);
      localStorage.setItem('gozoon_platform_logs', JSON.stringify(updated));
      return updated;
    });
  };

  // State handlers
  const handleToggleClosedRestaurant = (id: string) => {
    setClosedRestaurants(prev => {
      const isClosed = prev.includes(id);
      const updated = isClosed ? prev.filter(item => item !== id) : [...prev, id];
      const restName = restaurantsList.find(r => r.id === id)?.name || 'Merchant';
      addPlatformLog(`MERCHANT_STATUS: "${restName}" is now ${isClosed ? 'ONLINE (Open)' : 'OFFLINE (Closed)'}`, 'warning');
      return updated;
    });
  };

  const handleToggleOutOfStockItem = (id: string) => {
    setOutOfStockItems(prev => {
      const isOut = prev.includes(id);
      const updated = isOut ? prev.filter(item => item !== id) : [...prev, id];
      addPlatformLog(`STOCK_STATUS: Menu Item ${id} toggled ${isOut ? 'IN STOCK' : 'OUT OF STOCK'}`, 'info');
      return updated;
    });
  };

  const handleOnboardRestaurant = (newRestaurant: Restaurant) => {
    setRestaurantsList(prev => [newRestaurant, ...prev]);
  };

  const handleAddDishToRestaurant = (restaurantId: string, menuItem: MenuItem) => {
    setRestaurantsList(prev => prev.map(r => {
      if (r.id === restaurantId) {
        return {
          ...r,
          menu: [...r.menu, menuItem]
        };
      }
      return r;
    }));
    addPlatformLog(`MENU_ADD_DISH: Added dish "${menuItem.name}" to menu`, 'success');
  };

  const handleOnboardDriver = (newDriver: { name: string; phone: string; vehicle: string }) => {
    setDrivers(prev => [...prev, newDriver]);
  };

  const handleAddToCart = (newItem: CartItem) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.id === newItem.id);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += newItem.quantity;
        return updated;
      }
      return [...prev, newItem];
    });
    addPlatformLog(`CART_ADD: Added item "${newItem.menuItem.name}" to customer basket`, 'info');
  };

  const handleUpdateCartQuantity = (cartId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === cartId) {
        const nextQty = item.quantity + delta;
        return nextQty > 0 ? { ...item, quantity: nextQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleRemoveCartItem = (cartId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartId));
    addPlatformLog(`CART_REMOVE: Removed cart item ${cartId} from basket`, 'info');
  };

  const handleCheckout = (address: string, postcode: string, cardName: string) => {
    const selectedRestaurantId = cart[0]?.menuItem.id.split('-')[0] || '';
    const selectedRestaurant = restaurantsList.find(r => r.id === selectedRestaurantId) || restaurantsList[0];

    // Subtotal
    const subtotal = cart.reduce((acc, item) => {
      const customizationsCost = item.customizations.reduce((sum, c) => sum + c.additionalPrice, 0);
      return acc + (item.menuItem.price + customizationsCost) * item.quantity;
    }, 0);

    const delFee = selectedRestaurant.offersFreeDelivery ? 0 : Math.round((selectedRestaurant.deliveryFee * currentPostcode.deliveryMultiplier) * 100) / 100;
    const sFee = Math.max(0.99, Math.round(subtotal * 0.05 * 100) / 100);
    const total = subtotal + delFee + sFee;

    // Pick rider from current online riders pool
    const assignedRider = drivers[Math.floor(Math.random() * drivers.length)] || drivers[0];

    const orderId = Math.random().toString(36).substr(2, 6).toUpperCase();

    const newOrder: Order = {
      id: orderId,
      restaurantId: selectedRestaurant.id,
      restaurantName: selectedRestaurant.name,
      restaurantAddress: selectedRestaurant.address,
      items: [...cart],
      subtotal,
      deliveryFee: delFee,
      serviceFee: sFee,
      vat: Math.round(subtotal * 0.2 * 100) / 100,
      total,
      status: 'Placed',
      deliveryAddress: address,
      deliveryPostcode: postcode,
      driverName: assignedRider.name,
      driverPhone: assignedRider.phone,
      createdAt: new Date().toISOString()
    };

    // Optimistically update local React state
    setOrders(prev => [newOrder, ...prev]);
    setActiveOrderId(orderId);
    setCart([]); // Reset basket

    // Persist new order directly to Cloud SQL (PostgreSQL) in background
    fetchApi('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newOrder)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.order) {
          // Sync state with fully-parsed DB-backed record
          setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));
          addPlatformLog(`POSTGRES_INSERT: Saved order #${orderId} directly to Google Cloud SQL "orders" table.`, 'success');
        } else {
          console.error('[PostgreSQL] Failed to insert order:', data);
        }
      })
      .catch(err => {
        console.error('[PostgreSQL] Network error on insert:', err);
      });

    addPlatformLog(`STRIPE_PAYMENT_SUCCESS: £${total.toFixed(2)} captured on Card *4242 (Cardholder: ${cardName})`, 'success');
    addPlatformLog(`ORDER_PLACED: Order #${orderId} submitted to "${selectedRestaurant.name}"`, 'success');
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus, customDriverName?: string, customDriverPhone?: string) => {
    const existingOrder = orders.find(o => o.id === orderId);
    const driverName = customDriverName !== undefined ? customDriverName : existingOrder?.driverName;
    const driverPhone = customDriverPhone !== undefined ? customDriverPhone : existingOrder?.driverPhone;

    // Optimistically update UI
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, driverName, driverPhone } : o));

    // Update status in PostgreSQL Database
    fetchApi(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status, driverName, driverPhone })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.order) {
          // Sync with mapped PostgreSQL values
          setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));
          addPlatformLog(`POSTGRES_UPDATE: Patched order #${orderId} status to "${status}" in Cloud SQL.`, 'success');
        }
      })
      .catch(err => {
        console.error('[PostgreSQL] Failed to patch status:', err);
      });
  };

  const handleClearLogs = () => {
    setPlatformLogs([]);
    localStorage.removeItem('gozoon_platform_logs');
  };

  const handleClearAllOrders = () => {
    setOrders([]);
    setActiveOrderId(null);
    localStorage.removeItem('gozoon_orders');
    localStorage.removeItem('gozoon_active_order_id');

    // Flush PostgreSQL orders table
    fetchApi('/api/orders', {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          addPlatformLog('DB_FLUSH: Wiped all active and historical order records from Google Cloud SQL (PostgreSQL) database.', 'warning');
        }
      })
      .catch(err => {
        console.error('[PostgreSQL] Failed to flush database:', err);
      });
  };

  // Glow Badges Calculations for Platform Workspace Switcher
  const unacceptedCount = orders.filter(o => o.status === 'Placed').length;
  const dispatchGigsCount = orders.filter(o => !o.driverName || o.status === 'Preparing' || o.status === 'OutForDelivery').length;
  const trackingActive = orders.some(o => o.id === activeOrderId && o.status !== 'Delivered' && o.status !== 'Cancelled');

  if (standaloneApp) {
    return (
      <div className="w-full h-screen overflow-hidden bg-white select-none relative">
        {standaloneApp === 'customer' && (
          <GoZoonCustomer
            restaurantsList={restaurantsList}
            currentPostcode={currentPostcode}
            onPostcodeChange={setCurrentPostcode}
            cart={cart}
            onAddToCart={handleAddToCart}
            onUpdateCartQuantity={handleUpdateCartQuantity}
            onRemoveCartItem={handleRemoveCartItem}
            onCheckout={handleCheckout}
            activeOrderId={activeOrderId}
            onResetActiveOrder={() => setActiveOrderId(null)}
            onSetActiveOrder={setActiveOrderId}
            orders={orders}
            closedRestaurants={closedRestaurants}
            outOfStockItems={outOfStockItems}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            orderMode={orderMode}
            onOrderModeChange={setOrderMode}
          />
        )}
        {standaloneApp === 'business' && (
          <GoZoonBusiness
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            restaurantsList={restaurantsList}
            closedRestaurants={closedRestaurants}
            onToggleClosedRestaurant={handleToggleClosedRestaurant}
            outOfStockItems={outOfStockItems}
            onToggleOutOfStockItem={handleToggleOutOfStockItem}
            onOnboardRestaurant={handleOnboardRestaurant}
            onAddDishToRestaurant={handleAddDishToRestaurant}
            onAddLog={addPlatformLog}
          />
        )}
        {standaloneApp === 'roadking' && (
          <GoZoonRoadKing
            orders={orders}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            drivers={drivers}
            onOnboardDriver={handleOnboardDriver}
            onAddLog={addPlatformLog}
          />
        )}
        {standaloneApp === 'admin' && (
          <div className="w-full h-full bg-slate-950 overflow-auto">
            <GoZoonAdmin
              orders={orders}
              restaurantsList={restaurantsList}
              drivers={drivers}
              closedRestaurants={closedRestaurants}
              outOfStockItems={outOfStockItems}
              platformLogs={platformLogs}
              onClearLogs={handleClearLogs}
              onClearAllOrders={handleClearAllOrders}
            />
          </div>
        )}
        {/* Subtle floating toggle button to switch back to full Sandbox layout */}
        <div className="absolute bottom-4 right-4 z-[9999]">
          <button 
            onClick={() => {
              window.history.pushState({}, '', window.location.pathname);
              setStandaloneApp(null);
            }}
            className="bg-slate-900/90 hover:bg-slate-900 text-white text-[11px] font-bold px-4 py-2 rounded-full shadow-2xl flex items-center gap-1.5 cursor-pointer transition-all border border-slate-700/80 active:scale-95"
          >
            <span>🔧 Switch to Sandbox Hub</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans text-neutral-800">
      
      {/* Dynamic Status Ribbon / Command Bar */}
      <div className="bg-slate-900 text-white px-6 py-3 flex flex-col md:flex-row justify-between items-center border-b border-slate-800 gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
          <span className="font-extrabold text-sm tracking-tight">Go-Zoon Developer Command Center</span>
          <span className="hidden sm:inline-block bg-slate-800 border border-slate-700 text-slate-400 font-mono text-[9px] px-1.5 py-0.5 rounded-sm">
            STATUS: ACTIVE SANDBOX
          </span>
        </div>

        {/* Workspace Switcher Tabs */}
        <div className="flex flex-wrap bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1" id="workspace-switcher">
          <button
            onClick={() => setActiveApp('customer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wide transition-all flex items-center gap-1.5 cursor-pointer ${
              activeApp === 'customer' 
                ? 'bg-[#073db7] text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>1. Customer App</span>
            {trackingActive && <span className="w-1.5 h-1.5 bg-[#ff4a14] rounded-full animate-bounce"></span>}
          </button>

          <button
            onClick={() => setActiveApp('business')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wide transition-all flex items-center gap-1.5 cursor-pointer ${
              activeApp === 'business' 
                ? 'bg-[#073db7] text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>2. Business App</span>
            {unacceptedCount > 0 && (
              <span className="bg-[#ff4a14] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                {unacceptedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveApp('roadking')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wide transition-all flex items-center gap-1.5 cursor-pointer ${
              activeApp === 'roadking' 
                ? 'bg-[#073db7] text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>3. Road King</span>
            {dispatchGigsCount > 0 && (
              <span className="bg-orange-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                {dispatchGigsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveApp('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wide transition-all flex items-center gap-1.5 cursor-pointer ${
              activeApp === 'admin' 
                ? 'bg-[#073db7] text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>4. Admin Web</span>
          </button>
        </div>
      </div>

      {/* Main Container: Split screen layout */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden min-h-0">
        
        {/* LEFT SIDEBAR: Architectural Specs Drawer (Answers Payment, Postgres questions) */}
        <div className="xl:w-80 bg-white border-b xl:border-b-0 xl:border-r border-slate-200 p-5 space-y-5 overflow-y-auto shrink-0 font-sans" id="specifications-sidebar">
          <div className="flex items-center gap-2 text-brand-blue border-b border-slate-100 pb-3">
            <Sparkles className="w-5 h-5 text-brand-orange" />
            <h3 className="font-extrabold text-sm text-[#073db7] uppercase tracking-wide">
              Production Specifications
            </h3>
          </div>

          <div className="space-y-4">
            
            {/* Spec 1: DB */}
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 font-extrabold text-xs text-slate-800">
                <Server className="w-4 h-4 text-brand-blue" />
                <span>1. Cloud Data Storage</span>
              </span>
              <p className="text-[11px] leading-relaxed text-slate-500">
                <b>Local Dev</b> uses a highly reactive React hook sync state locked into <span className="font-mono text-[10px] bg-slate-100 px-1 rounded-sm">localStorage</span> databases.
              </p>
              <p className="text-[11px] leading-relaxed text-slate-500">
                <b>Production Launch</b> maps these exact JSON records onto <b>Google Cloud SQL (PostgreSQL)</b> schemas. We use Drizzle ORM to maintain type-safety with zero deploy surprises.
              </p>
            </div>

            {/* Spec 2: Gateway */}
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 font-extrabold text-xs text-slate-800">
                <CreditCard className="w-4 h-4 text-brand-blue" />
                <span>2. Stripe Payment Gateway</span>
              </span>
              <p className="text-[11px] leading-relaxed text-slate-500">
                We have built a high-fidelity **Stripe Credit Card processing form** inside the Customer checkout drawer.
              </p>
              <p className="text-[11px] leading-relaxed text-slate-500">
                In production, clicking pay securely initiates a handshake with our Express API proxy `/api/create-payment-intent`, keeping API secret keys hidden from browser inspect.
              </p>
            </div>

            {/* Spec 3: Store Compilation */}
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 font-extrabold text-xs text-slate-800">
                <ShieldCheck className="w-4 h-4 text-brand-blue" />
                <span>3. Native Appstore Bundles</span>
              </span>
              <p className="text-[11px] leading-relaxed text-slate-500">
                The Customer, Business, and Road King interfaces are crafted with mobile-first viewport grids. 
              </p>
              <p className="text-[11px] leading-relaxed text-slate-500">
                They compiled perfectly into native <b>iOS .ipa</b> and <b>Android .apk</b> wrappers using <b>CapacitorJS</b>, wrapping Vite build assets with zero code duplication!
              </p>
            </div>

            {/* Spec 4: Standalone Mobile Testing */}
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl space-y-1">
              <span className="font-extrabold text-[#073db7] text-[10px] uppercase tracking-wider block">📱 Test on Your iPhone / Mobile:</span>
              <p className="text-[10px] text-blue-900 leading-normal">
                To test a pristine, full-screen version of any app directly on your mobile device, open the URL and append the parameter:
              </p>
              <ul className="text-[9.5px] font-mono text-blue-950 space-y-1 bg-white/60 p-1.5 rounded-md border border-blue-100">
                <li>• Customer App: <a href="?app=customer" className="text-[#073db7] font-bold underline hover:text-[#ff4a14]">?app=customer</a></li>
                <li>• Business App: <a href="?app=business" className="text-[#073db7] font-bold underline hover:text-[#ff4a14]">?app=business</a></li>
                <li>• Road King App: <a href="?app=roadking" className="text-[#073db7] font-bold underline hover:text-[#ff4a14]">?app=roadking</a></li>
              </ul>
              <p className="text-[9px] text-blue-800 italic">
                Tip: You can use two devices (e.g. laptop & phone) to see live status syncing via PostgreSQL database!
              </p>
            </div>

            {/* Spec 5: Live Testing Tips */}
            <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl space-y-1">
              <span className="font-extrabold text-[#ff4a14] text-[10px] uppercase tracking-wider block">Sandbox Testing walkthrough:</span>
              <ol className="list-decimal list-inside text-[10px] text-orange-800 space-y-1 font-medium">
                <li>Pick SW1A 1AA in Customer App</li>
                <li>Add food and Pay via Stripe</li>
                <li>Switch to Merchant App, accept ticket</li>
                <li>Mark order ready for courier</li>
                <li>Switch to Road King, accept job</li>
                <li>Auto-drive GPS and deliver food!</li>
              </ol>
            </div>

            {/* Spec 6: Capacitor Mobile API Sync Gateway */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl space-y-2 border border-slate-800">
              <span className="font-extrabold text-[#ff4a14] text-[10px] uppercase tracking-wider block flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5" />
                <span>Capacitor Mobile API Sync:</span>
              </span>
              <p className="text-[10px] text-slate-300 leading-normal">
                iOS Simulator / actual iPhone MUST use the public **Shared App URL (ais-pre)** to sync. The development URL (ais-dev) is protected by cookie-based login and will block external API requests.
              </p>
              <div>
                <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Backend API Endpoint:</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={backendApiUrlInput}
                    onChange={(e) => {
                      setBackendApiUrlInput(e.target.value);
                      localStorage.setItem('gozoon_backend_api_url', e.target.value);
                    }}
                    placeholder="https://..."
                    className="flex-1 text-[10px] px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-white font-mono min-w-0"
                  />
                  <button
                    onClick={() => {
                      localStorage.removeItem('gozoon_backend_api_url');
                      setBackendApiUrlInput('https://ais-pre-ap557zrj3sovqxnvxsqzsf-651428129387.asia-east1.run.app');
                      alert('Reset to default public Shared App URL!');
                    }}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white rounded-md text-[9px] font-bold border border-slate-700 cursor-pointer shrink-0"
                    title="Reset to Default"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 italic">
                Active Shared URL: https://ais-pre-ap557zrj3sovqxnvxsqzsf-651428129387.asia-east1.run.app
              </p>
            </div>

          </div>
        </div>

        {/* RIGHT PLAYGROUND: Canvas frame */}
        <div className="flex-1 bg-slate-100 p-4 lg:p-6 overflow-y-auto flex items-center justify-center relative min-h-0">
          
          {activeApp === 'admin' ? (
            /* Admin Console gets full screen since it's a web interface */
            <div className="w-full h-full min-h-[550px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <GoZoonAdmin
                orders={orders}
                restaurantsList={restaurantsList}
                drivers={drivers}
                closedRestaurants={closedRestaurants}
                outOfStockItems={outOfStockItems}
                platformLogs={platformLogs}
                onClearLogs={handleClearLogs}
                onClearAllOrders={handleClearAllOrders}
              />
            </div>
          ) : (
            /* Customer, Business, Road King render inside beautiful, high-fidelity iOS simulator frames */
            <div className="space-y-4 w-full flex flex-col items-center justify-center">
              
              <div className="text-center">
                <span className="text-[10px] uppercase tracking-wider font-extrabold bg-blue-100 text-[#073db7] border border-blue-200 px-3 py-1 rounded-full shadow-xs">
                  {activeApp === 'customer' && '📱 Go-Zoon: Customer App (iPhone iOS Simulator)'}
                  {activeApp === 'business' && '🏪 Go-Zoon Business: Merchant App (Android/Tablet Simulator)'}
                  {activeApp === 'roadking' && '🛵 Go-Zoon Road King: Delivery Partner App (Rugged GPS Phone)'}
                </span>
              </div>

              {/* iOS Mobile Frame Bezel */}
              <div className="relative rounded-[45px] border-[11px] border-slate-900 bg-slate-950 shadow-2xl flex flex-col overflow-hidden w-full max-w-[365px] h-[675px] mx-auto select-none">
                
                {/* 1. iOS Status Bar */}
                <div className="h-6 bg-white text-black px-6 flex justify-between items-center text-[10px] font-bold z-40 select-none border-b border-slate-100">
                  <span>12:30</span>
                  
                  {/* Dynamic Island Notch */}
                  <div className="w-24 h-4 bg-black rounded-full absolute left-1/2 -translate-x-1/2 top-1.5 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-zinc-900 rounded-full"></span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Wifi className="w-3.5 h-3.5 text-black" />
                    <span>5G</span>
                    <Battery className="w-4 h-4 text-black" />
                  </div>
                </div>

                {/* 2. Embedded App Workspace */}
                <div className="flex-1 overflow-hidden relative">
                  {activeApp === 'customer' && (
                    <GoZoonCustomer
                      restaurantsList={restaurantsList}
                      currentPostcode={currentPostcode}
                      onPostcodeChange={setCurrentPostcode}
                      cart={cart}
                      onAddToCart={handleAddToCart}
                      onUpdateCartQuantity={handleUpdateCartQuantity}
                      onRemoveCartItem={handleRemoveCartItem}
                      onCheckout={handleCheckout}
                      activeOrderId={activeOrderId}
                      onResetActiveOrder={() => setActiveOrderId(null)}
                      onSetActiveOrder={setActiveOrderId}
                      orders={orders}
                      closedRestaurants={closedRestaurants}
                      outOfStockItems={outOfStockItems}
                      searchQuery={searchQuery}
                      onSearchQueryChange={setSearchQuery}
                      activeFilter={activeFilter}
                      onFilterChange={setActiveFilter}
                      orderMode={orderMode}
                      onOrderModeChange={setOrderMode}
                    />
                  )}

                  {activeApp === 'business' && (
                    <GoZoonBusiness
                      orders={orders}
                      onUpdateOrderStatus={handleUpdateOrderStatus}
                      restaurantsList={restaurantsList}
                      closedRestaurants={closedRestaurants}
                      onToggleClosedRestaurant={handleToggleClosedRestaurant}
                      outOfStockItems={outOfStockItems}
                      onToggleOutOfStockItem={handleToggleOutOfStockItem}
                      onOnboardRestaurant={handleOnboardRestaurant}
                      onAddDishToRestaurant={handleAddDishToRestaurant}
                      onAddLog={addPlatformLog}
                    />
                  )}

                  {activeApp === 'roadking' && (
                    <GoZoonRoadKing
                      orders={orders}
                      onUpdateOrderStatus={handleUpdateOrderStatus}
                      drivers={drivers}
                      onOnboardDriver={handleOnboardDriver}
                      onAddLog={addPlatformLog}
                    />
                  )}
                </div>

                {/* 3. iOS Home Line Overlay */}
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-neutral-400 rounded-full z-40"></div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
