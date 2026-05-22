import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import dns from 'dns';
import { v4 as uuidv4 } from 'uuid';
import { db, initDb } from './src/lib/db.ts';
import { users, courses, courseBlocks, notifications, messages, certificates, userProgress, homeworks } from './src/lib/schema.ts';
import { eq, and, or, desc, asc } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123';

async function startServer() {
  console.log('Starting server...');
  
  // Initialize DB
  try {
    await initDb();
    console.log('DB Init successful');
  } catch (err) {
    console.error('DB Init failed:', err);
  }
  
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // --- Email Transporter (Simulation by default) ---
  const sendEmail = async (to: string, subject: string, html: string) => {
    console.log('------------------------------------------');
    console.log(`[EMAIL SIMULATION] To: ${to}, Subject: ${subject}`);
    const codeMatch = html.match(/<b>(\d+)<\/b>/);
    if (codeMatch) console.log(`[CODE]: ${codeMatch[1]}`);
    console.log('------------------------------------------');
  };

  // --- Auth Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.userId = decoded.userId;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // --- Captcha & Email Codes ---
  const captchas = new Map<string, string>();
  const emailCodes = new Map<string, { code: string, expires: number }>();

  app.get('/api/captcha', (req, res) => {
    const id = uuidv4();
    const num1 = Math.floor(Math.random() * 10);
    const num2 = Math.floor(Math.random() * 10);
    const answer = (num1 + num2).toString();
    captchas.set(id, answer);
    res.json({ id, question: `Сколько будет ${num1} + ${num2}?` });
  });

  app.post('/api/auth/send-code', async (req, res) => {
    let { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    email = email.toLowerCase().trim();

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    emailCodes.set(email, { code, expires: Date.now() + 10 * 60 * 1000 });

    try {
      await sendEmail(email, 'Код подтверждения', `Ваш код: <b>${code}</b>`);
      res.json({ message: 'Код отправлен' });
    } catch (err) {
      res.status(500).json({ error: 'Ошибка почты' });
    }
  });

  // --- Auth Routes ---
  app.post('/api/auth/register', async (req, res) => {
    let { name, surname, email, password, code, captchaId, captchaAnswer } = req.body;
    email = email.toLowerCase().trim();
    
    if (captchas.get(captchaId) !== captchaAnswer) return res.status(400).json({ error: 'Неверная капча' });
    const stored = emailCodes.get(email);
    if (!stored || stored.code !== code || stored.expires < Date.now()) return res.status(400).json({ error: 'Неверный код' });

    const existingUser = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
    if (existingUser) return res.status(400).json({ error: 'Email занят' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const userCount = (await db.select().from(users)).length;
    const role = userCount === 0 ? 'admin' : 'student';

    await db.insert(users).values({
      id: userId,
      name,
      surname,
      email,
      password: hashedPassword,
      role,
      createdAt: new Date(),
    });

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7*24*60*60*1000, path: '/' });
    res.json({ message: 'Success' });
  });

  app.post('/api/auth/login', async (req, res) => {
    let { email, password } = req.body;
    email = email.toLowerCase().trim();
    const user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Неверный логин/пароль' });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7*24*60*60*1000, path: '/' });
    res.json({ message: 'Success' });
  });

  app.get('/api/auth/me', authenticate, async (req: any, res) => {
    const user = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token', { path: '/' });
    res.json({ message: 'Logged out' });
  });

  // --- Profile ---
  app.put('/api/profile', authenticate, async (req: any, res) => {
    const { name, surname, bio, avatar, theme, language } = req.body;
    await db.update(users).set({ name, surname, bio, avatar, theme, language }).where(eq(users.id, req.userId));
    res.json({ message: 'Updated' });
  });

  app.get('/api/users/:id', authenticate, async (req, res) => {
    const user = (await db.select().from(users).where(eq(users.id, req.params.id)).limit(1))[0];
    if (!user) return res.status(404).json({ error: 'Not found' });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // --- Courses ---
  app.get('/api/courses', authenticate, async (req: any, res) => {
    const user = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
    
    let allCourses;
    if (user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'curator') {
        allCourses = await db.select().from(courses); 
    } else {
        // Students only see published courses
        allCourses = await db.select().from(courses).where(eq(courses.status, 'published'));
    }
    res.json(allCourses);
  });

  app.post('/api/courses', authenticate, async (req: any, res) => {
    const { title, description, estimatedTime, imageUrl } = req.body;
    const id = uuidv4();
    await db.insert(courses).values({
      id,
      title,
      description,
      authorId: req.userId,
      estimatedTime,
      imageUrl,
      status: 'draft',
      createdAt: new Date()
    });
    res.json({ id });
  });

  app.put('/api/courses/:id', authenticate, async (req: any, res) => {
    const { title, description, estimatedTime, imageUrl } = req.body;
    const user = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
    const course = (await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1))[0];
    
    if (course?.authorId !== req.userId && user?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    await db.update(courses).set({ 
        title, 
        description, 
        estimatedTime, 
        imageUrl 
    }).where(eq(courses.id, req.params.id));
    
    res.json({ message: 'Updated' });
  });

  app.delete('/api/courses/:id', authenticate, async (req: any, res) => {
    const user = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
    const course = (await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1))[0];
    
    if (course?.authorId !== req.userId && user?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    await db.delete(courseBlocks).where(eq(courseBlocks.courseId, req.params.id));
    await db.delete(courses).where(eq(courses.id, req.params.id));
    res.json({ message: 'Deleted' });
  });

  app.get('/api/courses/:id', authenticate, async (req: any, res) => {
    const user = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
    
    // Curator Check for Students
    if (user?.role === 'student' && !user.curatorId) {
        return res.status(403).json({ error: 'Вам еще не назначен куратор. Вы не можете проходить обучение до назначения куратора.' });
    }

    const course = (await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1))[0];
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const blocks = await db.select().from(courseBlocks).where(eq(courseBlocks.courseId, req.params.id)).orderBy(asc(courseBlocks.order));
    
    // Fetch homeworks for blocks
    const blocksWithHomework: any[] = [];
    for (const block of blocks) {
        const blockHomeworks = await db.select().from(homeworks).where(eq(homeworks.blockId, block.id));
        blocksWithHomework.push({ ...block, homeworks: blockHomeworks });
    }

    res.json({ ...course, blocks: blocksWithHomework });
  });

  app.post('/api/courses/:id/blocks', authenticate, async (req: any, res) => {
    const { title, content, order, tasks } = req.body;
    const id = uuidv4();
    await db.insert(courseBlocks).values({ id, courseId: req.params.id, title, content, order });
    
    if (tasks && Array.isArray(tasks)) {
        for (const task of tasks) {
            await db.insert(homeworks).values({
                id: uuidv4(),
                blockId: id,
                type: task.type || 'open',
                description: task.description,
                options: task.options,
                correctAnswer: task.correctAnswer
            });
        }
    }

    res.json({ id });
  });

  app.post('/api/courses/:id/publish', authenticate, async (req: any, res) => {
    const user = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
    if (user?.role !== 'admin') return res.status(403).json({ error: 'Only admin can approve courses' });
    
    await db.update(courses).set({ status: 'published' }).where(eq(courses.id, req.params.id));
    res.json({ message: 'Published' });
  });

  app.post('/api/courses/:id/clear-blocks', authenticate, async (req: any, res) => {
    const user = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
    const course = (await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1))[0];
    
    if (course?.authorId !== req.userId && user?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const oldBlocks = await db.select().from(courseBlocks).where(eq(courseBlocks.courseId, req.params.id));
    for (const b of oldBlocks) {
        await db.delete(homeworks).where(eq(homeworks.blockId, b.id));
    }
    await db.delete(courseBlocks).where(eq(courseBlocks.courseId, req.params.id));
    res.json({ message: 'Cleared' });
  });

  // --- Admin ---
  app.get('/api/admin/users', authenticate, async (req: any, res) => {
    const admin = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
    if (admin?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const all = await db.select().from(users);
    res.json(all.map(({ password, ...u }) => u));
  });

  app.post('/api/admin/assign-role', authenticate, async (req: any, res) => {
    const requester = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
    if (requester?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const { userId, role } = req.body;
    await db.update(users).set({ role }).where(eq(users.id, userId));
    res.json({ message: 'Ok' });
  });

  app.post('/api/admin/assign-curator', authenticate, async (req: any, res) => {
    const requester = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
    if (requester?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const { studentId, curatorId } = req.body;
    await db.update(users).set({ curatorId }).where(eq(users.id, studentId));
    res.json({ message: 'Ok' });
  });

  app.delete('/api/admin/users/:id', authenticate, async (req: any, res) => {
    const requester = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
    if (requester?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    if (req.params.id === req.userId) {
      return res.status(400).json({ error: 'Вы не можете удалить свою собственную учётную запись' });
    }

    try {
      // Delete any dependent records
      await db.delete(userProgress).where(eq(userProgress.userId, req.params.id));
      await db.delete(certificates).where(eq(certificates.userId, req.params.id));
      await db.delete(messages).where(or(eq(messages.senderId, req.params.id), eq(messages.receiverId, req.params.id)));
      await db.delete(notifications).where(eq(notifications.userId, req.params.id));
      
      await db.delete(users).where(eq(users.id, req.params.id));
      res.json({ message: 'User deleted successfully' });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Ошибка сервера при удалении пользователя' });
    }
  });

  // --- Messaging ---
  app.get('/api/messages/:otherId', authenticate, async (req: any, res) => {
    const chat = await db.select().from(messages).where(
      or(
        and(eq(messages.senderId, req.userId), eq(messages.receiverId, req.params.otherId)),
        and(eq(messages.senderId, req.params.otherId), eq(messages.receiverId, req.userId))
      )
    ).orderBy(desc(messages.createdAt));
    res.json(chat);
  });

  app.post('/api/messages', authenticate, async (req: any, res) => {
    const { receiverId, content } = req.body;
    const id = uuidv4();
    await db.insert(messages).values({ id, senderId: req.userId, receiverId, content, createdAt: new Date() });
    res.json({ id });
  });

  // --- Notifications ---
  app.get('/api/notifications', authenticate, async (req: any, res) => {
    const all = await db.select().from(notifications).where(eq(notifications.userId, req.userId)).orderBy(desc(notifications.createdAt));
    res.json(all);
  });

  // --- Progress ---
  app.get('/api/progress/:courseId', authenticate, async (req: any, res) => {
    const blocks = await db.select().from(courseBlocks).where(eq(courseBlocks.courseId, req.params.courseId));
    const blockIds = blocks.map(b => b.id);
    if (blockIds.length === 0) return res.json([]);
    
    const progress = await db.select().from(userProgress).where(
        and(eq(userProgress.userId, req.userId), or(...blockIds.map(id => eq(userProgress.blockId, id))))
    );
    res.json(progress);
  });

  app.post('/api/progress/complete-block', authenticate, async (req: any, res) => {
    const { blockId, homeworkResponse } = req.body;
    const existing = (await db.select().from(userProgress).where(
        and(eq(userProgress.userId, req.userId), eq(userProgress.blockId, blockId))
    ).limit(1))[0];

    if (existing) {
        await db.update(userProgress).set({
            homeworkResponse,
            status: 'completed',
            updatedAt: new Date()
        }).where(eq(userProgress.id, existing.id));
    } else {
        await db.insert(userProgress).values({
            id: uuidv4(),
            userId: req.userId,
            blockId,
            homeworkResponse,
            status: 'completed',
            updatedAt: new Date()
        });
    }
    res.json({ message: 'Success' });
  });

  // --- Certificates ---
  app.get('/api/verify-certificate/:shareId', async (req, res) => {
    const cert = (await db.select().from(certificates).where(eq(certificates.shareId, req.params.shareId)).limit(1))[0];
    if (!cert) return res.status(404).json({ error: 'Not found' });

    const user = (await db.select().from(users).where(eq(users.id, cert.userId)).limit(1))[0];
    res.json({ cert, user: user ? { name: user.name, surname: user.surname } : null });
  });

  // --- Vite ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
