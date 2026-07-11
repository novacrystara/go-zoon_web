import { X, Trash2, Plus, Minus, ShoppingBag, Info } from 'lucide-react';
import { CartItem, Restaurant, UKPostcodeZone } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  restaurant: Restaurant | null;
  postcodeZone: UKPostcodeZone;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: (address: string, postcode: string) => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  restaurant,
  postcodeZone,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout
}: CartDrawerProps) {
  if (!isOpen) return null;

  // Calculate costs
  const subtotal = cartItems.reduce((acc, item) => {
    const customizationsCost = item.customizations.reduce((sum, c) => sum + c.additionalPrice, 0);
    return acc + (item.menuItem.price + customizationsCost) * item.quantity;
  }, 0);

  const deliveryFee = restaurant 
    ? (restaurant.offersFreeDelivery ? 0 : Math.round((restaurant.deliveryFee * postcodeZone.deliveryMultiplier) * 100) / 100)
    : 0;

  // 5% of subtotal, minimum £0.99 for UK Uber Eats style service fee
  const serviceFee = subtotal > 0 ? Math.max(0.99, Math.round(subtotal * 0.05 * 100) / 100) : 0;
  
  // UK VAT (20% is typically included, but let's show the breakdown: "Includes 20% UK VAT: £x.xx" or simply 10% calculated dynamically)
  const vatAmount = Math.round((subtotal * 0.20) * 100) / 100;

  const total = subtotal + deliveryFee + serviceFee;

  const handleCheckoutClick = () => {
    if (cartItems.length === 0) return;
    // Standard mock street
    const mockStreet = '10 Downing Street, Westminster';
    onCheckout(mockStreet, postcodeZone.postcode);
  };

  const isMinOrderMet = restaurant ? subtotal >= restaurant.minOrder : true;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" id="cart-drawer-container">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={onClose}></div>

      <div className="absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand-orange" />
            <span className="font-display font-extrabold text-lg text-gray-900">Your Basket</span>
            <span className="bg-brand-orange/10 text-brand-orange text-xs font-bold px-2 py-0.5 rounded-full">
              {cartItems.reduce((sum, item) => sum + item.quantity, 0)} items
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {restaurant && cartItems.length > 0 && (
            <div className="bg-brand-blue/5 rounded-xl p-3 border border-brand-blue/10 mb-2">
              <span className="text-[10px] text-brand-blue font-bold uppercase tracking-wider block mb-0.5">Ordering From</span>
              <span className="font-bold text-sm text-neutral-900">{restaurant.name}</span>
            </div>
          )}

          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="font-bold text-gray-800 text-sm">Your basket is empty</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xs px-4">Add delicious items from a restaurant menu to start your order.</p>
            </div>
          ) : (
            cartItems.map((item) => {
              const itemBaseCost = item.menuItem.price;
              const itemCustCost = item.customizations.reduce((sum, c) => sum + c.additionalPrice, 0);
              const singleItemTotal = itemBaseCost + itemCustCost;

              return (
                <div key={item.id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-none">
                  {item.menuItem.image && (
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                      <img
                        src={item.menuItem.image}
                        alt={item.menuItem.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-gray-900 leading-tight">{item.menuItem.name}</h4>
                        {item.customizations.length > 0 && (
                          <div className="text-[10px] text-gray-500 mt-1 space-y-0.5">
                            {item.customizations.map(c => (
                              <div key={c.name} className="flex items-center gap-1">
                                <span className="font-medium">{c.name}:</span>
                                <span className="text-gray-700 font-semibold">{c.selectedOption}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {item.notes && (
                          <p className="text-[10px] text-amber-600 bg-amber-50/50 px-1.5 py-0.5 rounded-sm mt-1 inline-block font-medium italic">
                            &ldquo;{item.notes}&rdquo;
                          </p>
                        )}
                      </div>
                      <div className="font-bold text-xs text-neutral-900 flex-shrink-0">
                        £{(singleItemTotal * item.quantity).toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity buttons */}
                      <div className="flex items-center border border-gray-200 rounded-full py-0.5 px-1.5 bg-gray-50">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="p-1 text-gray-400 hover:text-black hover:bg-gray-200 rounded-full transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-gray-800">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="p-1 text-gray-400 hover:text-black hover:bg-gray-200 rounded-full transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer billing & checkout details */}
        {cartItems.length > 0 && restaurant && (
          <div className="p-5 border-t border-gray-100 bg-gray-50/50 space-y-4">
            
            {/* Costs Breakdown */}
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-800">£{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee ({postcodeZone.postcode})</span>
                <span className="font-semibold text-gray-800">
                  {deliveryFee === 0 ? <span className="text-brand-orange font-bold">FREE</span> : `£${deliveryFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  Service Fee
                  <div className="group relative">
                    <Info className="w-3 h-3 text-gray-400 cursor-help" />
                    <span className="absolute bottom-5 left-1/2 -translate-x-1/2 w-48 bg-neutral-950 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
                      Go-Zoon standard 5% service charge (min. £0.99) helps fund operations.
                    </span>
                  </div>
                </span>
                <span className="font-semibold text-gray-800">£{serviceFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Includes UK VAT (20%)</span>
                <span>£{vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 font-extrabold text-sm text-gray-900">
                <span>Total</span>
                <span>£{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Minimum Order Check */}
            {!isMinOrderMet && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-semibold">
                Minimum order value of £{restaurant.minOrder.toFixed(2)} is required to place an order from this restaurant. Add £{(restaurant.minOrder - subtotal).toFixed(2)} more.
              </div>
            )}

            {/* UK Delivery Target post-checkout info */}
            <div className="text-[10px] text-gray-400 text-center">
              By checking out, you agree to our standard UK Terms of Service. Delivers to <span className="font-bold text-gray-600">{postcodeZone.areaName} ({postcodeZone.postcode})</span>.
            </div>

            {/* Checkout CTA */}
            <button
              onClick={handleCheckoutClick}
              disabled={!isMinOrderMet}
              id="checkout-action-btn"
              className={`w-full h-12 rounded-xl font-bold text-sm flex items-center justify-between px-5 transition-all cursor-pointer shadow-md ${
                isMinOrderMet
                  ? 'bg-brand-orange hover:bg-brand-orange/95 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>Place Order with Go-Zoon</span>
              <span className="bg-brand-blue/30 text-white px-2.5 py-1 rounded-md text-xs font-extrabold">
                £{total.toFixed(2)}
              </span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
