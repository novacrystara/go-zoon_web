import React, { useState, useEffect } from 'react';
import GoZoonCustomer from './components/apps/GoZoonCustomer';
import GoZoonBusiness from './components/apps/GoZoonBusiness';
import GoZoonRoadKing from './components/apps/GoZoonRoadKing';
import GoZoonAdmin from './components/apps/GoZoonAdmin';

import { UK_RESTAURANTS, UK_POSTCODES } from './data/restaurants';
import { Restaurant, CartItem, Order, UKPostcodeZone, OrderStatus, MenuItem } from './types';
import { Smartphone, Store, Bike, Landmark, Info, Sparkles, Server, ShieldCheck, CreditCard, Activity, Wifi, Battery, Settings } from 'lucide-react';
import { getApiUrl, fetchApi } from './api';

export default function App(): React.JSX.Element {
  // 1. Core State Synchronization (LocalStorage Keys with Rebranded Gozoon prefixes)
  const [backendApiUrlInput, setBackendApiUrlInput] = useState<string>(() => {
    return localStorage.getItem('gozoon_backend_api_url') || 'https://go-zoon.ai.studio';
  });

  // Anonymous per-device customer identity so "My Orders" only shows this
  // customer's own orders instead of every order in the system. Not a real
  // account/login system - just enough to stop the app leaking every
  // customer's order history to every other customer.
  const [customerId] = useState<string>(() => {
    const saved = localStorage.getItem('gozoon_customer_id');
    if (saved) return saved;
    const generated = crypto.randomUUID();
    localStorage.setItem('gozoon_customer_id', generated);
    return generated;
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
      // Packaged native builds have no URL query string to key off of;
      // this Customer app target defaults straight into the customer view.
      if (window.hasOwnProperty('Capacitor') || window.location.protocol === 'capacitor:') {
        return 'customer';
      }
    }
    return null;
  });

  // Load and sync orders from PostgreSQL Database (Interval-based real-time sync across devices).
  // The dedicated customer app scopes to this device's own orders only; the sandbox
  // hub / business / road king / admin views need visibility across all orders to operate.
  useEffect(() => {
    const fetchOrders = () => {
      const query = standaloneApp === 'customer' ? `?customerId=${encodeURIComponent(customerId)}` : '';
      fetchApi(`/api/orders${query}`)
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
  }, [standaloneApp, customerId]);

  // Load the shared restaurant catalog + closed/out-of-stock business state from the
  // backend so a merchant's changes are visible to every customer's device, not just
  // trapped in that one browser's localStorage. localStorage stays as an offline cache.
  useEffect(() => {
    const fetchRestaurantState = () => {
      fetchApi('/api/restaurants')
        .then(res => res.json())
        .then(data => {
          if (data?.restaurants) setRestaurantsList(data.restaurants);
          if (data?.closedRestaurants) setClosedRestaurants(data.closedRestaurants);
          if (data?.outOfStockItems) setOutOfStockItems(data.outOfStockItems);
        })
        .catch(err => {
          console.error('[Restaurants] Failed to fetch shared catalog/business state:', err);
        });
    };
    fetchRestaurantState();
    const interval = setInterval(fetchRestaurantState, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load the shared driver roster from the backend (same rationale as above).
  useEffect(() => {
    fetchApi('/api/drivers')
      .then(res => res.json())
      .then(data => {
        if (data?.drivers && data.drivers.length > 0) setDrivers(data.drivers);
      })
      .catch(err => {
        console.error('[Drivers] Failed to fetch shared driver roster:', err);
      });
  }, []);

  const [isDevSettingsOpen, setIsDevSettingsOpen] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const handleTestConnection = (url: string) => {
    setTesting(true);
    setTestResult('Connecting and pinging backend health endpoint...');
    const targetUrl = url.replace(/\/$/, '');
    fetch(`${targetUrl}/api/health`)
      .then(res => res.json())
      .then(data => {
        if (data && data.postgres && data.postgres.working) {
          setTestResult('✅ Success! Connected to your PostgreSQL Database successfully.');
        } else if (data && data.postgres && !data.postgres.working) {
          setTestResult(`⚠️ Connected to server, but PostgreSQL connection failed: ${data.postgres.error || 'Check database credentials.'}`);
        } else {
          setTestResult('✅ Server responded, but health metrics are unavailable.');
        }
      })
      .catch(err => {
        setTestResult(`❌ Network Connection Failed. Make sure your local server is running on ${targetUrl} (npm run dev) and is accessible.`);
      })
      .finally(() => {
        setTesting(false);
      });
  };

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

  // State handlers - each applies an optimistic local update, then persists to the
  // shared backend so the change is visible to every customer/device, not just this one.
  const handleToggleClosedRestaurant = (id: string) => {
    const isClosed = closedRestaurants.includes(id);
    const restName = restaurantsList.find(r => r.id === id)?.name || 'Merchant';
    setClosedRestaurants(prev => isClosed ? prev.filter(item => item !== id) : [...prev, id]);
    addPlatformLog(`MERCHANT_STATUS: "${restName}" is now ${isClosed ? 'ONLINE (Open)' : 'OFFLINE (Closed)'}`, 'warning');
    fetchApi(`/api/restaurants/${id}/toggle-closed`, { method: 'POST' })
      .catch(err => console.error('[Restaurants] Failed to sync closed status:', err));
  };

  const handleToggleOutOfStockItem = (id: string) => {
    const isOut = outOfStockItems.includes(id);
    setOutOfStockItems(prev => isOut ? prev.filter(item => item !== id) : [...prev, id]);
    addPlatformLog(`STOCK_STATUS: Menu Item ${id} toggled ${isOut ? 'IN STOCK' : 'OUT OF STOCK'}`, 'info');
    fetchApi(`/api/menu-items/${id}/toggle-stock`, { method: 'POST' })
      .catch(err => console.error('[Restaurants] Failed to sync stock status:', err));
  };

  const handleOnboardRestaurant = (newRestaurant: Restaurant) => {
    setRestaurantsList(prev => [newRestaurant, ...prev]);
    fetchApi('/api/restaurants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRestaurant)
    }).catch(err => console.error('[Restaurants] Failed to persist onboarded restaurant:', err));
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
    fetchApi(`/api/restaurants/${restaurantId}/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(menuItem)
    }).catch(err => console.error('[Restaurants] Failed to persist new dish:', err));
  };

  const handleOnboardDriver = (newDriver: { name: string; phone: string; vehicle: string }) => {
    setDrivers(prev => [...prev, newDriver]);
    fetchApi('/api/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDriver)
    }).catch(err => console.error('[Drivers] Failed to persist onboarded driver:', err));
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

  // Places the order and waits for the server to confirm it was actually saved before
  // touching the cart/UI state - previously the cart was cleared and an "active order"
  // shown optimistically even if the backend write failed, silently losing the order.
  const handleCheckout = async (address: string, postcode: string, cardName: string, restaurantId: string): Promise<{ success: boolean; error?: string }> => {
    const selectedRestaurant = restaurantsList.find(r => r.id === restaurantId);
    if (!selectedRestaurant) {
      return { success: false, error: 'Could not identify the restaurant for this basket. Please reopen the restaurant and try again.' };
    }

    const subtotal = cart.reduce((acc, item) => {
      const customizationsCost = item.customizations.reduce((sum, c) => sum + c.additionalPrice, 0);
      return acc + (item.menuItem.price + customizationsCost) * item.quantity;
    }, 0);

    const delFee = selectedRestaurant.offersFreeDelivery ? 0 : Math.round((selectedRestaurant.deliveryFee * currentPostcode.deliveryMultiplier) * 100) / 100;
    const sFee = Math.max(0.99, Math.round(subtotal * 0.05 * 100) / 100);
    const total = subtotal + delFee + sFee;

    // Pick rider from current online riders pool
    const assignedRider = drivers[Math.floor(Math.random() * drivers.length)] || drivers[0];

    const orderPayload = {
      customerId,
      restaurantId: selectedRestaurant.id,
      restaurantName: selectedRestaurant.name,
      restaurantAddress: selectedRestaurant.address,
      items: cart,
      subtotal,
      deliveryFee: delFee,
      serviceFee: sFee,
      // NOT LEGALLY REVIEWED: flat 20% VAT on subtotal is a placeholder. UK hot-food
      // takeaway VAT treatment is nuanced (zero-rated cold food, standard-rated hot
      // food, delivery fee treatment) - needs finance/legal sign-off before launch.
      vat: Math.round(subtotal * 0.2 * 100) / 100,
      total,
      status: 'Placed',
      deliveryAddress: address,
      deliveryPostcode: postcode,
      driverName: assignedRider?.name,
      driverPhone: assignedRider?.phone,
    };

    try {
      const res = await fetchApi('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      const data = await res.json();

      if (!res.ok || !data.success || !data.order) {
        addPlatformLog(`ORDER_FAILED: Checkout rejected - ${data.error || 'unknown server error'}`, 'warning');
        return { success: false, error: data.error || 'The order could not be saved. Please try again.' };
      }

      // Only now that the order is confirmed saved do we touch cart/order state.
      setOrders(prev => [data.order, ...prev]);
      setActiveOrderId(data.order.id);
      setCart([]);

      addPlatformLog(`STRIPE_PAYMENT_SUCCESS: £${total.toFixed(2)} captured on Card *4242 (Cardholder: ${cardName})`, 'success');
      addPlatformLog(`ORDER_PLACED: Order #${data.order.id} submitted to "${selectedRestaurant.name}"`, 'success');
      return { success: true };
    } catch (err) {
      console.error('[PostgreSQL] Network error on insert:', err);
      return { success: false, error: 'Network error while placing your order. Please check your connection and try again.' };
    }
  };

  // Lets a customer cancel an order that hasn't been accepted by the restaurant yet.
  const handleCancelOrder = (orderId: string) => {
    handleUpdateOrderStatus(orderId, 'Cancelled');
    addPlatformLog(`ORDER_CANCELLED: Customer cancelled order #${orderId} before kitchen acceptance.`, 'warning');
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
            onCancelOrder={handleCancelOrder}
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
        <div style={{ display: 'none' }} className="absolute bottom-4 right-4 z-[9999] flex gap-2">
          <button 
            onClick={() => {
              setIsDevSettingsOpen(true);
              setTestResult(null);
            }}
            className="bg-[#ff4a14] hover:bg-[#e03d0d] text-white text-[11px] font-black px-4 py-2 rounded-full shadow-2xl flex items-center gap-1.5 cursor-pointer transition-all border border-orange-500/30 active:scale-95 animate-pulse"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Developer Sync</span>
          </button>

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

        {/* Developer Sync Gateway Overlay Modal */}
        {isDevSettingsOpen && (
          <div className="absolute inset-0 bg-slate-950/90 z-[99999] flex items-center justify-center p-5 select-text overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 text-slate-100 p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-2xl relative text-xs font-sans">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-1.5 font-black text-white text-sm">
                  <Settings className="w-4 h-4 text-[#ff4a14]" />
                  <span>Developer Sync Gateway</span>
                </div>
                <button 
                  onClick={() => setIsDevSettingsOpen(false)}
                  className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Diagnostics Context</span>
                <p className="text-slate-300 leading-normal">
                  Xcode simulator/actual iPhone cannot access sandboxed cookies of your Cloud Run URLs directly. 
                  Connect to your local Mac backend running on port 3000 to save orders directly to your Postgres database.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] text-brand-orange uppercase font-extrabold tracking-wider">Backend API URL</label>
                <input
                  type="text"
                  value={backendApiUrlInput}
                  onChange={(e) => {
                    setBackendApiUrlInput(e.target.value);
                    localStorage.setItem('gozoon_backend_api_url', e.target.value);
                  }}
                  placeholder="http://localhost:3000"
                  className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-white font-mono focus:border-[#ff4a14] focus:outline-none"
                />
              </div>

              {/* Preset buttons */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => {
                    const localUrl = 'http://localhost:3000';
                    setBackendApiUrlInput(localUrl);
                    localStorage.setItem('gozoon_backend_api_url', localUrl);
                    setTestResult(null);
                  }}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-300 hover:text-white rounded-md text-[10px] font-bold cursor-pointer"
                >
                  💻 Localhost (Simulator)
                </button>
                <button
                  onClick={() => {
                    const preUrl = 'https://go-zoon.ai.studio';
                    setBackendApiUrlInput(preUrl);
                    localStorage.setItem('gozoon_backend_api_url', preUrl);
                    setTestResult(null);
                  }}
                  className="px-2.5 py-1 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-300 hover:text-white rounded-md text-[10px] font-bold cursor-pointer"
                >
                  ☁️ Shared Cloud
                </button>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => handleTestConnection(backendApiUrlInput)}
                  disabled={testing}
                  className="flex-1 py-2 bg-[#ff4a14] hover:bg-[#e03d0d] text-white font-bold rounded-lg text-xs cursor-pointer shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <span>{testing ? 'Testing...' : '🔌 Ping & Test Connection'}</span>
                </button>
              </div>

              {testResult && (
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[10.5px] leading-relaxed font-mono whitespace-pre-line text-slate-300">
                  {testResult}
                </div>
              )}

              <div className="pt-2 text-center border-t border-slate-800">
                <button
                  onClick={() => setIsDevSettingsOpen(false)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  Close & Apply Settings
                </button>
              </div>
            </div>
          </div>
        )}
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
                iOS Simulator / actual iPhone MUST use the public live app URL (https://go-zoon.ai.studio) to sync, so every platform reads/writes the same Postgres database.
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
                      setBackendApiUrlInput('https://go-zoon.ai.studio');
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
                Active Shared URL: https://go-zoon.ai.studio
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
                      onCancelOrder={handleCancelOrder}
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
