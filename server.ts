import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Pool } from 'pg';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Firestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

// In-memory fallbacks for development/testing sandbox when real databases aren't configured yet
const memoryDb = {
  orders: [] as any[],
  telemetry: {} as Record<string, { orderId: string, driverName: string, lat: number, lng: number, updatedAt: string }>,
};

// PostgreSQL connection pool (Lazy initialized)
let pgPool: Pool | null = null;
function getPgPool(): Pool | null {
  if (!pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      try {
        pgPool = new Pool({
          connectionString,
          ssl: connectionString.includes('render.com') || connectionString.includes('elephantsql') || connectionString.includes('gcp')
            ? { rejectUnauthorized: false }
            : undefined,
        });
        console.log('[PostgreSQL] Initialized client connection pool.');
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
      } catch (err) {
        console.error('[Firestore] Initialization error:', err);
      }
    } else {
      console.log('[Firestore] Service credentials not found. Using in-memory fallback for driver tracking.');
    }
  }
  return firestoreDb;
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
    client.release();
    console.log('[PostgreSQL] Tables bootstrapped or verified successfully.');
  } catch (err) {
    console.error('[PostgreSQL] Error bootstrapping tables:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Bootstrap Postgres database
  await bootstrapPostgres();

  // API Route: Create/Submit Order (Saves to Postgres, with Fallback to local memory)
  app.post('/api/orders', async (req, res) => {
    const { id, customerName, postcode, restaurantId, restaurantName, items, subtotal, deliveryFee, tip, total, status } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing order specifications.' });
    }

    const pool = getPgPool();
    if (pool) {
      try {
        const queryText = `
          INSERT INTO orders (id, customer_name, postcode, restaurant_id, restaurant_name, items, subtotal, delivery_fee, tip, total, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *;
        `;
        const values = [
          id, 
          customerName || 'Anonymous', 
          postcode || '', 
          restaurantId, 
          restaurantName, 
          JSON.stringify(items || []), 
          subtotal || 0, 
          deliveryFee || 0, 
          tip || 0, 
          total || 0, 
          status || 'Placed'
        ];
        const result = await pool.query(queryText, values);
        console.log(`[PostgreSQL] Order created/updated successfully: #${id}`);
        return res.json({ success: true, order: result.rows[0], source: 'postgres' });
      } catch (err) {
        console.error('[PostgreSQL] Error inserting order, resorting to memory fallback:', err);
      }
    }

    // In-Memory fallback behavior
    const existingIdx = memoryDb.orders.findIndex(o => o.id === id);
    const orderData = { id, customerName, postcode, restaurantId, restaurantName, items, subtotal, deliveryFee, tip, total, status, updatedAt: new Date().toISOString() };
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
    const { status, driverName } = req.body;

    const pool = getPgPool();
    if (pool) {
      try {
        const queryText = `
          UPDATE orders
          SET status = COALESCE($1, status),
              driver_name = COALESCE($2, driver_name),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING *;
        `;
        const result = await pool.query(queryText, [status, driverName, id]);
        if (result.rows.length > 0) {
          console.log(`[PostgreSQL] Status updated for Order #${id}: ${status}`);
          return res.json({ success: true, order: result.rows[0], source: 'postgres' });
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
      order.updatedAt = new Date().toISOString();
      console.log(`[MemoryStore] Status updated for Order #${id}: ${status}`);
      return res.json({ success: true, order, source: 'memory' });
    }

    return res.status(444).json({ error: 'Order not found in memory database.' });
  });

  // API Route: Fetch Orders
  app.get('/api/orders', async (req, res) => {
    const pool = getPgPool();
    if (pool) {
      try {
        const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50;');
        return res.json({ orders: result.rows, source: 'postgres' });
      } catch (err) {
        console.error('[PostgreSQL] Error fetching orders, using memory fallback:', err);
      }
    }
    return res.json({ orders: memoryDb.orders, source: 'memory' });
  });

  // API Route: Telemetry Stream (Saves live coordinates to Firestore with Memory Fallback)
  app.post('/api/telemetry', async (req, res) => {
    const { orderId, driverName, lat, lng } = req.body;

    if (!orderId || !lat || !lng) {
      return res.status(400).json({ error: 'Missing telemetry specifications.' });
    }

    const firestore = getFirestore();
    const timestamp = new Date().toISOString();
    const telemetryData = { orderId, driverName: driverName || 'Courier', lat, lng, updatedAt: timestamp };

    if (firestore) {
      try {
        await firestore.collection('telemetry').doc(orderId).set(telemetryData);
        console.log(`[Firestore] Streamed location for Order #${orderId} successfully.`);
        return res.json({ success: true, telemetry: telemetryData, source: 'firestore' });
      } catch (err) {
        console.error('[Firestore] Stream failed, using memory fallback:', err);
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

    if (firestore) {
      try {
        const doc = await firestore.collection('telemetry').doc(orderId).get();
        if (doc.exists) {
          return res.json({ telemetry: doc.data(), source: 'firestore' });
        }
      } catch (err) {
        console.error('[Firestore] Get failed, using memory fallback:', err);
      }
    }

    const telemetry = memoryDb.telemetry[orderId];
    if (telemetry) {
      return res.json({ telemetry, source: 'memory' });
    }
    return res.status(404).json({ error: 'No live telemetry found for this order.' });
  });

  // Health probe
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', postgres: !!getPgPool(), firestore: !!getFirestore() });
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
