import * as SQLite from 'expo-sqlite';
import { Entry, EntryWithDetails, Photo, Product, Vitamin } from './types';
import { WASH_TYPES } from './theme';

const db = SQLite.openDatabaseSync('rosewater.db');

export function initDb(): void {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      rating INTEGER,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      rating INTEGER,
      notes TEXT NOT NULL DEFAULT '',
      archived INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS entry_products (
      entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      PRIMARY KEY (entry_id, product_id)
    );
    CREATE TABLE IF NOT EXISTS vitamins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      sort INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS vitamin_log (
      vitamin_id INTEGER NOT NULL REFERENCES vitamins(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      PRIMARY KEY (vitamin_id, date)
    );
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      uri TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      entry_id INTEGER REFERENCES entries(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
    CREATE INDEX IF NOT EXISTS idx_photos_date ON photos(date);
  `);
}

function rowToEntry(r: any): Entry {
  return {
    id: r.id,
    date: r.date,
    type: r.type,
    rating: r.rating,
    note: r.note,
    createdAt: r.created_at,
  };
}

function attachDetails(entries: Entry[]): EntryWithDetails[] {
  if (entries.length === 0) return [];
  const ids = entries.map((e) => e.id).join(',');
  const prodRows = db.getAllSync<any>(
    `SELECT ep.entry_id, p.id, p.name FROM entry_products ep
     JOIN products p ON p.id = ep.product_id WHERE ep.entry_id IN (${ids})`
  );
  const photoRows = db.getAllSync<any>(
    `SELECT entry_id, uri FROM photos WHERE entry_id IN (${ids})`
  );
  return entries.map((e) => ({
    ...e,
    productIds: prodRows.filter((r) => r.entry_id === e.id).map((r) => r.id),
    productNames: prodRows.filter((r) => r.entry_id === e.id).map((r) => r.name),
    photoUris: photoRows.filter((r) => r.entry_id === e.id).map((r) => r.uri),
  }));
}

export function listEntries(limit = 200): EntryWithDetails[] {
  const rows = db.getAllSync<any>(
    'SELECT * FROM entries ORDER BY date DESC, id DESC LIMIT ?',
    [limit]
  );
  return attachDetails(rows.map(rowToEntry));
}

export function entriesForMonth(year: number, month: number): EntryWithDetails[] {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-%`;
  const rows = db.getAllSync<any>(
    'SELECT * FROM entries WHERE date LIKE ? ORDER BY date ASC, id ASC',
    [prefix]
  );
  return attachDetails(rows.map(rowToEntry));
}

export function getEntry(id: number): EntryWithDetails | null {
  const row = db.getFirstSync<any>('SELECT * FROM entries WHERE id = ?', [id]);
  if (!row) return null;
  return attachDetails([rowToEntry(row)])[0];
}

export function insertEntry(
  e: { date: string; type: string; rating: number | null; note: string },
  productIds: number[]
): number {
  const res = db.runSync(
    'INSERT INTO entries (date, type, rating, note) VALUES (?, ?, ?, ?)',
    [e.date, e.type, e.rating, e.note]
  );
  const id = res.lastInsertRowId;
  setEntryProducts(id, productIds);
  return id;
}

export function updateEntry(
  id: number,
  e: { date: string; type: string; rating: number | null; note: string },
  productIds: number[]
): void {
  db.runSync('UPDATE entries SET date = ?, type = ?, rating = ?, note = ? WHERE id = ?', [
    e.date, e.type, e.rating, e.note, id,
  ]);
  // Keep linked photos on the same day as their entry
  db.runSync('UPDATE photos SET date = ? WHERE entry_id = ?', [e.date, id]);
  setEntryProducts(id, productIds);
}

export function deleteEntry(id: number): void {
  db.runSync('DELETE FROM entries WHERE id = ?', [id]);
}

function setEntryProducts(entryId: number, productIds: number[]): void {
  db.runSync('DELETE FROM entry_products WHERE entry_id = ?', [entryId]);
  for (const pid of productIds) {
    db.runSync('INSERT OR IGNORE INTO entry_products (entry_id, product_id) VALUES (?, ?)', [
      entryId, pid,
    ]);
  }
}

export function lastDateOfTypes(types: string[]): string | null {
  const placeholders = types.map(() => '?').join(',');
  const row = db.getFirstSync<any>(
    `SELECT MAX(date) AS d FROM entries WHERE type IN (${placeholders})`,
    types
  );
  return row?.d ?? null;
}

export function lastWashDate(): string | null {
  return lastDateOfTypes(WASH_TYPES);
}

// Products

export function listProducts(includeArchived = false): Product[] {
  return db.getAllSync<Product>(
    includeArchived
      ? 'SELECT * FROM products ORDER BY archived ASC, name COLLATE NOCASE ASC'
      : 'SELECT * FROM products WHERE archived = 0 ORDER BY name COLLATE NOCASE ASC'
  );
}

export function insertProduct(p: { name: string; category: string; rating: number | null; notes: string }): number {
  const res = db.runSync(
    'INSERT INTO products (name, category, rating, notes) VALUES (?, ?, ?, ?)',
    [p.name, p.category, p.rating, p.notes]
  );
  return res.lastInsertRowId;
}

export function updateProduct(id: number, p: { name: string; category: string; rating: number | null; notes: string }): void {
  db.runSync('UPDATE products SET name = ?, category = ?, rating = ?, notes = ? WHERE id = ?', [
    p.name, p.category, p.rating, p.notes, id,
  ]);
}

export function setProductArchived(id: number, archived: boolean): void {
  db.runSync('UPDATE products SET archived = ? WHERE id = ?', [archived ? 1 : 0, id]);
}

export function deleteProduct(id: number): void {
  db.runSync('DELETE FROM products WHERE id = ?', [id]);
}

// Vitamins

export function listVitamins(activeOnly = true): Vitamin[] {
  return db.getAllSync<Vitamin>(
    activeOnly
      ? 'SELECT * FROM vitamins WHERE active = 1 ORDER BY sort ASC, id ASC'
      : 'SELECT * FROM vitamins ORDER BY active DESC, sort ASC, id ASC'
  );
}

export function insertVitamin(name: string): number {
  const row = db.getFirstSync<any>('SELECT COALESCE(MAX(sort), 0) + 1 AS s FROM vitamins');
  const res = db.runSync('INSERT INTO vitamins (name, sort) VALUES (?, ?)', [name, row.s]);
  return res.lastInsertRowId;
}

export function renameVitamin(id: number, name: string): void {
  db.runSync('UPDATE vitamins SET name = ? WHERE id = ?', [name, id]);
}

export function setVitaminActive(id: number, active: boolean): void {
  db.runSync('UPDATE vitamins SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
}

export function deleteVitamin(id: number): void {
  db.runSync('DELETE FROM vitamins WHERE id = ?', [id]);
}

export function vitaminsCheckedOn(date: string): Set<number> {
  const rows = db.getAllSync<any>('SELECT vitamin_id FROM vitamin_log WHERE date = ?', [date]);
  return new Set(rows.map((r) => r.vitamin_id));
}

export function setVitaminChecked(vitaminId: number, date: string, checked: boolean): void {
  if (checked) {
    db.runSync('INSERT OR IGNORE INTO vitamin_log (vitamin_id, date) VALUES (?, ?)', [vitaminId, date]);
  } else {
    db.runSync('DELETE FROM vitamin_log WHERE vitamin_id = ? AND date = ?', [vitaminId, date]);
  }
}

export function vitaminDatesForMonth(year: number, month: number): Set<string> {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-%`;
  const rows = db.getAllSync<any>(
    'SELECT DISTINCT date FROM vitamin_log WHERE date LIKE ?',
    [prefix]
  );
  return new Set(rows.map((r) => r.date));
}

export function vitaminStreak(upTo: string): number {
  const rows = db.getAllSync<any>(
    'SELECT DISTINCT date FROM vitamin_log WHERE date <= ? ORDER BY date DESC LIMIT 3660',
    [upTo]
  );
  const dates = new Set(rows.map((r) => r.date));
  let streak = 0;
  let cursor = upTo;
  // Today doesn't break the streak if not yet checked
  if (!dates.has(cursor)) {
    cursor = shiftDay(cursor, -1);
  }
  while (dates.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

function shiftDay(s: string, n: number): string {
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d + n);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

// Photos

export function listPhotos(): Photo[] {
  return db.getAllSync<any>('SELECT * FROM photos ORDER BY date DESC, id DESC').map((r) => ({
    id: r.id,
    date: r.date,
    uri: r.uri,
    note: r.note,
    entryId: r.entry_id,
  }));
}

export function insertPhoto(p: { date: string; uri: string; note: string; entryId: number | null }): number {
  const res = db.runSync('INSERT INTO photos (date, uri, note, entry_id) VALUES (?, ?, ?, ?)', [
    p.date, p.uri, p.note, p.entryId,
  ]);
  return res.lastInsertRowId;
}

export function deletePhoto(id: number): void {
  db.runSync('DELETE FROM photos WHERE id = ?', [id]);
}

// Settings

export function getSetting(key: string, fallback: string): string {
  const row = db.getFirstSync<any>('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : fallback;
}

export function setSetting(key: string, value: string): void {
  db.runSync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}

// Export

export function exportAllData(): string {
  const data = {
    exportedAt: new Date().toISOString(),
    entries: db.getAllSync('SELECT * FROM entries ORDER BY date'),
    entryProducts: db.getAllSync('SELECT * FROM entry_products'),
    products: db.getAllSync('SELECT * FROM products'),
    vitamins: db.getAllSync('SELECT * FROM vitamins'),
    vitaminLog: db.getAllSync('SELECT * FROM vitamin_log ORDER BY date'),
    photos: db.getAllSync('SELECT * FROM photos ORDER BY date'),
    settings: db.getAllSync('SELECT * FROM settings'),
  };
  return JSON.stringify(data, null, 2);
}
