import * as SQLite from 'expo-sqlite';
import { billTotals, money, validEventDate } from '../utils/billing';

let db;

export async function getDb() {
  if (!db) {
    db = SQLite.openDatabaseAsync('tent_billing.db').catch((error) => { db = null; throw error; });
  }
  return db;
}

export async function initDatabase() {
  const database = await getDb();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'piece',
      unit_cost REAL NOT NULL,
      category TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      event_date TEXT,
      venue TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      material_id INTEGER,
      material_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_cost_snapshot REAL NOT NULL,
      line_total REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE,
      subtotal REAL NOT NULL,
      discount_type TEXT DEFAULT 'none',
      discount_value REAL DEFAULT 0,
      final_amount REAL NOT NULL,
      is_manual_override INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
  `);

  return database;
}

// ---------- Materials ----------
export async function addMaterial(name, unit, unitCost, category) {
  if (!name.trim() || !unit.trim() || money(unitCost) <= 0) throw new Error('invalid_material');
  unitCost = money(unitCost);
  const database = await getDb();
  const result = await database.runAsync(
    'INSERT INTO materials (name, unit, unit_cost, category) VALUES (?, ?, ?, ?)',
    name, unit, unitCost, category || null
  );
  return result.lastInsertRowId;
}

export async function updateMaterial(id, name, unit, unitCost, category) {
  if (!name.trim() || !unit.trim() || money(unitCost) <= 0) throw new Error('invalid_material');
  unitCost = money(unitCost);
  const database = await getDb();
  await database.runAsync(
    'UPDATE materials SET name = ?, unit = ?, unit_cost = ?, category = ? WHERE id = ?',
    name, unit, unitCost, category || null, id
  );
}

export async function deleteMaterial(id) {
  const database = await getDb();
  await database.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('UPDATE order_items SET material_id = NULL WHERE material_id = ?', id);
    await txn.runAsync('DELETE FROM materials WHERE id = ?', id);
  });
}

export async function getMaterials() {
  const database = await getDb();
  return await database.getAllAsync('SELECT * FROM materials ORDER BY name ASC');
}

// ---------- Orders ----------
export async function getOrderItems(orderId) {
  const database = await getDb();
  return await database.getAllAsync('SELECT * FROM order_items WHERE order_id = ?', orderId);
}

export async function getOrders() {
  const database = await getDb();
  return await database.getAllAsync('SELECT * FROM orders ORDER BY created_at DESC, id DESC');
}

export async function getOrder(orderId) {
  const database = await getDb();
  return await database.getFirstAsync('SELECT * FROM orders WHERE id = ?', orderId);
}

// ---------- Bills ----------
export async function saveBill(orderId, subtotal, discountType, discountValue, finalAmount, isManualOverride, notes) {
  const database = await getDb();
  const items = await getOrderItems(orderId);
  if (!items.length) throw new Error('items_required');
  const totals = billTotals(items, isManualOverride, String(discountValue), String(finalAmount));
  if (money(subtotal) !== totals.subtotal || money(finalAmount) !== totals.finalAmount) throw new Error('invalid_amount');
  discountType = isManualOverride ? 'manual' : 'percent';
  discountValue = totals.percent;
  await database.runAsync(
    `INSERT INTO bills (order_id, subtotal, discount_type, discount_value, final_amount, is_manual_override, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(order_id) DO UPDATE SET
       subtotal = excluded.subtotal,
       discount_type = excluded.discount_type,
       discount_value = excluded.discount_value,
       final_amount = excluded.final_amount,
       is_manual_override = excluded.is_manual_override,
       notes = excluded.notes`,
    orderId, subtotal, discountType, discountValue, finalAmount, isManualOverride ? 1 : 0, notes || null
  );
}

export async function getBill(orderId) {
  const database = await getDb();
  return await database.getFirstAsync('SELECT * FROM bills WHERE order_id = ?', orderId);
}

// Commit the header and every item together: a failed line never leaves a partial order.
export async function createOrderWithItems(name, phone, date, venue, items) {
  if (!name.trim()) throw new Error('customer_required');
  if (!validEventDate(date)) throw new Error('invalid_date');
  if (!items.length) throw new Error('items_required');
  const lines = items.map((item) => {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0 || !item.name.trim()) throw new Error('invalid_quantity');
    if (money(item.unit_cost) <= 0) throw new Error('invalid_material');
    return { ...item, total: money(item.quantity * item.unit_cost) };
  });
  money(lines.reduce((sum, item) => sum + item.total, 0));
  const database = await getDb();
  let id;
  await database.withExclusiveTransactionAsync(async (txn) => {
    const result = await txn.runAsync('INSERT INTO orders (customer_name, customer_phone, event_date, venue) VALUES (?, ?, ?, ?)', name.trim(), phone.trim() || null, date.trim() || null, venue.trim() || null);
    id = result.lastInsertRowId;
    for (const item of lines) {
      if (!(await txn.getFirstAsync('SELECT id FROM materials WHERE id = ?', item.material_id))) throw new Error('missing_material');
      await txn.runAsync('INSERT INTO order_items (order_id, material_id, material_name, quantity, unit_cost_snapshot, line_total) VALUES (?, ?, ?, ?, ?, ?)', id, item.material_id, item.name, item.quantity, item.unit_cost, item.total);
    }
  });
  return id;
}

export async function updateOrderStatus(id, status) {
  if (!['pending', 'delivered', 'returned'].includes(status)) throw new Error('invalid_status');
  const database = await getDb();
  await database.runAsync('UPDATE orders SET status = ? WHERE id = ?', status, id);
}

export async function getShop() {
  const database = await getDb();
  return (await database.getFirstAsync('SELECT name, phone, address FROM settings WHERE id = 1')) || { name: '', phone: '', address: '' };
}

export async function saveShop({ name, phone, address }) {
  if (!name.trim()) throw new Error('shop_required');
  const database = await getDb();
  await database.runAsync('INSERT INTO settings (id, name, phone, address) VALUES (1, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, phone = excluded.phone, address = excluded.address', name.trim(), phone.trim(), address.trim());
}
