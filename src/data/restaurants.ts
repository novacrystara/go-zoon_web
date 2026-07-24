import { Restaurant, UKPostcodeZone } from '../types';

export const UK_RESTAURANTS: Restaurant[] = [
  {
    id: 'rest-1',
    name: 'The Royal Cod & Chippy',
    rating: 4.8,
    reviewsCount: 342,
    deliveryTimeRange: [15, 25],
    deliveryFee: 1.99,
    minOrder: 10.0,
    cuisine: 'British / Seafood',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=500&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=80',
    address: '42 Duke Street, Westminster, London',
    postcode: 'SW1A 1AA',
    lat: 51.5010,
    lng: -0.1416,
    featured: true,
    offersFreeDelivery: false,
    discountOffer: 'Save 10% on orders over £20',
    about: 'A Westminster institution since 1974, The Royal Cod & Chippy fries fresh Atlantic cod and Maris Piper potatoes in small batches all day, using a traditional beer batter recipe passed down through three generations.',
    openingHours: 'Mon-Sat 11:30 - 22:00, Sun 12:00 - 21:00',
    menu: [
      {
        id: 'r1-m1',
        name: 'Traditional Cod & Chips',
        description: 'Fresh Atlantic cod in crispy golden beer batter, served with twice-cooked Maris Piper chips, lemon wedge, and homemade tartare sauce.',
        price: 13.50,
        image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=300&q=80',
        category: 'Mains',
        nutrition: { calories: 820, protein: 42, carbs: 78, fat: 38 }
      },
      {
        id: 'r1-m2',
        name: 'Jumbo Haddock & Chips',
        description: 'Large flaky lines-caught Haddock battered to perfection, served with standard chips.',
        price: 14.20,
        image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=300&q=80',
        category: 'Mains',
        nutrition: { calories: 870, protein: 45, carbs: 80, fat: 41 }
      },
      {
        id: 'r1-m3',
        name: 'Traditional Mushy Peas',
        description: 'Slow-simmered marrowfat peas with a hint of fresh garden mint.',
        price: 1.80,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
        category: 'Sides',
        dietary: ['Vegetarian', 'Vegan', 'Gluten-Free'],
        nutrition: { calories: 130, protein: 8, carbs: 20, fat: 1 }
      },
      {
        id: 'r1-m4',
        name: 'Warm Chippy Curry Sauce',
        description: 'The ultimate British chippy side - sweet, mildly spiced curry sauce perfect for dipping.',
        price: 1.80,
        image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=300&q=80',
        category: 'Sides',
        dietary: ['Vegetarian'],
        nutrition: { calories: 95, protein: 1, carbs: 12, fat: 4 }
      },
      {
        id: 'r1-m5',
        name: 'Battered Jumbo Sausage',
        description: 'Pork sausage dipped in chipshop batter and fried till crispy.',
        price: 3.50,
        image: 'https://images.unsplash.com/photo-1531860835813-c0e85098954c?auto=format&fit=crop&w=300&q=80',
        category: 'Mains',
        nutrition: { calories: 340, protein: 14, carbs: 18, fat: 24 }
      },
      {
        id: 'r1-m6',
        name: 'Sticky Toffee Pudding',
        description: 'Classic British sponge cake with finely chopped dates, covered in a rich warm toffee sauce and served with custard.',
        price: 5.95,
        image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=300&q=80',
        category: 'Desserts',
        dietary: ['Vegetarian'],
        nutrition: { calories: 560, protein: 5, carbs: 78, fat: 25 }
      }
    ]
  },
  {
    id: 'rest-2',
    name: 'The Royal Sovereign Roast & Pub',
    rating: 4.7,
    reviewsCount: 189,
    deliveryTimeRange: [30, 45],
    deliveryFee: 2.99,
    minOrder: 12.00,
    cuisine: 'British / Roast',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80',
    address: '15 High Street, Camden, London',
    postcode: 'NW1 0NE',
    lat: 51.5390,
    lng: -0.1426,
    featured: true,
    offersFreeDelivery: true,
    discountOffer: 'Free Delivery on orders over £15',
    about: 'A cosy Camden gastropub serving proper Sunday roasts every day of the week - dry-aged meats, dripping-roasted potatoes, and giant Yorkshire puddings, in a dining room built around a 200-year-old oak bar.',
    openingHours: 'Mon-Fri 12:00 - 21:30, Sat-Sun 12:00 - 20:00',
    menu: [
      {
        id: 'r2-m1',
        name: 'Ultimate British Roast Beef',
        description: '28-day dry-aged Aberdeen Angus roast beef, crispy beef-fat roast potatoes, dynamic giant Yorkshire pudding, honey-glazed parsnips, buttered seasonal greens, and a rich red-wine gravy.',
        price: 17.95,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=300&q=80',
        category: 'Sunday Roast Specials',
        nutrition: { calories: 980, protein: 58, carbs: 62, fat: 48 }
      },
      {
        id: 'r2-m2',
        name: 'Half Roast Norfolk Chicken',
        description: 'Lemon & herb basted roasted chicken, served with roast potatoes, Yorkshire pudding, seasonal vegetables, and sage & onion stuffing.',
        price: 15.50,
        image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=300&q=80',
        category: 'Sunday Roast Specials',
        nutrition: { calories: 870, protein: 62, carbs: 55, fat: 38 }
      },
      {
        id: 'r2-m3',
        name: 'Vegetarian Nut Roast',
        description: 'Savory loaf of roasted nuts, cranberries, butternut squash, and herbs. Served with roast potatoes, Yorkshire pudding, and vegetarian gravy.',
        price: 14.50,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
        category: 'Sunday Roast Specials',
        dietary: ['Vegetarian'],
        nutrition: { calories: 720, protein: 22, carbs: 68, fat: 38 }
      },
      {
        id: 'r2-m4',
        name: 'Extra Large Yorkshire Pudding',
        description: 'Freshly baked, towering Yorkshire pudding. Crispy on the outside, soft on the inside.',
        price: 2.00,
        image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=300&q=80',
        category: 'Extras',
        dietary: ['Vegetarian'],
        nutrition: { calories: 210, protein: 7, carbs: 24, fat: 9 }
      },
      {
        id: 'r2-m5',
        name: 'Warm Apple & Blackberry Crumble',
        description: 'Tart English apples and wild blackberries topped with butter crumble, baked golden and served with warm vanilla custard.',
        price: 5.50,
        image: 'https://images.unsplash.com/photo-1508737804141-4c3b688e2546?auto=format&fit=crop&w=300&q=80',
        category: 'Desserts',
        dietary: ['Vegetarian'],
        nutrition: { calories: 490, protein: 5, carbs: 71, fat: 20 }
      }
    ]
  },
  {
    id: 'rest-3',
    name: 'Brick Lane Curry Club',
    rating: 4.9,
    reviewsCount: 512,
    deliveryTimeRange: [25, 35],
    deliveryFee: 1.49,
    minOrder: 15.00,
    cuisine: 'Indian / Curry',
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=500&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=80',
    address: '88 Brick Lane, Shoreditch, London',
    postcode: 'E1 6QL',
    lat: 51.5203,
    lng: -0.0714,
    featured: true,
    offersFreeDelivery: false,
    discountOffer: 'Spend £25, get a free Garlic Naan',
    about: 'Brick Lane Curry Club has been slow-cooking British-Bangladeshi curries on the same stretch of Brick Lane for over 20 years, hand-grinding its own spice blends fresh every morning.',
    openingHours: 'Daily 12:00 - 23:00',
    menu: [
      {
        id: 'r3-m1',
        name: 'British Tikka Masala (Chicken)',
        description: 'The nation’s favorite: tender chargrilled chicken breast in a creamy, mildly spiced tomato and coconut sauce.',
        price: 12.95,
        image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=300&q=80',
        category: 'Curries',
        dietary: ['Halal'],
        nutrition: { calories: 690, protein: 46, carbs: 24, fat: 42 }
      },
      {
        id: 'r3-m2',
        name: 'Lamb Rogan Josh',
        description: 'Slow-cooked British lamb shoulder in a rich, aromatic tomato sauce with Kashmiri chillies and cardamom.',
        price: 13.95,
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=300&q=80',
        category: 'Curries',
        dietary: ['Halal'],
        nutrition: { calories: 720, protein: 44, carbs: 20, fat: 48 }
      },
      {
        id: 'r3-m3',
        name: 'Tarka Dall',
        description: 'Yellow split lentils tempered with garlic, cumin, mustard seeds, and fresh coriander.',
        price: 6.50,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
        category: 'Sides',
        dietary: ['Vegetarian', 'Vegan', 'Gluten-Free'],
        nutrition: { calories: 310, protein: 16, carbs: 38, fat: 10 }
      },
      {
        id: 'r3-m4',
        name: 'Garlic & Coriander Naan',
        description: 'Freshly leavened bread baked against the wall of the clay tandoor, brushed with garlic butter.',
        price: 3.20,
        image: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&w=300&q=80',
        category: 'Breads',
        dietary: ['Vegetarian'],
        nutrition: { calories: 280, protein: 8, carbs: 46, fat: 7 }
      },
      {
        id: 'r3-m5',
        name: 'Pilau Rice',
        description: 'Fragrant basmati rice cooked with aromatic whole spices, saffron, and ghee.',
        price: 3.50,
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=300&q=80',
        category: 'Rice',
        dietary: ['Vegetarian', 'Gluten-Free'],
        nutrition: { calories: 340, protein: 6, carbs: 62, fat: 8 }
      }
    ]
  },
  {
    id: 'rest-4',
    name: 'Kensington Bakery & High Tea',
    rating: 4.6,
    reviewsCount: 94,
    deliveryTimeRange: [20, 30],
    deliveryFee: 3.49,
    minOrder: 12.00,
    cuisine: 'Bakery / Tea & Coffee',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80',
    address: '102 Kensington High Street, London',
    postcode: 'W8 4SG',
    lat: 51.5009,
    lng: -0.1925,
    featured: false,
    offersFreeDelivery: false,
    discountOffer: 'Sweet Treat: Buy 2 Scones, Get 1 Free',
    about: 'A light-filled Kensington bakery specialising in traditional English afternoon tea - scones baked in small batches every couple of hours, hand-cut sandwiches, and single-origin loose leaf tea.',
    openingHours: 'Mon-Sun 08:00 - 18:00',
    menu: [
      {
        id: 'r4-m1',
        name: 'Traditional Afternoon Tea Set for One',
        description: 'Two warm handmade fruit scones served with authentic Rodda\'s Cornish clotted cream, Tiptree strawberry jam, and a selection of delicate finger sandwiches (Cucumber & Cream Cheese, Smoked Salmon).',
        price: 14.50,
        image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=300&q=80',
        category: 'High Tea Sets',
        dietary: ['Vegetarian'],
        nutrition: { calories: 780, protein: 20, carbs: 84, fat: 40 }
      },
      {
        id: 'r4-m2',
        name: 'Warm Butter Croissant',
        description: 'Rich, flaky, laminated French butter pastry baked fresh daily.',
        price: 2.80,
        image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=300&q=80',
        category: 'Bakery',
        dietary: ['Vegetarian'],
        nutrition: { calories: 340, protein: 7, carbs: 34, fat: 20 }
      },
      {
        id: 'r4-m3',
        name: 'Clotted Cream & Jam Scone Duo',
        description: 'Two traditional baked English scones with strawberry preserve and rich clotted cream.',
        price: 5.20,
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80',
        category: 'Bakery',
        dietary: ['Vegetarian'],
        nutrition: { calories: 520, protein: 8, carbs: 60, fat: 27 }
      },
      {
        id: 'r4-m4',
        name: 'Artisan Flat White Coffee',
        description: 'Rich double shot of espresso with silky microfoam milk, prepared by our master barista.',
        price: 3.60,
        image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=300&q=80',
        category: 'Drinks',
        nutrition: { calories: 130, protein: 7, carbs: 10, fat: 7 }
      },
      {
        id: 'r4-m5',
        name: 'Loose Leaf English Breakfast Tea',
        description: 'Traditional robust black tea blend served hot in a dynamic secure takeaway pot with fresh milk on the side.',
        price: 3.10,
        image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=300&q=80',
        category: 'Drinks',
        dietary: ['Vegetarian', 'Vegan', 'Gluten-Free'],
        nutrition: { calories: 20, protein: 0, carbs: 3, fat: 0 }
      }
    ]
  },
  {
    id: 'rest-5',
    name: 'The Big Borough Burger Co.',
    rating: 4.7,
    reviewsCount: 298,
    deliveryTimeRange: [15, 25],
    deliveryFee: 1.99,
    minOrder: 8.50,
    cuisine: 'American / Burgers',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
    address: 'Southwark Street, Borough Market, London',
    postcode: 'SE1 1TL',
    lat: 51.5055,
    lng: -0.0910,
    featured: false,
    offersFreeDelivery: true,
    discountOffer: 'Spend £18, get free Rosemary Fries',
    about: 'Born as a Borough Market street stall, Big Borough Burger Co. grinds its own dry-aged British beef daily and now serves the same smash-grilled patties from a permanent Southwark Street kitchen.',
    openingHours: 'Mon-Sun 11:00 - 22:30',
    menu: [
      {
        id: 'r5-m1',
        name: 'The Big Borough Cheeseburger',
        description: 'Two dry-aged British beef patties, double melted West Country cheddar, pickle, minced onions, and house burger relish in a toasted brioche bun.',
        price: 11.50,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80',
        category: 'Burgers',
        nutrition: { calories: 890, protein: 48, carbs: 42, fat: 56 }
      },
      {
        id: 'r5-m2',
        name: 'Spicy Truffle Bird',
        description: 'Buttermilk fried chicken breast, truffle mayo, dynamic hot pepper honey, slaw, and pickles on a brioche bun.',
        price: 12.00,
        image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=300&q=80',
        category: 'Burgers',
        dietary: ['Halal'],
        nutrition: { calories: 820, protein: 40, carbs: 58, fat: 44 }
      },
      {
        id: 'r5-m3',
        name: 'Rosemary Salted Skin-on Fries',
        description: 'Crispy cut Maris Piper potatoes tossed in fresh crushed rosemary and sea salt.',
        price: 3.95,
        image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=300&q=80',
        category: 'Sides',
        dietary: ['Vegetarian', 'Vegan', 'Gluten-Free'],
        nutrition: { calories: 420, protein: 6, carbs: 54, fat: 20 }
      },
      {
        id: 'r5-m4',
        name: 'Truffle Mac & Cheese',
        description: 'Macaroni in a rich four-cheese sauce spiked with black truffle oil, topped with golden sourdough crumbs.',
        price: 5.50,
        image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=300&q=80',
        category: 'Sides',
        dietary: ['Vegetarian'],
        nutrition: { calories: 610, protein: 22, carbs: 52, fat: 36 }
      }
    ]
  },
  {
    id: 'rest-6',
    name: 'Istanbul Kebab House',
    rating: 4.5,
    reviewsCount: 172,
    deliveryTimeRange: [15, 30],
    deliveryFee: 2.49,
    minOrder: 10.00,
    cuisine: 'Middle Eastern / Turkish',
    image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=500&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=1200&q=80',
    address: '254 Green Lanes, Harringay, London',
    postcode: 'N4 1HE',
    lat: 51.5773,
    lng: -0.1066,
    featured: false,
    offersFreeDelivery: false,
    discountOffer: '£3 off when you spend £20',
    about: 'Run by the Yilmaz family since 1998, Istanbul Kebab House roasts lamb and chicken on a traditional vertical spit and bakes its own flatbread throughout service on Green Lanes.',
    openingHours: 'Mon-Sun 12:00 - 23:30',
    menu: [
      {
        id: 'r6-m1',
        name: 'Special Lamb Doner Wrap',
        description: 'Premium spiced British lamb roasted on a vertical spit, shaved thin and rolled in fresh warm flatbread with crisp lettuce, tomato, onion, and signature garlic & chilli sauces.',
        price: 10.95,
        image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=300&q=80',
        category: 'Wraps & Kebabs',
        dietary: ['Halal'],
        nutrition: { calories: 760, protein: 38, carbs: 62, fat: 38 }
      },
      {
        id: 'r6-m2',
        name: 'Marinated Chicken Shish Kebab',
        description: 'Skewers of tender chicken breast marinated in garlic, yogurt, and warm spices, grilled over wood coals. Served with pilav rice and grilled peppers.',
        price: 13.50,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=300&q=80',
        category: 'Wraps & Kebabs',
        dietary: ['Halal'],
        nutrition: { calories: 680, protein: 52, carbs: 58, fat: 24 }
      },
      {
        id: 'r6-m3',
        name: 'Authentic Hummus & Pita',
        description: 'Creamy pureed chickpeas with sesame tahini, fresh lemon juice, garlic, and olive oil, served with warm clay-baked flatbread.',
        price: 4.95,
        image: 'https://images.unsplash.com/photo-1637949385162-e416fb15b2ce?auto=format&fit=crop&w=300&q=80',
        category: 'Appetizers',
        dietary: ['Vegetarian', 'Vegan'],
        nutrition: { calories: 390, protein: 12, carbs: 48, fat: 17 }
      },
      {
        id: 'r6-m4',
        name: 'Pistachio Baklava Triplet',
        description: 'Three pieces of flaky, multi-layered filo pastry filled with crushed walnuts and pistachios, sweet-drenched in honey syrup.',
        price: 4.50,
        image: 'https://images.unsplash.com/photo-1508737804141-4c3b688e2546?auto=format&fit=crop&w=300&q=80',
        category: 'Desserts',
        dietary: ['Vegetarian'],
        nutrition: { calories: 430, protein: 6, carbs: 46, fat: 26 }
      }
    ]
  }
];

