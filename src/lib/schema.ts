import { pgTable, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
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
  stats: jsonb('stats'), // { completedCourses: number, totalArticles: number, rank: string }
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const courses = pgTable('courses', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  authorId: text('author_id').notNull().references(() => users.id),
  status: text('status').$type<'draft' | 'pending' | 'published'>().default('draft'),
  estimatedTime: text('estimated_time'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const courseBlocks = pgTable('course_blocks', {
  id: text('id').primaryKey(),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(), // HTML string
  order: integer('order').notNull(),
});

export const homeworks = pgTable('homeworks', {
  id: text('id').primaryKey(),
  blockId: text('block_id').notNull().references(() => courseBlocks.id, { onDelete: 'cascade' }),
  type: text('type').$type<'open' | 'quiz' | 'multiple'>().default('open'),
  description: text('description').notNull(),
  options: jsonb('options'), // For quiz: string[]
  correctAnswer: text('correct_answer'), // For auto-check
});

export const userProgress = pgTable('user_progress', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  blockId: text('block_id').notNull().references(() => courseBlocks.id, { onDelete: 'cascade' }),
  status: text('status').$type<'unlocked' | 'completed' | 'submitted'>().default('unlocked'),
  homeworkResponse: jsonb('homework_response'), // Record<taskId, value>
  grade: text('grade'), // 'accepted', 'rejected', 'needs_revision', null
  feedback: text('feedback'), // Curator feedback
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  message: text('message').notNull(),
  type: text('type').notNull(), // 'course_pass', 'new_message', 'new_block', 'curator_assigned'
  read: boolean('read').default(false),
  link: text('link'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  senderId: text('sender_id').notNull().references(() => users.id),
  receiverId: text('receiver_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const certificates = pgTable('certificates', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  courseIds: text('course_ids').notNull(), // JSON string: string[]
  shareId: text('share_id').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const profileComments = pgTable('profile_comments', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  authorName: text('author_name').notNull(),
  authorAvatar: text('author_avatar'),
  content: text('content').notNull(),
  likes: jsonb('likes'), // JSON array of user IDs who liked: e.g. ["userId1", "userId2"]
  replies: jsonb('replies'), // JSON array of replies: [{ id, authorId, authorName, authorAvatar, content, createdAt }]
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
