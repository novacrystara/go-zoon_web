import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Pool } from 'pg';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Firestore } from 'firebase-admin/firestore';
import { getDatabase as getAdminDatabase, Database } from 'firebase-admin/database';
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
      id, 
      customerName, 
      restaurantId, 
      restaurantName, 
      restaurantAddress,
      items, 
      subtotal, 
      deliveryFee, 
      serviceFee,
      vat,
      tip, 
      total, 
      status,
      deliveryAddress,
      deliveryPostcode,
      postcode,
      driverName,
      driverPhone
    } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Missing order specifications.' });
    }
 
    const pool = getPgPool();
    if (pool) {
      try {
        const queryText = `
          INSERT INTO orders (
            id, customer_name, restaurant_id, restaurant_name, restaurant_address,
            items, subtotal, delivery_fee, service_fee, vat, tip, total, status,
            delivery_address, delivery_postcode, driver_name, driver_phone, postcode
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            driver_name = COALESCE(EXCLUDED.driver_name, orders.driver_name),
            driver_phone = COALESCE(EXCLUDED.driver_phone, orders.driver_phone),
            updated_at = CURRENT_TIMESTAMP
          RETURNING *;
        `;
        const values = [
          id, 
          customerName || 'Anonymous', 
          restaurantId, 
          restaurantName,
          restaurantAddress || '',
          JSON.stringify(items || []), 
          subtotal || 0, 
          deliveryFee || 0, 
          serviceFee || 0,
          vat || 0,
          tip || 0, 
          total || 0, 
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
      customerName, 
      restaurantId, 
      restaurantName, 
      restaurantAddress,
      items, 
      subtotal, 
      deliveryFee, 
      serviceFee,
      vat,
      tip, 
      total, 
      status, 
      deliveryAddress,
      deliveryPostcode,
      driverName,
      driverPhone,
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

  // API Route: Fetch Orders
  app.get('/api/orders', async (req, res) => {
    const pool = getPgPool();
    if (pool) {
      try {
        const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50;');
        const mapped = result.rows.map(mapRowToOrder);
        return res.json({ orders: mapped, source: 'postgres' });
      } catch (err) {
        console.error('[PostgreSQL] Error fetching orders, using memory fallback:', err);
      }
    }
    return res.json({ orders: memoryDb.orders, source: 'memory' });
  });

  // API Route: Delete all orders (Flush database)
  app.delete('/api/orders', async (req, res) => {
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
