import React, { useState } from 'react';
import { Search, MapPin, ShoppingBag, Clock, Tag, Award, Check, ChevronLeft, Star, Phone, HelpCircle, Navigation, ShieldAlert, CreditCard, ClipboardList, History } from 'lucide-react';
import { Restaurant, CartItem, Order, UKPostcodeZone, MenuItem, OrderStatus, CartCustomization } from '../../types';
import { validateUKPostcode } from '../../data/restaurants';
import LegalModal from '../LegalModal';

interface GoZoonCustomerProps {
  restaurantsList: Restaurant[];
  currentPostcode: UKPostcodeZone;
  onPostcodeChange: (zone: UKPostcodeZone) => void;
  cart: CartItem[];
  onAddToCart: (item: CartItem) => void;
  onUpdateCartQuantity: (id: string, delta: number) => void;
  onRemoveCartItem: (id: string) => void;
  onCheckout: (address: string, postcode: string, cardName: string, restaurantId: string) => Promise<{ success: boolean; error?: string }>;
  onCancelOrder: (orderId: string) => void;
  activeOrderId: string | null;
  onResetActiveOrder: () => void;
  onSetActiveOrder: (id: string | null) => void;
  orders: Order[];
  closedRestaurants: string[];
  outOfStockItems: string[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  orderMode: 'Delivery' | 'Collection';
  onOrderModeChange: (mode: 'Delivery' | 'Collection') => void;
}

export default function GoZoonCustomer({
  restaurantsList,
  currentPostcode,
  onPostcodeChange,
  cart,
  onAddToCart,
  onUpdateCartQuantity,
  onRemoveCartItem,
  onCheckout,
  onCancelOrder,
  activeOrderId,
  onResetActiveOrder,
  onSetActiveOrder,
  orders,
  closedRestaurants,
  outOfStockItems,
  searchQuery,
  onSearchQueryChange,
  activeFilter,
  onFilterChange,
  orderMode,
  onOrderModeChange,
}: GoZoonCustomerProps): React.JSX.Element {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [selectedCategoryHero, setSelectedCategoryHero] = useState<string | null>(null);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [customizationNotes, setCustomizationNotes] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isChangingPostcode, setIsChangingPostcode] = useState(false);
  const [postcodeInput, setPostcodeInput] = useState(currentPostcode.postcode);
  const [postcodeError, setPostcodeError] = useState('');

  // Stripe checkout state
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'stripe' | 'processing'>('cart');
  const [stripeCardName, setStripeCardName] = useState('');
  const [stripeCardNum, setStripeCardNum] = useState('');
  const [stripeCardExpiry, setStripeCardExpiry] = useState('');
  const [stripeCardCvc, setStripeCardCvc] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('10 Downing Street, Westminster');
  const [stripeError, setStripeError] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');

