import dotenv from 'dotenv';
import { DEFAULT_STEPS, DEFAULT_USERS, INITIAL_CARDS, DEFAULT_POLES, DEFAULT_BOARDS } from '../src/data/initialData';
import { MerchPole, CustomBoard } from '../src/types';
import { rowToCard, rowToStep, rowToUser, rowToPole, rowToBoard } from './utils/mappers';
import { hashPassword } from './utils/security';

dotenv.config();

import sqlite from 'better-sqlite3';

// SQLite database path - relative to the project root
const dbPath = process.env.DATABASE_PATH || './dev.db';
const db = new sqlite(dbPath);

let isConnectedToSqlite = false;
let initPromise: Promise<void> | null = null;

// In-memory fallback if SQLite is not yet configured
let memorySteps = [...DEFAULT_STEPS];
let memoryUsers = [...DEFAULT_USERS];
let memoryCards = [...INITIAL_CARDS];
let memoryPoles = [...DEFAULT_POLES];
let memoryBoards = [...DEFAULT_BOARDS];

// Helper function to translate Postgres $1, $2, ... placeholders to SQLite ?
// and preserve parameter mapping order
function translateQueryAndParams(sql: string, params: any[]): { sql: string; params: any[] } {
  if (!/\$[0-9]+/.test(sql)) {
    return { sql, params: params || [] };
  }
  const newParams: any[] = [];
  const newSql = sql.replace(/\$([0-9]+)/g, (_match, numStr) => {
    const idx = parseInt(numStr, 10) - 1;
    newParams.push(params && params[idx] !== undefined ? params[idx] : null);
    return '?';
  });
  return { sql: newSql, params: newParams };
}

// Helper functions for SQLite operations
function prepare(sql: string): sqlite.Statement {
  return db.prepare(sql.replace(/\$([0-9]+)/g, '?'));
}

function all<T = any>(sql: string, params: any[] = []): T[] {
  const { sql: s, params: p } = translateQueryAndParams(sql, params);
  return db.prepare(s).all(...p) as T[];
}

function get<T = any>(sql: string, params: any[] = []): T | undefined {
  const { sql: s, params: p } = translateQueryAndParams(sql, params);
  return db.prepare(s).get(...p) as T | undefined;
}

// Mappers remain the same - they parse JSON strings from SQLite TEXT columns
// and normalize dates from TIMESTAMPTZ→TEXT

export function getDb() {
  return db;
}

export function getPool() {
  return isConnectedToSqlite ? db : null;
}

export function isSqliteConnected(): boolean {
  return isConnectedToSqlite;
}

