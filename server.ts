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
import { eq, and, or, desc } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123';

async function startServer() {
  // Initialize DB in background to prevent hanging server startup
  initDb().catch(err => console.error('Critical DB init error:', err));
  
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());
 
  // --- Email Transporter ---
  let transporter: nodemailer.Transporter | null = null;
  
  const sendEmail = async (to: string, subject: string, html: string) => {
    if (!transporter) {
      console.log('------------------------------------------');
      console.log(`[EMAIL SIMULATION] To: ${to}, Subject: ${subject}`);
      console.log(`Content snippet: ${html.substring(0, 100)}...`);
      // Extract code for easy access in dev
      const codeMatch = html.match(/<b>(\d+)<\/b>/);
      if (codeMatch) console.log(`[CODE]: ${codeMatch[1]}`);
      console.log('------------------------------------------');
      return;
    }
    
    try {
      const mailPromise = transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@botsupport.edu',
        to,
        subject,
        html,
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Email sending timed out')), 8000)
      );

      await Promise.race([mailPromise, timeoutPromise]);
    } catch (err) {
      console.error('Nodemailer error:', err);
      throw err;
    }
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

    // Basic regex check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Некорректный формат email' });
    }

    // Verify domain exists (simple check)
    const domain = email.split('@')[1];
    try {
      await new Promise((resolve, reject) => {
        dns.resolveMx(domain, (err, addresses) => {
          if (err || !addresses || addresses.length === 0) {
            // Try A record if MX fails
            dns.resolve(domain, (err2) => {
              if (err2) reject(new Error('Domain invalid'));
              else resolve(true);
            });
          } else resolve(true);
        });
      });
    } catch (err) {
      return res.status(400).json({ error: 'Почтовый домен не существует' });
    }
 
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    emailCodes.set(email, { code, expires: Date.now() + 10 * 60 * 1000 });
 
    try {
      await sendEmail(
        email, 
        'Код подтверждения BotSupport', 
        `<h1>Добро пожаловать в BotSupport!</h1><p>Ваш код подтверждения: <b>${code}</b></p><p>Код действителен 10 минут.</p>`
      );
      res.json({ message: 'Код отправлен на почту' });
    } catch (err) {
      console.error('Email error:', err);
      res.status(500).json({ error: 'Ошибка при отправке почты' });
    }
  });
 
  // --- Auth Routes ---
  app.post('/api/auth/register', async (req, res) => {
    let { name, surname, email, password, code, captchaId, captchaAnswer } = req.body;
    email = email.toLowerCase().trim();
    
    // Check Captcha
    if (captchas.get(captchaId) !== captchaAnswer) {
      return res.status(400).json({ error: 'Неверная капча' });
    }
    captchas.delete(captchaId);

    // Check Email Code
    const stored = emailCodes.get(email);
    if (!stored || stored.code !== code || stored.expires < Date.now()) {
      return res.status(400).json({ error: 'Неверный или просроченный код из письма' });
    }
    emailCodes.delete(email);

    const existingUser = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
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
    
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || req.hostname.includes('run.app');
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: isHttps, 
      sameSite: isHttps ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });
    res.json({ message: 'Success' });
  });

  app.post('/api/auth/login', async (req, res) => {
    let { email, password, captchaId, captchaAnswer } = req.body;
    email = email.toLowerCase().trim();
    
    // Check Captcha
    if (captchaId && captchas.get(captchaId) !== captchaAnswer) {
      return res.status(400).json({ error: 'Неверная капча' });
    }
    if (captchaId) captchas.delete(captchaId);

    const user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || req.hostname.includes('run.app');
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: isHttps, 
      sameSite: isHttps ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });
    res.json({ message: 'Success' });
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    let { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    email = email.toLowerCase().trim();

    const user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    emailCodes.set(`reset:${email}`, { code, expires: Date.now() + 10 * 60 * 1000 });

    try {
      await sendEmail(
        email,
        'Сброс пароля BotSupport',
        `<h1>Сброс пароля</h1><p>Ваш код для сброса пароля: <b>${code}</b></p><p>Код действителен 10 минут.</p>`
      );
      res.json({ message: 'Код сброса отправлен на почту' });
    } catch (err) {
      res.status(500).json({ error: 'Ошибка при отправке почты' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    let { email, code, newPassword } = req.body;
    email = email.toLowerCase().trim();
    
    const stored = emailCodes.get(`reset:${email}`);
    if (!stored || stored.code !== code || stored.expires < Date.now()) {
      return res.status(400).json({ error: 'Неверный или просроченный код' });
    }
    emailCodes.delete(`reset:${email}`);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: hashedPassword }).where(eq(users.email, email));

    res.json({ message: 'Пароль успешно изменен' });
  });

  app.post('/api/auth/logout', (req, res) => {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || req.hostname.includes('run.app');
    res.clearCookie('token', {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/'
    });
    res.json({ message: 'Logged out' });
  });

  app.get('/api/auth/me', authenticate, async (req: any, res) => {
    const user = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
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
    const user = (await db.select().from(users).where(eq(users.id, req.params.id)).limit(1))[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // --- Admin Routes ---
  app.get('/api/admin/users', authenticate, async (req: any, res) => {
    const admin = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
    if (admin?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const allUsers = await db.select().from(users);
    res.json(allUsers.map(({ password: _, ...u }) => u));
  });

  app.post('/api/admin/assign-role', authenticate, async (req: any, res) => {
    const admin = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
    if (admin?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { userId, role } = req.body;
    await db.update(users).set({ role }).where(eq(users.id, userId));
    res.json({ message: 'Role assigned' });
  });

  app.post('/api/admin/assign-curator', authenticate, async (req: any, res) => {
    const admin = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
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
    const user = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
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
    const course = (await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1))[0];
    const blocks = await db.select().from(courseBlocks).where(eq(courseBlocks.courseId, req.params.id)).orderBy(courseBlocks.order);
    res.json({ ...course, blocks });
  });

  app.post('/api/courses/:id/blocks', authenticate, async (req: any, res) => {
    const user = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
    const course = (await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1))[0];
    if (course?.authorId !== req.userId && user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    
    const { title, content, order } = req.body;
    const blockId = uuidv4();
    await db.insert(courseBlocks).values({ id: blockId, courseId: req.params.id, title, content, order });
    res.json({ id: blockId });
  });

  app.post('/api/courses/:id/publish', authenticate, async (req: any, res) => {
    const user = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
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
