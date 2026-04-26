import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  surname: text('surname').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  avatar: text('avatar'),
  bio: text('bio'),
  role: text('role').$type<'student' | 'curator' | 'teacher' | 'admin'>().default('student'),
  curatorId: text('curator_id').references(() => users.id),
  theme: text('theme').default('light'),
  language: text('language').default('ru'),
  stats: text('stats'), // JSON string: { completedCourses: number, totalArticles: number, rank: string }
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const courses = sqliteTable('courses', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  authorId: text('author_id').notNull().references(() => users.id),
  status: text('status').$type<'draft' | 'pending' | 'published'>().default('draft'),
  estimatedTime: text('estimated_time'),
  imageUrl: text('image_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const courseBlocks = sqliteTable('course_blocks', {
  id: text('id').primaryKey(),
  courseId: text('course_id').notNull().references(() => courses.id),
  title: text('title').notNull(),
  content: text('content').notNull(), // HTML string
  order: integer('order').notNull(),
});

export const homeworks = sqliteTable('homeworks', {
  id: text('id').primaryKey(),
  blockId: text('block_id').notNull().references(() => courseBlocks.id),
  description: text('description').notNull(),
});

export const userProgress = sqliteTable('user_progress', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  blockId: text('block_id').notNull().references(() => courseBlocks.id),
  status: text('status').$type<'unlocked' | 'completed'>().default('unlocked'),
  homeworkResponse: text('homework_response'),
  grade: text('grade'), // 'accepted', 'rejected', null
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  message: text('message').notNull(),
  type: text('type').notNull(), // 'course_pass', 'new_message', 'new_block', 'curator_assigned'
  read: integer('read', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  senderId: text('sender_id').notNull().references(() => users.id),
  receiverId: text('receiver_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const certificates = sqliteTable('certificates', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  courseIds: text('course_ids').notNull(), // JSON string: string[]
  shareId: text('share_id').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
