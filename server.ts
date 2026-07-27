import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Pool } from 'pg';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Firestore } from 'firebase-admin/firestore';
import { getDatabase as getAdminDatabase, Database } from 'firebase-admin/database';
import dotenv from 'dotenv';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { UK_RESTAURANTS, validateUKPostcode } from './src/data/restaurants';
import type { Restaurant, MenuItem } from './src/types';

dotenv.config();

// Demo-mode phone auth: no Twilio/SMS integration - a fixed whitelist of demo
// numbers accept a fixed OTP. This also doubles as the demo account Apple/Google
// require for App Store review of any app with a login wall.
const DEMO_PHONE_NUMBERS = ['+447700900000', '+447700900001'];
const DEMO_OTP = '123456';
const normalizePhone = (phone: string) => (phone || '').replace(/[\s()-]/g, '');

// In-memory fallbacks for development/testing sandbox when real databases aren't configured yet
const memoryDb = {
  orders: [] as any[],
  telemetry: {} as Record<string, { orderId: string, driverName: string, lat: number, lng: number, updatedAt: string }>,
  // Pre-seeded with a deep copy of the static demo restaurants so onboarding a new
  // restaurant merges into this list instead of the catalog appearing to replace them.
  restaurants: JSON.parse(JSON.stringify(UK_RESTAURANTS)) as Restaurant[],
  closedRestaurants: [] as string[],
  outOfStockItems: [] as string[],
  drivers: [] as { name: string; phone: string; vehicle: string }[],
  customers: [] as { id: string; phone: string; name?: string | null; notifyOrderUpdates?: boolean; notifyPromotions?: boolean; mpinHash?: string | null }[],
  sessions: {} as Record<string, string>, // token -> customerId
  addresses: [] as any[],
  reviews: [] as any[],
  notifications: [] as any[],
  supportMessages: [] as any[],
  promoCodes: { CHIPPY10: 10 } as Record<string, number>,
};

// MPIN hashing - scrypt (Node built-in, no extra dependency) with a random salt per
// customer. Stored as "salt:hash" hex in a single column.
function hashMpin(mpin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(mpin, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyMpin(mpin: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(mpin, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

// PostgreSQL connection pool (Lazy initialized)
let pgPool: Pool | null = null;
function getPgPool(): Pool | null {
  if (!pgPool) {
    const connectionString = process.env.DATABASE_URL;
    
    // Log diagnostics for debugging connection issues
    console.log('[PostgreSQL Diagnostics] DATABASE_URL present:', !!connectionString);
    if (connectionString) {
      try {
        // Safe parsing to log the host and DB name
        const parsedUrl = new URL(connectionString);
        console.log('[PostgreSQL Diagnostics] Configured Host:', parsedUrl.hostname);
        console.log('[PostgreSQL Diagnostics] Configured Port:', parsedUrl.port || '5432');
        console.log('[PostgreSQL Diagnostics] Configured Database:', parsedUrl.pathname.replace('/', ''));
      } catch (urlErr) {
        console.log('[PostgreSQL Diagnostics] Connection string is not a standard URL. Format test:', {
          length: connectionString.length,
          startsWithPostgres: connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://'),
          containsAt: connectionString.includes('@'),
          containsColon: connectionString.includes(':')
        });
      }
    }
    
    // Check if other pg-specific environment variables exist that might interfere
    const pgEnvKeys = ['PGHOST', 'PGPORT', 'PGUSER', 'PGDATABASE'];
    const presentPgEnvs = pgEnvKeys.filter(k => process.env[k]);
    if (presentPgEnvs.length > 0) {
      console.log('[PostgreSQL Diagnostics] Standard PG env vars found that might conflict:', presentPgEnvs);
      presentPgEnvs.forEach(k => {
        console.log(`  - ${k}:`, k === 'PGPASSWORD' ? '***' : process.env[k]);
      });
    }

    if (connectionString) {
      try {
        pgPool = new Pool({
          connectionString,
          connectionTimeoutMillis: 3000, // Fail-fast timeout for connections (3 seconds)
          ssl: connectionString.includes('render.com') || connectionString.includes('elephantsql') || connectionString.includes('gcp') || connectionString.includes('supabase') || connectionString.includes('neon')
            ? { rejectUnauthorized: false }
            : undefined,
        });
        console.log('[PostgreSQL] Initialized client connection pool with 3s timeout.');
      } catch (err) {
        console.error('[PostgreSQL] Connection pool initialization error:', err);
      }
    } else {
      console.log('[PostgreSQL] Connection string not found. Using memory fallback for sandbox orders.');
    }
  }
  return pgPool;
}

// Firestore instance (Lazy initialized)
let firestoreDb: Firestore | null = null;
let isFirebaseInitialized = false;
let firestoreInitError: string | null = null;
function getFirestore(): Firestore | null {
  if (!isFirebaseInitialized) {
    isFirebaseInitialized = true;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      try {
        privateKey = privateKey.replace(/\\n/g, '\n');
        
        let app;
        if (getApps().length === 0) {
          app = initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });
        } else {
          app = getApp();
        }
        
        firestoreDb = getAdminFirestore(app);
        console.log('[Firestore] Firebase Admin SDK initialized successfully.');
      } catch (err: any) {
        firestoreInitError = err?.message || String(err);
        console.error('[Firestore] Initialization error:', err);
      }
    } else {
      console.log('[Firestore] Service credentials not found. Using in-memory fallback for driver tracking.');
    }
  }
  return firestoreDb;
}

// Realtime Database instance (Lazy initialized)
let rtdb: Database | null = null;
let isRtdbInitialized = false;
let rtdbInitError: string | null = null;
function getRtdb(): Database | null {
  if (!isRtdbInitialized) {
    isRtdbInitialized = true;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const databaseUrl = process.env.FIREBASE_DATABASE_URL;

    console.log('[Realtime Database Setup] Checking env variables:', {
      projectId: !!projectId,
      clientEmail: !!clientEmail,
      privateKey: !!privateKey,
      databaseUrl: !!databaseUrl
    });

    if (projectId && clientEmail && privateKey && databaseUrl) {
      try {
        privateKey = privateKey.replace(/\\n/g, '\n');
        let app;
        if (getApps().length === 0) {
          app = initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey,
            }),
            databaseURL: databaseUrl,
          });
        } else {
          // If default app already exists (e.g., initialized by Firestore),
          // create or fetch a named app 'rtdb' containing the databaseURL option.
          try {
            app = getApp('rtdb');
          } catch {
            app = initializeApp({
              credential: cert({
                projectId,
                clientEmail,
                privateKey,
              }),
              databaseURL: databaseUrl,
            }, 'rtdb');
          }
        }
        rtdb = getAdminDatabase(app);
        console.log('[Realtime Database] Initialized successfully with URL:', databaseUrl);
      } catch (err: any) {
        rtdbInitError = err?.message || String(err);
        console.error('[Realtime Database] Initialization error:', err);
      }
    } else {
      console.log('[Realtime Database] URL or service credentials not found. Using Firestore or memory fallback.');
    }
  }
  return rtdb;
}

// Helper to map DB row to frontend Order type
function mapRowToOrder(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    customerId: row.customer_id || undefined,
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurant_name,
    restaurantAddress: row.restaurant_address || '',
    items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    serviceFee: Number(row.service_fee || 0),
    vat: Number(row.vat || 0),
    tip: Number(row.tip || 0),
    discount: Number(row.discount || 0),
    promoCode: row.promo_code || undefined,
    total: Number(row.total),
    status: row.status,
    orderMode: row.order_mode || 'Delivery',
    paymentMethod: row.payment_method || 'Card',
    deliveryAddress: row.delivery_address || '',
    deliveryPostcode: row.delivery_postcode || row.postcode || '',
    driverName: row.driver_name || undefined,
    driverPhone: row.driver_phone || undefined,
    rated: !!row.rated,
    preparingStartedAt: row.preparing_started_at || undefined,
    cancelReason: row.cancel_reason || undefined,
    createdAt: row.created_at || new Date().toISOString()
  };
}

