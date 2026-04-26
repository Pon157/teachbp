import { drizzle } from 'drizzle-orm/sqlite3';
import sqlite3 from 'sqlite3';
import * as schema from './schema.ts';

const sqlite = new sqlite3.Database('database.sqlite');
export const db = drizzle(sqlite, { schema });

// Initialize database
export async function initDb() {
  // Simple table creation for SQLite if not exists
  // In a real project we'd use migrations, but for simple applet this is okay
  // or we can run drizzle-kit push
  
  // Actually, drizzle-kit push is better. But I'll do a basic CREATE TABLE if needed or just use the tool.
  // I will use direct SQL for initialization to ensure it works in this env without extra commands if possible.
  
  sqlite.serialize(() => {
    sqlite.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      surname TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      avatar TEXT,
      bio TEXT,
      role TEXT DEFAULT 'student',
      curator_id TEXT,
      theme TEXT DEFAULT 'light',
      language TEXT DEFAULT 'ru',
      stats TEXT,
      created_at INTEGER NOT NULL
    )`);

    sqlite.run(`CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      author_id TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      estimated_time TEXT,
      image_url TEXT,
      created_at INTEGER NOT NULL
    )`);

    sqlite.run(`CREATE TABLE IF NOT EXISTS course_blocks (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      "order" INTEGER NOT NULL
    )`);

    sqlite.run(`CREATE TABLE IF NOT EXISTS homeworks (
      id TEXT PRIMARY KEY,
      block_id TEXT NOT NULL,
      description TEXT NOT NULL
    )`);

    sqlite.run(`CREATE TABLE IF NOT EXISTS user_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      block_id TEXT NOT NULL,
      status TEXT DEFAULT 'unlocked',
      homework_response TEXT,
      grade TEXT,
      updated_at INTEGER NOT NULL
    )`);

    sqlite.run(`CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )`);

    sqlite.run(`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`);

    sqlite.run(`CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_ids TEXT NOT NULL,
      share_id TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    )`);
  });
}
