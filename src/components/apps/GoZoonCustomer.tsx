import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, ShoppingBag, Clock, Tag, Award, Check, ChevronLeft, ChevronDown, Star, Phone, HelpCircle, Navigation, ShieldAlert, CreditCard, ClipboardList, History, User, LogOut, Plus, Bike, Store, Trash2, Leaf, SlidersHorizontal, Info, Bell, MessageSquare, Flame, TrendingUp, Banknote, Download, FileText, LifeBuoy, KeyRound, X } from 'lucide-react';
import { Restaurant, CartItem, Order, UKPostcodeZone, MenuItem, OrderStatus, CartCustomization, SavedAddress, Review, AppNotification } from '../../types';
import { validateUKPostcode, haversineDistanceKm, NEARBY_RADIUS_KM, getStoreClosureReason, isRestaurantVisibleToCustomers } from '../../data/restaurants';
import LegalModal from '../LegalModal';
import PhoneLogin from '../PhoneLogin';
import { fetchApi, StoredSession } from '../../api';

const SEARCH_PLACEHOLDER_EXAMPLES = ['Seafood', 'Curry', 'Burgers', 'Roast Dinner', 'Kebab', 'Pizza'];

// Isolated in its own component so the rotating placeholder's interval only
// re-renders this input, not the whole (large) restaurant browsing screen.
function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }): React.JSX.Element {
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx(prev => (prev + 1) % SEARCH_PLACEHOLDER_EXAMPLES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={`Search for "${SEARCH_PLACEHOLDER_EXAMPLES[placeholderIdx]}"`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 pl-9 pr-3 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-[16px] outline-hidden focus:bg-white focus:ring-1 focus:ring-brand-blue"
      />
      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
    </div>
  );
}

// A cart item's unit price is either its selected variant's absolute price (an
// alternate size/price point - see MenuItemVariant) or the dish's own base price.
// Never the two combined - variants replace the base price, they don't add to it.
function getCartItemBasePrice(item: CartItem): number {
  return item.selectedVariant ? item.selectedVariant.price : item.menuItem.price;
}

interface CheckoutParams {
  address: string;
  postcode: string;
  cardName: string;
  restaurantId: string;
  orderMode: 'Delivery' | 'Collection';
  paymentMethod: 'Card' | 'Cash';
  tip: number;
  promoCode?: string;
  promoDiscountPercent?: number;
}

interface GoZoonCustomerProps {
  session: StoredSession | null;
  onLoggedIn: (session: StoredSession) => void;
  onLogout: () => void;
  restaurantsList: Restaurant[];
  currentPostcode: UKPostcodeZone;
  onPostcodeChange: (zone: UKPostcodeZone) => void;
  cart: CartItem[];
  onAddToCart: (item: CartItem) => void;
  onUpdateCartQuantity: (id: string, delta: number) => void;
  onRemoveCartItem: (id: string) => void;
  onCheckout: (params: CheckoutParams) => Promise<{ success: boolean; error?: string }>;
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
  session,
  onLoggedIn,
  onLogout,
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
  const [pendingRestaurantSwitch, setPendingRestaurantSwitch] = useState<Restaurant | null>(null);
  const [selectedCategoryHero, setSelectedCategoryHero] = useState<string | null>(null);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [customizationNotes, setCustomizationNotes] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [confirmingCancelOrder, setConfirmingCancelOrder] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isChangingPostcode, setIsChangingPostcode] = useState(false);
  const [postcodeInput, setPostcodeInput] = useState(currentPostcode.postcode);
  const [postcodeError, setPostcodeError] = useState('');

  // Saved addresses
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('Home');
  const [newAddressLine, setNewAddressLine] = useState('');
  const [newAddressPostcode, setNewAddressPostcode] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Promo code
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercent: number } | null>(null);
  const [promoError, setPromoError] = useState('');

  // Tip
  const [tipAmount, setTipAmount] = useState(0);

  // Payment method: Card (simulated Stripe) or Cash on Delivery/Collection - no
  // third-party payment gateway is needed for the Cash path.
  const [paymentMethod, setPaymentMethod] = useState<'Card' | 'Cash'>('Card');

  // Post-delivery rating
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [dismissedRatingIds, setDismissedRatingIds] = useState<Set<string>>(new Set());

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
  const [selectedVariantName, setSelectedVariantName] = useState<string>('');

  // Restaurant browsing sort order
  const [sortBy, setSortBy] = useState<'Recommended' | 'Rating' | 'Fastest' | 'Price'>('Recommended');

  // Restaurant page: in-menu search, category filter, veg-only filter, info panel
  const [restaurantSearchQuery, setRestaurantSearchQuery] = useState('');
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string | null>(null);
  const [vegOnly, setVegOnly] = useState(false);
  const [isRestaurantInfoOpen, setIsRestaurantInfoOpen] = useState(false);
  const [restaurantReviews, setRestaurantReviews] = useState<Review[]>([]);

  // Reset restaurant-page-scoped filters whenever the selected restaurant changes,
  // and load its individual reviews (not just the aggregate rating/count).
  useEffect(() => {
    setRestaurantSearchQuery('');
    setSelectedMenuCategory(null);
    setVegOnly(false);
    setIsRestaurantInfoOpen(false);
    setRestaurantReviews([]);
    if (!selectedRestaurant) return;
    fetchApi(`/api/restaurants/${selectedRestaurant.id}/reviews`)
      .then(res => res.json())
      .then(data => {
        if (data?.reviews) setRestaurantReviews(data.reviews);
      })
      .catch(err => console.error('[Reviews] Failed to load restaurant reviews:', err));
  }, [selectedRestaurant?.id]);

  // Profile: display name + notification preferences
  const [profileName, setProfileName] = useState('');
  const [profileNameInput, setProfileNameInput] = useState('');
  const [notifyOrderUpdates, setNotifyOrderUpdates] = useState(true);
  const [notifyPromotions, setNotifyPromotions] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [hasMpin, setHasMpin] = useState(false);

  const refreshProfile = () => {
    if (!session) return;
    fetchApi('/api/profile')
      .then(res => res.json())
      .then(data => {
        setProfileName(data?.name || '');
        setProfileNameInput(data?.name || '');
        setNotifyOrderUpdates(data?.notifyOrderUpdates !== false);
        setNotifyPromotions(data?.notifyPromotions !== false);
        setHasMpin(!!data?.hasMpin);
      })
      .catch(err => console.error('[Profile] Failed to load:', err));
  };

  useEffect(refreshProfile, [session]);

  const handleSaveProfileName = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSaved(false);
    try {
      const res = await fetchApi('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileNameInput.trim() })
      });
      const data = await res.json();
      if (data?.success) {
        setProfileName(data.name || '');
        setProfileSaved(true);
      }
    } catch (err) {
      console.error('[Profile] Failed to save name:', err);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleToggleNotification = (key: 'notifyOrderUpdates' | 'notifyPromotions') => {
    const nextValue = key === 'notifyOrderUpdates' ? !notifyOrderUpdates : !notifyPromotions;
    if (key === 'notifyOrderUpdates') setNotifyOrderUpdates(nextValue);
    else setNotifyPromotions(nextValue);
    fetchApi('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: nextValue })
    }).catch(err => console.error('[Profile] Failed to save notification setting:', err));
  };

  // MPIN (local quick-login PIN, fully self-contained - no SMS/3rd-party dependency)
  const [mpinInput, setMpinInput] = useState('');
  const [mpinConfirmInput, setMpinConfirmInput] = useState('');
  const [mpinSaving, setMpinSaving] = useState(false);
  const [mpinSaved, setMpinSaved] = useState(false);
  const [mpinError, setMpinError] = useState('');

  const handleSetMpin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMpinError('');
    setMpinSaved(false);
    if (!/^\d{4,6}$/.test(mpinInput)) {
      setMpinError('MPIN must be 4-6 digits.');
      return;
    }
    if (mpinInput !== mpinConfirmInput) {
      setMpinError('MPINs do not match.');
      return;
    }
    setMpinSaving(true);
    try {
      const res = await fetchApi('/api/auth/mpin/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mpin: mpinInput })
      });
      const data = await res.json();
      if (data?.success) {
        setHasMpin(true);
        setMpinSaved(true);
        setMpinInput('');
        setMpinConfirmInput('');
      } else {
        setMpinError(data?.error || 'Could not save MPIN.');
      }
    } catch {
      setMpinError('Network error. Please try again.');
    } finally {
      setMpinSaving(false);
    }
  };

  const handleRemoveMpin = async () => {
    if (!window.confirm('Remove your MPIN? You will need to log in with OTP next time.')) return;
    try {
      await fetchApi('/api/auth/mpin', { method: 'DELETE' });
      setHasMpin(false);
    } catch (err) {
      console.error('[MPIN] Failed to remove:', err);
    }
  };

  // Help & Support - self-contained ticket capture (no live chat/email provider needed)
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const [supportSent, setSupportSent] = useState(false);

  const handleSendSupportMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setSupportSending(true);
    try {
      const res = await fetchApi('/api/support-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: supportMessage.trim() })
      });
      if (res.ok) {
        setSupportSent(true);
        setSupportMessage('');
      }
    } catch (err) {
      console.error('[Support] Failed to send message:', err);
    } finally {
      setSupportSending(false);
    }
  };

  // Delete Account
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your Go-Zoon account? This removes your saved addresses and profile and cannot be undone.')) return;
    if (!window.confirm('This is permanent. Are you absolutely sure you want to delete your account?')) return;
    setIsDeletingAccount(true);
    try {
      const res = await fetchApi('/api/customers/me', { method: 'DELETE' });
      if (res.ok) {
        setIsAccountOpen(false);
        onLogout();
      }
    } catch (err) {
      console.error('[Account] Failed to delete account:', err);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Post-delivery courier rating (separate from the restaurant rating)
  const [courierRatingValue, setCourierRatingValue] = useState(5);

  // Notification center - real per-customer notifications (order updates + promos),
  // replacing the old static hardcoded promo banner.
  useEffect(() => {
    if (!session) return;
    const fetchNotifications = () => {
      fetchApi('/api/notifications')
        .then(res => res.json())
        .then(data => {
          if (data?.notifications) setNotifications(data.notifications);
        })
        .catch(err => console.error('[Notifications] Failed to load:', err));
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [session]);

  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    fetchApi(`/api/notifications/${id}/read`, { method: 'POST' }).catch(() => {});
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    fetchApi('/api/notifications/read-all', { method: 'POST' }).catch(() => {});
  };

  // Tapping a notification should take you to the thing it's about, not just mark it read.
  const handleNotificationClick = (n: AppNotification) => {
    handleMarkNotificationRead(n.id);
    setIsNotificationsOpen(false);
    if (!n.orderId) return;
    const relatedOrder = orders.find(o => o.id === n.orderId);
    if (relatedOrder && relatedOrder.status !== 'Delivered' && relatedOrder.status !== 'Cancelled') {
      onSetActiveOrder(relatedOrder.id);
    } else {
      setIsOrdersOpen(true);
    }
  };

  const activeOrder = orders.find(o => o.id === activeOrderId);

  // Load saved addresses once logged in.
  useEffect(() => {
    if (!session) return;
    fetchApi('/api/addresses')
      .then(res => res.json())
      .then(data => {
        if (data?.addresses) {
          setAddresses(data.addresses);
          const def = data.addresses.find((a: SavedAddress) => a.isDefault) || data.addresses[0];
          if (def) {
            setSelectedAddressId(def.id);
            setDeliveryAddress(`${def.addressLine}, ${def.postcode}`);
          }
        }
      })
      .catch(err => console.error('[Addresses] Failed to load:', err));
  }, [session]);

  // Prompt for a rating the moment an order reaches Delivered and hasn't been rated yet.
  useEffect(() => {
    const toRate = orders.find(o => o.status === 'Delivered' && !o.rated && !dismissedRatingIds.has(o.id));
    if (toRate && !ratingOrder) {
      setRatingOrder(toRate);
      setRatingValue(5);
      setCourierRatingValue(5);
      setRatingComment('');
    }
  }, [orders, ratingOrder, dismissedRatingIds]);

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
    // Keyed off the cart's own restaurantId (not the transient selectedRestaurant view
    // state) so this still catches a restaurant switch after the user has hit "back",
    // which clears selectedRestaurant but leaves the basket populated.
    const cartOwnerId = cart[0]?.restaurantId;
    if (cartOwnerId && cartOwnerId !== restaurant.id) {
      // An in-app confirmation instead of window.confirm() - native confirm() dialogs
      // are unreliable inside Capacitor/WebView builds (can be suppressed or silently
      // auto-dismiss), which made tapping any restaurant other than the basket's owner
      // appear to simply do nothing.
      setPendingRestaurantSwitch(restaurant);
    } else {
      setSelectedRestaurant(restaurant);
    }
  };

  const handleOpenCustomizer = (item: MenuItem) => {
    if (outOfStockItems.includes(item.id)) return;
    setCustomizingItem(item);
    setCustomizationNotes('');
    setSelectedVariantName(item.variants && item.variants.length > 0 ? item.variants[0].name : '');

    // Set dynamic default options if present
    const defaults: { [key: string]: string } = {};
    if (item.options && item.options.length > 0) {
      item.options.forEach(opt => {
        if (opt.type === 'select') {
          defaults[opt.name] = opt.choices[0]?.name || '';
        }
      });
    } else if (!item.variants || item.variants.length === 0) {
      defaults['Size'] = 'Standard';
    }
    setSelectedOptions(defaults);
  };

  const handleConfirmCustomization = () => {
    if (!customizingItem || !selectedRestaurant) return;

    const customizations: CartCustomization[] = [];
    let extraPrice = 0;
    let itemCartId = customizingItem.id;

    // Variants are a distinct, absolute-price choice (see MenuItemVariant) -
    // resolved independently of the additive customization options below.
    let selectedVariant: { name: string; price: number } | undefined;
    if (customizingItem.variants && customizingItem.variants.length > 0) {
      const variant = customizingItem.variants.find(v => v.name === selectedVariantName) || customizingItem.variants[0];
      selectedVariant = variant;
      itemCartId += `-variant_${variant.name}`;
    }

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
    } else if (!customizingItem.variants || customizingItem.variants.length === 0) {
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
      restaurantId: selectedRestaurant.id,
      menuItem: customizingItem,
      quantity: 1,
      customizations,
      selectedVariant,
      notes: customizationNotes.trim() || undefined
    };

    onAddToCart(cartItem);
    setCustomizingItem(null);
  };

  const handleStripeCheckout = (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentMethod === 'Card') {
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
    }

    setStripeError('');
    setCheckoutStep('processing');

    const statuses = paymentMethod === 'Card' ? [
      'Authenticating card with Stripe server...',
      'Securing escrow authorization code...',
      'E-emitting order docket to restaurant terminal...',
      'Payment Captured! Placing order...'
    ] : [
      'Confirming your cash order...',
      'E-emitting order docket to restaurant terminal...'
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
        onCheckout({
          address: deliveryAddress,
          postcode: currentPostcode.postcode,
          cardName: paymentMethod === 'Card' ? stripeCardName : 'Cash on Delivery',
          restaurantId: selectedRestaurant.id,
          orderMode,
          paymentMethod,
          tip: tipAmount,
          promoCode: appliedPromo?.code,
          promoDiscountPercent: appliedPromo?.discountPercent,
        }).then(result => {
          if (result.success) {
            setIsCartOpen(false);
            setCheckoutStep('cart');
            setTipAmount(0);
            setAppliedPromo(null);
            setPromoCodeInput('');
            setPaymentMethod('Card');
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

  // Plain-text itemized receipt - generated entirely client-side (no PDF/invoicing
  // service needed) and offered both as an in-app view and a downloadable file.
  const buildReceiptText = (order: Order): string => {
    const lines: string[] = [];
    lines.push('GO-ZOON RECEIPT');
    lines.push('================');
    lines.push(`Order #${order.id}`);
    lines.push(`Date: ${new Date(order.createdAt).toLocaleString()}`);
    lines.push(`Restaurant: ${order.restaurantName}`);
    lines.push(`${order.orderMode === 'Collection' ? 'Collection from' : 'Delivered to'}: ${order.orderMode === 'Collection' ? order.restaurantAddress : order.deliveryAddress}`);
    lines.push(`Payment method: ${order.paymentMethod === 'Cash' ? 'Cash' : 'Card'}`);
    lines.push('');
    lines.push('Items');
    lines.push('-----');
    order.items.forEach(item => {
      const itemTotal = (getCartItemBasePrice(item) + item.customizations.reduce((s, c) => s + c.additionalPrice, 0)) * item.quantity;
      lines.push(`${item.quantity}x ${item.menuItem.name} - £${itemTotal.toFixed(2)}`);
      if (item.selectedVariant) lines.push(`   Option: ${item.selectedVariant.name}`);
      item.customizations.forEach(c => lines.push(`   ${c.name}: ${c.selectedOption}`));
    });
    lines.push('');
    lines.push(`Subtotal: £${order.subtotal.toFixed(2)}`);
    if (order.discount) lines.push(`Promo discount${order.promoCode ? ` (${order.promoCode})` : ''}: -£${order.discount.toFixed(2)}`);
    lines.push(`${order.orderMode === 'Collection' ? 'Collection' : 'Delivery'} fee: £${order.deliveryFee.toFixed(2)}`);
    lines.push(`Platform service fee: £${order.serviceFee.toFixed(2)}`);
    if (order.vat) lines.push(`VAT (20%, included in prices): £${order.vat.toFixed(2)}`);
    if (order.tip) lines.push(`Courier tip: £${order.tip.toFixed(2)}`);
    lines.push(`TOTAL PAID: £${order.total.toFixed(2)}`);
    lines.push('');
    lines.push('Thank you for ordering with Go-Zoon.');
    return lines.join('\n');
  };

  const handleDownloadReceipt = (order: Order) => {
    const blob = new Blob([buildReceiptText(order)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `go-zoon-receipt-${order.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      onAddToCart({ ...item, restaurantId: order.restaurantId });
    });
    setIsOrdersOpen(false);
    setIsCartOpen(true);
    setCheckoutStep('cart');
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressLine.trim() || !newAddressPostcode.trim()) return;
    try {
      const res = await fetchApi('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newAddressLabel, addressLine: newAddressLine, postcode: newAddressPostcode, isDefault: addresses.length === 0 })
      });
      const data = await res.json();
      if (data?.success && data.address) {
        setAddresses(prev => [data.address, ...prev]);
        setSelectedAddressId(data.address.id);
        setDeliveryAddress(`${data.address.addressLine}, ${data.address.postcode}`);
        setNewAddressLine('');
        setNewAddressPostcode('');
        setIsAddingAddress(false);
      }
    } catch (err) {
      console.error('[Addresses] Failed to save:', err);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    setAddresses(prev => prev.filter(a => a.id !== id));
    try {
      await fetchApi(`/api/addresses/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('[Addresses] Failed to delete:', err);
    }
  };

  const handleApplyPromo = async () => {
    setPromoError('');
    if (!promoCodeInput.trim()) return;
    try {
      const res = await fetchApi('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCodeInput.trim() })
      });
      const data = await res.json();
      if (data?.valid) {
        setAppliedPromo({ code: data.code, discountPercent: data.discountPercent });
      } else {
        setAppliedPromo(null);
        setPromoError(data.error || 'Invalid promo code.');
      }
    } catch {
      setPromoError('Could not validate promo code. Please try again.');
    }
  };

  const handleSubmitRating = async () => {
    if (!ratingOrder) return;
    setRatingSubmitting(true);
    try {
      const canRateCourier = ratingOrder.orderMode === 'Delivery' && !!ratingOrder.driverName;
      const res = await fetchApi('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: ratingOrder.id,
          rating: ratingValue,
          courierRating: canRateCourier ? courierRatingValue : undefined,
          comment: ratingComment.trim() || undefined
        })
      });
      if (res.ok) {
        setDismissedRatingIds(prev => new Set(prev).add(ratingOrder.id));
        setRatingOrder(null);
      }
    } catch (err) {
      console.error('[Reviews] Failed to submit rating:', err);
    } finally {
      setRatingSubmitting(false);
    }
  };

  // Calculations for basket
  const cartSubtotal = cart.reduce((acc, item) => {
    const customizationsCost = item.customizations.reduce((sum, c) => sum + c.additionalPrice, 0);
    return acc + (getCartItemBasePrice(item) + customizationsCost) * item.quantity;
  }, 0);

  const isCollection = orderMode === 'Collection';
  const deliveryFee = selectedRestaurant && !isCollection
    ? (selectedRestaurant.offersFreeDelivery ? 0 : Math.round((selectedRestaurant.deliveryFee * currentPostcode.deliveryMultiplier) * 100) / 100)
    : 0;

  const serviceFee = cartSubtotal > 0 ? Math.max(0.99, Math.round(cartSubtotal * 0.05 * 100) / 100) : 0;
  const discountAmount = appliedPromo ? Math.round(cartSubtotal * (appliedPromo.discountPercent / 100) * 100) / 100 : 0;
  const belowMinOrder = !!(selectedRestaurant?.enforceMinOrder && cartSubtotal > 0 && cartSubtotal < selectedRestaurant.minOrder);
  const grandTotal = Math.max(0, cartSubtotal - discountAmount + deliveryFee + serviceFee + tipAmount);
  // Informational only - mirrors the server's VAT breakdown (see computeServerTotal in
  // server.ts). Not added on top of the total: UK menu prices are treated as VAT-inclusive.
  const vatIncluded = cartSubtotal > 0 ? Math.round((cartSubtotal - discountAmount) * 0.2 * 100) / 100 : 0;

  // Admin Portal gate: a restaurant awaiting approval, rejected, suspended, or
  // deactivated should never appear in customer-facing discovery, regardless of
  // its own open/closed toggle.
  const visibleRestaurants = useMemo(() => restaurantsList.filter(isRestaurantVisibleToCustomers), [restaurantsList]);

  // Filters over every restaurant's full menu (.some() + .toLowerCase() per item) -
  // memoized so background polling re-renders and unrelated state changes (e.g.
  // typing in the cart's promo code field) don't force this to recompute from
  // scratch, which was showing up as scroll/navigation jank.
  const filteredRestaurants = useMemo(() => visibleRestaurants.filter(restaurant => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = q === '' ||
      restaurant.name.toLowerCase().includes(q) ||
      restaurant.cuisine.toLowerCase().includes(q) ||
      restaurant.address.toLowerCase().includes(q) ||
      restaurant.postcode.toLowerCase().includes(q) ||
      restaurant.menu.some(item => item.name.toLowerCase().includes(q));

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
  }), [visibleRestaurants, searchQuery, activeFilter, selectedCategoryHero, currentPostcode]);

  // Average menu item price used as a "Price" sort proxy - restaurants don't carry
  // a single price point of their own, only per-dish prices.
  const avgMenuPrice = (restaurant: Restaurant) =>
    restaurant.menu.length > 0 ? restaurant.menu.reduce((sum, item) => sum + item.price, 0) / restaurant.menu.length : 0;

  const sortedRestaurants = useMemo(() => {
    if (sortBy === 'Recommended') return filteredRestaurants;
    const list = [...filteredRestaurants];
    if (sortBy === 'Rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'Fastest') {
      list.sort((a, b) => (a.deliveryTimeRange[0] * currentPostcode.deliveryMultiplier) - (b.deliveryTimeRange[0] * currentPostcode.deliveryMultiplier));
    } else if (sortBy === 'Price') {
      list.sort((a, b) => avgMenuPrice(a) - avgMenuPrice(b));
    }
    return list;
  }, [filteredRestaurants, sortBy, currentPostcode]);

  const showDiscoverySections = !searchQuery.trim() && !selectedCategoryHero && activeFilter === 'All';
  const featuredRestaurants = visibleRestaurants.filter(r => r.featured);

  // "Popular Near You" - the most-reviewed restaurants within actual delivery
  // distance of the selected postcode, distinct from the curated Featured flag.
  const popularNearYou = useMemo(() => {
    return visibleRestaurants
      .filter(r => haversineDistanceKm(currentPostcode, r) <= NEARBY_RADIUS_KM)
      .sort((a, b) => b.reviewsCount - a.reviewsCount)
      .slice(0, 5);
  }, [visibleRestaurants, currentPostcode]);
  // "Recently Ordered" surfaces the actual dishes from order history (matching how
  // items appear in My Orders History), deduped by menu item - not by restaurantId -
  // so multiple different dishes from the same restaurant each get their own card.
  const recentlyOrderedItems = useMemo(() => {
    const seen = new Set<string>();
    const list: { item: CartItem; restaurant: Restaurant }[] = [];
    for (const order of orders) {
      const rest = visibleRestaurants.find(r => r.id === order.restaurantId);
      if (!rest) continue;
      for (const item of order.items) {
        if (seen.has(item.menuItem.id)) continue;
        seen.add(item.menuItem.id);
        list.push({ item, restaurant: rest });
        if (list.length >= 8) break;
      }
      if (list.length >= 8) break;
    }
    return list;
  }, [orders, visibleRestaurants]);

  // Restaurant page: menu filtered by in-menu search, category, and veg-only, then
  // grouped by category so items render in labeled sections instead of one flat list.
  const menuCategories = useMemo(() => {
    if (!selectedRestaurant) return [];
    return Array.from(new Set(selectedRestaurant.menu.map(item => item.category)));
  }, [selectedRestaurant]);

  const isVegItem = (item: MenuItem) => !!item.dietary?.some(d => d === 'Vegetarian' || d === 'Vegan');

  const filteredGroupedMenu = useMemo(() => {
    if (!selectedRestaurant) return [] as { category: string; items: MenuItem[] }[];
    const q = restaurantSearchQuery.trim().toLowerCase();
    const matches = selectedRestaurant.menu.filter(item => {
      const matchesQuery = q === '' || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      const matchesCategory = !selectedMenuCategory || item.category === selectedMenuCategory;
      const matchesVeg = !vegOnly || isVegItem(item);
      return matchesQuery && matchesCategory && matchesVeg;
    });
    const groups: { category: string; items: MenuItem[] }[] = [];
    menuCategories.forEach(category => {
      const items = matches.filter(item => item.category === category);
      if (items.length > 0) groups.push({ category, items });
    });
    return groups;
  }, [selectedRestaurant, restaurantSearchQuery, selectedMenuCategory, vegOnly, menuCategories]);

  const restaurantEstimatedTime = selectedRestaurant
    ? `${Math.round(selectedRestaurant.deliveryTimeRange[0] * currentPostcode.deliveryMultiplier)}-${Math.round(selectedRestaurant.deliveryTimeRange[1] * currentPostcode.deliveryMultiplier)} min`
    : '';

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

  // Reset any pending cancel confirmation if the tracked order changes underneath it
  // (e.g. a new order is placed, or the customer navigates to a different active order).
  useEffect(() => {
    setConfirmingCancelOrder(false);
  }, [activeOrder?.id]);

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

  if (!session) {
    return <PhoneLogin onLoggedIn={onLoggedIn} />;
  }

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
            onClick={() => setIsNotificationsOpen(true)}
            className="flex items-center justify-center p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-brand-blue" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-orange text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white">
                {unreadNotificationCount}
              </span>
            )}
          </button>

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

          <button
            onClick={() => setIsAccountOpen(true)}
            className="flex items-center justify-center p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 cursor-pointer"
            title="Account"
          >
            <User className="w-4 h-4 text-brand-blue" />
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
              {activeOrder.status === 'ReadyForPickup' && 'Ready for Pickup'}
              {activeOrder.status === 'DriverArrived' && 'Courier at the Kitchen'}
              {activeOrder.status === 'PickedUp' && 'Order Collected!'}
              {activeOrder.status === 'OutForDelivery' && 'Rider en Route'}
              {(activeOrder.status as string) === 'Delivered' && 'Delivered!'}
            </h3>
            <p className="text-xs text-brand-orange font-bold mt-1">
              {activeOrder.status === 'Placed' && 'Restaurant is receiving your ticket...'}
              {activeOrder.status === 'Preparing' && 'Freshly baking your traditional British dish...'}
              {activeOrder.status === 'ReadyForPickup' && (activeOrder.driverName ? `${activeOrder.driverName} is heading to the restaurant...` : 'Waiting for a courier to accept this delivery...')}
              {activeOrder.status === 'DriverArrived' && `${activeOrder.driverName || 'Your courier'} has arrived and is collecting your order...`}
              {activeOrder.status === 'PickedUp' && `${activeOrder.driverName || 'Your courier'} is about to set off with your food...`}
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
            <h4 className="text-xs font-black text-slate-800">
              {activeOrder.orderMode === 'Collection' ? 'Collection Order' : activeOrder.driverName ? 'Your Courier' : 'Courier Assignment'}
            </h4>
            {activeOrder.orderMode === 'Collection' ? (
              <p className="text-[11px] text-slate-500">No courier needed - collect your order directly from {activeOrder.restaurantName}.</p>
            ) : activeOrder.driverName ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center font-black text-brand-blue text-sm border border-brand-blue/15">
                  {activeOrder.driverName.slice(0, 2).toUpperCase()}
                </div>
                <div className="text-xs">
                  <div className="font-bold text-slate-900">{activeOrder.driverName}</div>
                  <div className="text-slate-400 font-semibold text-[10px]">Active Rider • London Fleet</div>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">Waiting for a Road King courier to accept this delivery...</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={activeOrder.driverPhone ? `tel:${activeOrder.driverPhone.replace(/\s+/g, '')}` : undefined}
                aria-disabled={!activeOrder.driverPhone}
                className={`h-8 rounded-lg border border-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center gap-1 hover:bg-slate-50 ${!activeOrder.driverPhone ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <Phone className="w-3 h-3 text-brand-blue" />
                <span>Call Courier</span>
              </a>
              <button
                onClick={onResetActiveOrder}
                className="h-8 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center gap-1 hover:bg-slate-200"
              >
                <span>Back to Store</span>
              </button>
            </div>
            {(activeOrder.status === 'Placed' || activeOrder.status === 'Preparing') && (
              confirmingCancelOrder ? (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg space-y-2">
                  <p className="text-[10px] text-red-700 font-bold text-center">Cancel this order? This can't be undone.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setConfirmingCancelOrder(false)}
                      className="h-8 rounded-lg border border-slate-200 text-slate-600 font-bold text-[10px] hover:bg-slate-50 cursor-pointer"
                    >
                      Keep Order
                    </button>
                    <button
                      onClick={() => {
                        onCancelOrder(activeOrder.id);
                        setConfirmingCancelOrder(false);
                      }}
                      className="h-8 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] cursor-pointer"
                    >
                      Yes, Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingCancelOrder(true)}
                  className="w-full h-8 rounded-lg border border-red-200 text-red-600 font-bold text-[10px] flex items-center justify-center gap-1 hover:bg-red-50 cursor-pointer"
                >
                  <span>Cancel Order</span>
                </button>
              )
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
                  <span className="font-bold">£{(getCartItemBasePrice(item) * item.quantity).toFixed(2)}</span>
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
              className="absolute left-3 top-3 w-8 h-8 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center shadow-md hover:bg-white cursor-pointer"
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
          <div className="border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
            <div className="p-3 text-xs text-slate-500 flex justify-between items-center">
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

            <button
              onClick={() => setIsRestaurantInfoOpen(!isRestaurantInfoOpen)}
              className="w-full px-3 pb-2 flex items-center justify-between text-[10px] font-bold text-slate-500 cursor-pointer"
            >
              <span className="flex items-center gap-1">
                <Info className="w-3 h-3 text-slate-400" />
                <span>Restaurant Info</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isRestaurantInfoOpen ? 'rotate-180' : ''}`} />
            </button>

            {isRestaurantInfoOpen && (
              <div className="px-3 pb-3 space-y-2 text-[10.5px] text-slate-600 leading-relaxed">
                {selectedRestaurant.about && <p>{selectedRestaurant.about}</p>}
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3 h-3 text-brand-orange mt-0.5 flex-shrink-0" />
                  <span>{selectedRestaurant.address}</span>
                </div>
                {selectedRestaurant.openingHours && (
                  <div className="flex items-start gap-1.5">
                    <Clock className="w-3 h-3 text-brand-orange mt-0.5 flex-shrink-0" />
                    <span>{selectedRestaurant.openingHours}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Menu Items List */}
          <div className={`flex-1 overflow-y-auto p-3 space-y-4 ${cart.length > 0 ? 'pb-20' : ''}`}>
            {closedRestaurants.includes(selectedRestaurant.id) || getStoreClosureReason(selectedRestaurant) ? (
              <div className="p-6 text-center text-red-500 bg-red-50/50 border border-red-100 rounded-xl space-y-2">
                <ShieldAlert className="w-10 h-10 mx-auto opacity-75" />
                <p className="font-bold text-sm">Restaurant is Closed</p>
                <p className="text-[11px] text-red-400">
                  {getStoreClosureReason(selectedRestaurant) || 'The merchant has toggled their kitchen offline in the Business App. Please choose another spot.'}
                </p>
              </div>
            ) : (
              <>
                {/* In-menu search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder={`Search ${selectedRestaurant.name}'s menu`}
                    value={restaurantSearchQuery}
                    onChange={(e) => setRestaurantSearchQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 bg-slate-100 rounded-lg text-[16px] outline-hidden focus:bg-white focus:ring-1 focus:ring-brand-blue"
                  />
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                </div>

                {/* Category + veg filter chips */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  <button
                    onClick={() => setSelectedMenuCategory(null)}
                    className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full transition-all cursor-pointer flex-shrink-0 ${
                      selectedMenuCategory === null ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    All
                  </button>
                  {menuCategories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedMenuCategory(category === selectedMenuCategory ? null : category)}
                      className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full transition-all cursor-pointer flex-shrink-0 ${
                        selectedMenuCategory === category ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                  <button
                    onClick={() => setVegOnly(!vegOnly)}
                    className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full transition-all cursor-pointer flex-shrink-0 flex items-center gap-1 ${
                      vegOnly ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Leaf className="w-3 h-3" />
                    <span>Veg Only</span>
                  </button>
                </div>

                {filteredGroupedMenu.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 space-y-1.5">
                    <ShieldAlert className="w-7 h-7 text-slate-300 mx-auto" />
                    <p className="text-[11px] font-semibold">No dishes match your search/filters.</p>
                  </div>
                ) : (
                  filteredGroupedMenu.map(group => (
                    <div key={group.category} className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider pt-1">{group.category}</h4>
                      <div className="space-y-3.5">
                        {group.items.map(item => {
                          const isOutOfStock = outOfStockItems.includes(item.id);
                          const isVeg = isVegItem(item);
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleOpenCustomizer(item)}
                              className={`flex gap-3 pb-3 border-b border-slate-100 last:border-none cursor-pointer group select-none ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    title={isVeg ? 'Vegetarian/Vegan' : 'Non-Vegetarian'}
                                    className={`w-3 h-3 flex-shrink-0 border-2 rounded-[2px] flex items-center justify-center ${isVeg ? 'border-emerald-600' : 'border-red-600'}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-emerald-600' : 'bg-red-600'}`}></span>
                                  </span>
                                  <h4 className="font-bold text-xs text-slate-800 group-hover:text-brand-blue transition-colors">{item.name}</h4>
                                  {isOutOfStock && <span className="text-[8px] bg-red-100 text-red-600 px-1 py-0.2 rounded-sm font-black">OUT OF STOCK</span>}
                                </div>
                                <p className="text-[10px] text-slate-400 line-clamp-2 leading-snug">{item.description}</p>
                                <div className="flex items-center gap-2 pt-1">
                                  <span className="font-black text-xs text-slate-900">£{item.price.toFixed(2)}</span>
                                  {item.nutrition && (
                                    <span className="flex items-center gap-0.5 text-[9px] font-semibold text-slate-400">
                                      <Flame className="w-2.5 h-2.5" />
                                      {item.nutrition.calories} kcal
                                    </span>
                                  )}
                                </div>
                              </div>
                              {item.image && (
                                <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0">
                                  <img src={item.image} alt="" referrerPolicy="no-referrer" draggable={false} className="w-full h-full object-cover pointer-events-none" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}

                {/* Reviews */}
                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-brand-blue" />
                    <h4 className="font-extrabold text-xs text-slate-800">Reviews</h4>
                    <span className="text-[9px] text-slate-400 font-semibold">({selectedRestaurant.reviewsCount} total)</span>
                  </div>
                  {restaurantReviews.length === 0 ? (
                    <p className="text-[10px] text-slate-400">No written reviews yet - be the first to rate this restaurant after your order.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {restaurantReviews.map(review => (
                        <div key={review.id} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map(n => (
                                <Star key={n} className={`w-3 h-3 ${n <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} />
                              ))}
                            </div>
                            <span className="text-[9px] text-slate-400 font-semibold">{new Date(review.createdAt).toLocaleDateString()}</span>
                          </div>
                          {review.comment && <p className="text-[10.5px] text-slate-600 leading-snug">{review.comment}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
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

          {/* Recently Ordered - the actual dishes from this customer's own order history */}
          {showDiscoverySections && recentlyOrderedItems.length > 0 && (
            <div className="px-3 py-2 bg-white border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <History className="w-3 h-3 text-brand-blue" />
                <h3 className="font-extrabold text-[11px] text-slate-800">Recently Ordered</h3>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {recentlyOrderedItems.map(({ item, restaurant }) => (
                  <button
                    key={item.menuItem.id}
                    onClick={() => selectRestaurantSafely(restaurant)}
                    className="flex-shrink-0 w-20 text-left cursor-pointer group"
                  >
                    <div className="w-20 h-14 rounded-lg overflow-hidden border border-slate-150 bg-slate-100">
                      {item.menuItem.image && <img src={item.menuItem.image} alt={item.menuItem.name} referrerPolicy="no-referrer" draggable={false} className="w-full h-full object-cover pointer-events-none" />}
                    </div>
                    <span className="block text-[9px] font-bold text-slate-700 truncate mt-1 group-hover:text-brand-blue">{item.menuItem.name}</span>
                    <span className="block text-[8px] text-slate-400 truncate">{restaurant.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Featured Restaurants */}
          {showDiscoverySections && featuredRestaurants.length > 0 && (
            <div className="px-3 py-2 bg-white border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Award className="w-3 h-3 text-brand-orange" />
                <h3 className="font-extrabold text-[11px] text-slate-800">Featured Restaurants</h3>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {featuredRestaurants.map(rest => (
                  <button
                    key={rest.id}
                    onClick={() => selectRestaurantSafely(rest)}
                    className="flex-shrink-0 w-28 text-left cursor-pointer group bg-slate-50 rounded-xl border border-slate-150 overflow-hidden hover:border-brand-blue/40 transition-all"
                  >
                    <div className="w-28 h-14 bg-slate-150 relative">
                      {rest.image && <img src={rest.image} alt={rest.name} referrerPolicy="no-referrer" draggable={false} className="w-full h-full object-cover pointer-events-none" />}
                      <span className="absolute top-1 left-1 bg-brand-orange text-white text-[7px] font-black px-1.5 py-0.3 rounded-full uppercase">Featured</span>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      <span className="block text-[9px] font-bold text-slate-800 truncate group-hover:text-brand-blue">{rest.name}</span>
                      <span className="flex items-center gap-0.5 text-[8px] font-semibold text-amber-500">
                        <Star className="w-2 h-2 fill-amber-500" />
                        {rest.rating}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Near You - most-reviewed restaurants within actual delivery distance */}
          {showDiscoverySections && popularNearYou.length > 0 && (
            <div className="px-3 py-2 bg-white border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="w-3 h-3 text-brand-blue" />
                <h3 className="font-extrabold text-[11px] text-slate-800">Popular Near You</h3>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {popularNearYou.map(rest => (
                  <button
                    key={rest.id}
                    onClick={() => selectRestaurantSafely(rest)}
                    className="flex-shrink-0 w-24 text-left cursor-pointer group"
                  >
                    <div className="w-24 h-14 rounded-lg overflow-hidden border border-slate-150 bg-slate-100">
                      {rest.image && <img src={rest.image} alt={rest.name} referrerPolicy="no-referrer" draggable={false} className="w-full h-full object-cover pointer-events-none" />}
                    </div>
                    <span className="block text-[9px] font-bold text-slate-700 truncate mt-1 group-hover:text-brand-blue">{rest.name}</span>
                    <span className="flex items-center gap-0.5 text-[8px] font-semibold text-slate-400">
                      <MessageSquare className="w-2 h-2" />
                      {rest.reviewsCount} reviews
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
          <div className="p-3 pb-1.5 flex gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
            {['All', 'Offers', 'Top Rated', 'Fastest'].map(filter => {
              const isSelected = activeFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => onFilterChange(filter)}
                  className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full transition-all cursor-pointer flex-shrink-0 ${
                    isSelected ? 'bg-brand-orange text-white shadow-xs' : 'bg-slate-200/60 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter === 'Top Rated' ? '★ 4.7+' : filter === 'Fastest' ? '⚡ Under 30' : filter}
                </button>
              );
            })}
          </div>

          {/* Sort control */}
          <div className="px-3 pb-2 flex items-center gap-1.5 flex-shrink-0">
            <SlidersHorizontal className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide flex-shrink-0">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-[10px] font-bold text-slate-700 bg-slate-100 rounded-full px-2 py-1 outline-hidden cursor-pointer border-none"
            >
              <option value="Recommended">Recommended</option>
              <option value="Rating">Rating: High to Low</option>
              <option value="Fastest">Delivery Time: Fastest</option>
              <option value="Price">Price: Low to High</option>
            </select>
          </div>

          {/* Search Bar inside App */}
          <div className="px-3 pb-2 flex-shrink-0">
            <SearchBar value={searchQuery} onChange={onSearchQueryChange} />
          </div>

          {/* Restaurant Cards list inside mobile frame */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {sortedRestaurants.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2 bg-white rounded-xl border border-slate-100">
                <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-xs text-slate-800">No restaurants near you</p>
                <p className="text-[10px] max-w-[200px] mx-auto text-slate-400">Try changing your search query or reset filters.</p>
              </div>
            ) : (
              sortedRestaurants.map(rest => {
                const isClosed = closedRestaurants.includes(rest.id) || !!getStoreClosureReason(rest);
                const distanceKm = haversineDistanceKm(currentPostcode, rest);
                return (
                  <div
                    key={rest.id}
                    onClick={() => selectRestaurantSafely(rest)}
                    className="bg-white rounded-xl border border-slate-150 overflow-hidden shadow-xs cursor-pointer hover:border-slate-300 transition-all select-none relative"
                  >
                    <div className="h-20 bg-slate-150 relative">
                      {rest.image && (
                        <img src={rest.image} alt={rest.name} referrerPolicy="no-referrer" draggable={false} className="w-full h-full object-cover pointer-events-none" />
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
                      <div className="flex items-center gap-0.5 text-[9px] text-slate-400 font-semibold">
                        <MapPin className="w-2.5 h-2.5" />
                        <span>{distanceKm.toFixed(1)} km away</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Floating Basket Drawer - hidden whenever the live order tracker is showing
          (any order not yet Delivered/Cancelled takes over the main screen; the
          basket button must never float on top of it).
          Uses `fixed` rather than `absolute`: the root screen container below is
          both the `relative` positioning context AND the scrolling element, so an
          `absolute` child anchors to the bottom of the *scrolled content* and
          drifts up over menu items as the list scrolls. `fixed` anchors to the
          actual viewport instead, keeping it pinned to the real screen bottom. */}
      {cart.length > 0 && selectedRestaurant && (!activeOrder || activeOrder.status === 'Delivered' || activeOrder.status === 'Cancelled') && (
        <button
          onClick={() => {
            setCheckoutStep('cart');
            setIsCartOpen(true);
          }}
          className="fixed bottom-3 left-3 right-3 h-10 bg-brand-blue hover:bg-brand-blue/95 text-white rounded-full font-bold text-xs flex items-center justify-between px-4 shadow-md z-30 cursor-pointer animate-pulse"
        >
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4" />
            <span className="bg-brand-orange text-white px-1.5 py-0.5 rounded-full text-[9px] font-black">{cart.reduce((sum, i) => sum + i.quantity, 0)}</span>
          </div>
          <span>View Basket</span>
          <span className="font-extrabold">£{grandTotal.toFixed(2)}</span>
        </button>
      )}

      {/* Confirm switching restaurants (basket has items from a different one) */}
      {pendingRestaurantSwitch && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-end z-50">
          <div className="w-full bg-white rounded-t-2xl p-4 space-y-4 animate-in slide-in-from-bottom duration-200 text-xs">
            <div>
              <h4 className="font-black text-sm text-slate-900">Clear your basket?</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Your basket has items from another restaurant. Clear it to order from <b className="text-slate-800">{pendingRestaurantSwitch.name}</b>?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingRestaurantSwitch(null)}
                className="flex-1 h-10 border border-slate-200 text-slate-600 rounded-lg font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  cart.forEach(item => onRemoveCartItem(item.id));
                  setSelectedRestaurant(pendingRestaurantSwitch);
                  setPendingRestaurantSwitch(null);
                }}
                className="flex-1 h-10 bg-brand-orange text-white font-black rounded-lg shadow-md cursor-pointer"
              >
                Clear &amp; Continue
              </button>
            </div>
          </div>
        </div>
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

            {/* Nutritional info (optional per-dish data) */}
            {customizingItem.nutrition && (
              <div className="grid grid-cols-4 gap-1.5 bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                <div className="text-center">
                  <span className="block font-black text-slate-900 text-xs">{customizingItem.nutrition.calories}</span>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase">kcal</span>
                </div>
                <div className="text-center">
                  <span className="block font-black text-slate-900 text-xs">{customizingItem.nutrition.protein}g</span>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase">Protein</span>
                </div>
                <div className="text-center">
                  <span className="block font-black text-slate-900 text-xs">{customizingItem.nutrition.carbs}g</span>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase">Carbs</span>
                </div>
                <div className="text-center">
                  <span className="block font-black text-slate-900 text-xs">{customizingItem.nutrition.fat}g</span>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase">Fat</span>
                </div>
              </div>
            )}

            {/* Variants: alternate absolute price points (e.g. sizes) - distinct
                from the additive customization options below */}
            {customizingItem.variants && customizingItem.variants.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[9px] block">Choose an option</span>
                <div className="grid grid-cols-2 gap-2">
                  {customizingItem.variants.map(variant => {
                    const isSelected = selectedVariantName === variant.name;
                    return (
                      <button
                        key={variant.name}
                        type="button"
                        onClick={() => setSelectedVariantName(variant.name)}
                        className={`h-8 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center justify-between px-3 ${
                          isSelected ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span>{variant.name}</span>
                        <span className="font-semibold text-slate-500 text-[10px]">£{variant.price.toFixed(2)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
            ) : (!customizingItem.variants || customizingItem.variants.length === 0) ? (
              /* Fallback to default Size option for legacy data with neither variants nor options */
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
            ) : null}

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
                const hasVariants = !!customizingItem.variants && customizingItem.variants.length > 0;
                let currentItemPrice = hasVariants
                  ? (customizingItem.variants!.find(v => v.name === selectedVariantName) || customizingItem.variants![0]).price
                  : customizingItem.price;
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
                } else if (!hasVariants) {
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

                  {/* Delivery vs Collection */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onOrderModeChange('Delivery')}
                      className={`h-9 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        orderMode === 'Delivery' ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      <Bike className="w-3.5 h-3.5" />
                      <span>Delivery</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOrderModeChange('Collection')}
                      className={`h-9 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                        orderMode === 'Collection' ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>Collection</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2 text-[10.5px] text-slate-600 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-brand-orange flex-shrink-0" />
                    <span>
                      {isCollection ? 'Ready for collection in' : 'Estimated delivery'} <b className="text-slate-900">{restaurantEstimatedTime}</b>
                    </span>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Card')}
                        className={`h-9 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                          paymentMethod === 'Card' ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Card</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Cash')}
                        className={`h-9 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                          paymentMethod === 'Cash' ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Cash on {isCollection ? 'Collection' : 'Delivery'}</span>
                      </button>
                    </div>
                  </div>

                  {belowMinOrder && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2.5 text-[10px] font-semibold">
                      This restaurant requires a minimum order of £{selectedRestaurant.minOrder.toFixed(2)}. Add £{(selectedRestaurant.minOrder - cartSubtotal).toFixed(2)} more to check out.
                    </div>
                  )}

                  {/* items */}
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.id} className="flex gap-2.5 pb-3 border-b border-slate-100 last:border-none">
                        <div className="flex-1 space-y-0.5">
                          <h4 className="font-bold text-slate-800 text-[11px]">{item.menuItem.name}</h4>
                          <span className="text-[9px] text-slate-400 block font-semibold">
                            {[item.selectedVariant?.name, ...item.customizations.map(c => `${c.name}: ${c.selectedOption}`)].filter(Boolean).join(', ')}
                          </span>
                          {item.notes && <p className="text-[9px] text-amber-600 font-medium italic">&ldquo;{item.notes}&rdquo;</p>}
                          <button
                            type="button"
                            onClick={() => onRemoveCartItem(item.id)}
                            className="flex items-center gap-1 text-[9px] text-red-500 font-bold cursor-pointer pt-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                        <div className="text-right space-y-1">
                          <span className="font-bold text-slate-900 block">£{((getCartItemBasePrice(item) + item.customizations.reduce((s,c)=>s+c.additionalPrice,0)) * item.quantity).toFixed(2)}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => onUpdateCartQuantity(item.id, -1)} className="w-4 h-4 bg-slate-100 rounded flex items-center justify-center font-bold">-</button>
                            <span className="font-bold text-[10px] w-4 text-center">{item.quantity}</span>
                            <button onClick={() => onUpdateCartQuantity(item.id, 1)} className="w-4 h-4 bg-slate-100 rounded flex items-center justify-center font-bold">+</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Promo code */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Promo Code</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g. CHIPPY10"
                        value={promoCodeInput}
                        onChange={(e) => { setPromoCodeInput(e.target.value.toUpperCase()); setPromoError(''); }}
                        className="flex-1 h-9 px-2.5 border border-slate-200 rounded-lg text-[16px] uppercase"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="px-3 h-9 bg-slate-900 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    {appliedPromo && (
                      <p className="text-[10px] text-emerald-600 font-bold">✓ {appliedPromo.code} applied - {appliedPromo.discountPercent}% off</p>
                    )}
                    {promoError && <p className="text-[10px] text-red-500 font-semibold">{promoError}</p>}
                  </div>

                  {/* Tip */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Tip Your Courier</label>
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3].map(amount => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setTipAmount(amount)}
                          className={`flex-1 h-8 rounded-lg border text-xs font-bold cursor-pointer ${
                            tipAmount === amount ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-slate-200 text-slate-500'
                          }`}
                        >
                          {amount === 0 ? 'No Tip' : `£${amount}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Billing */}
                  <div className="space-y-1.5 text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-800">£{cartSubtotal.toFixed(2)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Promo Discount</span>
                        <span className="font-semibold">-£{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>{isCollection ? 'Collection' : 'Delivery Fee'}</span>
                      <span className="font-semibold text-slate-800">{deliveryFee === 0 ? 'FREE' : `£${deliveryFee.toFixed(2)}`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform Service Fee</span>
                      <span className="font-semibold text-slate-800">£{serviceFee.toFixed(2)}</span>
                    </div>
                    {vatIncluded > 0 && (
                      <div className="flex justify-between text-slate-400">
                        <span>VAT (20%, included in prices)</span>
                        <span className="font-semibold">£{vatIncluded.toFixed(2)}</span>
                      </div>
                    )}
                    {tipAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Courier Tip</span>
                        <span className="font-semibold text-slate-800">£{tipAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-extrabold text-slate-950 pt-2 border-t border-slate-200">
                      <span>Total</span>
                      <span>£{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Checkout Transition */}
                  <button
                    onClick={() => setCheckoutStep('stripe')}
                    disabled={belowMinOrder}
                    className="w-full h-11 bg-brand-orange hover:bg-brand-orange/95 text-white font-black rounded-lg flex items-center justify-center gap-1.5 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {paymentMethod === 'Card' ? <CreditCard className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
                    <span>{paymentMethod === 'Card' ? 'Secure Checkout with Stripe' : 'Continue to Confirm Order'}</span>
                  </button>
                </>
              )}

              {/* PAYMENT CONTAINER (Card via simulated Stripe, or Cash) */}
              {checkoutStep === 'stripe' && (
                <form onSubmit={handleStripeCheckout} className="space-y-4">
                  {paymentMethod === 'Card' ? (
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
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg space-y-1 text-[11px]">
                      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px] text-emerald-700">
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Cash on {isCollection ? 'Collection' : 'Delivery'}</span>
                      </div>
                      <p>Amount due: <b>£{grandTotal.toFixed(2)}</b></p>
                      <p className="text-emerald-700">
                        {isCollection ? 'Pay in cash at the counter when you collect your order.' : 'Pay your courier in cash when your order arrives.'}
                      </p>
                    </div>
                  )}

                  {stripeError && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-2.5 rounded-lg text-[10px] font-semibold">
                      {stripeError}
                    </div>
                  )}

                  {/* Card fields */}
                  <div className="space-y-3">
                    {isCollection ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5 text-[11px]">
                        <span className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-wide mb-0.5">Collecting From</span>
                        <span className="font-bold text-slate-800">{selectedRestaurant.name}</span>
                        <span className="block text-slate-500">{selectedRestaurant.address}</span>
                      </div>
                    ) : addresses.length > 0 ? (
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">Delivery Address</label>
                        <div className="space-y-1.5">
                          {addresses.map(addr => (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => { setSelectedAddressId(addr.id); setDeliveryAddress(`${addr.addressLine}, ${addr.postcode}`); }}
                              className={`w-full text-left p-2 rounded-md border text-[11px] cursor-pointer ${
                                selectedAddressId === addr.id ? 'border-brand-blue bg-brand-blue/5' : 'border-slate-200'
                              }`}
                            >
                              <span className="font-bold text-slate-800">{addr.label}</span>
                              <span className="block text-slate-500">{addr.addressLine}, {addr.postcode}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide mb-1">Delivery Address (London Zone)</label>
                        <input
                          type="text"
                          required
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="w-full h-9 px-2.5 border border-slate-250 rounded-md bg-slate-50 text-[16px]"
                        />
                        <p className="text-[9px] text-slate-400 mt-1">Tip: save addresses from your Account screen for faster checkout next time.</p>
                      </div>
                    )}

                    {paymentMethod === 'Card' && (
                      <>
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
                      </>
                    )}
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
                      <span>{paymentMethod === 'Card' ? `Pay £${grandTotal.toFixed(2)} via Stripe` : `Place Order • £${grandTotal.toFixed(2)}`}</span>
                    </button>
                  </div>
                </form>
              )}

              {isLegalOpen && <LegalModal onClose={() => setIsLegalOpen(false)} />}

              {checkoutStep === 'processing' && (
                <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-brand-orange/20 border-t-brand-orange rounded-full animate-spin"></div>
                    {paymentMethod === 'Card' ? (
                      <CreditCard className="w-5 h-5 text-brand-orange absolute left-3.5 top-3.5 animate-pulse" />
                    ) : (
                      <Banknote className="w-5 h-5 text-brand-orange absolute left-3.5 top-3.5 animate-pulse" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-950">{paymentMethod === 'Card' ? 'Processing Stripe payment' : 'Confirming your order'}</h4>
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
                            order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                            order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-orange-100 text-orange-700 animate-pulse'
                          }`}>
                            {order.status === 'ReadyForPickup' ? 'Ready for Pickup' :
                             order.status === 'DriverArrived' ? 'Courier at Kitchen' :
                             order.status === 'PickedUp' ? 'Picked Up' :
                             order.status === 'OutForDelivery' ? 'Out for Delivery' : order.status}
                          </span>
                        </div>

                        {/* Items listed */}
                        <div className="border-t border-slate-50 pt-2 space-y-1 font-semibold text-slate-600 text-[10px]">
                          {order.items.map(item => (
                            <div key={item.id} className="flex justify-between">
                              <span>{item.quantity}x {item.menuItem.name}</span>
                              <span className="text-slate-400">£{(getCartItemBasePrice(item) * item.quantity).toFixed(2)}</span>
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
                            <button
                              onClick={() => setReceiptOrder(order)}
                              className="px-2.5 h-7 border border-slate-200 text-slate-600 rounded-lg font-bold text-[9px] flex items-center gap-1 hover:bg-slate-50 cursor-pointer"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Receipt</span>
                            </button>
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

      {/* Account Drawer */}
      {isAccountOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-40 flex flex-col justify-end">
          <div className="absolute inset-0" onClick={() => setIsAccountOpen(false)}></div>
          <div className="w-full bg-white rounded-t-2xl h-[85%] max-h-[85%] flex flex-col z-10 animate-in slide-in-from-bottom duration-300 text-xs">
            <div className="p-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
              <div className="flex items-center gap-1.5 font-black text-slate-900 text-sm">
                <User className="w-4 h-4 text-brand-blue" />
                <span>Account</span>
              </div>
              <button onClick={() => setIsAccountOpen(false)} className="text-xs font-bold text-slate-400 hover:text-slate-900 px-2 py-1 bg-slate-200/50 rounded-md cursor-pointer">
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3">
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Logged in as</span>
                <span className="font-bold text-slate-900">{profileName || session.phone}</span>
                {profileName && <span className="block text-[10px] text-slate-400">{session.phone}</span>}
              </div>

              <form onSubmit={handleSaveProfileName} className="space-y-2">
                <h4 className="font-extrabold text-slate-800 text-xs">Your Name</h4>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Add your name"
                    value={profileNameInput}
                    onChange={(e) => { setProfileNameInput(e.target.value); setProfileSaved(false); }}
                    maxLength={100}
                    className="flex-1 h-8 px-2.5 border border-slate-200 rounded-md text-[16px]"
                  />
                  <button
                    type="submit"
                    disabled={profileSaving || profileNameInput.trim() === profileName}
                    className="px-3 h-8 bg-slate-900 text-white rounded-md text-[11px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {profileSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                {profileSaved && <p className="text-[10px] text-emerald-600 font-bold">✓ Name updated</p>}
              </form>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-brand-blue" />
                  <h4 className="font-extrabold text-slate-800 text-xs">Notification Settings</h4>
                </div>
                <div className="bg-white border border-slate-150 rounded-xl divide-y divide-slate-100">
                  <button
                    type="button"
                    onClick={() => handleToggleNotification('notifyOrderUpdates')}
                    className="w-full flex items-center justify-between p-2.5 cursor-pointer"
                  >
                    <div className="text-left">
                      <span className="block font-bold text-slate-800 text-[11px]">Order Updates</span>
                      <span className="block text-[9px] text-slate-400">Status changes, delivery tracking</span>
                    </div>
                    <span className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${notifyOrderUpdates ? 'bg-brand-blue' : 'bg-slate-200'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-xs transition-all ${notifyOrderUpdates ? 'left-4.5' : 'left-0.5'}`}></span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleNotification('notifyPromotions')}
                    className="w-full flex items-center justify-between p-2.5 cursor-pointer"
                  >
                    <div className="text-left">
                      <span className="block font-bold text-slate-800 text-[11px]">Promotions & Offers</span>
                      <span className="block text-[9px] text-slate-400">Deals, discount codes, new restaurants</span>
                    </div>
                    <span className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${notifyPromotions ? 'bg-brand-blue' : 'bg-slate-200'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-xs transition-all ${notifyPromotions ? 'left-4.5' : 'left-0.5'}`}></span>
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-slate-800 text-xs">Saved Addresses</h4>
                  <button
                    onClick={() => setIsAddingAddress(!isAddingAddress)}
                    className="flex items-center gap-1 text-[10px] font-bold text-brand-blue cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {isAddingAddress && (
                  <form onSubmit={handleAddAddress} className="bg-slate-50 border border-slate-150 rounded-xl p-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Label (Home, Work...)"
                      value={newAddressLabel}
                      onChange={(e) => setNewAddressLabel(e.target.value)}
                      className="w-full h-8 px-2.5 border border-slate-200 rounded-md text-[16px]"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Address line"
                      value={newAddressLine}
                      onChange={(e) => setNewAddressLine(e.target.value)}
                      className="w-full h-8 px-2.5 border border-slate-200 rounded-md text-[16px]"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Postcode"
                      value={newAddressPostcode}
                      onChange={(e) => setNewAddressPostcode(e.target.value.toUpperCase())}
                      className="w-full h-8 px-2.5 border border-slate-200 rounded-md text-[16px] uppercase"
                    />
                    <button type="submit" className="w-full h-8 bg-brand-orange text-white font-bold rounded-md text-[11px]">
                      Save Address
                    </button>
                  </form>
                )}

                {addresses.length === 0 && !isAddingAddress ? (
                  <p className="text-[10px] text-slate-400">No saved addresses yet.</p>
                ) : (
                  addresses.map(addr => (
                    <div key={addr.id} className="flex items-center justify-between bg-white border border-slate-150 rounded-xl p-2.5">
                      <div>
                        <span className="font-bold text-slate-800 block">{addr.label}</span>
                        <span className="text-slate-500 text-[10px]">{addr.addressLine}, {addr.postcode}</span>
                      </div>
                      <button onClick={() => handleDeleteAddress(addr.id)} className="text-[10px] text-red-500 font-bold cursor-pointer">Remove</button>
                    </div>
                  ))
                )}
              </div>

              {/* Security: MPIN quick-login */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-brand-blue" />
                  <h4 className="font-extrabold text-slate-800 text-xs">Security - MPIN</h4>
                </div>
                {hasMpin ? (
                  <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-3 flex items-center justify-between gap-2">
                    <p className="text-[10.5px] text-emerald-800">MPIN is set up - you can log in faster next time.</p>
                    <button onClick={handleRemoveMpin} className="text-[10px] text-red-500 font-bold cursor-pointer flex-shrink-0">Remove</button>
                  </div>
                ) : (
                  <form onSubmit={handleSetMpin} className="bg-slate-50 border border-slate-150 rounded-xl p-3 space-y-2">
                    <p className="text-[10px] text-slate-500">Set a 4-6 digit MPIN to skip OTP next time you log in.</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="password"
                        placeholder="New MPIN"
                        maxLength={6}
                        value={mpinInput}
                        onChange={(e) => setMpinInput(e.target.value.replace(/\D/g, ''))}
                        className="w-full h-8 px-2.5 border border-slate-200 rounded-md text-[16px] font-mono tracking-widest"
                      />
                      <input
                        type="password"
                        placeholder="Confirm MPIN"
                        maxLength={6}
                        value={mpinConfirmInput}
                        onChange={(e) => setMpinConfirmInput(e.target.value.replace(/\D/g, ''))}
                        className="w-full h-8 px-2.5 border border-slate-200 rounded-md text-[16px] font-mono tracking-widest"
                      />
                    </div>
                    {mpinError && <p className="text-[10px] text-red-500 font-semibold">{mpinError}</p>}
                    {mpinSaved && <p className="text-[10px] text-emerald-600 font-bold">✓ MPIN saved</p>}
                    <button type="submit" disabled={mpinSaving} className="w-full h-8 bg-brand-orange text-white font-bold rounded-md text-[11px] disabled:opacity-50">
                      {mpinSaving ? 'Saving...' : 'Set MPIN'}
                    </button>
                  </form>
                )}
              </div>

              <button
                onClick={() => setIsSupportOpen(true)}
                className="w-full h-10 border border-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50"
              >
                <LifeBuoy className="w-3.5 h-3.5 text-brand-blue" />
                <span>Help &amp; Support</span>
              </button>

              <button
                onClick={() => { setIsAccountOpen(false); onLogout(); }}
                className="w-full h-10 border border-red-200 text-red-600 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>

              <button
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="w-full h-9 text-red-400 hover:text-red-600 font-bold text-[10px] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                <span>{isDeletingAccount ? 'Deleting...' : 'Delete Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help & Support */}
      {isSupportOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-end z-50">
          <div className="w-full bg-white rounded-t-2xl max-h-[85%] flex flex-col animate-in slide-in-from-bottom duration-200 text-xs">
            <div className="p-3.5 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-1.5 font-black text-slate-900 text-sm">
                <HelpCircle className="w-4 h-4 text-brand-blue" />
                <span>Help &amp; Support</span>
              </div>
              <button onClick={() => { setIsSupportOpen(false); setSupportSent(false); }} className="text-slate-400 hover:text-black cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-2.5">
                <h4 className="font-extrabold text-slate-800 text-xs">Frequently Asked Questions</h4>
                {[
                  { q: 'How do I cancel an order?', a: "You can cancel for free from the live tracking screen, as long as the restaurant hasn't accepted it yet." },
                  { q: 'My order is late - what happens?', a: 'Check the live tracker for status. If it\'s significantly overdue, send us a message below with your order number and we\'ll look into it.' },
                  { q: 'How do refunds work?', a: 'Approved refunds are returned to your original payment method, typically within 3-5 business days.' },
                  { q: 'Can I change my delivery address after ordering?', a: 'Not once the order is placed - please cancel (if still possible) and reorder with the correct address.' },
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                    <p className="font-bold text-slate-800 text-[11px]">{item.q}</p>
                    <p className="text-slate-500 text-[10.5px] mt-0.5 leading-snug">{item.a}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendSupportMessage} className="space-y-2 border-t border-slate-100 pt-3">
                <h4 className="font-extrabold text-slate-800 text-xs">Still need help? Send us a message</h4>
                {supportSent ? (
                  <p className="text-[11px] text-emerald-600 font-bold">✓ Thanks - we've received your message and will get back to you.</p>
                ) : (
                  <>
                    <textarea
                      placeholder="Describe your issue, including an order number if relevant..."
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      className="w-full h-20 p-2.5 border border-slate-200 rounded-lg text-[16px] resize-none"
                    />
                    <button
                      type="submit"
                      disabled={supportSending || !supportMessage.trim()}
                      className="w-full h-9 bg-brand-orange text-white font-bold rounded-lg text-xs disabled:opacity-50 cursor-pointer"
                    >
                      {supportSending ? 'Sending...' : 'Send Message'}
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Notification Center */}
      {isNotificationsOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-40 flex flex-col justify-end">
          <div className="absolute inset-0" onClick={() => setIsNotificationsOpen(false)}></div>
          <div className="w-full bg-white rounded-t-2xl h-[80%] max-h-[80%] flex flex-col z-10 animate-in slide-in-from-bottom duration-300 text-xs">
            <div className="p-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
              <div className="flex items-center gap-1.5 font-black text-slate-900 text-sm">
                <Bell className="w-4 h-4 text-brand-blue" />
                <span>Notifications</span>
              </div>
              <div className="flex items-center gap-2">
                {unreadNotificationCount > 0 && (
                  <button onClick={handleMarkAllNotificationsRead} className="text-[10px] font-bold text-brand-blue cursor-pointer">
                    Mark all read
                  </button>
                )}
                <button onClick={() => setIsNotificationsOpen(false)} className="text-xs font-bold text-slate-400 hover:text-slate-900 px-2 py-1 bg-slate-200/50 rounded-md cursor-pointer">
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {notifications.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center space-y-2">
                  <Bell className="w-8 h-8 text-slate-300" />
                  <p className="text-[11px] text-slate-400 max-w-[200px]">Order updates and offers will show up here.</p>
                </div>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left p-3 rounded-xl border space-y-1 cursor-pointer ${n.read ? 'bg-white border-slate-100' : 'bg-brand-blue/5 border-brand-blue/20'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-extrabold text-slate-800 text-[11px]">
                        {n.type === 'promo' ? <Tag className="w-3 h-3 text-brand-orange" /> : <ClipboardList className="w-3 h-3 text-brand-blue" />}
                        {n.title}
                      </span>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand-orange flex-shrink-0"></span>}
                    </div>
                    <p className="text-slate-500 text-[10.5px] leading-snug">{n.body}</p>
                    <span className="block text-[9px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Receipt / Invoice */}
      {receiptOrder && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-end z-50">
          <div className="w-full bg-white rounded-t-2xl max-h-[85%] flex flex-col animate-in slide-in-from-bottom duration-200 text-xs">
            <div className="p-3.5 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-1.5 font-black text-slate-900 text-sm">
                <FileText className="w-4 h-4 text-brand-blue" />
                <span>Receipt #{receiptOrder.id}</span>
              </div>
              <button onClick={() => setReceiptOrder(null)} className="text-slate-400 hover:text-black cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-[10px] text-slate-500 space-y-0.5">
                <p><span className="font-bold text-slate-800">{receiptOrder.restaurantName}</span></p>
                <p>{new Date(receiptOrder.createdAt).toLocaleString()}</p>
                <p>{receiptOrder.orderMode === 'Collection' ? 'Collection from' : 'Delivered to'}: {receiptOrder.orderMode === 'Collection' ? receiptOrder.restaurantAddress : receiptOrder.deliveryAddress}</p>
                <p>Payment: {receiptOrder.paymentMethod === 'Cash' ? 'Cash' : 'Card'}</p>
              </div>

              <div className="border-t border-slate-100 pt-2 space-y-1.5">
                {receiptOrder.items.map(item => (
                  <div key={item.id} className="text-[11px]">
                    <div className="flex justify-between font-semibold text-slate-700">
                      <span>{item.quantity}x {item.menuItem.name}</span>
                      <span>£{((getCartItemBasePrice(item) + item.customizations.reduce((s, c) => s + c.additionalPrice, 0)) * item.quantity).toFixed(2)}</span>
                    </div>
                    {(item.selectedVariant || item.customizations.length > 0) && (
                      <span className="text-[9px] text-slate-400 block">
                        {[item.selectedVariant?.name, ...item.customizations.map(c => `${c.name}: ${c.selectedOption}`)].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-2 space-y-1 text-slate-500">
                <div className="flex justify-between"><span>Subtotal</span><span className="font-semibold text-slate-800">£{receiptOrder.subtotal.toFixed(2)}</span></div>
                {!!receiptOrder.discount && (
                  <div className="flex justify-between text-emerald-600"><span>Promo Discount{receiptOrder.promoCode ? ` (${receiptOrder.promoCode})` : ''}</span><span className="font-semibold">-£{receiptOrder.discount.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between"><span>{receiptOrder.orderMode === 'Collection' ? 'Collection' : 'Delivery'} Fee</span><span className="font-semibold text-slate-800">£{receiptOrder.deliveryFee.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Platform Service Fee</span><span className="font-semibold text-slate-800">£{receiptOrder.serviceFee.toFixed(2)}</span></div>
                {!!receiptOrder.vat && (
                  <div className="flex justify-between text-slate-400"><span>VAT (20%, included)</span><span className="font-semibold">£{receiptOrder.vat.toFixed(2)}</span></div>
                )}
                {!!receiptOrder.tip && (
                  <div className="flex justify-between"><span>Courier Tip</span><span className="font-semibold text-slate-800">£{receiptOrder.tip.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between font-extrabold text-slate-950 pt-2 border-t border-slate-200">
                  <span>Total Paid</span>
                  <span>£{receiptOrder.total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => handleDownloadReceipt(receiptOrder)}
                className="w-full h-9 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-delivery rating prompt */}
      {ratingOrder && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-end z-50">
          <div className="w-full bg-white rounded-t-2xl p-4 space-y-4 animate-in slide-in-from-bottom duration-200 text-xs">
            <div>
              <h4 className="font-black text-sm text-slate-900">How was your order?</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">{ratingOrder.restaurantName} • #{ratingOrder.id}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wide">Rate the restaurant</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRatingValue(n)}
                    className="cursor-pointer"
                  >
                    <Star className={`w-8 h-8 ${n <= ratingValue ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} />
                  </button>
                ))}
              </div>
            </div>

            {ratingOrder.orderMode === 'Delivery' && ratingOrder.driverName && (
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <p className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wide">Rate your courier, {ratingOrder.driverName.split(' ')[0]}</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCourierRatingValue(n)}
                      className="cursor-pointer"
                    >
                      <Star className={`w-8 h-8 ${n <= courierRatingValue ? 'text-brand-blue fill-brand-blue' : 'text-slate-200'}`} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <textarea
              placeholder="Leave a comment (optional)"
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              className="w-full h-16 p-2.5 border border-slate-200 rounded-lg text-[16px] resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDismissedRatingIds(prev => new Set(prev).add(ratingOrder.id));
                  setRatingOrder(null);
                }}
                className="w-24 h-10 border border-slate-200 text-slate-600 rounded-lg font-bold cursor-pointer"
              >
                Later
              </button>
              <button
                type="button"
                onClick={handleSubmitRating}
                disabled={ratingSubmitting}
                className="flex-1 h-10 bg-brand-orange text-white font-black rounded-lg shadow-md disabled:opacity-50 cursor-pointer"
              >
                {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
