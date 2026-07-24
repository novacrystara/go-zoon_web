export interface MenuItemOption {
  name: string; // e.g., "Size", "Extras"
  type: 'select' | 'checkbox';
  required: boolean;
  choices: {
    name: string; // e.g., "Standard", "Large", "Extra Cheese"
    price: number; // e.g., 0, 2.50, 1.50
  }[];
}

export interface NutritionInfo {
  calories: number; // kcal per serving
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
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
  nutrition?: NutritionInfo;
}

export interface Restaurant {
  id: string;
  name: string;
  rating: number;
  reviewsCount: number;
  deliveryTimeRange: [number, number]; // e.g. [20, 30] minutes
  deliveryFee: number;
  minOrder: number;
  enforceMinOrder?: boolean; // business-configurable toggle - minOrder is decorative unless this is true
  cuisine: string;
  image: string;
  bannerImage: string;
  address: string;
  postcode: string;
  featured: boolean;
  offersFreeDelivery?: boolean;
  discountOffer?: string; // e.g., "Spend £15, get £3 off"
  about?: string;
  openingHours?: string; // e.g. "Mon-Sun 11:00 - 22:00"
  lat: number;
  lng: number;
  menu: MenuItem[];
}

export interface CartCustomization {
  name: string;
  selectedOption: string;
  additionalPrice: number;
}

export interface CartItem {
  id: string; // Unique id for cart instance (item id + selections hash)
  restaurantId: string;
  menuItem: MenuItem;
  quantity: number;
  customizations: CartCustomization[];
  notes?: string;
}

export type OrderStatus =
  | 'Placed'
  | 'Preparing'
  | 'ReadyForPickup'
  | 'DriverArrived'
  | 'PickedUp'
  | 'OutForDelivery'
  | 'Delivered'
  | 'Cancelled';

export interface Order {
  id: string;
  customerId?: string;
  restaurantId: string;
  restaurantName: string;
  restaurantAddress: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  vat: number;
  tip: number;
  discount?: number;
  promoCode?: string;
  total: number;
  status: OrderStatus;
  orderMode: 'Delivery' | 'Collection';
  paymentMethod: 'Card' | 'Cash';
  deliveryAddress: string;
  deliveryPostcode: string;
  driverName?: string;
  driverPhone?: string;
  driverLatLng?: { lat: number; lng: number };
  rated?: boolean;
  createdAt: string;
}

export interface UKPostcodeZone {
  postcode: string;
  areaName: string;
  deliveryMultiplier: number; // to adjust delivery fees/times dynamically
  lat: number;
  lng: number;
}

export interface SavedAddress {
  id: string;
  customerId: string;
  label: string; // e.g. "Home", "Work"
  addressLine: string;
  postcode: string;
  isDefault?: boolean;
}

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  restaurantId: string;
  rating: number; // 1-5
  courierRating?: number; // 1-5, only present for delivered orders with a courier
  comment?: string;
  createdAt: string;
}

export interface AuthSession {
  customerId: string;
  phone: string;
  sessionToken: string;
}

export interface CustomerProfile {
  name: string | null;
  notifyOrderUpdates: boolean;
  notifyPromotions: boolean;
  hasMpin: boolean;
}

export interface AppNotification {
  id: string;
  type: 'order' | 'promo';
  title: string;
  body: string;
  orderId?: string;
  read: boolean;
  createdAt: string;
}
