import React, { useState } from 'react';
import { Star, Clock, Heart } from 'lucide-react';
import { Restaurant, UKPostcodeZone } from '../types';

interface RestaurantCardProps {
  key?: string;
  restaurant: Restaurant;
  postcodeZone: UKPostcodeZone;
  onSelect: (restaurant: Restaurant) => void;
}

export default function RestaurantCard({ restaurant, postcodeZone, onSelect }: RestaurantCardProps): React.JSX.Element {
  const [isFavorite, setIsFavorite] = useState(false);

  // Dynamic delivery fee & time calculations based on the UK postcode multiplier
  const baseDeliveryFee = restaurant.deliveryFee;
  const dynamicDeliveryFee = restaurant.offersFreeDelivery 
    ? 0 
    : Math.round((baseDeliveryFee * postcodeZone.deliveryMultiplier) * 100) / 100;

  const baseMinTime = restaurant.deliveryTimeRange[0];
  const baseMaxTime = restaurant.deliveryTimeRange[1];
  const dynamicMinTime = Math.round(baseMinTime * postcodeZone.deliveryMultiplier);
  const dynamicMaxTime = Math.round(baseMaxTime * postcodeZone.deliveryMultiplier);

  return (
    <div
      onClick={() => onSelect(restaurant)}
      className="group bg-white rounded-xl overflow-hidden cursor-pointer flex flex-col h-full hover:shadow-md transition-all duration-300 relative border border-gray-100"
      id={`restaurant-${restaurant.id}`}
    >
      {/* Restaurant Image Wrapper */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsFavorite(!isFavorite);
          }}
          className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-sm hover:scale-110 active:scale-95 transition-all text-gray-700"
        >
          <Heart
            className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
          />
        </button>

        {/* Special Offer Tag */}
        {restaurant.discountOffer && (
          <div className="absolute bottom-3 left-3 bg-brand-orange text-white text-xs font-bold px-2.5 py-1 rounded-md shadow-md flex items-center gap-1">
            <span>{restaurant.discountOffer}</span>
          </div>
        )}

        {/* Featured Tag */}
        {restaurant.featured && (
          <div className="absolute top-3 left-3 bg-brand-blue text-white text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-xs">
            Featured
          </div>
        )}
      </div>

      {/* Restaurant Info */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h3 className="font-display font-bold text-base text-gray-900 group-hover:text-brand-blue transition-colors line-clamp-1">
            {restaurant.name}
          </h3>
          <div className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded-sm flex-shrink-0">
            <Star className="w-3.5 h-3.5 fill-brand-orange text-brand-orange" />
            <span className="text-xs font-bold text-gray-800">{restaurant.rating}</span>
            <span className="text-[10px] text-gray-400">({restaurant.reviewsCount})</span>
          </div>
        </div>

        {/* Cuisine & Postcode Area */}
        <p className="text-xs text-gray-500 mb-3 font-medium">
          {restaurant.cuisine} • <span className="text-brand-blue font-bold">{restaurant.postcode}</span>
        </p>

        {/* Time, Price Tier, and Delivery Fee Details */}
        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold">{dynamicMinTime}-{dynamicMaxTime} min</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            {dynamicDeliveryFee === 0 ? (
              <span className="text-brand-orange font-bold bg-brand-orange/10 px-1.5 py-0.5 rounded-sm text-[10px]">FREE DELIVERY</span>
            ) : (
              <span className="font-semibold">£{dynamicDeliveryFee.toFixed(2)} delivery</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span className="font-medium text-gray-400 text-[10px]">Min: £{restaurant.minOrder.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
