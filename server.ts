import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Pool } from 'pg';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Firestore } from 'firebase-admin/firestore';
import { getDatabase as getAdminDatabase, Database } from 'firebase-admin/database';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import { UK_RESTAURANTS, validateUKPostcode } from './src/data/restaurants';
import type { Restaurant, MenuItem } from './src/types';

dotenv.config();

// In-memory fallbacks for development/testing sandbox when real databases aren't configured yet
const memoryDb = {
  orders: [] as any[],
  telemetry: {} as Record<string, { orderId: string, driverName: string, lat: number, lng: number, updatedAt: string }>,
  restaurants: [] as Restaurant[],
  closedRestaurants: [] as string[],
  outOfStockItems: [] as string[],
  drivers: [] as { name: string; phone: string; vehicle: string }[],
};

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
    total: Number(row.total),
    status: row.status,
    deliveryAddress: row.delivery_address || '',
    deliveryPostcode: row.delivery_postcode || row.postcode || '',
    driverName: row.driver_name || undefined,
    driverPhone: row.driver_phone || undefined,
    createdAt: row.created_at || new Date().toISOString()
  };
}

// Recompute pricing server-side from the trusted restaurant/menu catalog so a
// client can't submit an arbitrary total for its basket contents.
function computeServerTotal(restaurant: Restaurant, items: any[], deliveryPostcode: string): { subtotal: number; deliveryFee: number; serviceFee: number; vat: number; total: number } | null {
  const zone = validateUKPostcode(deliveryPostcode || '');
  const deliveryMultiplier = zone?.deliveryMultiplier ?? 1;
  let subtotal = 0;
  for (const cartItem of items || []) {
    const menuItem = restaurant.menu.find(m => m.id === cartItem?.menuItem?.id);
    if (!menuItem) return null;
    const quantity = Number(cartItem.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) return null;

    let unitPrice = menuItem.price;
    for (const c of cartItem.customizations || []) {
      const option = menuItem.options?.find(o => o.name === c.name);
      const choice = option?.choices.find(ch => ch.name === c.selectedOption);
      // Unknown option/choice combos are rejected rather than silently trusted.
      if (option && !choice) return null;
      unitPrice += choice ? choice.price : Number(c.additionalPrice) || 0;
    }
    subtotal += unitPrice * quantity;
  }

  const deliveryFee = restaurant.offersFreeDelivery ? 0 : Math.round((restaurant.deliveryFee * deliveryMultiplier) * 100) / 100;
  const serviceFee = subtotal > 0 ? Math.max(0.99, Math.round(subtotal * 0.05 * 100) / 100) : 0;
  // NOT LEGALLY REVIEWED: mirrors the same flat-20%-of-subtotal placeholder used
  // client-side (see App.tsx handleCheckout) - needs finance/legal sign-off before launch.
  const vat = Math.round(subtotal * 0.2 * 100) / 100;
  const total = Math.round((subtotal + deliveryFee + serviceFee) * 100) / 100;

  return { subtotal: Math.round(subtotal * 100) / 100, deliveryFee, serviceFee, vat, total };
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
    `);

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
  return memoryDb.restaurants.length > 0 ? memoryDb.restaurants : UK_RESTAURANTS;
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
    const {
      customerId,
      customerName,
      restaurantId,
      restaurantName,
      restaurantAddress,
      items,
      status,
      deliveryAddress,
      deliveryPostcode,
      postcode,
      driverName,
      driverPhone
    } = req.body;

    if (!restaurantId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing order specifications: restaurantId and at least one item are required.' });
    }
    // The server assigns the order id itself - trusting a client-supplied id would let
    // a caller guess/reuse another order's id and hijack it via the upsert below.
    const id = randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();

    // Recompute pricing from the trusted catalog rather than accepting the client's numbers -
    // a tampered basket total (or a total for items that don't exist) is rejected outright.
    const catalog = await getRestaurantCatalog();
    const restaurant = catalog.find(r => r.id === restaurantId);
    if (!restaurant) {
      return res.status(400).json({ error: `Unknown restaurantId "${restaurantId}".` });
    }
    const computed = computeServerTotal(restaurant, items, deliveryPostcode || postcode || '');
    if (!computed) {
      return res.status(400).json({ error: 'One or more items/customizations do not match the restaurant menu.' });
    }
    const clientTotal = Number(req.body.total);
    if (!Number.isFinite(clientTotal) || Math.abs(clientTotal - computed.total) > 0.02) {
      return res.status(400).json({ error: 'Submitted total does not match the server-computed price for this basket.', expectedTotal: computed.total });
    }
    const { subtotal, deliveryFee, serviceFee, vat, total } = computed;

    const pool = getPgPool();
    if (pool) {
      try {
        const queryText = `
          INSERT INTO orders (
            id, customer_id, customer_name, restaurant_id, restaurant_name, restaurant_address,
            items, subtotal, delivery_fee, service_fee, vat, tip, total, status,
            delivery_address, delivery_postcode, driver_name, driver_phone, postcode
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            driver_name = COALESCE(EXCLUDED.driver_name, orders.driver_name),
            driver_phone = COALESCE(EXCLUDED.driver_phone, orders.driver_phone),
            updated_at = CURRENT_TIMESTAMP
          RETURNING *;
        `;
        const values = [
          id,
          customerId || null,
          customerName || 'Anonymous',
          restaurantId,
          restaurantName,
          restaurantAddress || '',
          JSON.stringify(items || []),
          subtotal,
          deliveryFee,
          serviceFee,
          vat,
          0,
          total,
          status || 'Placed',
          deliveryAddress || '',
          deliveryPostcode || postcode || '',
          driverName || null,
          driverPhone || null,
          postcode || deliveryPostcode || ''
        ];
        const result = await pool.query(queryText, values);
        console.log(`[PostgreSQL] Order created/updated successfully: #${id}`);
        return res.json({ success: true, order: mapRowToOrder(result.rows[0]), source: 'postgres' });
      } catch (err) {
        console.error('[PostgreSQL] Error inserting order, resorting to memory fallback:', err);
      }
    }

    // In-Memory fallback behavior
    const existingIdx = memoryDb.orders.findIndex(o => o.id === id);
    const orderData = {
      id,
      customerId,
      customerName,
      restaurantId,
      restaurantName,
      restaurantAddress,
      items,
      subtotal,
      deliveryFee,
      serviceFee,
      vat,
      tip: 0,
      total,
      status: status || 'Placed',
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
    return res.json({ success: true, order: orderData, source: 'memory' });
  });

  // API Route: Update Order Status / Assign Driver (Saves to Postgres, with Fallback)
  app.patch('/api/orders/:id', async (req, res) => {
    const { id } = req.params;
    const { status, driverName, driverPhone } = req.body;

    const pool = getPgPool();
    if (pool) {
      try {
        const queryText = `
          UPDATE orders
          SET status = COALESCE($1, status),
              driver_name = COALESCE($2, driver_name),
              driver_phone = COALESCE($3, driver_phone),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
          RETURNING *;
        `;
        const result = await pool.query(queryText, [status || null, driverName || null, driverPhone || null, id]);
        if (result.rows.length > 0) {
          console.log(`[PostgreSQL] Status updated for Order #${id}: ${status}`);
          return res.json({ success: true, order: mapRowToOrder(result.rows[0]), source: 'postgres' });
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
      order.updatedAt = new Date().toISOString();
      console.log(`[MemoryStore] Status updated for Order #${id}: ${status}`);
      return res.json({ success: true, order, source: 'memory' });
    }

    return res.status(444).json({ error: 'Order not found in memory database.' });
  });

  // API Route: Fetch Orders. When ?customerId= is supplied (the customer-facing app),
  // results are scoped to that customer only - the unscoped "all orders" view stays
  // available for the Business/Road King/Admin operational apps.
  app.get('/api/orders', async (req, res) => {
    const customerId = typeof req.query.customerId === 'string' ? req.query.customerId : undefined;
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