// Recompute pricing server-side from the trusted restaurant/menu catalog so a
// client can't submit an arbitrary total for its basket contents.
function computeServerTotal(
  restaurant: Restaurant,
  items: any[],
  deliveryPostcode: string,
  orderMode: 'Delivery' | 'Collection',
  tip: number,
  promoDiscountPercent: number
): { subtotal: number; deliveryFee: number; serviceFee: number; vat: number; discount: number; tip: number; total: number } | { error: string; expectedTotal?: number } {
  const zone = validateUKPostcode(deliveryPostcode || '');
  const deliveryMultiplier = zone?.deliveryMultiplier ?? 1;
  let subtotal = 0;
  for (const cartItem of items || []) {
    const menuItem = restaurant.menu.find(m => m.id === cartItem?.menuItem?.id);
    if (!menuItem) return { error: 'One or more items/customizations do not match the restaurant menu.' };
    const quantity = Number(cartItem.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) return { error: 'One or more items/customizations do not match the restaurant menu.' };

    let unitPrice = menuItem.price;
    // Variants are a distinct, absolute-price concept from customizations (see
    // MenuItemVariant) - if the dish has variants, the selected one's price
    // replaces the base price entirely rather than adding to it.
    if (menuItem.variants && menuItem.variants.length > 0) {
      const variant = menuItem.variants.find(v => v.name === cartItem.selectedVariant?.name);
      if (!variant) return { error: 'One or more items/customizations do not match the restaurant menu.' };
      unitPrice = variant.price;
    }
    for (const c of cartItem.customizations || []) {
      const option = menuItem.options?.find(o => o.name === c.name);
      const choice = option?.choices.find(ch => ch.name === c.selectedOption);
      // Unknown option/choice combos are rejected rather than silently trusted.
      if (option && !choice) return { error: 'One or more items/customizations do not match the restaurant menu.' };
      unitPrice += choice ? choice.price : Number(c.additionalPrice) || 0;
    }
    subtotal += unitPrice * quantity;
  }

  if (restaurant.enforceMinOrder && subtotal < restaurant.minOrder) {
    return { error: `This restaurant requires a minimum order of £${restaurant.minOrder.toFixed(2)} (basket is £${subtotal.toFixed(2)}).` };
  }

  const isCollection = orderMode === 'Collection';
  const deliveryFee = isCollection || restaurant.offersFreeDelivery ? 0 : Math.round((restaurant.deliveryFee * deliveryMultiplier) * 100) / 100;
  const serviceFee = subtotal > 0 ? Math.max(0.99, Math.round(subtotal * 0.05 * 100) / 100) : 0;
  const discount = promoDiscountPercent > 0 ? Math.round(subtotal * (promoDiscountPercent / 100) * 100) / 100 : 0;
  // NOT LEGALLY REVIEWED: informational breakdown only, mirrors prior behavior of not
  // being additive on top of the total (UK menu prices are typically VAT-inclusive
  // already) - needs finance/legal sign-off before launch either way.
  const vat = Math.round((subtotal - discount) * 0.2 * 100) / 100;
  const safeTip = Number.isFinite(tip) && tip > 0 ? Math.min(Math.round(tip * 100) / 100, 50) : 0;
  const total = Math.round((subtotal - discount + deliveryFee + serviceFee + safeTip) * 100) / 100;

  return { subtotal: Math.round(subtotal * 100) / 100, deliveryFee, serviceFee, vat, discount, tip: safeTip, total };
}

