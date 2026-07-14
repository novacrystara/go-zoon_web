import React, { useState } from 'react';
import { Search, MapPin, ShoppingBag, Clock, Tag, Award, Check } from 'lucide-react';
import { validateUKPostcode } from '../data/restaurants';
import { UKPostcodeZone } from '../types';

interface HeaderProps {
  currentPostcode: UKPostcodeZone;
  onPostcodeChange: (zone: UKPostcodeZone) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  cartCount: number;
  onCartToggle: () => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  orderMode: 'Delivery' | 'Collection';
  onOrderModeChange: (mode: 'Delivery' | 'Collection') => void;
  onViewPortal: () => void;
  isPortalActive: boolean;
}

export default function Header({
  currentPostcode,
  onPostcodeChange,
  searchQuery,
  onSearchChange,
  cartCount,
  onCartToggle,
  activeFilter,
  onFilterChange,
  orderMode,
  onOrderModeChange,
  onViewPortal,
  isPortalActive
}: HeaderProps) {
  const [postcodeInput, setPostcodeInput] = useState(currentPostcode.postcode);
  const [postcodeError, setPostcodeError] = useState('');
  const [isChangingPostcode, setIsChangingPostcode] = useState(false);

  const handlePostcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const zone = validateUKPostcode(postcodeInput);
    if (zone) {
      onPostcodeChange(zone);
      setPostcodeError('');
      setIsChangingPostcode(false);
    } else {
      setPostcodeError('Please enter a valid UK postcode (e.g., SW1A 1AA, NW1 0NE)');
    }
  };

  const quickPostcodes = [
    { code: 'SW1A 1AA', label: 'Westminster' },
    { code: 'E1 6QL', label: 'Brick Lane' },
    { code: 'NW1 0NE', label: 'Camden Town' },
    { code: 'W8 4SG', label: 'Kensington' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-xs" id="app-header">
      {/* Top Banner: Marketplace announcement & Partner Toggle */}
      <div className="bg-brand-blue text-white px-4 py-2 text-xs flex justify-between items-center font-sans">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <span className="bg-brand-orange text-white font-bold px-1.5 py-0.5 rounded-xs text-[10px] tracking-wide">UK LAUNCH</span>
          <span className="text-blue-100 font-medium">Onboard, deliver, and order premium food in Westminster, Camden & City of London!</span>
        </div>
        <button
          onClick={onViewPortal}
          id="partner-portal-toggle"
          className={`px-3 py-1 rounded-full font-bold transition-all text-[11px] cursor-pointer ${
            isPortalActive 
              ? 'bg-brand-orange text-white border-brand-orange shadow-md' 
              : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
          }`}
        >
          {isPortalActive ? '← Back to Go-Zoon Store' : 'Onboarding & Driver Portal'}
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        {/* Main Header Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Toggle Delivery/Collection */}
          <div className="flex items-center justify-between md:justify-start gap-4 sm:gap-6">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { onSearchChange(''); onFilterChange('All'); }}>
              <span className="font-display font-extrabold text-2xl tracking-tight text-brand-blue select-none flex items-center">
                Go<span className="text-brand-orange">-Zoon</span>
              </span>
              <span className="text-[9px] font-extrabold bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full">UK</span>
            </div>

            {/* Mode Switcher */}
            <div className="bg-gray-100 p-0.5 rounded-full flex items-center" id="delivery-mode-switcher">
              <button
                onClick={() => onOrderModeChange('Delivery')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  orderMode === 'Delivery'
                    ? 'bg-brand-blue text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Delivery
              </button>
              <button
                onClick={() => onOrderModeChange('Collection')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  orderMode === 'Collection'
                    ? 'bg-brand-blue text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Collection
              </button>
            </div>
          </div>

          {/* Postcode Selector & Search Bar */}
          <div className="flex-1 max-w-2xl flex flex-col sm:flex-row gap-2">
            
            {/* Postcode Selector */}
            <div className="relative">
              <button
                onClick={() => setIsChangingPostcode(!isChangingPostcode)}
                id="postcode-selector-btn"
                className="w-full sm:w-56 h-12 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-between text-sm text-gray-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <MapPin className="w-4 h-4 text-brand-orange flex-shrink-0" />
                  <div className="text-left truncate">
                    <div className="text-[10px] text-gray-400 font-bold uppercase leading-none">Deliver to</div>
                    <div className="font-semibold text-brand-blue truncate">{currentPostcode.postcode}</div>
                  </div>
                </div>
                <span className="text-xs text-brand-orange font-bold">Change</span>
              </button>

              {isChangingPostcode && (
                <div className="absolute top-14 left-0 w-full sm:w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <form onSubmit={handlePostcodeSubmit} className="space-y-3">
                    <label className="block text-xs font-bold text-gray-700">Enter UK Postcode</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={postcodeInput}
                        onChange={(e) => setPostcodeInput(e.target.value)}
                        placeholder="e.g. SW1A 1AA"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-brand-blue"
                      />
                      <button
                        type="submit"
                        className="bg-brand-orange text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-brand-orange/90 transition-colors cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    {postcodeError && <p className="text-xs text-red-500 font-medium">{postcodeError}</p>}
                  </form>
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Popular UK Hubs</span>
                    <div className="grid grid-cols-2 gap-2">
                      {quickPostcodes.map(pc => (
                        <button
                          key={pc.code}
                          type="button"
                          onClick={() => {
                            setPostcodeInput(pc.code);
                            const zone = validateUKPostcode(pc.code);
                            if (zone) {
                              onPostcodeChange(zone);
                              setIsChangingPostcode(false);
                            }
                          }}
                          className="text-left px-2 py-1.5 border border-gray-100 rounded-lg hover:border-brand-orange hover:bg-brand-orange/5 text-xs transition-colors cursor-pointer"
                        >
                          <div className="font-bold text-brand-blue">{pc.code}</div>
                          <div className="text-[10px] text-gray-400 truncate">{pc.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Search Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search traditional chippies, Sunday roasts, curries..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                id="search-bar"
                className="w-full h-12 pl-11 pr-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all"
              />
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-4 top-3.5 text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              )}
            </div>

          </div>

          {/* Basket Trigger Button */}
          <button
            onClick={onCartToggle}
            id="cart-trigger-btn"
            className="h-12 px-6 bg-brand-blue text-white hover:bg-brand-blue/95 rounded-full flex items-center justify-center gap-2 font-bold transition-all shadow-md flex-shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5 text-white" />
            <span className="text-sm">Basket</span>
            <span className="bg-brand-orange text-white text-xs font-extrabold w-5 h-5 rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          </button>

        </div>

        {/* Filter Badges Carousel (If not on Portal) */}
        {!isPortalActive && (
          <div className="flex items-center gap-2 mt-4 pt-2 border-t border-gray-50 overflow-x-auto no-scrollbar" id="filter-badges">
            {[
              { id: 'All', label: 'All Cuisines', icon: null },
              { id: 'Offers', label: 'Special Offers', icon: Tag },
              { id: 'Top Rated', label: 'Top Rated (4.7+)', icon: Award },
              { id: 'Fastest', label: 'Under 30 Mins', icon: Clock },
              { id: 'Vegan', label: 'Vegan Friendly', icon: null },
              { id: 'Halal', label: 'Halal Certified', icon: null }
            ].map(filter => {
              const Icon = filter.icon;
              const isSelected = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => onFilterChange(filter.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-brand-orange text-white border-brand-orange shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-transparent'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  <span>{filter.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
