import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL is not set. Database operations will fail.');
}

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });

// Initialize database
export async function initDb() {
  console.log('Initializing PostgreSQL database tables...');
  
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
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
      stats JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      author_id TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      estimated_time TEXT,
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS course_blocks (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      "order" INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS homeworks (
      id TEXT PRIMARY KEY,
      block_id TEXT NOT NULL,
      description TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS user_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      block_id TEXT NOT NULL,
      status TEXT DEFAULT 'unlocked',
      homework_response TEXT,
      grade TEXT,
      feedback TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      link TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      course_ids TEXT NOT NULL,
      share_id TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS profile_comments (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_avatar TEXT,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  ];

  try {
    const client = await pool.connect();
    for (const query of queries) {
      await client.query(query);
    }

    // Database schema migrations
    const alterHomeworks = [
      `ALTER TABLE homeworks ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'open'`,
      `ALTER TABLE homeworks ADD COLUMN IF NOT EXISTS options JSONB`,
      `ALTER TABLE homeworks ADD COLUMN IF NOT EXISTS correct_answer TEXT`,
      `ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS feedback TEXT`,
      `ALTER TABLE profile_comments ADD COLUMN IF NOT EXISTS likes JSONB`,
      `ALTER TABLE profile_comments ADD COLUMN IF NOT EXISTS replies JSONB`
    ];
    for (const query of alterHomeworks) {
      try {
        await client.query(query);
      } catch (err) {
        console.warn('Migration query warning/ignored:', query, err);
      }
    }

    // Alter user_progress column homework_response to jsonb if it is not already jsonb
    try {
      const checkRes = await client.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'user_progress' AND column_name = 'homework_response'
      `);
      if (checkRes.rows.length > 0 && checkRes.rows[0].data_type !== 'jsonb') {
        await client.query(`
          ALTER TABLE user_progress ALTER COLUMN homework_response TYPE JSONB USING (
            CASE 
              WHEN homework_response IS NULL OR homework_response = '' THEN NULL
              ELSE to_jsonb(homework_response)
            END
          )
        `);
        console.log('Successfully altered user_progress.homework_response column to JSONB');
      }
    } catch (err) {
      console.warn('Failed to alter user_progress.homework_response:', err);
    }

    client.release();
    console.log('Database tables initialized successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}
