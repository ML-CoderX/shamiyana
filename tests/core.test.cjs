const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');
const babel = require('@babel/core');

function load(relative, mocks = {}) {
  const filename = path.resolve(relative);
  const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require: name => mocks[name] || (name.startsWith('.') ? load(path.relative(process.cwd(), path.resolve(path.dirname(filename), name + '.js')), mocks) : require(name)),
  }, { filename });
  return module.exports;
}
const billing = load('utils/billing.js');

test('billing rejects malformed, negative, infinite, and out-of-range inputs', () => {
  const items = [{ quantity: 3, unit_cost_snapshot: 0.1 }];
  assert.equal(billing.billTotals(items, false, '0', '').subtotal, 0.3);
  assert.equal(billing.billTotals(items, false, '100', '').finalAmount, 0);
  for (const discount of ['-1', '101', 'Infinity', '10abc', '']) assert.throws(() => billing.billTotals(items, false, discount, ''));
  for (const amount of ['', '-1', 'Infinity', '2abc', '10000000001']) assert.throws(() => billing.billTotals(items, true, '0', amount));
  assert.equal(billing.billTotals(items, true, 'invalid unused discount', '0').finalAmount, 0);
});

test('event dates reject impossible dates and accept leap years and blank optional dates', () => {
  for (const date of ['', '29-02-2024', '31-12-2026']) assert.equal(billing.validEventDate(date), true);
  for (const date of ['29-02-2025', '31-04-2026', '2026-01-01', '00-01-2026']) assert.equal(billing.validEventDate(date), false);
});

let sql, db;
beforeEach(async () => {
  sql = new DatabaseSync(':memory:');
  const adapter = {
    execAsync: async query => sql.exec(query),
    runAsync: async (query, ...args) => {
      const result = sql.prepare(query).run(...args);
      return { changes: result.changes, lastInsertRowId: result.lastInsertRowid };
    },
    getAllAsync: async (query, ...args) => sql.prepare(query).all(...args),
    getFirstAsync: async (query, ...args) => sql.prepare(query).get(...args),
    withExclusiveTransactionAsync: async task => {
      sql.exec('BEGIN');
      try { await task(adapter); sql.exec('COMMIT'); }
      catch (error) { sql.exec('ROLLBACK'); throw error; }
    },
  };
  db = load('db/database.js', { 'expo-sqlite': { openDatabaseAsync: async () => adapter } });
  await db.initDatabase();
});

test('order creation rolls back all writes if any item fails', async () => {
  const id = await db.addMaterial('Chair', 'piece', 10, '');
  await assert.rejects(db.createOrderWithItems('Customer', '', '', '', [
    { material_id: id, name: 'Chair', quantity: 2, unit_cost: 10 },
    { material_id: 9999, name: 'Missing', quantity: 1, unit_cost: 10 },
  ]));
  assert.equal((await db.getOrders()).length, 0);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM order_items').get().n, 0);
});

test('price edits and catalog deletion preserve old order snapshots; bills upsert', async () => {
  const material = await db.addMaterial('Chair', 'piece', 10, '');
  const id = await db.createOrderWithItems('Customer', '', '30-10-2026', 'Hall', [{ material_id: material, name: 'Chair', quantity: 3, unit_cost: 10 }]);
  await db.updateMaterial(material, 'New chair', 'piece', 20, '');
  await db.deleteMaterial(material);
  const [item] = await db.getOrderItems(id);
  assert.equal(item.material_name, 'Chair');
  assert.equal(item.unit_cost_snapshot, 10);
  assert.equal(item.line_total, 30);
  assert.equal(item.material_id, null);
  await db.saveBill(id, 30, 'percent', 10, 27, false, null);
  await db.saveBill(id, 30, 'manual', 0, 25, true, null);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM bills').get().n, 1);
  assert.equal((await db.getBill(id)).final_amount, 25);
  await db.updateOrderStatus(id, 'delivered');
  assert.equal((await db.getOrder(id)).status, 'delivered');
  await assert.rejects(db.updateOrderStatus(id, 'nonsense'));
});

test('settings persist and schema initialization preserves existing data', async () => {
  await db.saveShop({ name: 'My shop', phone: '123', address: 'Address' });
  await db.initDatabase();
  assert.equal((await db.getShop()).name, 'My shop');
  await assert.rejects(db.saveShop({ name: ' ', phone: '', address: '' }));
});

test('database rejects inconsistent bill totals instead of persisting them', async () => {
  const material = await db.addMaterial('Chair', 'piece', 10, '');
  const id = await db.createOrderWithItems('Customer', '', '', '', [{ material_id: material, name: 'Chair', quantity: 3, unit_cost: 10 }]);
  await assert.rejects(db.saveBill(id, 30, 'percent', 101, -0.3, false, null));
  await assert.rejects(db.saveBill(id, 30, 'percent', 10, 28, false, null));
  await assert.rejects(db.saveBill(id, 99, 'manual', 0, 25, true, null));
  assert.equal(await db.getBill(id), undefined);
});

test('all application JavaScript parses, including native JSX screens', () => {
  const parser = require('@babel/parser');
  const files = ['App.js', ...['screens', 'db', 'utils', 'i18n'].flatMap(dir => fs.readdirSync(dir).filter(name => name.endsWith('.js')).map(name => `${dir}/${name}`))];
  for (const file of files) parser.parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
});

test('PDF escapes markup and reports unsupported native sharing', async () => {
  const pdf = load('utils/pdf.js', { 'expo-print': {}, 'expo-sharing': { isAvailableAsync: async () => false } });
  const html = pdf.buildBillHtml({ t: key => key, order: { id: 1, customer_name: '<script>alert(1)</script>', venue: 'A&B' }, items: [{ material_name: '<img src=x>', quantity: 1, unit_cost_snapshot: 10, line_total: 10 }], subtotal: 10, finalAmount: 10, shop: { name: '"Shop" <test>', address: '<b>Road</b>' } });
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img src=x>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('A&amp;B'));
  assert.ok(html.includes('&lt;b&gt;Road&lt;/b&gt;'));
  await assert.rejects(pdf.shareBillPdf(html), /sharing_unavailable/);
});

test('English and Kannada have matching translation keys', () => {
  const en = JSON.parse(fs.readFileSync('i18n/locales/en.json'));
  const kn = JSON.parse(fs.readFileSync('i18n/locales/kn.json'));
  assert.deepEqual(Object.keys(en).sort(), Object.keys(kn).sort());
  for (const file of ['App.js', ...fs.readdirSync('screens').map(name => 'screens/' + name)]) {
    for (const [, key] of fs.readFileSync(file, 'utf8').matchAll(/\bt\('([^']+)'\)/g)) assert.ok(en[key], `${file}: missing ${key}`);
  }
});