export const UK_POSTCODES: UKPostcodeZone[] = [
  { postcode: 'SW1A 1AA', areaName: 'Westminster, London', deliveryMultiplier: 1.2, lat: 51.5010, lng: -0.1416 },
  { postcode: 'EC1A 1BB', areaName: 'City of London', deliveryMultiplier: 1.3, lat: 51.5178, lng: -0.0965 },
  { postcode: 'NW1 0NE', areaName: 'Camden, London', deliveryMultiplier: 1.1, lat: 51.5390, lng: -0.1426 },
  { postcode: 'E1 6QL', areaName: 'Shoreditch & Whitechapel, London', deliveryMultiplier: 1.0, lat: 51.5203, lng: -0.0714 },
  { postcode: 'W8 4SG', areaName: 'Kensington, London', deliveryMultiplier: 1.4, lat: 51.5009, lng: -0.1925 },
  { postcode: 'SE1 1TL', areaName: 'Southwark, London', deliveryMultiplier: 1.15, lat: 51.5045, lng: -0.0865 },
  { postcode: 'N4 1HE', areaName: 'Harringay, London', deliveryMultiplier: 1.0, lat: 51.5773, lng: -0.1066 },
];

// Central London fallback used for postcodes that pass basic UK-postcode validation
// but aren't one of our known zones (see the regex branch below).
const LONDON_CENTER = { lat: 51.5074, lng: -0.1278 };

