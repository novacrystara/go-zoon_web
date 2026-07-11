export interface MenuItemOption {
  name: string; // e.g., "Size", "Extras"
  type: 'select' | 'checkbox';
  required: boolean;
  choices: {
    name: string; // e.g., "Standard", "Large", "Extra Cheese"
    price: number; // e.g., 0, 2.50, 1.50
  }[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  dietary?: ('Vegan' | 'Vegetarian' | 'Gluten-Free' | 'Halal')[];
  options?: MenuItemOption[];
}

export interface Restaurant {
  id: string;
  name: string;
  rating: number;
  reviewsCount: number;
  deliveryTimeRange: [number, number]; // e.g. [20, 30] minutes
  deliveryFee: number;
  minOrder: number;
  cuisine: string;
  image: string;
  bannerImage: string;
  address: string;
  postcode: string;
  featured: boolean;
  offersFreeDelivery?: boolean;
  discountOffer?: string; // e.g., "Spend £15, get £3 off"
  menu: MenuItem[];
}

export interface CartCustomization {
  name: string;
  selectedOption: string;
  additionalPrice: number;
}

export interface CartItem {
  id: string; // Unique id for cart instance (item id + selections hash)
  menuItem: MenuItem;
  quantity: number;
  customizations: CartCustomization[];
  notes?: string;
}

export type OrderStatus = 'Placed' | 'Preparing' | 'OutForDelivery' | 'Delivered' | 'Cancelled';

export interface Order {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantAddress: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  vat: number;
  total: number;
  status: OrderStatus;
  deliveryAddress: string;
  deliveryPostcode: string;
  driverName?: string;
  driverPhone?: string;
  driverLatLng?: { lat: number; lng: number };
  createdAt: string;
}

export interface UKPostcodeZone {
  postcode: string;
  areaName: string;
  deliveryMultiplier: number; // to adjust delivery fees/times dynamically
}