// Initialize the database schema
export function initializeSchema(): void {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create steps table
  db.exec(`
    CREATE TABLE IF NOT EXISTS steps (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) UNIQUE NOT NULL,
      order_index INT NOT NULL DEFAULT 0,
      color VARCHAR(50) NOT NULL DEFAULT '#4f46e5',
      description TEXT,
      default_checklists TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'NOW'))
    );
  `);

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'commercial',
      poste_label VARCHAR(255),
      password_hash VARCHAR(255) NOT NULL,
      avatar TEXT,
      phone VARCHAR(50),
      address TEXT,
      notes TEXT,
      brand_color VARCHAR(50),
      invited_by VARCHAR(255),
      invited_card_ids TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'NOW')),
      updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'NOW'))
    );
  `);

  // Create cards table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id VARCHAR(64) PRIMARY KEY,
      reference VARCHAR(100) NOT NULL,
      modele VARCHAR(255) NOT NULL,
      client_name VARCHAR(255) NOT NULL,
      current_step_id VARCHAR(64),
      status VARCHAR(50) NOT NULL DEFAULT 'en_cours',
      date_creation TEXT NOT NULL,
      date_livraison TEXT NOT NULL,
      due_date TEXT,
      due_date_notes TEXT,
      merchandiser_name VARCHAR(255),
      merchandiser_id VARCHAR(64),
      merchandiser_avatar TEXT,
      matiere VARCHAR(255),
      prix VARCHAR(50) DEFAULT '0',
      quantites VARCHAR(50) DEFAULT '0',
      vagues TEXT DEFAULT '[]',
      historique_note TEXT,
      dossier_technique TEXT,
      frame TEXT,
      attachments TEXT DEFAULT '[]',
      members TEXT DEFAULT '[]',
      merchandisers TEXT DEFAULT '[]',
      step_checklists TEXT DEFAULT '{}',
      labels TEXT DEFAULT '[]',
      history_logs TEXT DEFAULT '[]',
      invited_visitors TEXT DEFAULT '[]',
      comments TEXT DEFAULT '[]',
      sort_order INT,
      archived BOOLEAN DEFAULT FALSE
    );
  `);

  // Create poles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS poles (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      leader_ids TEXT DEFAULT '[]',
      leader_names TEXT DEFAULT '[]',
      description TEXT,
      color VARCHAR(50) DEFAULT 'indigo',
      phone VARCHAR(50),
      email VARCHAR(255),
      board_ids TEXT DEFAULT '[]',
      invited_visitors TEXT DEFAULT '[]',
      notes TEXT,
      created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'NOW')),
      updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'NOW'))
    );
  `);

  // Create boards table
  db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      color VARCHAR(50) DEFAULT 'indigo',
      background_image TEXT,
      card_ids TEXT DEFAULT '[]',
      steps TEXT DEFAULT '[]',
      pole_id VARCHAR(64),
      invited_visitors TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'NOW')),
      updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'NOW'))
    );
  `);
}