export function validateUKPostcode(postcode: string): UKPostcodeZone | null {
  const normalized = postcode.trim().toUpperCase().replace(/\s+/g, ' ');
  // Match full postcode or prefix
  const exactMatch = UK_POSTCODES.find(p => p.postcode === normalized);
  if (exactMatch) return exactMatch;

  const prefixMatch = UK_POSTCODES.find(p => normalized.startsWith(p.postcode.split(' ')[0]));
  if (prefixMatch) {
    return {
      postcode: normalized,
      areaName: prefixMatch.areaName,
      deliveryMultiplier: prefixMatch.deliveryMultiplier,
      lat: prefixMatch.lat,
      lng: prefixMatch.lng
    };
  }

  // Basic regex check for general UK postcode to simulate validation
  const ukRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
  if (ukRegex.test(normalized)) {
    return {
      postcode: normalized,
      areaName: 'Greater London (Simulated Zone)',
      deliveryMultiplier: 1.1,
      lat: LONDON_CENTER.lat,
      lng: LONDON_CENTER.lng
    };
  }

  return null;
}

// Straight-line (great-circle) distance in km - good enough for a "how far is this
// restaurant from you" estimate without needing a paid routing/maps API.
export function haversineDistanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export const NEARBY_RADIUS_KM = 8;