  // Selected custom sizes or extras
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});

  const activeOrder = orders.find(o => o.id === activeOrderId);

  // Sync postcode input
  React.useEffect(() => {
    setPostcodeInput(currentPostcode.postcode);
  }, [currentPostcode]);

  const handlePostcodeApply = (e: React.FormEvent) => {
    e.preventDefault();
    const zone = validateUKPostcode(postcodeInput);
    if (zone) {
      onPostcodeChange(zone);
      setPostcodeError('');
      setIsChangingPostcode(false);
    } else {
      setPostcodeError('Invalid UK postcode (e.g. SW1A 1AA)');
    }
  };

  const selectRestaurantSafely = (restaurant: Restaurant) => {
    if (selectedRestaurant && selectedRestaurant.id !== restaurant.id && cart.length > 0) {
      if (window.confirm('Clear your current basket and switch restaurants?')) {
        // clear cart by removing all items
        cart.forEach(item => onRemoveCartItem(item.id));
        setSelectedRestaurant(restaurant);
      }
    } else {
      setSelectedRestaurant(restaurant);
    }
  };

  const handleOpenCustomizer = (item: MenuItem) => {
    if (outOfStockItems.includes(item.id)) return;
    setCustomizingItem(item);
    setCustomizationNotes('');
    
    // Set dynamic default options if present
    const defaults: { [key: string]: string } = {};
    if (item.options && item.options.length > 0) {
      item.options.forEach(opt => {
        if (opt.type === 'select') {
          defaults[opt.name] = opt.choices[0]?.name || '';
        }
      });
    } else {
      defaults['Size'] = 'Standard';
    }
    setSelectedOptions(defaults);
  };

  const handleConfirmCustomization = () => {
    if (!customizingItem) return;

    const customizations: CartCustomization[] = [];
    let extraPrice = 0;
    let itemCartId = customizingItem.id;

    if (customizingItem.options && customizingItem.options.length > 0) {
      customizingItem.options.forEach(opt => {
        if (opt.type === 'select') {
          const selectedVal = selectedOptions[opt.name];
          const choice = opt.choices.find(c => c.name === selectedVal);
          if (choice) {
            customizations.push({
              name: opt.name,
              selectedOption: choice.name,
              additionalPrice: choice.price
            });
            extraPrice += choice.price;
            itemCartId += `-${opt.name}_${choice.name}`;
          }
        } else if (opt.type === 'checkbox') {
          opt.choices.forEach(choice => {
            const isChecked = selectedOptions[`${opt.name}_${choice.name}`] === 'true';
            if (isChecked) {
              customizations.push({
                name: opt.name,
                selectedOption: choice.name,
                additionalPrice: choice.price
              });
              extraPrice += choice.price;
              itemCartId += `-${opt.name}_${choice.name}`;
            }
          });
        }
      });
    } else {
      const sizePrice = selectedOptions['Size'] === 'Large' ? 2.50 : 0;
      extraPrice = sizePrice;
      const sizeVal = selectedOptions['Size'] || 'Standard';
      itemCartId += `-${sizeVal}`;
      customizations.push({
        name: 'Size',
        selectedOption: sizeVal,
        additionalPrice: sizePrice
      });
    }

    const cartItem: CartItem = {
      id: itemCartId,
      menuItem: customizingItem,
      quantity: 1,
      customizations,
      notes: customizationNotes.trim() || undefined
    };

    onAddToCart(cartItem);
    setCustomizingItem(null);
  };

  const handleStripeCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripeCardName.trim()) {
      setStripeError('Please enter the Cardholder Name');
      return;
    }
    if (stripeCardNum.replace(/\s/g, '').length !== 16) {
      setStripeError('Please enter a valid 16-digit card number');
      return;
    }
    if (!stripeCardExpiry.includes('/')) {
      setStripeError('Please enter expiry (MM/YY)');
      return;
    }
    if (stripeCardCvc.length < 3) {
      setStripeError('Please enter 3-digit CVC');
      return;
    }

    setStripeError('');
    setCheckoutStep('processing');

    const statuses = [
      'Authenticating card with Stripe server...',
      'Securing escrow authorization code...',
      'E-emitting order docket to restaurant terminal...',
      'Payment Captured! Placing order...'
    ];

    let i = 0;
    setProcessingStatus(statuses[0]);

    const interval = setInterval(() => {
      i++;
      if (i < statuses.length) {
        setProcessingStatus(statuses[i]);
      } else {
        clearInterval(interval);
        if (!selectedRestaurant) {
          setStripeError('Lost track of which restaurant this basket belongs to. Please reopen it and try again.');
          setCheckoutStep('stripe');
          return;
        }
        onCheckout(deliveryAddress, currentPostcode.postcode, stripeCardName, selectedRestaurant.id).then(result => {
          if (result.success) {
            setIsCartOpen(false);
            setCheckoutStep('cart');
            // Clear card inputs
            setStripeCardName('');
            setStripeCardNum('');
            setStripeCardExpiry('');
            setStripeCardCvc('');
          } else {
            // Order wasn't actually saved - keep the basket intact and let the customer retry.
            setStripeError(result.error || 'Your payment could not be completed. Please try again.');
            setCheckoutStep('stripe');
          }
        });
      }
    }, 1200);
  };

  const handleReorder = (order: Order) => {
    // Clear current cart first
    if (cart.length > 0) {
      cart.forEach(item => onRemoveCartItem(item.id));
    }
    const rest = restaurantsList.find(r => r.id === order.restaurantId);
    if (rest) {
      setSelectedRestaurant(rest);
    }
    order.items.forEach(item => {
      onAddToCart(item);
    });
    setIsOrdersOpen(false);
    setIsCartOpen(true);
    setCheckoutStep('cart');
  };

  // Calculations for basket
  const cartSubtotal = cart.reduce((acc, item) => {
    const customizationsCost = item.customizations.reduce((sum, c) => sum + c.additionalPrice, 0);
    return acc + (item.menuItem.price + customizationsCost) * item.quantity;
  }, 0);

  const deliveryFee = selectedRestaurant
    ? (selectedRestaurant.offersFreeDelivery ? 0 : Math.round((selectedRestaurant.deliveryFee * currentPostcode.deliveryMultiplier) * 100) / 100)
    : 0;

  const serviceFee = cartSubtotal > 0 ? Math.max(0.99, Math.round(cartSubtotal * 0.05 * 100) / 100) : 0;
  const grandTotal = cartSubtotal + deliveryFee + serviceFee;

  const filteredRestaurants = restaurantsList.filter(restaurant => {
    const matchesSearch = searchQuery.trim() === '' || 
      restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.menu.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesFilter = true;
    if (activeFilter === 'Offers') {
      matchesFilter = !!restaurant.discountOffer || restaurant.deliveryFee === 0;
    } else if (activeFilter === 'Top Rated') {
      matchesFilter = restaurant.rating >= 4.7;
    } else if (activeFilter === 'Fastest') {
      const adjustedMin = restaurant.deliveryTimeRange[0] * currentPostcode.deliveryMultiplier;
      matchesFilter = adjustedMin <= 30;
    } else if (activeFilter === 'Vegan') {
      matchesFilter = restaurant.menu.some(item => item.dietary?.includes('Vegan'));
    } else if (activeFilter === 'Halal') {
      matchesFilter = restaurant.menu.some(item => item.dietary?.includes('Halal'));
    }

    let matchesHeroCategory = true;
    if (selectedCategoryHero) {
      if (selectedCategoryHero === 'Chippy') {
        matchesHeroCategory = restaurant.cuisine.includes('Seafood') || restaurant.cuisine.includes('British') || restaurant.cuisine.includes('Chip');
      } else if (selectedCategoryHero === 'Roast') {
        matchesHeroCategory = restaurant.cuisine.includes('Roast') || restaurant.cuisine.includes('Gastro') || restaurant.cuisine.includes('Bistro');
      } else if (selectedCategoryHero === 'Curry') {
        matchesHeroCategory = restaurant.cuisine.includes('Indian') || restaurant.cuisine.includes('Curry');
      } else if (selectedCategoryHero === 'Burgers') {
        matchesHeroCategory = restaurant.cuisine.includes('Burgers') || restaurant.cuisine.includes('Grill') || restaurant.cuisine.includes('Fast');
      } else if (selectedCategoryHero === 'Kebab') {
        matchesHeroCategory = restaurant.cuisine.includes('Turkish') || restaurant.cuisine.includes('Kebab');
      } else if (selectedCategoryHero === 'Tea') {
        matchesHeroCategory = restaurant.cuisine.includes('Bakery') || restaurant.cuisine.includes('Cake') || restaurant.cuisine.includes('Sweet');
      }
    }

    return matchesSearch && matchesFilter && matchesHeroCategory;
  });

  // SVG Bezier Rider calculation for Tracker
  const [riderProgress, setRiderProgress] = useState(0);
  const animationRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!activeOrder) return;
    if (activeOrder.status === 'OutForDelivery') {
      const duration = 20000; // 20s travel simulation
      const startTime = performance.now();
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(100, (elapsed / duration) * 100);
        setRiderProgress(progress);
        if (progress < 100) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    } else if (activeOrder.status === 'Delivered') {
      setRiderProgress(100);
    } else {
      setRiderProgress(0);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [activeOrder?.status]);

  const getPointAtLength = (t: number) => {
    const p0 = { x: 70, y: 190 };
    const cp1 = { x: 140, y: 130 };
    const cp2 = { x: 200, y: 190 };
    const p3 = { x: 300, y: 70 };

    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = uuu * p0.x + 3 * uu * t * cp1.x + 3 * u * tt * cp2.x + ttt * p3.x;
    const y = uuu * p0.y + 3 * uu * t * cp1.y + 3 * u * tt * cp2.y + ttt * p3.y;

    return { x, y };
  };

  const riderCoords = getPointAtLength(riderProgress / 100);

  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-y-auto no-scrollbar relative text-neutral-800 font-sans select-none" id="customer-phone-view">
      
      {/* 1. Header with Postcode */}
      <div className="bg-white border-b border-gray-150 px-4 pb-3 pt-3 pt-safe flex-shrink-0 sticky top-0 z-30 flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-brand-orange animate-pulse"></div>
          <span className="font-extrabold text-brand-blue text-sm">Go-Zoon</span>
        </div>

        {/* Deliver to address and Orders button */}
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button 
              onClick={() => setIsChangingPostcode(!isChangingPostcode)}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-[11px] font-bold text-slate-700"
            >
              <MapPin className="w-3.5 h-3.5 text-brand-orange" />
              <span className="truncate max-w-[80px]">{currentPostcode.postcode}</span>
            </button>

            {isChangingPostcode && (
              <div className="absolute top-8 right-0 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50">
                <form onSubmit={handlePostcodeApply} className="space-y-2">
                  <input
                    type="text"
                    required
                    value={postcodeInput}
                    onChange={(e) => setPostcodeInput(e.target.value)}
                    placeholder="e.g. SW1A 1AA"
                    className="w-full text-[16px] px-2 py-1.5 border border-slate-300 rounded-md uppercase"
                  />
                  <button type="submit" className="w-full bg-brand-orange text-white text-xs font-bold py-1.5 rounded-md">
                    Apply Postcode
                  </button>
                  {postcodeError && <p className="text-[10px] text-red-500 font-medium">{postcodeError}</p>}
                </form>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setIsOrdersOpen(true);
              setIsCartOpen(false);
            }}
            className="flex items-center justify-center p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 relative cursor-pointer"
            id="btn-customer-my-orders"
            title="My Orders"
          >
            <ClipboardList className="w-4 h-4 text-brand-blue" />
            {orders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-orange text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white">
                {orders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Main screen based on selection */}
      {activeOrder && activeOrder.status !== 'Delivered' && activeOrder.status !== 'Cancelled' ? (
        /* live active tracker inside phone mock */
        <div className="flex-1 p-3 space-y-4">
          <div className="bg-white rounded-xl border border-slate-150 shadow-xs p-4 text-center">
            <span className="text-[9px] uppercase font-extrabold tracking-wider bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full inline-block">
              Live GPS Feed
            </span>
            <h3 className="text-lg font-black text-slate-900 mt-2">
              {activeOrder.status === 'Placed' && 'Kitchen Acceptance...'}
              {activeOrder.status === 'Preparing' && 'Food is Cooking!'}
              {activeOrder.status === 'OutForDelivery' && 'Rider en Route'}
              {(activeOrder.status as string) === 'Delivered' && 'Delivered!'}
            </h3>
            <p className="text-xs text-brand-orange font-bold mt-1">
              {activeOrder.status === 'Placed' && 'Restaurant is receiving your ticket...'}
              {activeOrder.status === 'Preparing' && 'Freshly baking your traditional British dish...'}
              {activeOrder.status === 'OutForDelivery' && `${activeOrder.driverName || 'Rider'} is driving at 15mph`}
            </p>
          </div>

          {/* Mini Interactive Map */}
          <div className="bg-slate-900 h-48 rounded-xl relative overflow-hidden shadow-inner border border-slate-800">
            <svg className="w-full h-full text-slate-700" viewBox="0 0 370 200">
              {/* grid lines */}
              <defs>
                <pattern id="mini-grid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#222" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#mini-grid)" />
              <path d="M 0,180 Q 180,160 370,180" fill="none" stroke="#222" strokeWidth="4" />
              
              {/* Streets */}
              <g stroke="#334155" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.8">
                <line x1="10" y1="90" x2="360" y2="90" />
                <path d="M 180,40 L 180,150" fill="none" />
                <path
                  d="M 70,190 C 140,130 200,190 300,70"
                  fill="none"
                  stroke={activeOrder.status === 'OutForDelivery' ? '#ff4a14' : '#475569'}
                  strokeWidth="3.5"
                  strokeDasharray={activeOrder.status === 'OutForDelivery' ? '6 3' : 'none'}
                />
              </g>

              {/* Nodes */}
              <g transform="translate(70,190)">
                <circle r="7" fill="#1e293b" stroke="#073db7" strokeWidth="1.5" />
                <circle r="2.5" fill="#073db7" />
              </g>

              <g transform="translate(300,70)">
                <circle r="7" fill="#1e293b" stroke="#ff4a14" strokeWidth="1.5" />
                <circle r="2.5" fill="#ff4a14" />
                <text x="10" y="3" fill="#ff4a14" fontSize="7" fontWeight="black" stroke="#000" strokeWidth="0.5">YOU</text>
              </g>

              {/* Rider */}
              {(activeOrder.status === 'OutForDelivery' || (activeOrder.status as string) === 'Delivered') && (
                <g transform={`translate(${riderCoords.x}, ${riderCoords.y})`}>
                  <circle r="6" fill="#ff4a14" stroke="#fff" strokeWidth="1.5" className="shadow-md" />
                  {activeOrder.status === 'OutForDelivery' && <circle r="10" fill="none" stroke="#ff4a14" strokeWidth="0.5" className="animate-ping" />}
                </g>
              )}
            </svg>
          </div>

          {/* Courier profile */}
          <div className="bg-white rounded-xl border border-slate-150 p-3.5 space-y-3.5 shadow-xs">
            <h4 className="text-xs font-black text-slate-800">Your Courier Assigned</h4>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center font-black text-brand-blue text-sm border border-brand-blue/15">
                {(activeOrder.driverName || 'Dave').slice(0,2).toUpperCase()}
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900">{activeOrder.driverName || 'Dave Henderson'}</div>
                <div className="text-slate-400 font-semibold text-[10px]">Active Rider • London Fleet</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="h-8 rounded-lg border border-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center gap-1 hover:bg-slate-50">
                <Phone className="w-3 h-3 text-brand-blue" />
                <span>Call Courier</span>
              </button>
              <button
                onClick={onResetActiveOrder}
                className="h-8 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center gap-1 hover:bg-slate-200"
              >
                <span>Back to Store</span>
              </button>
            </div>
            {activeOrder.status === 'Placed' && (
              <button
                onClick={() => {
                  if (window.confirm('Cancel this order before the restaurant accepts it?')) {
                    onCancelOrder(activeOrder.id);
                  }
                }}
                className="w-full h-8 rounded-lg border border-red-200 text-red-600 font-bold text-[10px] flex items-center justify-center gap-1 hover:bg-red-50 cursor-pointer"
              >
                <span>Cancel Order</span>
              </button>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl border border-slate-150 p-3.5 text-xs space-y-2 shadow-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="font-extrabold text-slate-800">Summary</span>
              <span className="text-[10px] font-mono font-bold text-slate-400">#{activeOrder.id}</span>
            </div>
            <div className="space-y-1.5 max-h-24 overflow-y-auto">
              {activeOrder.items.map(item => (
                <div key={item.id} className="flex justify-between text-[11px] font-medium">
                  <span>{item.quantity}x {item.menuItem.name}</span>
                  <span className="font-bold">£{(item.menuItem.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-2 flex justify-between font-extrabold text-slate-900 text-xs">
              <span>Paid Total</span>
              <span>£{activeOrder.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      ) : selectedRestaurant ? (
        /* Detailed Menu view inside phone mockup */
        <div className="flex-1 flex flex-col bg-white">
          {/* Cover image & Back button */}
          <div className="h-28 bg-slate-100 relative flex-shrink-0">
            {selectedRestaurant.bannerImage && (
              <img src={selectedRestaurant.bannerImage} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/35"></div>
            <button
              onClick={() => setSelectedRestaurant(null)}
              className="absolute left-3 w-8 h-8 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center shadow-md hover:bg-white cursor-pointer"
              style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
            >
              <ChevronLeft className="w-5 h-5 text-slate-800" />
            </button>
            <div className="absolute bottom-3 left-3 right-3 text-white">
              <div className="text-[9px] font-extrabold uppercase bg-brand-orange text-white px-1.5 py-0.5 rounded-sm inline-block mb-1">
                {selectedRestaurant.cuisine}
              </div>
              <h3 className="font-black text-base truncate leading-none">{selectedRestaurant.name}</h3>
            </div>
          </div>

          {/* Restaurant details */}
          <div className="p-3 border-b border-slate-100 text-xs text-slate-500 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
            <div className="flex items-center gap-1 font-bold text-slate-700">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{selectedRestaurant.rating} ({selectedRestaurant.reviewsCount})</span>
            </div>
            <div className="flex items-center gap-1 font-semibold">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{Math.round(selectedRestaurant.deliveryTimeRange[0] * currentPostcode.deliveryMultiplier)} min</span>
            </div>
            <div className="font-bold text-brand-blue">
              {selectedRestaurant.offersFreeDelivery ? 'Free Delivery' : `£${(selectedRestaurant.deliveryFee * currentPostcode.deliveryMultiplier).toFixed(2)} del`}
            </div>
          </div>

          {/* Menu Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
            {closedRestaurants.includes(selectedRestaurant.id) ? (
              <div className="p-6 text-center text-red-500 bg-red-50/50 border border-red-100 rounded-xl space-y-2">
                <ShieldAlert className="w-10 h-10 mx-auto opacity-75" />
                <p className="font-bold text-sm">Restaurant is Closed</p>
                <p className="text-[11px] text-red-400">The merchant has toggled their kitchen offline in the Business App. Please choose another spot.</p>
              </div>
            ) : (
              selectedRestaurant.menu.map(item => {
                const isOutOfStock = outOfStockItems.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenCustomizer(item)}
                    className={`flex gap-3 pb-3 border-b border-slate-100 last:border-none cursor-pointer group select-none ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs text-slate-800 group-hover:text-brand-blue transition-colors">{item.name}</h4>
                        {isOutOfStock && <span className="text-[8px] bg-red-100 text-red-600 px-1 py-0.2 rounded-sm font-black">OUT OF STOCK</span>}
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-snug">{item.description}</p>
                      <span className="font-black text-xs text-slate-900 block pt-1">£{item.price.toFixed(2)}</span>
                    </div>
                    {item.image && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0">
                        <img src={item.image} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Marketplace home page inside phone mockup */
        <div className="flex-1 flex flex-col">
          {/* Summer Banner */}
          <div className="p-3.5 bg-linear-to-r from-brand-blue to-blue-900 text-white rounded-b-xl flex-shrink-0 flex items-center justify-between gap-2 shadow-sm">
            <div className="space-y-0.5">
              <span className="bg-brand-orange text-white text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase">UK PROMO</span>
              <h3 className="font-black text-xs">Traditional Chippy Specials</h3>
              <p className="text-[9px] text-blue-100 font-medium">Use code <b className="text-white bg-white/20 px-1 rounded-sm">CHIPPY10</b> for 10% off cod!</p>
            </div>
            <div className="text-2xl">🐟</div>
          </div>

          {/* Quick Categories horizontal carousel */}
          <div className="p-3 bg-white border-b border-slate-100 flex gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
            {[
              { id: 'Chippy', emoji: '🐟', label: 'Chippy' },
              { id: 'Roast', emoji: '🥩', label: 'Roast' },
              { id: 'Curry', emoji: '🍛', label: 'Curry' },
              { id: 'Burgers', emoji: '🍔', label: 'Burgers' },
              { id: 'Kebab', emoji: '🌯', label: 'Kebab' },
              { id: 'Tea', emoji: '🧁', label: 'High Tea' }
            ].map(cat => {
              const isSelected = selectedCategoryHero === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryHero(isSelected ? null : cat.id)}
                  className={`px-3 py-1.5 border rounded-full flex items-center gap-1 cursor-pointer flex-shrink-0 text-[11px] font-bold transition-all ${
                    isSelected ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-slate-150 bg-slate-50 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Filter Chips row */}
          <div className="p-3 flex gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
            {['All', 'Offers', 'Top Rated', 'Fastest'].map(filter => {
              const isSelected = activeFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => onFilterChange(filter)}
                  className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full transition-all cursor-pointer ${
                    isSelected ? 'bg-brand-orange text-white shadow-xs' : 'bg-slate-200/60 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter === 'Top Rated' ? '★ 4.7+' : filter === 'Fastest' ? '⚡ Under 30' : filter}
                </button>
              );
            })}
          </div>

          {/* Search Bar inside App */}
          <div className="px-3 pb-2 flex-shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Search cod, roasts, curries..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-[16px] outline-hidden focus:bg-white focus:ring-1 focus:ring-brand-blue"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Restaurant Cards list inside mobile frame */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {filteredRestaurants.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2 bg-white rounded-xl border border-slate-100">
                <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-xs text-slate-800">No restaurants near you</p>
                <p className="text-[10px] max-w-[200px] mx-auto text-slate-400">Try changing your search query or reset filters.</p>
              </div>
            ) : (
              filteredRestaurants.map(rest => {
                const isClosed = closedRestaurants.includes(rest.id);
                return (
                  <div
                    key={rest.id}
                    onClick={() => selectRestaurantSafely(rest)}
                    className="bg-white rounded-xl border border-slate-150 overflow-hidden shadow-xs cursor-pointer hover:border-slate-300 transition-all select-none relative"
                  >
                    <div className="h-20 bg-slate-150 relative">
                      {rest.image && (
                        <img src={rest.image} alt={rest.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      )}
                      {isClosed && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                          <span className="text-[10px] font-black text-white bg-red-600 px-2 py-0.5 rounded-sm">CLOSED</span>
                        </div>
                      )}
                      {rest.discountOffer && !isClosed && (
                        <div className="absolute top-2 left-2 bg-brand-orange text-white text-[8px] font-black px-1.5 py-0.5 rounded-sm shadow-xs">
                          {rest.discountOffer}
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 space-y-1">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-xs text-slate-900 truncate pr-2 max-w-[170px]">{rest.name}</h4>
                        <div className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500 flex-shrink-0">
                          <Star className="w-3 h-3 fill-amber-500" />
                          <span>{rest.rating}</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold flex justify-between">
                        <span>{rest.cuisine}</span>
                        <span>{Math.round(rest.deliveryTimeRange[0] * currentPostcode.deliveryMultiplier)}-{Math.round(rest.deliveryTimeRange[1] * currentPostcode.deliveryMultiplier)} mins</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Floating Basket Drawer */}
      {cart.length > 0 && selectedRestaurant && activeOrder?.status !== 'OutForDelivery' && activeOrder?.status !== 'Preparing' && (
        <button
          onClick={() => {
            setCheckoutStep('cart');
            setIsCartOpen(true);
          }}
          className="absolute bottom-3 left-3 right-3 h-10 bg-brand-blue hover:bg-brand-blue/95 text-white rounded-full font-bold text-xs flex items-center justify-between px-4 shadow-md z-30 cursor-pointer animate-pulse"
        >
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4" />
            <span className="bg-brand-orange text-white px-1.5 py-0.5 rounded-full text-[9px] font-black">{cart.reduce((sum, i) => sum + i.quantity, 0)}</span>
          </div>
          <span>View Basket</span>
          <span className="font-extrabold">£{grandTotal.toFixed(2)}</span>
        </button>
      )}

      {/* Customizer Dialog Modal */}
      {customizingItem && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-end z-50">
          <div className="w-full bg-white rounded-t-2xl max-h-[85%] overflow-y-auto p-4 space-y-4 animate-in slide-in-from-bottom duration-200 text-xs">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-black text-sm text-slate-900">{customizingItem.name}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{customizingItem.description}</p>
              </div>
              <button onClick={() => setCustomizingItem(null)} className="text-slate-400 hover:text-black font-bold">Close</button>
            </div>

            {/* Customizer Option */}
            {customizingItem.options && customizingItem.options.length > 0 ? (
              customizingItem.options.map(opt => (
                <div key={opt.name} className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[9px]">
                      {opt.name} {opt.required && <span className="text-red-500">*</span>}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">
                      {opt.type === 'select' ? 'Choose One' : 'Select Multiple'}
                    </span>
                  </div>
                  {opt.type === 'select' ? (
                    <div className="grid grid-cols-2 gap-2">
                      {opt.choices.map(choice => {
                        const isSelected = selectedOptions[opt.name] === choice.name;
                        return (
                          <button
                            key={choice.name}
                            type="button"
                            onClick={() => setSelectedOptions({ ...selectedOptions, [opt.name]: choice.name })}
                            className={`h-8 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center justify-between px-3 ${
                              isSelected ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <span>{choice.name}</span>
                            {choice.price > 0 && <span className="font-semibold text-slate-500 text-[10px]">+{choice.price > 0 ? `£${choice.price.toFixed(2)}` : 'Free'}</span>}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {opt.choices.map(choice => {
                        const isChecked = selectedOptions[`${opt.name}_${choice.name}`] === 'true';
                        return (
                          <button
                            key={choice.name}
                            type="button"
                            onClick={() => {
                              const key = `${opt.name}_${choice.name}`;
                              const nextVal = isChecked ? 'false' : 'true';
                              setSelectedOptions({ ...selectedOptions, [key]: nextVal });
                            }}
                            className={`h-8 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center justify-between px-3 ${
                              isChecked ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <span>{choice.name}</span>
                            {choice.price > 0 && <span className="font-semibold text-slate-500 text-[10px]">+{choice.price > 0 ? `£${choice.price.toFixed(2)}` : 'Free'}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            ) : (
              /* Fallback to default Size option for legacy data */
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[9px] block">Select Size</span>
                <div className="flex gap-2">
                  {['Standard', 'Large (+£2.50)'].map(opt => {
                    const val = opt.startsWith('Standard') ? 'Standard' : 'Large';
                    const isSelected = selectedOptions['Size'] === val;
                    return (
                      <button
                        key={opt}
                        onClick={() => setSelectedOptions({ ...selectedOptions, 'Size': val })}
                        className={`flex-1 h-8 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          isSelected ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Preparation Notes */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <label className="font-extrabold text-slate-800 uppercase tracking-wider text-[9px] block">Kitchen Prep Instructions</label>
              <input
                type="text"
                placeholder="e.g. no vinegar, extra sauce on side, etc."
                value={customizationNotes}
                onChange={(e) => setCustomizationNotes(e.target.value)}
                className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-[16px]"
              />
            </div>

            {/* Confirm CTA */}
            <button
              onClick={handleConfirmCustomization}
              className="w-full h-9 bg-brand-orange hover:bg-brand-orange/95 text-white font-extrabold rounded-lg"
            >
              Add to Basket • £{(() => {
                let currentItemPrice = customizingItem.price;
                if (customizingItem.options && customizingItem.options.length > 0) {
                  customizingItem.options.forEach(opt => {
                    if (opt.type === 'select') {
                      const selectedVal = selectedOptions[opt.name];
                      const choice = opt.choices.find(c => c.name === selectedVal);
                      if (choice) {
                        currentItemPrice += choice.price;
                      }
                    } else if (opt.type === 'checkbox') {
                      opt.choices.forEach(choice => {
                        const isChecked = selectedOptions[`${opt.name}_${choice.name}`] === 'true';
                        if (isChecked) {
                          currentItemPrice += choice.price;
                        }
                      });
                    }
                  });
                } else {
                  currentItemPrice += selectedOptions['Size'] === 'Large' ? 2.50 : 0;
                }
                return currentItemPrice.toFixed(2);
              })()}
            </button>
          </div>
        </div>
      )}

      {/* Slide-over Phone Basket & Stripe Checkout Portal */}
      {isCartOpen && selectedRestaurant && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-40 flex flex-col justify-end">
          <div className="absolute inset-0" onClick={() => setIsCartOpen(false)}></div>
          <div className="w-full bg-white rounded-t-2xl max-h-[92%] flex flex-col z-10 animate-in slide-in-from-bottom duration-300 text-xs">
            
            {/* Header */}
            <div className="p-3.5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-1.5 font-black text-slate-900 text-sm">
                <ShoppingBag className="w-4 h-4 text-brand-orange" />
                <span>Your Basket</span>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-black font-bold">Back</button>
            </div>

            {/* Content pane */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {checkoutStep === 'cart' && (
                <>
                  <div className="bg-brand-blue/5 rounded-lg p-2.5 border border-brand-blue/10 text-[11px]">
                    <span className="text-[8px] text-brand-blue font-black uppercase tracking-wider block">Merchant Pick</span>
                    <span className="font-bold text-slate-950">{selectedRestaurant.name}</span>
                  </div>

                  {/* items */}
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.id} className="flex gap-2.5 pb-3 border-b border-slate-100 last:border-none">
                        <div className="flex-1 space-y-0.5">
                          <h4 className="font-bold text-slate-800 text-[11px]">{item.menuItem.name}</h4>
                          <span className="text-[9px] text-slate-400 block font-semibold">
                            {item.customizations.map(c => `${c.name}: ${c.selectedOption}`).join(', ')}
                          </span>
                          {item.notes && <p className="text-[9px] text-amber-600 font-medium italic">&ldquo;{item.notes}&rdquo;</p>}
                        </div>
                        <div className="text-right space-y-1">
                          <span className="font-bold text-slate-900 block">£{((item.menuItem.price + item.customizations.reduce((s,c)=>s+c.additionalPrice,0)) * item.quantity).toFixed(2)}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => onUpdateCartQuantity(item.id, -1)} className="w-4 h-4 bg-slate-100 rounded flex items-center justify-center font-bold">-</button>
                            <span className="font-bold text-[10px] w-4 text-center">{item.quantity}</span>
                            <button onClick={() => onUpdateCartQuantity(item.id, 1)} className="w-4 h-4 bg-slate-100 rounded flex items-center justify-center font-bold">+</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Billing */}
                  <div className="space-y-1.5 text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-800">£{cartSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span className="font-semibold text-slate-800">{deliveryFee === 0 ? 'FREE' : `£${deliveryFee.toFixed(2)}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform Service Fee</span>
                      <span className="font-semibold text-slate-800">£{serviceFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-slate-950 pt-2 border-t border-slate-200">
                      <span>Total</span>
                      <span>£{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Stripe Checkout Transition */}
                  <button
                    onClick={() => setCheckoutStep('stripe')}
                    className="w-full h-11 bg-brand-orange hover:bg-brand-orange/95 text-white font-black rounded-lg flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Secure Checkout with Stripe</span>
                  </button>
                </>
              )}

              {/* STRIPE PAYMENT CONTAINER */}
              {checkoutStep === 'stripe' && (
                <form onSubmit={handleStripeCheckout} className="space-y-4">
                  <div className="bg-slate-900 text-white p-3 rounded-lg border border-slate-800 space-y-1 shadow-inner font-mono text-[10px]">
                    <div className="flex justify-between text-brand-orange font-bold uppercase tracking-wider text-[9px]">
                      <span>Stripe Checkout Node</span>
                      <span>SECURE SSL</span>
                    </div>
                    <div className="text-slate-300">Merchant: Go-Zoon UK Limited</div>
                    <div className="text-slate-300">Amount: £{grandTotal.toFixed(2)}</div>
                    <div className="text-[9px] text-slate-400 mt-2 border-t border-slate-800 pt-1.5 font-bold">
                      💳 TEST CARD: Use <span className="text-brand-orange">4242 4242 4242 4242</span> for card credentials.
                    </div>
                  </div>

                  {stripeError && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-2.5 rounded-lg text-[10px] font-semibold">
                      {stripeError}
                    </div>
                  )}

                  {/* Card fields */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">Delivery Address (London Zone)</label>
                      <input
                        type="text"
                        required
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full h-9 px-2.5 border border-slate-250 rounded-md bg-slate-50 text-[16px]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={stripeCardName}
                        onChange={(e) => setStripeCardName(e.target.value)}
                        className="w-full h-9 px-2.5 border border-slate-250 rounded-md text-[16px] uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">Card Number (Stripe Test)</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          maxLength={19}
                          placeholder="4242 4242 4242 4242"
                          value={stripeCardNum}
                          onChange={(e) => {
                            // add space every 4 digits
                            const val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                            const matches = val.match(/\d{4,16}/g);
                            const match = matches && matches[0] || '';
                            const parts = [];
                            for (let i=0, len=match.length; i<len; i+=4) {
                              parts.push(match.substring(i, i+4));
                            }
                            if (parts.length > 0) {
                              setStripeCardNum(parts.join(' '));
                            } else {
                              setStripeCardNum(val);
                            }
                          }}
                          className="w-full h-9 pl-8 pr-3 border border-slate-250 rounded-md text-[16px] font-mono"
                        />
                        <CreditCard className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">Expiry Date</label>
                        <input
                          type="text"
                          required
                          placeholder="MM/YY"
                          maxLength={5}
                          value={stripeCardExpiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length > 2) {
                              val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
                            }
                            setStripeCardExpiry(val);
                          }}
                          className="w-full h-9 px-2.5 border border-slate-250 rounded-md text-[16px] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">CVC Code</label>
                        <input
                          type="password"
                          required
                          placeholder="123"
                          maxLength={3}
                          value={stripeCardCvc}
                          onChange={(e) => setStripeCardCvc(e.target.value.replace(/\D/g, ''))}
                          className="w-full h-9 px-2.5 border border-slate-250 rounded-md text-[16px] font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-[9px] text-slate-400 text-center">
                    By placing this order you agree to our{' '}
                    <button type="button" onClick={() => setIsLegalOpen(true)} className="text-brand-blue font-bold underline cursor-pointer">
                      Terms, Privacy &amp; Refund Policy
                    </button>
                  </p>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCheckoutStep('cart')}
                      className="w-24 h-10 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-bold"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 h-10 bg-brand-orange hover:bg-brand-orange/95 text-white font-black rounded-lg shadow-md flex items-center justify-center gap-1"
                    >
                      <span>Pay £{grandTotal.toFixed(2)} via Stripe</span>
                    </button>
                  </div>
                </form>
              )}

              {isLegalOpen && <LegalModal onClose={() => setIsLegalOpen(false)} />}

              {checkoutStep === 'processing' && (
                <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-brand-orange/20 border-t-brand-orange rounded-full animate-spin"></div>
                    <CreditCard className="w-5 h-5 text-brand-orange absolute left-3.5 top-3.5 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-950">Processing Stripe payment</h4>
                    <p className="text-[10px] font-semibold text-slate-400 font-mono animate-pulse">{processingStatus}</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Slide-over My Orders History Drawer */}
      {isOrdersOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-40 flex flex-col justify-end">
          <div className="absolute inset-0" onClick={() => setIsOrdersOpen(false)}></div>
          <div className="w-full bg-white rounded-t-2xl h-[92%] max-h-[92%] flex flex-col z-10 animate-in slide-in-from-bottom duration-300 text-xs">
            
            {/* Header */}
            <div className="p-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
              <div className="flex items-center gap-1.5 font-black text-slate-900 text-sm">
                <ClipboardList className="w-4 h-4 text-brand-blue" />
                <span>My Orders History</span>
                <span className="bg-slate-200 text-slate-700 text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                  {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                </span>
              </div>
              <button 
                onClick={() => setIsOrdersOpen(false)} 
                className="text-xs font-bold text-slate-400 hover:text-slate-900 px-2 py-1 bg-slate-200/50 rounded-md cursor-pointer animate-in fade-in"
              >
                Close
              </button>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {orders.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 text-slate-400">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-800 text-xs">No orders yet</h4>
                    <p className="text-[10px] text-slate-400 max-w-[200px]">Any meals you order through Go-Zoon will show up right here for fast tracking and reordering.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map(order => {
                    const isActive = order.status !== 'Delivered' && order.status !== 'Cancelled';
                    return (
                      <div key={order.id} className="bg-white rounded-xl border border-slate-150 p-3 space-y-3 shadow-xs">
                        {/* Title Row */}
                        <div className="flex justify-between items-start gap-1">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-400 font-mono">#{order.id}</span>
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                              <span className="text-[9px] font-semibold text-slate-400">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-slate-900 text-xs leading-tight">{order.restaurantName}</h4>
                          </div>
                          
                          {/* Status Badge */}
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                            order.status === 'Placed' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'Preparing' ? 'bg-amber-100 text-amber-700' :
                            order.status === 'OutForDelivery' ? 'bg-orange-100 text-orange-700 animate-pulse' :
                            order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {order.status}
                          </span>
                        </div>

                        {/* Items listed */}
                        <div className="border-t border-slate-50 pt-2 space-y-1 font-semibold text-slate-600 text-[10px]">
                          {order.items.map(item => (
                            <div key={item.id} className="flex justify-between">
                              <span>{item.quantity}x {item.menuItem.name}</span>
                              <span className="text-slate-400">£{(item.menuItem.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Total price and actions */}
                        <div className="border-t border-slate-100 pt-2 flex items-center justify-between gap-2">
                          <div className="text-[10px] font-bold text-slate-900">
                            <span>Paid: </span>
                            <span className="font-extrabold text-xs text-slate-950">£{order.total.toFixed(2)}</span>
                          </div>

                          <div className="flex gap-1.5">
                            {isActive ? (
                              <button
                                onClick={() => {
                                  onSetActiveOrder(order.id);
                                  setIsOrdersOpen(false);
                                }}
                                className="px-3 h-7 bg-brand-blue text-white rounded-lg font-bold text-[9px] flex items-center gap-1 hover:bg-brand-blue/90 animate-pulse shadow-sm cursor-pointer"
                              >
                                <History className="w-3 h-3" />
                                <span>Track Live Status</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReorder(order)}
                                className="px-3 h-7 bg-brand-orange text-white rounded-lg font-bold text-[9px] flex items-center gap-1 hover:bg-brand-orange/95 shadow-sm cursor-pointer"
                              >
                                <span>Reorder Items</span>
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