// Seed default steps if empty
export async function seedInitialData(): Promise<void> {
  const stepCount = await get<{ count: string | number }>('SELECT COUNT(*) as count FROM steps');

  if (parseInt(String(stepCount?.count ?? 0), 10) === 0) {
    console.log('[SQLite] Seeding initial pipeline steps...');
    const stmt = prepare(
      `INSERT INTO steps (id, name, code, order_index, color, description, default_checklists)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`
    );
    for (const step of DEFAULT_STEPS) {
      stmt.run(
        step.id,
        step.name,
        step.code,
        step.order,
        step.color,
        step.description || '',
        JSON.stringify(step.defaultChecklists || [])
      );
    }
  }

  // Purge legacy demo accounts, demo poles and demo cards permanently
  db.exec(`
    DELETE FROM users WHERE email LIKE '%@fashionbrand.com'
      OR email LIKE '%@ateliercouture.fr'
      OR id IN ('usr-dir-1', 'usr-dir-2', 'usr-planning-1', 'usr-1', 'usr-2', 'usr-5', 'usr-6', 'usr-client-1')
      OR id LIKE 'usr-vis%';
    DELETE FROM poles WHERE id IN ('pole-sophie-lucas', 'pole-camille-alexandre');
    UPDATE boards SET pole_id = 'pole-commercial' WHERE pole_id IN ('pole-sophie-lucas', 'pole-camille-alexandre') OR pole_id IS NULL;
    DELETE FROM cards WHERE merchandiser_name IN ('Sophie Bertrand', 'Lucas Moreau', 'Camille Dupuis', 'Alexandre Martin');
  `);

  // Ensure real team accounts (Miarisoa, Lalatiana) are seeded and up-to-date
  console.log('[SQLite] Syncing real team accounts...');
  const userStmt = prepare(
    `INSERT INTO users (id, name, email, role, poste_label, password_hash, avatar, phone, address, notes, brand_color, invited_by, invited_card_ids)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       email = excluded.email,
       role = excluded.role,
       poste_label = excluded.poste_label,
       avatar = excluded.avatar`
  );
  for (const u of DEFAULT_USERS) {
    userStmt.run(
      u.id,
      u.name,
      u.email,
      u.role,
      u.posteLabel || null,
      hashPassword(u.password || '123456'),
      u.avatar || null,
      u.phone || null,
      u.address || null,
      u.notes || null,
      u.brandColor || null,
      u.invitedBy || null,
      JSON.stringify(u.invitedCardIds || [])
    );
  }

  // Seed initial cards if empty
  const cardCount = await get<{ count: string | number }>('SELECT COUNT(*) as count FROM cards');
  if (parseInt(String(cardCount?.count ?? 0), 10) === 0) {
    console.log('[SQLite] Seeding initial cards...');
    const cardStmt = prepare(
      `INSERT INTO cards (
        id, reference, modele, client_name, current_step_id, status,
        date_creation, date_livraison, due_date, due_date_notes,
        merchandiser_name, merchandiser_id, merchandiser_avatar,
        matiere, prix, quantites, vagues, historique_note,
        dossier_technique, frame, attachments, members, merchandisers,
        step_checklists, labels, history_logs, invited_visitors, comments,
        sort_order, archived
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)`
    );
    for (const card of INITIAL_CARDS) {
      cardStmt.run(
        card.id,
        card.reference,
        card.modele,
        card.clientName,
        card.currentStepId,
        card.status,
        card.dateCreation,
        card.dateLivraison,
        card.dueDate || null,
        card.dueDateNotes || null,
        card.merchandiserName || null,
        card.merchandiserId || null,
        card.merchandiserAvatar || null,
        card.descriptionSpec?.matiere || '',
        String(card.descriptionSpec?.prix || 0),
        String(card.descriptionSpec?.quantites || 0),
        JSON.stringify(card.descriptionSpec?.vagues || []),
        card.descriptionSpec?.historiqueNote || '',
        JSON.stringify(card.dossierTechnique || null),
        JSON.stringify(card.frame || null),
        JSON.stringify(card.attachments || []),
        JSON.stringify(card.members || []),
        JSON.stringify(card.merchandisers || []),
        JSON.stringify(card.stepChecklists || {}),
        JSON.stringify(card.labels || []),
        JSON.stringify(card.historyLogs || []),
        JSON.stringify(card.invitedVisitors || []),
        JSON.stringify(card.comments || []),
        card.sortOrder ?? null,
        card.archived ? 1 : 0
      );
    }
  }

  // Seed initial poles if empty
  const poleCount = await get<{ count: string | number }>('SELECT COUNT(*) as count FROM poles');
  if (parseInt(String(poleCount?.count ?? 0), 10) === 0) {
    console.log('[SQLite] Seeding initial poles...');
    const poleStmt = prepare(
      `INSERT INTO poles (id, name, leader_ids, leader_names, description, color, phone, email, board_ids, invited_visitors, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`
    );
    for (const pole of DEFAULT_POLES) {
      poleStmt.run(
        pole.id,
        pole.name || '',
        JSON.stringify(pole.leaderIds || []),
        JSON.stringify(pole.leaderNames || []),
        pole.description || '',
        pole.color || 'indigo',
        pole.phone || '',
        pole.email || '',
        JSON.stringify(pole.boardIds || []),
        JSON.stringify(pole.invitedVisitors || []),
        pole.notes || ''
      );
    }
  }

  // Seed initial boards if empty
  const boardCount = await get<{ count: string | number }>('SELECT COUNT(*) as count FROM boards');
  if (parseInt(String(boardCount?.count ?? 0), 10) === 0) {
    console.log('[SQLite] Seeding initial boards...');
    const boardStmt = prepare(
      `INSERT INTO boards (id, title, description, color, background_image, card_ids, steps, pole_id, invited_visitors)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`
    );
    for (const board of DEFAULT_BOARDS) {
      boardStmt.run(
        board.id,
        board.title,
        board.description || '',
        board.color || 'indigo',
        board.backgroundImage || null,
        JSON.stringify(board.cardIds || []),
        JSON.stringify(DEFAULT_STEPS),
        board.poleId || null,
        JSON.stringify(board.invitedVisitors || [])
      );
    }
  }

  // Backfill: boards created before the per-board steps feature get a
  // snapshot of the current global pipeline as their personal steps list.
  // SQLite version: read steps and aggregate in application code
  const boards = await all<{ id: string; steps: string }>("SELECT id, steps FROM boards WHERE steps IS NULL OR steps = ''");
  const allSteps = await all<{ id: string; name: string; code: string; order_index: number; color: string; description: string; default_checklists: string }>(
    'SELECT id, name, code, order_index, color, description, default_checklists FROM steps ORDER BY order_index ASC'
  );

  for (const board of boards) {
    // Already has steps, skip
    if (board.steps && board.steps !== '[]') {
      continue;
    }
    // Aggregate steps into JSON array of objects
    const stepObjects = all<any>('SELECT id, name, code, order_index, color, description, default_checklists FROM steps ORDER BY order_index ASC');
    const aggregated = stepObjects.map((s: any) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      order: s.order_index,
      color: s.color,
      description: s.description,
      defaultChecklists: s.default_checklists || [],
    }));
    const stepsData = JSON.stringify(aggregated);

    prepare('UPDATE boards SET steps = ? WHERE id = ?').run(stepsData, board.id);
  }

  // Hydrate the in-memory mirrors from the database
  const hydratedSteps = all<any>('SELECT * FROM steps ORDER BY order_index ASC');
  const hydratedUsers = all<any>('SELECT * FROM users ORDER BY name ASC');
  const hydratedCards = all<any>('SELECT * FROM cards ORDER BY created_at DESC');
  const hydratedPoles = all<any>('SELECT * FROM poles ORDER BY created_at ASC');
  const hydratedBoards = all<any>('SELECT * FROM boards ORDER BY created_at ASC');

  memorySteps = hydratedSteps.map(rowToStep);
  memoryUsers = hydratedUsers.map(rowToUser);
  memoryCards = hydratedCards.map(rowToCard);
  memoryPoles = hydratedPoles.map(rowToPole);
  memoryBoards = hydratedBoards.map(rowToBoard);

  isConnectedToSqlite = true;
  console.log('[SQLite] Database initialized and hydrated successfully.');
}

