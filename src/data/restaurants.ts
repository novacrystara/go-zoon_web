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
    featured: true,
    offersFreeDelivery: false,
    discountOffer: 'Save 10% on orders over £20',
    menu: [
      {
        id: 'r1-m1',
        name: 'Traditional Cod & Chips',
        description: 'Fresh Atlantic cod in crispy golden beer batter, served with twice-cooked Maris Piper chips, lemon wedge, and homemade tartare sauce.',
        price: 13.50,
        image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=300&q=80',
        category: 'Mains'
      },
      {
        id: 'r1-m2',
        name: 'Jumbo Haddock & Chips',
        description: 'Large flaky lines-caught Haddock battered to perfection, served with standard chips.',
        price: 14.20,
        image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=300&q=80',
        category: 'Mains'
      },
      {
        id: 'r1-m3',
        name: 'Traditional Mushy Peas',
        description: 'Slow-simmered marrowfat peas with a hint of fresh garden mint.',
        price: 1.80,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
        category: 'Sides',
        dietary: ['Vegetarian', 'Vegan', 'Gluten-Free']
      },
      {
        id: 'r1-m4',
        name: 'Warm Chippy Curry Sauce',
        description: 'The ultimate British chippy side - sweet, mildly spiced curry sauce perfect for dipping.',
        price: 1.80,
        image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=300&q=80',
        category: 'Sides',
        dietary: ['Vegetarian']
      },
      {
        id: 'r1-m5',
        name: 'Battered Jumbo Sausage',
        description: 'Pork sausage dipped in chipshop batter and fried till crispy.',
        price: 3.50,
        image: 'https://images.unsplash.com/photo-1778449521139-8c4a3f6273c5?auto=format&fit=crop&w=300&q=80',
        category: 'Mains'
      },
      {
        id: 'r1-m6',
        name: 'Sticky Toffee Pudding',
        description: 'Classic British sponge cake with finely chopped dates, covered in a rich warm toffee sauce and served with custard.',
        price: 5.95,
        image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=300&q=80',
        category: 'Desserts',
        dietary: ['Vegetarian']
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
    featured: true,
    offersFreeDelivery: true,
    discountOffer: 'Free Delivery on orders over £15',
    menu: [
      {
        id: 'r2-m1',
        name: 'Ultimate British Roast Beef',
        description: '28-day dry-aged Aberdeen Angus roast beef, crispy beef-fat roast potatoes, dynamic giant Yorkshire pudding, honey-glazed parsnips, buttered seasonal greens, and a rich red-wine gravy.',
        price: 17.95,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=300&q=80',
        category: 'Sunday Roast Specials'
      },
      {
        id: 'r2-m2',
        name: 'Half Roast Norfolk Chicken',
        description: 'Lemon & herb basted roasted chicken, served with roast potatoes, Yorkshire pudding, seasonal vegetables, and sage & onion stuffing.',
        price: 15.50,
        image: 'https://images.unsplash.com/photo-1670398564097-0762e1b30b3a?auto=format&fit=crop&w=300&q=80',
        category: 'Sunday Roast Specials'
      },
      {
        id: 'r2-m3',
        name: 'Vegetarian Nut Roast',
        description: 'Savory loaf of roasted nuts, cranberries, butternut squash, and herbs. Served with roast potatoes, Yorkshire pudding, and vegetarian gravy.',
        price: 14.50,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
        category: 'Sunday Roast Specials',
        dietary: ['Vegetarian']
      },
      {
        id: 'r2-m4',
        name: 'Extra Large Yorkshire Pudding',
        description: 'Freshly baked, towering Yorkshire pudding. Crispy on the outside, soft on the inside.',
        price: 2.00,
        image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=300&q=80',
        category: 'Extras',
        dietary: ['Vegetarian']
      },
      {
        id: 'r2-m5',
        name: 'Warm Apple & Blackberry Crumble',
        description: 'Tart English apples and wild blackberries topped with butter crumble, baked golden and served with warm vanilla custard.',
        price: 5.50,
        image: 'https://images.unsplash.com/photo-1508737804141-4c3b688e2546?auto=format&fit=crop&w=300&q=80',
        category: 'Desserts',
        dietary: ['Vegetarian']
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
    featured: true,
    offersFreeDelivery: false,
    discountOffer: 'Spend £25, get a free Garlic Naan',
    menu: [
      {
        id: 'r3-m1',
        name: 'British Tikka Masala (Chicken)',
        description: 'The nation’s favorite: tender chargrilled chicken breast in a creamy, mildly spiced tomato and coconut sauce.',
        price: 12.95,
        image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=300&q=80',
        category: 'Curries',
        dietary: ['Halal']
      },
      {
        id: 'r3-m2',
        name: 'Lamb Rogan Josh',
        description: 'Slow-cooked British lamb shoulder in a rich, aromatic tomato sauce with Kashmiri chillies and cardamom.',
        price: 13.95,
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=300&q=80',
        category: 'Curries',
        dietary: ['Halal']
      },
      {
        id: 'r3-m3',
        name: 'Tarka Dall',
        description: 'Yellow split lentils tempered with garlic, cumin, mustard seeds, and fresh coriander.',
        price: 6.50,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
        category: 'Sides',
        dietary: ['Vegetarian', 'Vegan', 'Gluten-Free']
      },
      {
        id: 'r3-m4',
        name: 'Garlic & Coriander Naan',
        description: 'Freshly leavened bread baked against the wall of the clay tandoor, brushed with garlic butter.',
        price: 3.20,
        image: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&w=300&q=80',
        category: 'Breads',
        dietary: ['Vegetarian']
      },
      {
        id: 'r3-m5',
        name: 'Pilau Rice',
        description: 'Fragrant basmati rice cooked with aromatic whole spices, saffron, and ghee.',
        price: 3.50,
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=300&q=80',
        category: 'Rice',
        dietary: ['Vegetarian', 'Gluten-Free']
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
    featured: false,
    offersFreeDelivery: false,
    discountOffer: 'Sweet Treat: Buy 2 Scones, Get 1 Free',
    menu: [
      {
        id: 'r4-m1',
        name: 'Traditional Afternoon Tea Set for One',
        description: 'Two warm handmade fruit scones served with authentic Rodda\'s Cornish clotted cream, Tiptree strawberry jam, and a selection of delicate finger sandwiches (Cucumber & Cream Cheese, Smoked Salmon).',
        price: 14.50,
        image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=300&q=80',
        category: 'High Tea Sets',
        dietary: ['Vegetarian']
      },
      {
        id: 'r4-m2',
        name: 'Warm Butter Croissant',
        description: 'Rich, flaky, laminated French butter pastry baked fresh daily.',
        price: 2.80,
        image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=300&q=80',
        category: 'Bakery',
        dietary: ['Vegetarian']
      },
      {
        id: 'r4-m3',
        name: 'Clotted Cream & Jam Scone Duo',
        description: 'Two traditional baked English scones with strawberry preserve and rich clotted cream.',
        price: 5.20,
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80',
        category: 'Bakery',
        dietary: ['Vegetarian']
      },
      {
        id: 'r4-m4',
        name: 'Artisan Flat White Coffee',
        description: 'Rich double shot of espresso with silky microfoam milk, prepared by our master barista.',
        price: 3.60,
        image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=300&q=80',
        category: 'Drinks'
      },
      {
        id: 'r4-m5',
        name: 'Loose Leaf English Breakfast Tea',
        description: 'Traditional robust black tea blend served hot in a dynamic secure takeaway pot with fresh milk on the side.',
        price: 3.10,
        image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=300&q=80',
        category: 'Drinks',
        dietary: ['Vegetarian', 'Vegan', 'Gluten-Free']
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
    featured: false,
    offersFreeDelivery: true,
    discountOffer: 'Spend £18, get free Rosemary Fries',
    menu: [
      {
        id: 'r5-m1',
        name: 'The Big Borough Cheeseburger',
        description: 'Two dry-aged British beef patties, double melted West Country cheddar, pickle, minced onions, and house burger relish in a toasted brioche bun.',
        price: 11.50,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80',
        category: 'Burgers'
      },
      {
        id: 'r5-m2',
        name: 'Spicy Truffle Bird',
        description: 'Buttermilk fried chicken breast, truffle mayo, dynamic hot pepper honey, slaw, and pickles on a brioche bun.',
        price: 12.00,
        image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=300&q=80',
        category: 'Burgers',
        dietary: ['Halal']
      },
      {
        id: 'r5-m3',
        name: 'Rosemary Salted Skin-on Fries',
        description: 'Crispy cut Maris Piper potatoes tossed in fresh crushed rosemary and sea salt.',
        price: 3.95,
        image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=300&q=80',
        category: 'Sides',
        dietary: ['Vegetarian', 'Vegan', 'Gluten-Free']
      },
      {
        id: 'r5-m4',
        name: 'Truffle Mac & Cheese',
        description: 'Macaroni in a rich four-cheese sauce spiked with black truffle oil, topped with golden sourdough crumbs.',
        price: 5.50,
        image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=300&q=80',
        category: 'Sides',
        dietary: ['Vegetarian']
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
    featured: false,
    offersFreeDelivery: false,
    discountOffer: '£3 off when you spend £20',
    menu: [
      {
        id: 'r6-m1',
        name: 'Special Lamb Doner Wrap',
        description: 'Premium spiced British lamb roasted on a vertical spit, shaved thin and rolled in fresh warm flatbread with crisp lettuce, tomato, onion, and signature garlic & chilli sauces.',
        price: 10.95,
        image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=300&q=80',
        category: 'Wraps & Kebabs',
        dietary: ['Halal']
      },
      {
        id: 'r6-m2',
        name: 'Marinated Chicken Shish Kebab',
        description: 'Skewers of tender chicken breast marinated in garlic, yogurt, and warm spices, grilled over wood coals. Served with pilav rice and grilled peppers.',
        price: 13.50,
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=300&q=80',
        category: 'Wraps & Kebabs',
        dietary: ['Halal']
      },
      {
        id: 'r6-m3',
        name: 'Authentic Hummus & Pita',
        description: 'Creamy pureed chickpeas with sesame tahini, fresh lemon juice, garlic, and olive oil, served with warm clay-baked flatbread.',
        price: 4.95,
        image: 'https://images.unsplash.com/photo-1591299177061-2151e53fcaea?auto=format&fit=crop&w=300&q=80',
        category: 'Appetizers',
        dietary: ['Vegetarian', 'Vegan']
      },
      {
        id: 'r6-m4',
        name: 'Pistachio Baklava Triplet',
        description: 'Three pieces of flaky, multi-layered filo pastry filled with crushed walnuts and pistachios, sweet-drenched in honey syrup.',
        price: 4.50,
        image: 'https://images.unsplash.com/photo-1508737804141-4c3b688e2546?auto=format&fit=crop&w=300&q=80',
        category: 'Desserts',
        dietary: ['Vegetarian']
      }
    ]
  }
];

export const UK_POSTCODES: UKPostcodeZone[] = [
  { postcode: 'SW1A 1AA', areaName: 'Westminster, London', deliveryMultiplier: 1.2 },
  { postcode: 'EC1A 1BB', areaName: 'City of London', deliveryMultiplier: 1.3 },
  { postcode: 'NW1 0NE', areaName: 'Camden, London', deliveryMultiplier: 1.1 },
  { postcode: 'E1 6QL', areaName: 'Shoreditch & Whitechapel, London', deliveryMultiplier: 1.0 },
  { postcode: 'W8 4SG', areaName: 'Kensington, London', deliveryMultiplier: 1.4 },
  { postcode: 'SE1 1TL', areaName: 'Southwark, London', deliveryMultiplier: 1.15 },
  { postcode: 'N4 1HE', areaName: 'Harringay, London', deliveryMultiplier: 1.0 },
];

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
      deliveryMultiplier: prefixMatch.deliveryMultiplier
    };
  }

  // Basic regex check for general UK postcode to simulate validation
  const ukRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
  if (ukRegex.test(normalized)) {
    return {
      postcode: normalized,
      areaName: 'Greater London (Simulated Zone)',
      deliveryMultiplier: 1.1
    };
  }

  return null;
}
