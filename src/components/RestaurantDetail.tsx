import React, { useState } from 'react';
import { ArrowLeft, Star, Clock, ShoppingBag, Plus, Minus, X, Check } from 'lucide-react';
import { MenuItem, Restaurant, UKPostcodeZone, CartItem } from '../types';

interface RestaurantDetailProps {
  restaurant: Restaurant;
  postcodeZone: UKPostcodeZone;
  onBack: () => void;
  onAddToCart: (item: CartItem) => void;
}

export default function RestaurantDetail({
  restaurant,
  postcodeZone,
  onBack,
  onAddToCart
}: RestaurantDetailProps) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [selectedCustomizations, setSelectedCustomizations] = useState<{
    [customizationName: string]: { option: string; price: number };
  }>({});
  const [itemNotes, setItemNotes] = useState('');

  // Dynamic delivery calculations
  const baseDeliveryFee = restaurant.deliveryFee;
  const dynamicDeliveryFee = restaurant.offersFreeDelivery 
    ? 0 
    : Math.round((baseDeliveryFee * postcodeZone.deliveryMultiplier) * 100) / 100;

  const baseMinTime = restaurant.deliveryTimeRange[0];
  const baseMaxTime = restaurant.deliveryTimeRange[1];
  const dynamicMinTime = Math.round(baseMinTime * postcodeZone.deliveryMultiplier);
  const dynamicMaxTime = Math.round(baseMaxTime * postcodeZone.deliveryMultiplier);

  // Extract all categories in menu
  const categories = ['All', ...Array.from(new Set(restaurant.menu.map(item => item.category)))];

  const filteredMenu = selectedCategory === 'All'
    ? restaurant.menu
    : restaurant.menu.filter(item => item.category === selectedCategory);

  // Customization options based on category or item (typical British food additions)
  const getCustomizationOptions = (item: MenuItem) => {
    if (item.category === 'Mains' && restaurant.id === 'rest-1') {
      return [
        {
          name: 'Choose Your Side',
          required: true,
          options: [
            { name: 'Traditional Mushy Peas', price: 1.50 },
            { name: 'Warm Chippy Curry Sauce', price: 1.50 },
            { name: 'Gravy Pot', price: 1.20 },
            { name: 'Pickled Onion & Egg Trio', price: 1.80 },
            { name: 'No Side (Just Fish & Chips)', price: 0 }
          ]
        },
        {
          name: 'Chip Shop Condiments',
          required: false,
          options: [
            { name: 'Maldon Sea Salt & Malt Vinegar', price: 0 },
            { name: 'Heinz Squeeze Ketchup', price: 0.30 },
            { name: 'Tartare Sauce Cup', price: 0.40 }
          ]
        }
      ];
    } else if (item.category === 'Sunday Roast Specials') {
      return [
        {
          name: 'Meat Doneness or Roast Option',
          required: true,
          options: [
            { name: 'Classic Medium Roast', price: 0 },
            { name: 'Well Done Cuts', price: 0 },
            { name: 'Double Giant Yorkshire Pudding & Extra Gravy', price: 2.50 }
          ]
        }
      ];
    } else if (item.category === 'Curries') {
      return [
        {
          name: 'Spice Level',
          required: true,
          options: [
            { name: 'Mild & Creamy', price: 0 },
            { name: 'Medium Hot', price: 0 },
            { name: 'Extra British Hot (Madras style)', price: 0.50 }
          ]
        }
      ];
    }
    
    // Default standard drinks/sauces customizations
    return [
      {
        name: 'Add a Cold Drink',
        required: false,
        options: [
          { name: 'Coca-Cola Original (330ml Can)', price: 1.95 },
          { name: 'Diet Coke (330ml Can)', price: 1.80 },
          { name: 'Irn-Bru (330ml Can - Scottish Legend)', price: 1.95 },
          { name: 'Harrogate Still Water', price: 1.50 },
          { name: 'No Drink', price: 0 }
        ]
      }
    ];
  };

  const handleOpenItem = (item: MenuItem) => {
    setSelectedItem(item);
    setModalQuantity(1);
    setItemNotes('');
    
    // Auto-select first option for required customizations
    const options = getCustomizationOptions(item);
    const initialCusts: typeof selectedCustomizations = {};
    options.forEach(opt => {
      if (opt.required && opt.options.length > 0) {
        initialCusts[opt.name] = {
          option: opt.options[0].name,
          price: opt.options[0].price
        };
      }
    });
    setSelectedCustomizations(initialCusts);
  };

  const handleCustomizationSelect = (custName: string, optionName: string, price: number) => {
    setSelectedCustomizations(prev => ({
      ...prev,
      [custName]: { option: optionName, price }
    }));
  };

  const handleAddToCartSubmit = () => {
    if (!selectedItem) return;

    const customizationsList = Object.entries(selectedCustomizations).map(([name, detail]) => {
      const d = detail as { option: string; price: number };
      return {
        name,
        selectedOption: d.option,
        additionalPrice: d.price
      };
    });

    // Create unique cart item hash id
    const customizationsHash = customizationsList.map(c => `${c.name}:${c.selectedOption}`).sort().join('|');
    const uniqueCartId = `${selectedItem.id}-${customizationsHash}`;

    const cartItem: CartItem = {
      id: uniqueCartId,
      menuItem: selectedItem,
      quantity: modalQuantity,
      customizations: customizationsList,
      notes: itemNotes.trim() || undefined
    };

    onAddToCart(cartItem);
    setSelectedItem(null);
  };

  // Calculate modal total
  const getItemPriceTotal = () => {
    if (!selectedItem) return 0;
    const customizationsCost = (Object.values(selectedCustomizations) as { option: string; price: number }[])
      .reduce((acc, curr) => acc + curr.price, 0);
    return (selectedItem.price + customizationsCost) * modalQuantity;
  };

  return (
    <div className="bg-neutral-50 min-h-screen pb-16" id="restaurant-detail-view">
      {/* Hero Banner */}
      <div className="relative h-64 sm:h-80 bg-neutral-900 overflow-hidden">
        <img
          src={restaurant.bannerImage}
          alt={restaurant.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent"></div>
        
        {/* Back Button */}
        <button
          onClick={onBack}
          id="back-to-list-btn"
          className="absolute top-6 left-6 p-2.5 bg-white text-black hover:bg-gray-100 rounded-full shadow-md transition-all active:scale-95 flex items-center justify-center cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Restaurant Header Details */}
      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10">
        <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest bg-brand-blue/10 text-brand-blue px-2.5 py-1 rounded-full border border-brand-blue/5 inline-block mb-2">
                {restaurant.cuisine}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-display">{restaurant.name}</h1>
              <p className="text-xs text-gray-400 mt-1 font-medium">{restaurant.address} • <span className="text-brand-blue font-bold">{restaurant.postcode}</span></p>
            </div>

            <div className="flex items-center gap-2 bg-neutral-900 text-white p-3 rounded-xl self-start sm:self-center shadow-xs">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <div>
                <div className="font-extrabold text-sm">{restaurant.rating}</div>
                <div className="text-[10px] text-gray-300 font-medium">{restaurant.reviewsCount} reviews</div>
              </div>
            </div>
          </div>

          {/* Delivery Specifics */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-4 border-t border-gray-100 text-center text-xs text-gray-600 font-semibold">
            <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Delivery Time</span>
              <div className="font-extrabold text-neutral-950 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-brand-orange" />
                <span>{dynamicMinTime}-{dynamicMaxTime} mins</span>
              </div>
            </div>
            <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Delivery Fee</span>
              <div className="font-extrabold text-brand-orange">
                {dynamicDeliveryFee === 0 ? 'FREE' : `£${dynamicDeliveryFee.toFixed(2)}`}
              </div>
            </div>
            <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Min. Order</span>
              <div className="font-extrabold text-neutral-950">£{restaurant.minOrder.toFixed(2)}</div>
            </div>
          </div>

          {/* Offer Banner */}
          {restaurant.discountOffer && (
            <div className="bg-brand-orange/10 text-brand-orange border border-brand-orange/15 px-4 py-3 rounded-xl mt-4 flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="bg-brand-orange text-white px-2 py-0.5 rounded-sm text-[10px] font-extrabold">PROMO</span>
                <span>{restaurant.discountOffer}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Categories & Menu Listing */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        
        {/* Horizontal Category Nav */}
        <div className="flex gap-2 pb-4 overflow-x-auto border-b border-gray-250 sticky top-24 bg-neutral-50 z-20 pt-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === category
                  ? 'bg-brand-blue text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-150 border border-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4" id="restaurant-menu-list">
          {filteredMenu.map(item => (
            <div
              key={item.id}
              onClick={() => handleOpenItem(item)}
              className="bg-white p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-300 flex justify-between gap-4 cursor-pointer"
            >
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <h3 className="font-bold text-sm text-gray-900 leading-snug">{item.name}</h3>
                    {item.dietary?.map(tag => (
                      <span
                        key={tag}
                        className={`text-[9px] font-extrabold px-1 rounded-sm tracking-wide ${
                          tag === 'Vegetarian' ? 'bg-green-100 text-green-800' :
                          tag === 'Vegan' ? 'bg-emerald-100 text-emerald-800' :
                          tag === 'Halal' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {tag[0]}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <div className="font-extrabold text-neutral-900 text-sm mt-3">
                  £{item.price.toFixed(2)}
                </div>
              </div>

              {item.image && (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100 relative">
                  <img
                    src={item.image}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 bg-white hover:bg-neutral-100 text-brand-orange p-1.5 rounded-full shadow-md flex items-center justify-center transition-transform active:scale-90">
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Item Customization Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" id="item-customisation-modal">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="relative h-44 sm:h-48 bg-neutral-900">
              <img
                src={selectedItem.image}
                alt={selectedItem.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-90"
              />
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 bg-white/90 hover:bg-white text-black p-2 rounded-full shadow-md hover:scale-105 active:scale-95 transition-all"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Scroll Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 font-display">{selectedItem.name}</h2>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{selectedItem.description}</p>
                <div className="text-brand-orange font-extrabold text-lg mt-2">£{selectedItem.price.toFixed(2)}</div>
              </div>

              {/* Customizations Render */}
              {getCustomizationOptions(selectedItem).map((cust) => (
                <div key={cust.name} className="space-y-2.5 border-t border-gray-100 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-gray-900">{cust.name}</span>
                    {cust.required ? (
                      <span className="text-[10px] font-extrabold bg-neutral-950 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Required</span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400">Optional</span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {cust.options.map((opt) => {
                      const isSelected = selectedCustomizations[cust.name]?.option === opt.name;
                      return (
                        <div
                          key={opt.name}
                          onClick={() => handleCustomizationSelect(cust.name, opt.name, opt.price)}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer text-xs transition-colors ${
                            isSelected
                              ? 'border-brand-blue bg-brand-blue/5'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-brand-blue bg-brand-blue text-white' : 'border-gray-300'
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                            </div>
                            <span className="font-semibold text-gray-800">{opt.name}</span>
                          </div>
                          {opt.price > 0 && (
                            <span className="font-bold text-brand-orange">+ £{opt.price.toFixed(2)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Special Instructions Input */}
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <label className="font-bold text-sm text-gray-900 block">Special Instructions</label>
                <textarea
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="e.g. Please leave off the onions, sauce on the side etc."
                  rows={2}
                  className="w-full text-xs border border-gray-200 rounded-lg p-3 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
                ></textarea>
              </div>
            </div>

            {/* Modal Bottom Add Bar */}
            <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between gap-4">
              
              {/* Quantity Changer */}
              <div className="flex items-center border border-gray-200 rounded-full px-2 py-1.5">
                <button
                  onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                  className="p-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center text-sm font-bold text-gray-900">{modalQuantity}</span>
                <button
                  onClick={() => setModalQuantity(modalQuantity + 1)}
                  className="p-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add to basket button */}
              <button
                onClick={handleAddToCartSubmit}
                id="add-to-basket-action-btn"
                className="flex-1 h-12 bg-brand-orange hover:bg-brand-orange/95 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <ShoppingBag className="w-4 h-4 text-white" />
                <span>Add {modalQuantity} to Basket</span>
                <span className="ml-1 bg-brand-blue text-white px-2 py-0.5 rounded-md text-xs font-bold">
                  £{getItemPriceTotal().toFixed(2)}
                </span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