// Bootstrap PostgreSQL tables if connected
async function bootstrapPostgres() {
  const pool = getPgPool();
  if (!pool) return;

  try {
    const client = await pool.connect();
    console.log('[PostgreSQL] Bootstrapping orders schema...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        customer_name VARCHAR(100) NOT NULL,
        postcode VARCHAR(20) NOT NULL,
        restaurant_id VARCHAR(50) NOT NULL,
        restaurant_name VARCHAR(100) NOT NULL,
        items TEXT NOT NULL, -- JSON string array
        subtotal DECIMAL(10,2) NOT NULL,
        delivery_fee DECIMAL(10,2) NOT NULL,
        tip DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        driver_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure new columns are added if the table already existed
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS restaurant_address VARCHAR(255);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10,2);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS vat DECIMAL(10,2);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_postcode VARCHAR(20);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_phone VARCHAR(50);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id VARCHAR(100);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_mode VARCHAR(20) DEFAULT 'Delivery';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS rated BOOLEAN DEFAULT FALSE;
    `);

    console.log('[PostgreSQL] Bootstrapping restaurants/business-state schema...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id VARCHAR(50) PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS closed_restaurants (
        restaurant_id VARCHAR(50) PRIMARY KEY
      );
      CREATE TABLE IF NOT EXISTS out_of_stock_items (
        item_id VARCHAR(100) PRIMARY KEY
      );
      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        vehicle VARCHAR(50) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS client_errors (
        id SERIAL PRIMARY KEY,
        message TEXT,
        stack TEXT,
        source VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(50) PRIMARY KEY,
        phone VARCHAR(30) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token VARCHAR(64) PRIMARY KEY,
        customer_id VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS addresses (
        id VARCHAR(50) PRIMARY KEY,
        customer_id VARCHAR(50) NOT NULL,
        label VARCHAR(50) NOT NULL,
        address_line TEXT NOT NULL,
        postcode VARCHAR(20) NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(50) PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL,
        customer_id VARCHAR(50) NOT NULL,
        restaurant_id VARCHAR(50) NOT NULL,
        rating SMALLINT NOT NULL,
        comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS promo_codes (
        code VARCHAR(30) PRIMARY KEY,
        discount_percent SMALLINT NOT NULL,
        active BOOLEAN DEFAULT TRUE
      );
    `);

    // Ensure newer customer profile / review columns exist if these tables predate them
    await client.query(`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS name VARCHAR(100);
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS notify_order_updates BOOLEAN DEFAULT TRUE;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS notify_promotions BOOLEAN DEFAULT TRUE;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS mpin_hash VARCHAR(200);
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS courier_rating SMALLINT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'Card';
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS preparing_started_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(50) PRIMARY KEY,
        customer_id VARCHAR(50) NOT NULL,
        type VARCHAR(20) NOT NULL,
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        order_id VARCHAR(50),
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS support_messages (
        id VARCHAR(50) PRIMARY KEY,
        customer_id VARCHAR(50) NOT NULL,
        phone VARCHAR(30),
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const { rows: existingPromos } = await client.query('SELECT COUNT(*) FROM promo_codes;');
    if (Number(existingPromos[0].count) === 0) {
      await client.query('INSERT INTO promo_codes (code, discount_percent, active) VALUES ($1, $2, TRUE);', ['CHIPPY10', 10]);
      console.log('[PostgreSQL] Seeded default promo code CHIPPY10.');
    }

    // Seed the restaurant catalog from the static defaults on first run only.
    const { rows: existingRestaurants } = await client.query('SELECT COUNT(*) FROM restaurants;');
    if (Number(existingRestaurants[0].count) === 0) {
      for (const restaurant of UK_RESTAURANTS) {
        await client.query('INSERT INTO restaurants (id, data) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING;', [restaurant.id, JSON.stringify(restaurant)]);
      }
      console.log(`[PostgreSQL] Seeded ${UK_RESTAURANTS.length} default restaurants.`);
    }

    const { rows: existingDrivers } = await client.query('SELECT COUNT(*) FROM drivers;');
    if (Number(existingDrivers[0].count) === 0) {
      const defaultDrivers = [
        { name: 'Dave Henderson', phone: '+44 7700 900077', vehicle: 'Bicycle' },
        { name: 'Sarah Jenkins', phone: '+44 7700 911044', vehicle: 'Electric Scooter' },
        { name: 'Liam Fitzpatrick', phone: '+44 7700 900222', vehicle: 'Electric Scooter' }
      ];
      for (const driver of defaultDrivers) {
        await client.query('INSERT INTO drivers (name, phone, vehicle) VALUES ($1, $2, $3);', [driver.name, driver.phone, driver.vehicle]);
      }
      console.log(`[PostgreSQL] Seeded ${defaultDrivers.length} default drivers.`);
    }

    client.release();
    console.log('[PostgreSQL] Tables bootstrapped or verified successfully.');
  } catch (err) {
    console.error('[PostgreSQL] Error bootstrapping tables:', err);
  }
}

// Fetch the live restaurant catalog (Postgres-backed when available, static fallback otherwise).
async function getRestaurantCatalog(): Promise<Restaurant[]> {
  const pool = getPgPool();
  if (pool) {
    try {
      const result = await pool.query('SELECT data FROM restaurants ORDER BY created_at ASC;');
      if (result.rows.length > 0) {
        return result.rows.map(r => r.data as Restaurant);
      }
    } catch (err) {
      console.error('[PostgreSQL] Failed to fetch restaurant catalog, using memory/static fallback:', err);
    }
  }
  return memoryDb.restaurants;
}

// Resolves the authenticated customerId from a session token, never trusting a
// client-supplied customerId directly - closes the gap where anyone who knew/
// guessed a customerId string could read another customer's orders/addresses.
async function getSessionCustomerId(req: express.Request): Promise<string | null> {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  const pool = getPgPool();
  if (pool) {
    try {
      const result = await pool.query('SELECT customer_id FROM sessions WHERE token = $1;', [token]);
      return result.rows[0]?.customer_id || null;
    } catch (err) {
      console.error('[PostgreSQL] Failed to resolve session, using memory fallback:', err);
    }
  }
  return memoryDb.sessions[token] || null;
}

async function getPromoDiscount(code: string | undefined): Promise<{ code: string; discountPercent: number } | null> {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  const pool = getPgPool();
  if (pool) {
    try {
      const result = await pool.query('SELECT discount_percent FROM promo_codes WHERE code = $1 AND active = TRUE;', [normalized]);
      if (result.rows.length > 0) {
        return { code: normalized, discountPercent: Number(result.rows[0].discount_percent) };
      }
      return null;
    } catch (err) {
      console.error('[PostgreSQL] Failed to validate promo code, using memory fallback:', err);
    }
  }
  const discountPercent = memoryDb.promoCodes[normalized];
  return discountPercent ? { code: normalized, discountPercent } : null;
}

// Live-order-update fanout: connected SSE clients get pushed to instantly (this
// server instance), and every update is also mirrored to Firebase Realtime
// Database so it's durable and reaches clients connected to a different
// instance if this ever scales out horizontally. Replaces 3s client polling.
const sseClients = new Map<string, Set<express.Response>>();

function broadcastOrderUpdate(customerId: string, order: any) {
  const clients = sseClients.get(customerId);
  if (clients && clients.size > 0) {
    const payload = `data: ${JSON.stringify({ orders: [order] })}\n\n`;
    clients.forEach(res => res.write(payload));
  }
  const rtdbInstance = getRtdb();
  if (rtdbInstance) {
    rtdbInstance.ref(`orderUpdates/${customerId}/${order.id}`).set({
      id: order.id,
      status: order.status,
      driverName: order.driverName || null,
      driverPhone: order.driverPhone || null,
      updatedAt: new Date().toISOString()
    }).catch((err: any) => console.error('[RTDB] Failed to mirror order update:', err));
  }
}

// Creates a real, per-customer, DB-backed notification - but only if that customer
// currently has the relevant preference enabled (notify_order_updates for order
// events, notify_promotions for marketing/promo events). Replaces the old static
// hardcoded promo banner with an actually-targeted notification system.
async function createNotificationIfEnabled(customerId: string, type: 'order' | 'promo', title: string, body: string, orderId?: string) {
  const pool = getPgPool();
  let notifyOrderUpdates = true;
  let notifyPromotions = true;

  if (pool) {
    try {
      const result = await pool.query('SELECT notify_order_updates, notify_promotions FROM customers WHERE id = $1;', [customerId]);
      if (result.rows[0]) {
        notifyOrderUpdates = result.rows[0].notify_order_updates !== false;
        notifyPromotions = result.rows[0].notify_promotions !== false;
      }
    } catch (err) {
      console.error('[PostgreSQL] Failed to load notification prefs, defaulting to enabled:', err);
    }
  } else {
    const customer = memoryDb.customers.find(c => c.id === customerId);
    if (customer) {
      notifyOrderUpdates = customer.notifyOrderUpdates !== false;
      notifyPromotions = customer.notifyPromotions !== false;
    }
  }

  const allowed = type === 'order' ? notifyOrderUpdates : notifyPromotions;
  if (!allowed) return;

  const id = randomUUID().replace(/-/g, '').slice(0, 12);
  if (pool) {
    try {
      await pool.query(
        'INSERT INTO notifications (id, customer_id, type, title, body, order_id) VALUES ($1, $2, $3, $4, $5, $6);',
        [id, customerId, type, title, body, orderId || null]
      );
      return;
    } catch (err) {
      console.error('[PostgreSQL] Failed to insert notification, using memory fallback:', err);
    }
  }
  memoryDb.notifications.push({ id, customerId, type, title, body, orderId, read: false, createdAt: new Date().toISOString() });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Enable CORS for native Capacitor webviews and direct API access
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Bootstrap Postgres database
  await bootstrapPostgres();

  // API Route: Create/Submit Order (Saves to Postgres, with Fallback to local memory)
  app.post('/api/orders', async (req, res) => {
    // Orders require a logged-in customer - the server derives identity from the
    // session token rather than trusting a client-supplied customerId.
    const sessionCustomerId = await getSessionCustomerId(req);
    if (!sessionCustomerId) {
      return res.status(401).json({ error: 'Please log in to place an order.' });
    }

    const {
      customerName,
      restaurantId,
      restaurantName,
      restaurantAddress,
      items,
      status,
      orderMode,
      deliveryAddress,
      deliveryPostcode,
      postcode,
      driverName,
      driverPhone,
      tip,
      promoCode,
      paymentMethod
    } = req.body;
    const resolvedPaymentMethod: 'Card' | 'Cash' = paymentMethod === 'Cash' ? 'Cash' : 'Card';

    if (!restaurantId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing order specifications: restaurantId and at least one item are required.' });
    }
    // The server assigns the order id itself - trusting a client-supplied id would let
    // a caller guess/reuse another order's id and hijack it via the upsert below.
    const id = randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
    const resolvedOrderMode: 'Delivery' | 'Collection' = orderMode === 'Collection' ? 'Collection' : 'Delivery';

    // Recompute pricing from the trusted catalog rather than accepting the client's numbers -
    // a tampered basket total (or a total for items that don't exist) is rejected outright.
    const catalog = await getRestaurantCatalog();
    const restaurant = catalog.find(r => r.id === restaurantId);
    if (!restaurant) {
      return res.status(400).json({ error: `Unknown restaurantId "${restaurantId}".` });
    }
    const promo = await getPromoDiscount(promoCode);
    const computed = computeServerTotal(restaurant, items, deliveryPostcode || postcode || '', resolvedOrderMode, Number(tip) || 0, promo?.discountPercent || 0);
    if ('error' in computed) {
      return res.status(400).json(computed);
    }
    const clientTotal = Number(req.body.total);
    if (!Number.isFinite(clientTotal) || Math.abs(clientTotal - computed.total) > 0.02) {
      return res.status(400).json({ error: 'Submitted total does not match the server-computed price for this basket.', expectedTotal: computed.total });
    }
    const { subtotal, deliveryFee, serviceFee, vat, discount, tip: safeTip, total } = computed;

    const pool = getPgPool();
    if (pool) {
      try {
        const queryText = `
          INSERT INTO orders (
            id, customer_id, customer_name, restaurant_id, restaurant_name, restaurant_address,
            items, subtotal, delivery_fee, service_fee, vat, tip, discount, promo_code, total, status,
            order_mode, delivery_address, delivery_postcode, driver_name, driver_phone, postcode, payment_method
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            driver_name = COALESCE(EXCLUDED.driver_name, orders.driver_name),
            driver_phone = COALESCE(EXCLUDED.driver_phone, orders.driver_phone),
            updated_at = CURRENT_TIMESTAMP
          RETURNING *;
        `;
        const values = [
          id,
          sessionCustomerId,
          customerName || 'Anonymous',
          restaurantId,
          restaurantName,
          restaurantAddress || '',
          JSON.stringify(items || []),
          subtotal,
          deliveryFee,
          serviceFee,
          vat,
          safeTip,
          discount,
          promo?.code || null,
          total,
          status || 'Placed',
          resolvedOrderMode,
          deliveryAddress || '',
          deliveryPostcode || postcode || '',
          driverName || null,
          driverPhone || null,
          postcode || deliveryPostcode || '',
          resolvedPaymentMethod
        ];
        const result = await pool.query(queryText, values);
        console.log(`[PostgreSQL] Order created/updated successfully: #${id}`);
        const order = mapRowToOrder(result.rows[0]);
        broadcastOrderUpdate(sessionCustomerId, order);
        createNotificationIfEnabled(sessionCustomerId, 'order', 'Order placed', `Your order from ${restaurantName} has been placed (#${id}).`, id).catch(() => {});
        return res.json({ success: true, order, source: 'postgres' });
      } catch (err) {
        console.error('[PostgreSQL] Error inserting order, resorting to memory fallback:', err);
      }
    }

    // In-Memory fallback behavior
    const existingIdx = memoryDb.orders.findIndex(o => o.id === id);
    const orderData = {
      id,
      customerId: sessionCustomerId,
      customerName,
      restaurantId,
      restaurantName,
      restaurantAddress,
      items,
      subtotal,
      deliveryFee,
      serviceFee,
      vat,
      tip: safeTip,
      discount,
      promoCode: promo?.code,
      total,
      status: status || 'Placed',
      orderMode: resolvedOrderMode,
      paymentMethod: resolvedPaymentMethod,
      deliveryAddress,
      deliveryPostcode,
      driverName,
      driverPhone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (existingIdx >= 0) {
      memoryDb.orders[existingIdx] = { ...memoryDb.orders[existingIdx], ...orderData };
    } else {
      memoryDb.orders.push(orderData);
    }
    console.log(`[MemoryStore] Order updated: #${id} (${status})`);
    broadcastOrderUpdate(sessionCustomerId, orderData);
    createNotificationIfEnabled(sessionCustomerId, 'order', 'Order placed', `Your order from ${restaurantName} has been placed (#${id}).`, id).catch(() => {});
    return res.json({ success: true, order: orderData, source: 'memory' });
  });

  // API Route: Update Order Status / Assign Driver (Saves to Postgres, with Fallback)
  app.patch('/api/orders/:id', async (req, res) => {
    const { id } = req.params;
    const { status, driverName, driverPhone, cancelReason } = req.body;
    const statusLabels: Record<string, string> = {
      Preparing: 'is being prepared by the restaurant',
      ReadyForPickup: 'is ready and awaiting courier pickup',
      DriverArrived: "your courier has arrived at the restaurant",
      PickedUp: 'has been picked up by your courier',
      OutForDelivery: 'is out for delivery',
      Delivered: 'has been delivered',
      Cancelled: 'was cancelled'
    };
    const notificationBody = (status: string) =>
      status === 'Cancelled' && cancelReason
        ? `Order #${id} was cancelled by the restaurant: ${cancelReason}`
        : `Order #${id} ${statusLabels[status]}.`;

    const pool = getPgPool();
    if (pool) {
      try {
        const queryText = `
          UPDATE orders
          SET status = COALESCE($1, status),
              driver_name = COALESCE($2, driver_name),
              driver_phone = COALESCE($3, driver_phone),
              cancel_reason = COALESCE($4, cancel_reason),
              preparing_started_at = CASE WHEN $1 = 'Preparing' THEN CURRENT_TIMESTAMP ELSE preparing_started_at END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
          RETURNING *;
        `;
        const result = await pool.query(queryText, [status || null, driverName || null, driverPhone || null, cancelReason || null, id]);
        if (result.rows.length > 0) {
          console.log(`[PostgreSQL] Status updated for Order #${id}: ${status}`);
          const order = mapRowToOrder(result.rows[0]);
          if (order.customerId) broadcastOrderUpdate(order.customerId, order);
          if (order.customerId && status && statusLabels[status]) {
            createNotificationIfEnabled(order.customerId, 'order', 'Order update', notificationBody(status), id).catch(() => {});
          }
          return res.json({ success: true, order, source: 'postgres' });
        }
      } catch (err) {
        console.error('[PostgreSQL] Error updating order status, reverting to memory fallback:', err);
      }
    }

    // Memory fallback update
    const order = memoryDb.orders.find(o => o.id === id);
    if (order) {
      if (status) order.status = status;
      if (driverName !== undefined) order.driverName = driverName;
      if (driverPhone !== undefined) order.driverPhone = driverPhone;
      if (cancelReason !== undefined) order.cancelReason = cancelReason;
      if (status === 'Preparing' && !order.preparingStartedAt) order.preparingStartedAt = new Date().toISOString();
      order.updatedAt = new Date().toISOString();
      console.log(`[MemoryStore] Status updated for Order #${id}: ${status}`);
      if (order.customerId) broadcastOrderUpdate(order.customerId, order);
      if (order.customerId && status && statusLabels[status]) {
        createNotificationIfEnabled(order.customerId, 'order', 'Order update', notificationBody(status), id).catch(() => {});
      }
      return res.json({ success: true, order, source: 'memory' });
    }

    return res.status(444).json({ error: 'Order not found in memory database.' });
  });

  // API Route: Fetch Orders. A valid session scopes results to that customer only
  // (the customer app never trusts a client-supplied customerId) - the unscoped
  // "all orders" view stays available, unauthenticated, for the Business/Road
  // King/Admin operational apps which don't have their own auth system yet.
  app.get('/api/orders', async (req, res) => {
    const sessionCustomerId = await getSessionCustomerId(req);
    const queryCustomerId = typeof req.query.customerId === 'string' ? req.query.customerId : undefined;
    const customerId = sessionCustomerId || queryCustomerId;
    const limit = 100;
    const pool = getPgPool();
    if (pool) {
      try {
        const result = customerId
          ? await pool.query('SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT $2;', [customerId, limit])
          : await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT $1;', [limit]);
        const mapped = result.rows.map(mapRowToOrder);
        return res.json({ orders: mapped, source: 'postgres' });
      } catch (err) {
        console.error('[PostgreSQL] Error fetching orders, using memory fallback:', err);
      }
    }
    const memoryOrders = customerId ? memoryDb.orders.filter(o => o.customerId === customerId) : memoryDb.orders;
    return res.json({ orders: memoryOrders, source: 'memory' });
  });

  // API Route: Delete all orders (Flush database).
  // Destructive and unauthenticated by design (sandbox reset button) - disabled outside
  // of local/dev usage so it can't be called against the live production deployment.
  app.delete('/api/orders', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Bulk order deletion is disabled in production.' });
    }
    const pool = getPgPool();
    if (pool) {
      try {
        await pool.query('DELETE FROM orders;');
        console.log('[PostgreSQL] Database flushed.');
        return res.json({ success: true, source: 'postgres' });
      } catch (err) {
        console.error('[PostgreSQL] Error flushing orders:', err);
      }
    }
    memoryDb.orders = [];
    console.log('[MemoryStore] Database flushed.');
    return res.json({ success: true, source: 'memory' });
  });

  // API Route: Telemetry Stream (Saves live coordinates to Firestore or Realtime Database, with Memory Fallback)
  app.post('/api/telemetry', async (req, res) => {
    const { orderId, driverName, lat, lng } = req.body;

    if (!orderId || !lat || !lng) {
      return res.status(400).json({ error: 'Missing telemetry specifications.' });
    }

    const firestore = getFirestore();
    const rtdbInstance = getRtdb();
    const timestamp = new Date().toISOString();
    const telemetryData = { orderId, driverName: driverName || 'Courier', lat, lng, updatedAt: timestamp };

    if (firestore) {
      try {
        await firestore.collection('telemetry').doc(orderId).set(telemetryData);
        console.log(`[Firestore] Streamed location for Order #${orderId} successfully.`);
        return res.json({ success: true, telemetry: telemetryData, source: 'firestore' });
      } catch (err) {
        console.error('[Firestore] Stream failed, trying Realtime Database or fallback:', err);
      }
    }

    if (rtdbInstance) {
      try {
        await rtdbInstance.ref(`telemetry/${orderId}`).set(telemetryData);
        console.log(`[Realtime Database] Streamed location for Order #${orderId} successfully.`);
        return res.json({ success: true, telemetry: telemetryData, source: 'rtdb' });
      } catch (err) {
        console.error('[Realtime Database] Stream failed, using memory fallback:', err);
      }
    }

    // Memory fallback channel
    memoryDb.telemetry[orderId] = telemetryData;
    return res.json({ success: true, telemetry: telemetryData, source: 'memory' });
  });

  // API Route: Fetch live driver location
  app.get('/api/telemetry/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const firestore = getFirestore();
    const rtdbInstance = getRtdb();

    if (firestore) {
      try {
        const doc = await firestore.collection('telemetry').doc(orderId).get();
        if (doc.exists) {
          return res.json({ telemetry: doc.data(), source: 'firestore' });
        }
      } catch (err) {
        console.error('[Firestore] Get failed, trying Realtime Database or fallback:', err);
      }
    }

    if (rtdbInstance) {
      try {
        const snapshot = await rtdbInstance.ref(`telemetry/${orderId}`).once('value');
        if (snapshot.exists()) {
          return res.json({ telemetry: snapshot.val(), source: 'rtdb' });
        }
      } catch (err) {
        console.error('[Realtime Database] Get failed, using memory fallback:', err);
      }
    }

    const telemetry = memoryDb.telemetry[orderId];
    if (telemetry) {
      return res.json({ telemetry, source: 'memory' });
    }
    return res.status(404).json({ error: 'No live telemetry found for this order.' });
  });

  // API Route: Fetch the restaurant catalog plus shared closed/out-of-stock business state,
  // so merchant changes on one device are visible to every customer instead of being
  // trapped in that one browser's localStorage.
  app.get('/api/restaurants', async (req, res) => {
    const restaurants = await getRestaurantCatalog();
    const pool = getPgPool();
    if (pool) {
      try {
        const [closedResult, outOfStockResult] = await Promise.all([
          pool.query('SELECT restaurant_id FROM closed_restaurants;'),
          pool.query('SELECT item_id FROM out_of_stock_items;'),
        ]);
        return res.json({
          restaurants,
          closedRestaurants: closedResult.rows.map(r => r.restaurant_id),
          outOfStockItems: outOfStockResult.rows.map(r => r.item_id),
          source: 'postgres'
        });
      } catch (err) {
        console.error('[PostgreSQL] Error fetching business state, using memory fallback:', err);
      }
    }
    return res.json({
      restaurants,
      closedRestaurants: memoryDb.closedRestaurants,
      outOfStockItems: memoryDb.outOfStockItems,
      source: 'memory'
    });
  });

  // API Route: Onboard a new restaurant (Business App)
  app.post('/api/restaurants', async (req, res) => {
    const restaurant = req.body as Restaurant;
    if (!restaurant?.id || !restaurant?.name) {
      return res.status(400).json({ error: 'Missing restaurant id/name.' });
    }
    const pool = getPgPool();
    if (pool) {
      try {
        await pool.query('INSERT INTO restaurants (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;', [restaurant.id, JSON.stringify(restaurant)]);
        return res.json({ success: true, source: 'postgres' });
      } catch (err) {
        console.error('[PostgreSQL] Error onboarding restaurant, using memory fallback:', err);
      }
    }
    memoryDb.restaurants = [restaurant, ...memoryDb.restaurants.filter(r => r.id !== restaurant.id)];
    return res.json({ success: true, source: 'memory' });
  });

  // API Route: Add a dish to an existing restaurant's menu (Business App)
  app.post('/api/restaurants/:id/menu', async (req, res) => {
    const { id } = req.params;
    const menuItem = req.body as MenuItem;
    if (!menuItem?.id || !menuItem?.name) {
      return res.status(400).json({ error: 'Missing menu item id/name.' });
    }
    const pool = getPgPool();
    if (pool) {
      try {
        const result = await pool.query('SELECT data FROM restaurants WHERE id = $1;', [id]);
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Restaurant not found.' });
        }
        const restaurant = result.rows[0].data as Restaurant;
        restaurant.menu = [...restaurant.menu, menuItem];
        await pool.query('UPDATE restaurants SET data = $1 WHERE id = $2;', [JSON.stringify(restaurant), id]);
        return res.json({ success: true, restaurant, source: 'postgres' });
      } catch (err) {
        console.error('[PostgreSQL] Error adding dish, using memory fallback:', err);
      }
    }
    const restaurant = memoryDb.restaurants.find(r => r.id === id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found.' });
    }
    restaurant.menu = [...restaurant.menu, menuItem];
    return res.json({ success: true, restaurant, source: 'memory' });
  });

  // API Route: Toggle a restaurant open/closed (Business App)
  app.post('/api/restaurants/:id/toggle-closed', async (req, res) => {
    const { id } = req.params;
    const pool = getPgPool();
    if (pool) {
      try {
        const existing = await pool.query('SELECT 1 FROM closed_restaurants WHERE restaurant_id = $1;', [id]);
        let isClosed: boolean;
        if (existing.rows.length > 0) {
          await pool.query('DELETE FROM closed_restaurants WHERE restaurant_id = $1;', [id]);
          isClosed = false;
        } else {
          await pool.query('INSERT INTO closed_restaurants (restaurant_id) VALUES ($1) ON CONFLICT DO NOTHING;', [id]);
          isClosed = true;
        }
        return res.json({ success: true, isClosed, source: 'postgres' });
      } catch (err) {
        console.error('[PostgreSQL] Error toggling closed state, using memory fallback:', err);
      }
    }
    const isClosed = memoryDb.closedRestaurants.includes(id);
    memoryDb.closedRestaurants = isClosed ? memoryDb.closedRestaurants.filter(r => r !== id) : [...memoryDb.closedRestaurants, id];
    return res.json({ success: true, isClosed: !isClosed, source: 'memory' });
  });

  // ===== Store Management: Holiday Settings & Temporary Pause (Business App) =====
  // Distinct from the manual open/closed toggle above - these are time-bound
  // closures the merchant schedules in advance (holiday) or triggers briefly
  // (pause), and they auto-lift once the date/time passes.

  app.post('/api/restaurants/:id/holiday', async (req, res) => {
    const { id } = req.params;
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ error: 'startDate and endDate are required as YYYY-MM-DD.' });
    }
    const pool = getPgPool();
    if (pool) {
      try {
        const result = await pool.query('SELECT data FROM restaurants WHERE id = $1;', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Restaurant not found.' });
        const restaurant = result.rows[0].data as Restaurant;
        restaurant.holidayStart = startDate;
        restaurant.holidayEnd = endDate;
        await pool.query('UPDATE restaurants SET data = $1 WHERE id = $2;', [JSON.stringify(restaurant), id]);
        return res.json({ success: true, restaurant, source: 'postgres' });
      } catch (err) {
        console.error('[PostgreSQL] Error setting holiday, using memory fallback:', err);
      }
    }
    const restaurant = memoryDb.restaurants.find(r => r.id === id) || UK_RESTAURANTS.find(r => r.id === id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found.' });
    restaurant.holidayStart = startDate;
    restaurant.holidayEnd = endDate;
    return res.json({ success: true, restaurant, source: 'memory' });
  });

  app.delete('/api/restaurants/:id/holiday', async (req, res) => {
    const { id } = req.params;
    const pool = getPgPool();
    if (pool) {
      try {
        const result = await pool.query('SELECT data FROM restaurants WHERE id = $1;', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Restaurant not found.' });
        const restaurant = result.rows[0].data as Restaurant;
        delete restaurant.holidayStart;
        delete restaurant.holidayEnd;
        await pool.query('UPDATE restaurants SET data = $1 WHERE id = $2;', [JSON.stringify(restaurant), id]);
        return res.json({ success: true, restaurant, source: 'postgres' });
      } catch (err) {
        console.error('[PostgreSQL] Error clearing holiday, using memory fallback:', err);
      }
    }
    const restaurant = memoryDb.restaurants.find(r => r.id === id) || UK_RESTAURANTS.find(r => r.id === id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found.' });
    delete restaurant.holidayStart;
    delete restaurant.holidayEnd;
    return res.json({ success: true, restaurant, source: 'memory' });
  });

  app.post('/api/restaurants/:id/pause', async (req, res) => {
    const { id } = req.params;
    const minutes = Number(req.body?.minutes);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 24 * 60) {
      return res.status(400).json({ error: 'minutes must be a positive number up to 1440.' });
    }
    const pausedUntil = new Date(Date.now() + minutes * 60000).toISOString();
    const pool = getPgPool();
    if (pool) {
      try {
        const result = await pool.query('SELECT data FROM restaurants WHERE id = $1;', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Restaurant not found.' });
        const restaurant = result.rows[0].data as Restaurant;
        restaurant.pausedUntil = pausedUntil;
        await pool.query('UPDATE restaurants SET data = $1 WHERE id = $2;', [JSON.stringify(restaurant), id]);
        return res.json({ success: true, restaurant, source: 'postgres' });
      } catch (err) {
        console.error('[PostgreSQL] Error setting pause, using memory fallback:', err);
      }
    }
    const restaurant = memoryDb.restaurants.find(r => r.id === id) || UK_RESTAURANTS.find(r => r.id === id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found.' });
    restaurant.pausedUntil = pausedUntil;
    return res.json({ success: true, restaurant, source: 'memory' });
  });

  app.delete('/api/restaurants/:id/pause', async (req, res) => {
    const { id } = req.params;
    const pool = getPgPool();
    if (pool) {
      try {
        const result = await pool.query('SELECT data FROM restaurants WHERE id = $1;', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Restaurant not found.' });
        const restaurant = result.rows[0].data as Restaurant;
        delete restaurant.pausedUntil;
        await pool.query('UPDATE restaurants SET data = $1 WHERE id = $2;', [JSON.stringify(restaurant), id]);
        return res.json({ success: true, restaurant, source: 'postgres' });
      } catch (err) {
        console.error('[PostgreSQL] Error clearing pause, using memory fallback:', err);
      }
    }
    const restaurant = memoryDb.restaurants.find(r => r.id === id) || UK_RESTAURANTS.find(r => r.id === id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found.' });
    delete restaurant.pausedUntil;
    return res.json({ success: true, restaurant, source: 'memory' });
  });

  // API Route: Real average rating + review count computed from actual reviews
  // (Business App Reports) - falls back to the restaurant's static seeded rating
  // when it has no reviews yet, so a brand-new listing doesn't show a blank 0.
  app.get('/api/restaurants/:id/rating-summary', async (req, res) => {
    const { id } = req.params;
    const pool = getPgPool();
    if (pool) {
      try {
        const result = await pool.query('SELECT AVG(rating)::float AS avg_rating, COUNT(*)::int AS count FROM reviews WHERE restaurant_id = $1;', [id]);
        const row = result.rows[0];
        if (row && Number(row.count) > 0) {
          return res.json({ averageRating: Math.round(Number(row.avg_rating) * 10) / 10, totalReviews: Number(row.count), computed: true });
        }
      } catch (err) {
        console.error('[PostgreSQL] Error computing rating summary, using memory fallback:', err);
      }
    }
    const reviews = memoryDb.reviews.filter(r => r.restaurantId === id);
    if (reviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      return res.json({ averageRating: Math.round(avg * 10) / 10, totalReviews: reviews.length, computed: true });
    }
    const catalog = await getRestaurantCatalog();
    const restaurant = catalog.find(r => r.id === id);
    return res.json({ averageRating: restaurant?.rating ?? 0, totalReviews: restaurant?.reviewsCount ?? 0, computed: false });
  });

  // API Route: Toggle a menu item's stock status (Business App)
  app.post('/api/menu-items/:itemId/toggle-stock', async (req, res) => {
    const { itemId } = req.params;
    const pool = getPgPool();
    if (pool) {
      try {
        const existing = await pool.query('SELECT 1 FROM out_of_stock_items WHERE item_id = $1;', [itemId]);
        let isOutOfStock: boolean;
        if (existing.rows.length > 0) {
          await pool.query('DELETE FROM out_of_stock_items WHERE item_id = $1;', [itemId]);
          isOutOfStock = false;
        } else {
          await pool.query('INSERT INTO out_of_stock_items (item_id) VALUES ($1) ON CONFLICT DO NOTHING;', [itemId]);
          isOutOfStock = true;
        }
        return res.json({ success: true, isOutOfStock, source: 'postgres' });
      } catch (err) {
        console.error('[PostgreSQL] Error toggling stock state, using memory fallback:', err);
      }
    }
    const isOutOfStock = memoryDb.outOfStockItems.includes(itemId);
    memoryDb.outOfStockItems = isOutOfStock ? memoryDb.outOfStockItems.filter(i => i !== itemId) : [...memoryDb.outOfStockItems, itemId];
    return res.json({ success: true, isOutOfStock: !isOutOfStock, source: 'memory' });
  });

  // API Route: Fetch/onboard delivery drivers (Road King App)
  app.get('/api/drivers', async (req, res) => {
    const pool = getPgPool();
    if (pool) {
      try {
        const result = await pool.query('SELECT name, phone, vehicle FROM drivers ORDER BY id ASC;');
        return res.json({ drivers: result.rows, source: 'postgres' });
      } catch (err) {
        console.error('[PostgreSQL] Error fetching drivers, using memory fallback:', err);
      }
    }
    return res.json({ drivers: memoryDb.drivers, source: 'memory' });
  });

  app.post('/api/drivers', async (req, res) => {
    const { name, phone, vehicle } = req.body;
    if (!name || !phone || !vehicle) {
      return res.status(400).json({ error: 'Missing driver name/phone/vehicle.' });
    }
    const pool = getPgPool();
    if (pool) {
      try {
        await pool.query('INSERT INTO drivers (name, phone, vehicle) VALUES ($1, $2, $3);', [name, phone, vehicle]);
        return res.json({ success: true, source: 'postgres' });
      } catch (err) {
        console.error('[PostgreSQL] Error onboarding driver, using memory fallback:', err);
      }
    }
    memoryDb.drivers = [...memoryDb.drivers, { name, phone, vehicle }];
    return res.json({ success: true, source: 'memory' });
  });

  // API Route: Lightweight client-side error logging (no third-party crash reporting
  // service required - just persists what broke and where for later triage).
  app.post('/api/client-errors', async (req, res) => {
    const { message, stack, source } = req.body;
    console.error(`[ClientError] ${source || 'unknown'}: ${message}`);
    const pool = getPgPool();
    if (pool) {
      try {
        await pool.query('INSERT INTO client_errors (message, stack, source) VALUES ($1, $2, $3);', [message || '', stack || '', source || '']);
      } catch (err) {
        console.error('[PostgreSQL] Failed to persist client error:', err);
      }
    }
    return res.json({ success: true });
  });

  // ===== Phone + OTP auth (demo mode: no Twilio/SMS - fixed whitelist + fixed OTP) =====

  app.post('/api/auth/request-otp', async (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    if (!DEMO_PHONE_NUMBERS.includes(phone)) {
      return res.status(400).json({ error: 'This demo only accepts the provided demo phone numbers.', demoNumbers: DEMO_PHONE_NUMBERS });
    }
    // No real SMS is sent - the OTP is fixed and shown in the UI for demo/testing purposes.
    return res.json({ success: true, demoOtp: DEMO_OTP });
  });

  app.post('/api/auth/verify-otp', async (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    const otp = String(req.body?.otp || '');
    if (!DEMO_PHONE_NUMBERS.includes(phone) || otp !== DEMO_OTP) {
      return res.status(401).json({ error: 'Invalid phone number or OTP.' });
    }

    const sessionToken = randomUUID().replace(/-/g, '');
    const pool = getPgPool();
    if (pool) {
      try {
        const existing = await pool.query('SELECT id FROM customers WHERE phone = $1;', [phone]);
        let customerId: string;
        let isNewCustomer = false;
        if (existing.rows.length > 0) {
          customerId = existing.rows[0].id;
        } else {
          customerId = randomUUID().replace(/-/g, '').slice(0, 16);
          await pool.query('INSERT INTO customers (id, phone) VALUES ($1, $2);', [customerId, phone]);
          isNewCustomer = true;
        }
        await pool.query('INSERT INTO sessions (token, customer_id) VALUES ($1, $2);', [sessionToken, customerId]);
        if (isNewCustomer) {
          createNotificationIfEnabled(customerId, 'promo', 'Welcome to Go-Zoon!', 'Use code CHIPPY10 for 10% off your first order.').catch(() => {});
        }
        return res.json({ success: true, customerId, phone, sessionToken });
      } catch (err) {
        console.error('[PostgreSQL] Error during OTP verification, using memory fallback:', err);
      }
    }

    let customer = memoryDb.customers.find(c => c.phone === phone);
    if (!customer) {
      customer = { id: randomUUID().replace(/-/g, '').slice(0, 16), phone };
      memoryDb.customers.push(customer);
      createNotificationIfEnabled(customer.id, 'promo', 'Welcome to Go-Zoon!', 'Use code CHIPPY10 for 10% off your first order.').catch(() => {});
    }
    memoryDb.sessions[sessionToken] = customer.id;
    return res.json({ success: true, customerId: customer.id, phone, sessionToken });
  });

  // ===== MPIN (local quick-login PIN, fully self-contained - no SMS/3rd-party) =====

  const isValidMpin = (mpin: unknown): mpin is string => typeof mpin === 'string' && /^\d{4,6}$/.test(mpin);

  app.post('/api/auth/mpin/set', async (req, res) => {
    const customerId = await getSessionCustomerId(req);
    if (!customerId) return res.status(401).json({ error: 'Please log in.' });
    const { mpin } = req.body;
    if (!isValidMpin(mpin)) {
      return res.status(400).json({ error: 'MPIN must be 4-6 digits.' });
    }
    const mpinHash = hashMpin(mpin);
    const pool = getPgPool();
    if (pool) {
      try {
        await pool.query('UPDATE customers SET mpin_hash = $1 WHERE id = $2;', [mpinHash, customerId]);
        return res.json({ success: true });
      } catch (err) {
        console.error('[PostgreSQL] Error setting MPIN, using memory fallback:', err);
      }
    }
    const customer = memoryDb.customers.find(c => c.id === customerId);
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });
    customer.mpinHash = mpinHash;
    return res.json({ success: true });
  });

  app.delete('/api/auth/mpin', async (req, res) => {
    const customerId = await getSessionCustomerId(req);
    if (!customerId) return res.status(401).json({ error: 'Please log in.' });
    const pool = getPgPool();
    if (pool) {
      try {
        await pool.query('UPDATE customers SET mpin_hash = NULL WHERE id = $1;', [customerId]);
        return res.json({ success: true });
      } catch (err) {
        console.error('[PostgreSQL] Error removing MPIN, using memory fallback:', err);
      }
    }
    const customer = memoryDb.customers.find(c => c.id === customerId);
    if (customer) customer.mpinHash = null;
    return res.json({ success: true });
  });

  app.post('/api/auth/mpin/login', async (req, res) => {
    const phone = normalizePhone(req.body?.phone);
    const mpin = String(req.body?.mpin || '');
    if (!phone || !isValidMpin(mpin)) {
      return res.status(400).json({ error: 'A phone number and 4-6 digit MPIN are required.' });
    }

    const sessionToken = randomUUID().replace(/-/g, '');
    const pool = getPgPool();
    if (pool) {
      try {
        const result = await pool.query('SELECT id, mpin_hash FROM customers WHERE phone = $1;', [phone]);
        const row = result.rows[0];
        if (!row || !verifyMpin(mpin, row.mpin_hash)) {
          return res.status(401).json({ error: 'Incorrect phone number or MPIN.' });
        }
        await pool.query('INSERT INTO sessions (token, customer_id) VALUES ($1, $2);', [sessionToken, row.id]);
        return res.json({ success: true, customerId: row.id, phone, sessionToken });
      } catch (err) {
        console.error('[PostgreSQL] Error during MPIN login, using memory fallback:', err);
      }
    }
    const customer = memoryDb.customers.find(c => c.phone === phone);
    if (!customer || !verifyMpin(mpin, customer.mpinHash)) {
      return res.status(401).json({ error: 'Incorrect phone number or MPIN.' });
    }
    memoryDb.sessions[sessionToken] = customer.id;
    return res.json({ success: true, customerId: customer.id, phone, sessionToken });
  });

  // ===== Delete account =====

  app.delete('/api/customers/me', async (req, res) => {
    const customerId = await getSessionCustomerId(req);
    if (!customerId) return res.status(401).json({ error: 'Please log in.' });
    const pool = getPgPool();
    if (pool) {
      try {
        await pool.query('DELETE FROM sessions WHERE customer_id = $1;', [customerId]);
        await pool.query('DELETE FROM addresses WHERE customer_id = $1;', [customerId]);
        await pool.query('DELETE FROM notifications WHERE customer_id = $1;', [customerId]);
        await pool.query('DELETE FROM customers WHERE id = $1;', [customerId]);
        return res.json({ success: true });
      } catch (err) {
        console.error('[PostgreSQL] Error deleting account, using memory fallback:', err);
      }
    }
    memoryDb.customers = memoryDb.customers.filter(c => c.id !== customerId);
    memoryDb.addresses = memoryDb.addresses.filter(a => a.customerId !== customerId);
    memoryDb.notifications = memoryDb.notifications.filter(n => n.customerId !== customerId);
    Object.keys(memoryDb.sessions).forEach(token => {
      if (memoryDb.sessions[token] === customerId) delete memoryDb.sessions[token];
    });
    return res.json({ success: true });
  });

  // Validates a stored session token on app launch so a customer stays logged in.
  app.get('/api/auth/me', async (req, res) => {
    const customerId = await getSessionCustomerId(req);
    if (!customerId) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }
    const pool = getPgPool();
    if (pool) {
      try {
        const result = await pool.query('SELECT phone FROM customers WHERE id = $1;', [customerId]);
        return res.json({ customerId, phone: result.rows[0]?.phone });
      } catch (err) {
        console.error('[PostgreSQL] Error resolving customer, using memory fallback:', err);
      }
    }
    const customer = memoryDb.customers.find(c => c.id === customerId);
    return res.json({ customerId, phone: customer?.phone });
  });

  // ===== Customer profile (name + notification preferences) =====

  app.get('/api/profile', async (req, res) => {
    const customerId = await getSessionCustomerId(req);
    if (!customerId) return res.status(401).json({ error: 'Please log in.' });
    const pool = getPgPool();
    if (pool) {
      try {
        const result = await pool.query('SELECT name, notify_order_updates, notify_promotions, mpin_hash FROM customers WHERE id = $1;', [customerId]);
        const row = result.rows[0];
        return res.json({
          name: row?.name || null,
          notifyOrderUpdates: row?.notify_order_updates !== false,
          notifyPromotions: row?.notify_promotions !== false,
          hasMpin: !!row?.mpin_hash
        });
      } catch (err) {
        console.error('[PostgreSQL] Error fetching profile, using memory fallback:', err);
      }
    }
    const customer = memoryDb.customers.find(c => c.id === customerId);
    return res.json({
      name: customer?.name || null,
      notifyOrderUpdates: customer?.notifyOrderUpdates !== false,
      notifyPromotions: customer?.notifyPromotions !== false,
      hasMpin: !!customer?.mpinHash
    });
  });

  app.patch('/api/profile', async (req, res) => {
    const customerId = await getSessionCustomerId(req);
    if (!customerId) return res.status(401).json({ error: 'Please log in.' });
    const { name, notifyOrderUpdates, notifyPromotions } = req.body;
    if (name !== undefined && typeof name !== 'string') {
      return res.status(400).json({ error: 'name must be a string.' });
    }
    const trimmedName = typeof name === 'string' ? name.trim().slice(0, 100) : undefined;

    const pool = getPgPool();
    if (pool) {
      try {
        await pool.query(
          `UPDATE customers SET
             name = COALESCE($1, name),
             notify_order_updates = COALESCE($2, notify_order_updates),
             notify_promotions = COALESCE($3, notify_promotions)
           WHERE id = $4;`,
          [trimmedName !== undefined ? trimmedName : null, notifyOrderUpdates !== undefined ? !!notifyOrderUpdates : null, notifyPromotions !== undefined ? !!notifyPromotions : null, customerId]
        );
        const result = await pool.query('SELECT name, notify_order_updates, notify_promotions FROM customers WHERE id = $1;', [customerId]);
        const row = result.rows[0];
        return res.json({ success: true, name: row?.name || null, notifyOrderUpdates: row?.notify_order_updates !== false, notifyPromotions: row?.notify_promotions !== false });
      } catch (err) {
        console.error('[PostgreSQL] Error updating profile, using memory fallback:', err);
      }
    }
    const customer = memoryDb.customers.find(c => c.id === customerId);
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });
    if (trimmedName !== undefined) customer.name = trimmedName;
    if (notifyOrderUpdates !== undefined) customer.notifyOrderUpdates = !!notifyOrderUpdates;
    if (notifyPromotions !== undefined) customer.notifyPromotions = !!notifyPromotions;
    return res.json({ success: true, name: customer.name || null, notifyOrderUpdates: customer.notifyOrderUpdates !== false, notifyPromotions: customer.notifyPromotions !== false });
  });

  // ===== Notifications (real per-customer targeted notifications, replaces the old
  // static hardcoded promo banner) =====

  app.get('/api/notifications', async (req, res) => {
    const customerId = await getSessionCustomerId(req);
    if (!customerId) return res.status(401).json({ error: 'Please log in.' });
    const pool = getPgPool();
    if (pool) {
      try {
        const result = await pool.query(
          'SELECT id, type, title, body, order_id, read, created_at FROM notifications WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 30;',
          [customerId]
        );
        return res.json({
          notifications: result.rows.map(r => ({ id: r.id, type: r.type, title: r.title, body: r.body, orderId: r.order_id || undefined, read: !!r.read, createdAt: r.created_at }))
        });
      } catch (err) {
        console.error('[PostgreSQL] Error fetching notifications, using memory fallback:', err);
      }
    }
    const notifications = memoryDb.notifications
      .filter(n => n.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30);
    return res.json({ notifications });
  });

  app.post('/api/notifications/:id/read', async (req, res) => {
    const customerId = await getSessionCustomerId(req);
    if (!customerId) return res.status(401).json({ error: 'Please log in.' });
    const { id } = req.params;
    const pool = getPgPool();
    if (pool) {
      try {
        await pool.query('UPDATE notifications SET read = TRUE WHERE id = $1 AND customer_id = $2;', [id, customerId]);
        return res.json({ success: true });
      } catch (err) {
        console.error('[PostgreSQL] Error marking notification read, using memory fallback:', err);
      }
    }
    const notification = memoryDb.notifications.find(n => n.id === id && n.customerId === customerId);
    if (notification) notification.read = true;
    return res.json({ success: true });
  });

  app.post('/api/notifications/read-all', async (req, res) => {
    const customerId = await getSessionCustomerId(req);
    if (!customerId) return res.status(401).json({ error: 'Please log in.' });
    const pool = getPgPool();
    if (pool) {
      try {
        await pool.query('UPDATE notifications SET read = TRUE WHERE customer_id = $1;', [customerId]);
        return res.json({ success: true });
      } catch (err) {
        console.error('[PostgreSQL] Error marking all notifications read, using memory fallback:', err);
      }
    }
    memoryDb.notifications.filter(n => n.customerId === customerId).forEach(n => { n.read = true; });
    return res.json({ success: true });
  });

  // ===== Help & Support (self-contained ticket capture - no live chat/email provider) =====

  app.post('/api/support-messages', async (req, res) => {
    const customerId = await getSessionCustomerId(req);
    if (!customerId) return res.status(401).json({ error: 'Please log in.' });
    const message = String(req.body?.message || '').trim();
    if (!message) return res.status(400).json({ error: 'Please enter a message.' });
    const id = randomUUID().replace(/-/g, '').slice(0, 12);
    const pool = getPgPool();
    if (pool) {
      try {
        const customerResult = await pool.query('SELECT phone FROM customers WHERE id = $1;', [customerId]);
        await pool.query('INSERT INTO support_messages (id, customer_id, phone, message) VALUES ($1, $2, $3, $4);', [id, customerId, customerResult.rows[0]?.phone || null, message.slice(0, 2000)]);
        return res.json({ success: true });
      } catch (err) {
        console.error('[PostgreSQL] Error saving support message, using memory fallback:', err);
      }
    }
    const customer = memoryDb.customers.find(c => c.id === customerId);
    memoryDb.supportMessages.push({ id, customerId, phone: customer?.phone, message: message.slice(0, 2000), createdAt: new Date().toISOString() });
    return res.json({ success: true });
  });

  // ===== Saved addresses =====

  app.get('/api/addresses', async (req, res) => {
    const customerId = await getSessionCustomerId(req);
    if (!customerId) return res.status(401).json({ error: 'Please log in.' });
    const pool = getPgPool();
    if (pool) {
      try {
        const result = await pool.query('SELECT * FROM addresses WHERE customer_id = $1 ORDER BY is_default DESC, created_at DESC;', [customerId]);
        return res.json({ addresses: result.rows.map(r => ({ id: r.id, customerId: r.customer_id, label: r.label, addressLine: r.address_line, postcode: r.postcode, isDefault: r.is_default })) });
      } catch (err) {
        console.error('[PostgreSQL] Error fetching addresses, using memory fallback:', err);
      }
    }
    return res.json({ addresses: memoryDb.addresses.filter(a => a.customerId === customerId) });
  });

  app.post('/api/addresses', async (req, res) => {
    const customerId = await getSessionCustomerId(req);
    if (!customerId) return res.status(401).json({ error: 'Please log in.' });
    const { label, addressLine, postcode, isDefault } = req.body;
    if (!label || !addressLine || !postcode) {
      return res.status(400).json({ error: 'Missing label/addressLine/postcode.' });
    }
    const id = randomUUID().replace(/-/g, '').slice(0, 12);
    const pool = getPgPool();
    if (pool) {
      try {
        if (isDefault) {
          await pool.query('UPDATE addresses SET is_default = FALSE WHERE customer_id = $1;', [customerId]);
        }
        await pool.query('INSERT INTO addresses (id, customer_id, label, address_line, postcode, is_default) VALUES ($1, $2, $3, $4, $5, $6);', [id, customerId, label, addressLine, postcode, !!isDefault]);
        return res.json({ success: true, address: { id, customerId, label, addressLine, postcode, isDefault: !!isDefault } });
      } catch (err) {
        console.error('[PostgreSQL] Error saving address, using memory fallback:', err);
      }
    }
    const address = { id, customerId, label, addressLine, postcode, isDefault: !!isDefault };
    memoryDb.addresses.push(address);
    return res.json({ success: true, address });
  });

  app.delete('/api/addresses/:id', async (req, res) => {
    const customerId = await getSessionCustomerId(req);
    if (!customerId) return res.status(401).json({ error: 'Please log in.' });
    const { id } = req.params;
    const pool = getPgPool();
    if (pool) {
      try {
        await pool.query('DELETE FROM addresses WHERE id = $1 AND customer_id = $2;', [id, customerId]);
        return res.json({ success: true });
      } catch (err) {
        console.error('[PostgreSQL] Error deleting address, using memory fallback:', err);
      }
    }
    memoryDb.addresses = memoryDb.addresses.filter(a => !(a.id === id && a.customerId === customerId));
    return res.json({ success: true });
  });

  // ===== Post-delivery ratings/reviews =====

  app.post('/api/reviews', async (req, res) => {
    const customerId = await getSessionCustomerId(req);
    if (!customerId) return res.status(401).json({ error: 'Please log in.' });
    const { orderId, rating, comment, courierRating } = req.body;
    const numericRating = Number(rating);
    if (!orderId || !Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: 'A valid orderId and a 1-5 rating are required.' });
    }
    const hasCourierRating = courierRating !== undefined && courierRating !== null;
    const numericCourierRating = hasCourierRating ? Number(courierRating) : null;
    if (hasCourierRating && (!Number.isInteger(numericCourierRating) || numericCourierRating! < 1 || numericCourierRating! > 5)) {
      return res.status(400).json({ error: 'Courier rating must be 1-5.' });
    }

    const pool = getPgPool();
    if (pool) {
      try {
        const orderResult = await pool.query('SELECT customer_id, restaurant_id, status, rated FROM orders WHERE id = $1;', [orderId]);
        const order = orderResult.rows[0];
        if (!order || order.customer_id !== customerId) {
          return res.status(404).json({ error: 'Order not found.' });
        }
        if (order.status !== 'Delivered') {
          return res.status(400).json({ error: 'Only delivered orders can be rated.' });
        }
        if (order.rated) {
          return res.status(400).json({ error: 'This order has already been rated.' });
        }
        const id = randomUUID().replace(/-/g, '').slice(0, 12);
        await pool.query('INSERT INTO reviews (id, order_id, customer_id, restaurant_id, rating, courier_rating, comment) VALUES ($1, $2, $3, $4, $5, $6, $7);', [id, orderId, customerId, order.restaurant_id, numericRating, numericCourierRating, comment || null]);
        await pool.query('UPDATE orders SET rated = TRUE WHERE id = $1;', [orderId]);
        return res.json({ success: true });
      } catch (err) {
        console.error('[PostgreSQL] Error saving review, using memory fallback:', err);
      }
    }

    const order = memoryDb.orders.find(o => o.id === orderId);
    if (!order || order.customerId !== customerId) return res.status(404).json({ error: 'Order not found.' });
    if (order.status !== 'Delivered') return res.status(400).json({ error: 'Only delivered orders can be rated.' });
    if (order.rated) return res.status(400).json({ error: 'This order has already been rated.' });
    memoryDb.reviews.push({ id: randomUUID(), orderId, customerId, restaurantId: order.restaurantId, rating: numericRating, courierRating: numericCourierRating, comment, createdAt: new Date().toISOString() });
    order.rated = true;
    return res.json({ success: true });
  });

  // Individual reviews for a restaurant's page (not just the aggregate count/rating).
  app.get('/api/restaurants/:id/reviews', async (req, res) => {
    const { id } = req.params;
    const limit = 20;
    const pool = getPgPool();
    if (pool) {
      try {
        const result = await pool.query(
          'SELECT id, rating, courier_rating, comment, created_at FROM reviews WHERE restaurant_id = $1 ORDER BY created_at DESC LIMIT $2;',
          [id, limit]
        );
        return res.json({
          reviews: result.rows.map(r => ({ id: r.id, rating: Number(r.rating), courierRating: r.courier_rating != null ? Number(r.courier_rating) : undefined, comment: r.comment || undefined, createdAt: r.created_at })),
          source: 'postgres'
        });
      } catch (err) {
        console.error('[PostgreSQL] Error fetching restaurant reviews, using memory fallback:', err);
      }
    }
    const reviews = memoryDb.reviews
      .filter(r => r.restaurantId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
    return res.json({ reviews, source: 'memory' });
  });

  // ===== Promo codes =====

  app.post('/api/promo/validate', async (req, res) => {
    const promo = await getPromoDiscount(req.body?.code);
    if (!promo) return res.status(404).json({ valid: false, error: 'Invalid or expired promo code.' });
    return res.json({ valid: true, code: promo.code, discountPercent: promo.discountPercent });
  });

  // ===== Business-configurable minimum order enforcement =====

  app.post('/api/restaurants/:id/toggle-min-order-enforcement', async (req, res) => {
    const { id } = req.params;
    const pool = getPgPool();
    if (pool) {
      try {
        const result = await pool.query('SELECT data FROM restaurants WHERE id = $1;', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Restaurant not found.' });
        const restaurant = result.rows[0].data as Restaurant;
        restaurant.enforceMinOrder = !restaurant.enforceMinOrder;
        await pool.query('UPDATE restaurants SET data = $1 WHERE id = $2;', [JSON.stringify(restaurant), id]);
        return res.json({ success: true, enforceMinOrder: restaurant.enforceMinOrder, source: 'postgres' });
      } catch (err) {
        console.error('[PostgreSQL] Error toggling min-order enforcement, using memory fallback:', err);
      }
    }
    // memoryDb.restaurants is pre-seeded with a deep copy of UK_RESTAURANTS, so it's
    // always the single source of truth in memory-fallback mode; mutating the found
    // object here is what makes the toggle stick for subsequent catalog fetches.
    const restaurant = memoryDb.restaurants.find(r => r.id === id) || UK_RESTAURANTS.find(r => r.id === id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found.' });
    restaurant.enforceMinOrder = !restaurant.enforceMinOrder;
    return res.json({ success: true, enforceMinOrder: restaurant.enforceMinOrder, source: 'memory' });
  });

  // ===== Live order updates via Server-Sent Events (replaces client polling) =====
  // Backed by Firebase Realtime Database so updates are durable and reach clients
  // even if a write happened on a different server instance.
  app.get('/api/orders/stream', async (req, res) => {
    const sessionCustomerId = await getSessionCustomerId(req);
    const queryCustomerId = typeof req.query.customerId === 'string' ? req.query.customerId : undefined;
    const customerId = sessionCustomerId || queryCustomerId;
    if (!customerId) {
      return res.status(401).json({ error: 'A valid session or customerId is required to stream order updates.' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write(': connected\n\n');

    if (!sseClients.has(customerId)) sseClients.set(customerId, new Set());
    sseClients.get(customerId)!.add(res);

    const rtdbInstance = getRtdb();
    const rtdbRef = rtdbInstance ? rtdbInstance.ref(`orderUpdates/${customerId}`) : null;
    const rtdbListener = rtdbRef
      ? rtdbRef.on('child_changed', (snapshot: any) => {
          res.write(`data: ${JSON.stringify({ orders: [snapshot.val()] })}\n\n`);
        })
      : null;

    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.get(customerId)?.delete(res);
      if (rtdbRef && rtdbListener) rtdbRef.off('child_changed', rtdbListener);
    });
  });

  // Health probe with actual database connection tests
  app.get('/api/health', async (req, res) => {
    let postgresStatus = { configured: false, working: false, error: null as any };
    let firestoreStatus = { configured: false, working: false, error: null as any };
    let rtdbStatus = { configured: false, working: false, error: null as any };

    const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
        promise
          .then((result) => {
            clearTimeout(timer);
            resolve(result);
          })
          .catch((err) => {
            clearTimeout(timer);
            reject(err);
          });
      });
    };

    // Test PostgreSQL
    const pool = getPgPool();
    if (pool) {
      postgresStatus.configured = true;
      try {
        const client = await withTimeout(
          pool.connect(),
          2000,
          "PostgreSQL pool connect timed out after 2000ms"
        );
        try {
          await withTimeout(
            client.query('SELECT 1;'),
            1500,
            "PostgreSQL SELECT 1 query timed out after 1500ms"
          );
          postgresStatus.working = true;
        } finally {
          client.release();
        }
      } catch (err: any) {
        postgresStatus.error = err.message || String(err);
      }
    }

    // Test Firestore
    const firestore = getFirestore();
    if (firestore) {
      firestoreStatus.configured = true;
      try {
        await withTimeout(
          firestore.collection('health_check').doc('connection_test').set({ 
            last_test: new Date().toISOString(),
            description: "Connection verification ping"
          }),
          2000,
          "Firestore write timed out after 2000ms"
        );
        firestoreStatus.working = true;
      } catch (err: any) {
        firestoreStatus.error = err.message || String(err);
      }
    }

    // Test Realtime Database
    const rtdbInstance = getRtdb();
    if (rtdbInstance) {
      rtdbStatus.configured = true;
      try {
        await withTimeout(
          rtdbInstance.ref('health_check').set({
            last_test: new Date().toISOString(),
            description: "Connection verification ping"
          }),
          2000,
          "Realtime Database write timed out after 2000ms"
        );
        rtdbStatus.working = true;
      } catch (err: any) {
        rtdbStatus.error = err.message || String(err);
      }
    }

    let dbParsedDiagnostics: any = {};
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      try {
        const parsedUrl = new URL(connectionString);
        dbParsedDiagnostics = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || '5432',
          database: parsedUrl.pathname.replace('/', ''),
          protocol: parsedUrl.protocol,
          has_username: !!parsedUrl.username,
          has_password: !!parsedUrl.password,
        };
      } catch (err: any) {
        dbParsedDiagnostics = {
          error: "Not a valid URL standard format: " + err.message,
          length: connectionString.length,
          startsWithPostgres: connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://'),
          containsAt: connectionString.includes('@'),
          containsColon: connectionString.includes(':')
        };
      }
    }

    const pgEnvKeys = ['PGHOST', 'PGPORT', 'PGUSER', 'PGDATABASE'];
    const presentPgEnvs: any = {};
    pgEnvKeys.forEach(k => {
      if (process.env[k]) {
        presentPgEnvs[k] = process.env[k];
      }
    });

    // List all present environment variable keys (excluding values for security)
    const allEnvKeys = Object.keys(process.env).filter(k => 
      !k.includes('SECRET') && 
      !k.includes('KEY') && 
      !k.includes('PASSWORD') && 
      !k.includes('TOKEN')
    );

    const allWorking = (!postgresStatus.configured || postgresStatus.working) && 
                       (!firestoreStatus.configured || firestoreStatus.working) &&
                       (!rtdbStatus.configured || rtdbStatus.working);

    res.status(allWorking ? 200 : 500).json({
      status: allWorking ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      postgres: postgresStatus,
      firestore: firestoreStatus,
      realtime_database: rtdbStatus,
      diagnostics: {
        using_postgres_fallback: !postgresStatus.working,
        using_firestore_fallback: !firestoreStatus.working,
        using_rtdb_fallback: !rtdbStatus.working,
        parsed_db_connection: dbParsedDiagnostics,
        present_pg_env_vars: presentPgEnvs,
        firebase_env_diagnostics: {
          project_id: !!process.env.FIREBASE_PROJECT_ID,
          client_email: !!process.env.FIREBASE_CLIENT_EMAIL,
          private_key: !!process.env.FIREBASE_PRIVATE_KEY,
          database_url: !!process.env.FIREBASE_DATABASE_URL,
          firestore_init_error: firestoreInitError,
          rtdb_init_error: rtdbInitError,
        },
        available_env_keys: allEnvKeys
      }
    });
  });

  // Integrate Vite dev server middleware in development mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets from dist folder
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`--------------------------------------------------`);
    console.log(`🚀 GoZoon Full-Stack Delivery System running!`);
    console.log(`   Host: http://0.0.0.0:${PORT}`);
    console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`--------------------------------------------------`);
  });
}

startServer();
