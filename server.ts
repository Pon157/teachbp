import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db, initDb } from './src/lib/db.ts';
import { users, courses, courseBlocks, notifications, messages, certificates, userProgress, homeworks } from './src/lib/schema.ts';
import { eq, and, or, desc } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123';

async function startServer() {
  await initDb();
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

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

  // --- Captcha ---
  const captchas = new Map<string, string>();
  app.get('/api/captcha', (req, res) => {
    const id = uuidv4();
    const num1 = Math.floor(Math.random() * 10);
    const num2 = Math.floor(Math.random() * 10);
    const answer = (num1 + num2).toString();
    captchas.set(id, answer);
    res.json({ id, question: `Сколько будет ${num1} + ${num2}?` });
  });

  // --- Auth Routes ---
  app.post('/api/auth/register', async (req, res) => {
    const { name, surname, email, password, captchaId, captchaAnswer } = req.body;
    
    if (captchas.get(captchaId) !== captchaAnswer) {
      return res.status(400).json({ error: 'Неверная капча' });
    }
    captchas.delete(captchaId);

    const existingUser = await db.select().from(users).where(eq(users.email, email)).get();
    if (existingUser) return res.status(400).json({ error: 'Email уже занят' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    
    // Check if it's the first user - make them admin
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
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.json({ message: 'Success' });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password, captchaId, captchaAnswer } = req.body;
    
    if (captchaId && captchas.get(captchaId) !== captchaAnswer) {
        return res.status(400).json({ error: 'Неверная капча' });
    }
    if (captchaId) captchas.delete(captchaId);

    const user = await db.select().from(users).where(eq(users.email, email)).get();
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.json({ message: 'Success' });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
  });

  app.get('/api/auth/me', authenticate, async (req: any, res) => {
    const user = await db.select().from(users).where(eq(users.id, req.userId)).get();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // --- Profile Routes ---
  app.put('/api/profile', authenticate, async (req: any, res) => {
    const { name, surname, bio, avatar, theme, language } = req.body;
    await db.update(users).set({ name, surname, bio, avatar, theme, language }).where(eq(users.id, req.userId));
    res.json({ message: 'Profile updated' });
  });

  app.get('/api/users/:id', authenticate, async (req, res) => {
    const user = await db.select().from(users).where(eq(users.id, req.params.id)).get();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // --- Admin Routes ---
  app.get('/api/admin/users', authenticate, async (req: any, res) => {
    const admin = await db.select().from(users).where(eq(users.id, req.userId)).get();
    if (admin?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const allUsers = await db.select().from(users);
    res.json(allUsers.map(({ password: _, ...u }) => u));
  });

  app.post('/api/admin/assign-role', authenticate, async (req: any, res) => {
    const admin = await db.select().from(users).where(eq(users.id, req.userId)).get();
    if (admin?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { userId, role } = req.body;
    await db.update(users).set({ role }).where(eq(users.id, userId));
    res.json({ message: 'Role assigned' });
  });

  app.post('/api/admin/assign-curator', authenticate, async (req: any, res) => {
    const admin = await db.select().from(users).where(eq(users.id, req.userId)).get();
    if (admin?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { studentId, curatorId } = req.body;
    await db.update(users).set({ curatorId }).where(eq(users.id, studentId));
    
    // Notify student
    await db.insert(notifications).values({
        id: uuidv4(),
        userId: studentId,
        message: 'Вам назначен новый куратор',
        type: 'curator_assigned',
        createdAt: new Date()
    });

    // Notify curator
    await db.insert(notifications).values({
        id: uuidv4(),
        userId: curatorId,
        message: 'Вам назначен новый ученик',
        type: 'new_student',
        createdAt: new Date()
    });

    res.json({ message: 'Curator assigned' });
  });

  // --- Course Routes ---
  app.get('/api/courses', authenticate, async (req, res) => {
    const allCourses = await db.select().from(courses).where(eq(courses.status, 'published'));
    res.json(allCourses);
  });

  app.post('/api/courses', authenticate, async (req: any, res) => {
    const user = await db.select().from(users).where(eq(users.id, req.userId)).get();
    if (user?.role !== 'teacher' && user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    
    const { title, description, estimatedTime, imageUrl } = req.body;
    const courseId = uuidv4();
    await db.insert(courses).values({
      id: courseId,
      title,
      description,
      authorId: req.userId,
      status: 'draft',
      estimatedTime,
      imageUrl,
      createdAt: new Date()
    });
    res.json({ id: courseId });
  });

  app.get('/api/courses/:id', authenticate, async (req, res) => {
    const course = await db.select().from(courses).where(eq(courses.id, req.params.id)).get();
    const blocks = await db.select().from(courseBlocks).where(eq(courseBlocks.courseId, req.params.id)).orderBy(courseBlocks.order);
    res.json({ ...course, blocks });
  });

  app.post('/api/courses/:id/blocks', authenticate, async (req: any, res) => {
    const user = await db.select().from(users).where(eq(users.id, req.userId)).get();
    const course = await db.select().from(courses).where(eq(courses.id, req.params.id)).get();
    if (course?.authorId !== req.userId && user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    
    const { title, content, order } = req.body;
    const blockId = uuidv4();
    await db.insert(courseBlocks).values({ id: blockId, courseId: req.params.id, title, content, order });
    res.json({ id: blockId });
  });

  app.post('/api/courses/:id/publish', authenticate, async (req: any, res) => {
    const user = await db.select().from(users).where(eq(users.id, req.userId)).get();
    if (user?.role !== 'admin') return res.status(403).json({ error: 'Only admin can approve courses' });
    
    await db.update(courses).set({ status: 'published' }).where(eq(courses.id, req.params.id));
    
    // Notify all users about new course
    const allUsers = await db.select().from(users);
    for (const u of allUsers) {
        await db.insert(notifications).values({
            id: uuidv4(),
            userId: u.id,
            message: `Появился новый блок заданий: ${req.body.title || 'Новый курс'}`,
            type: 'new_block',
            createdAt: new Date()
        });
    }

    res.json({ message: 'Published' });
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
    const msgId = uuidv4();
    await db.insert(messages).values({
        id: msgId,
        senderId: req.userId,
        receiverId,
        content,
        createdAt: new Date()
    });
    res.json({ id: msgId });
  });

  // --- Notifications ---
  app.get('/api/notifications', authenticate, async (req: any, res) => {
    const userNotifications = await db.select().from(notifications).where(eq(notifications.userId, req.userId)).orderBy(desc(notifications.createdAt));
    res.json(userNotifications);
  });

  app.post('/api/notifications/:id/read', authenticate, async (req: any, res) => {
    await db.update(notifications).set({ read: true }).where(and(eq(notifications.id, req.params.id), eq(notifications.userId, req.userId)));
    res.json({ message: 'Read' });
  });

  // --- Progress & Certificates ---
  app.post('/api/progress/complete-block', authenticate, async (req: any, res) => {
    const { blockId, homeworkResponse } = req.body;
    const progressId = uuidv4();
    await db.insert(userProgress).values({
        id: progressId,
        userId: req.userId,
        blockId,
        status: 'completed',
        homeworkResponse,
        updatedAt: new Date()
    });
    
    // Notify creator/curator maybe? user wants bell notification
    await db.insert(notifications).values({
        id: uuidv4(),
        userId: req.userId,
        message: 'Вы успешно прошли учебный блок!',
        type: 'course_pass',
        createdAt: new Date()
    });

    res.json({ message: 'Completed' });
  });

  app.post('/api/certificates', authenticate, async (req: any, res) => {
    const { courseIds } = req.body; // array of names
    const certId = uuidv4();
    const shareId = Math.random().toString(36).substring(2, 10).toUpperCase();
    await db.insert(certificates).values({
        id: certId,
        userId: req.userId,
        courseIds: JSON.stringify(courseIds),
        shareId,
        createdAt: new Date()
    });
    res.json({ id: certId, shareId });
  });

  app.get('/api/certificates', authenticate, async (req: any, res) => {
    const certs = await db.select().from(certificates).where(eq(certificates.userId, req.userId));
    res.json(certs);
  });

  app.get('/api/verify-certificate/:shareId', async (req, res) => {
    const cert = await db.select().from(certificates).where(eq(certificates.shareId, req.params.shareId)).get();
    if (!cert) return res.status(404).json({ error: 'Certificate not found' });
    const user = await db.select().from(users).where(eq(users.id, cert.userId)).get();
    res.json({ cert, user: { name: user?.name, surname: user?.surname, avatar: user?.avatar } });
  });

  // --- Vite setup ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