export async function initDatabase(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      initializeSchema();
      await seedInitialData();
    } catch (err: any) {
      console.warn('[SQLite] Initialization error:', err.message);
      isConnectedToSqlite = false;
    }
  })();

  return initPromise;
}

// Query function - compatible with existing route code structure
// Uses COALESCE patterns and JSON handling adapted for SQLite TEXT columns
export async function query<T = any>(text: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
  try {
    const { sql, params: mappedParams } = translateQueryAndParams(text, params);
    const stmt = db.prepare(sql);
    if (stmt.reader) {
      const results = stmt.all(...mappedParams) as T[];
      return {
        rows: results,
        rowCount: results.length,
      };
    } else {
      const info = stmt.run(...mappedParams);
      return {
        rows: [],
        rowCount: info.changes,
      };
    }
  } catch (err: any) {
    console.warn('[SQLite query notice]:', err?.message);
    throw err;
  }
}

// Memory fallback helpers
export const memoryDb = {
  getSteps: () => memorySteps,
  setSteps: (steps: typeof memorySteps) => { memorySteps = steps; },
  getUsers: () => memoryUsers,
  setUsers: (users: typeof memoryUsers) => { memoryUsers = users; },
  getCards: () => memoryCards,
  setCards: (cards: typeof memoryCards) => { memoryCards = cards; },
  getPoles: () => memoryPoles,
  setPoles: (poles: MerchPole[]) => { memoryPoles = poles; },
  getBoards: () => memoryBoards,
  setBoards: (boards: CustomBoard[]) => { memoryBoards = boards; },
  isConnected: () => isConnectedToSqlite,
};