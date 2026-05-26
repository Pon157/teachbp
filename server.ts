import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import dns from 'dns';
import { v4 as uuidv4 } from 'uuid';
import { db, initDb } from './src/lib/db.ts';
import { users, courses, courseBlocks, notifications, messages, certificates, userProgress, homeworks, profileComments, blockDiscussions } from './src/lib/schema.ts';
import { eq, and, or, desc, asc, ne, ilike } from 'drizzle-orm';

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
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // --- Email Transporter (SMTP + Fallback) ---
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });

  const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"TeachBP Support" <${process.env.SMTP_USER}>`,
          to,
          subject,
          html,
        });
        console.log(`[EMAIL SUCCESS] Real message dispatched to ${to}`);
        return true;
      } catch (err) {
        console.error(`[EMAIL ERROR] SMTP dispatch failed to ${to}:`, err);
      }
    }
    console.log('------------------------------------------');
    console.log(`[EMAIL SIMULATION FALLBACK] To: ${to}, Subject: ${subject}`);
    const codeMatch = html.match(/<b>(\d+)<\/b>/);
    if (codeMatch) console.log(`[CODE]: ${codeMatch[1]}`);
    console.log('------------------------------------------');
    return false;
  };

  async function ensureStudentHasCurator(userId: string) {
    try {
      const student = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
      if (student && student.role === 'student' && !student.curatorId) {
        const allCurators = await db.select().from(users).where(eq(users.role, 'curator'));
        if (allCurators.length > 0) {
          const allWards = await db.select().from(users).where(eq(users.role, 'student'));
          const counts = allCurators.map(cur => {
            const count = allWards.filter(w => w.curatorId === cur.id).length;
            return { id: cur.id, count };
          });
          counts.sort((a, b) => a.count - b.count);
          const chosenCurator = counts[0].id;
          await db.update(users).set({ curatorId: chosenCurator }).where(eq(users.id, userId));
          
          await db.insert(notifications).values({
            id: uuidv4(),
            userId,
            message: `Вам назначен куратор! Теперь вы можете общаться в чате поддержки.`,
            type: 'info',
            read: false,
            createdAt: new Date()
          });
          console.log(`[CURATOR AUTO-ASSIGNED] Curator ${chosenCurator} allocated for Student ${userId}`);
        }
      }
    } catch (err) {
      console.error('Error auto-assigning curator:', err);
    }
  }

  // --- Auth Middleware ---
  const authenticate = async (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.userId = decoded.userId;

      // Check user existence, ban status, and update presence
      const u = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
      if (u) {
        if (u.isBanned && req.path !== '/api/auth/me' && req.path !== '/api/auth/logout') {
          return res.status(403).json({ error: 'Ваш профиль заблокирован', isBanned: true });
        }
        
        // Update presence every 10 seconds
        const now = new Date();
        const lastActive = u.lastActiveAt ? new Date(u.lastActiveAt).getTime() : 0;
        if (now.getTime() - lastActive > 10000) {
          await db.update(users).set({ lastActiveAt: now }).where(eq(users.id, req.userId));
        }
      }

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
      const existing = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
      if (existing) {
        await db.update(users).set({ verificationCode: code }).where(eq(users.id, existing.id));
      }
    } catch (dbErr) {
      console.error('Error saving verification code to DB:', dbErr);
    }

    try {
      const isReal = await sendEmail(email, 'Код подтверждения', `Ваш код: <b>${code}</b>`);
      if (isReal) {
        res.json({ message: 'Код отправлен' });
      } else {
        res.json({ message: 'Код отправлен (Используйте демо-код)', code });
      }
    } catch (err) {
      res.status(500).json({ error: 'Ошибка почты' });
    }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    let { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    email = email.toLowerCase().trim();

    const user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
    if (!user) return res.status(404).json({ error: 'Пользователь с таким email не найден' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    emailCodes.set(email, { code, expires: Date.now() + 10 * 60 * 1000 });

    try {
      await db.update(users).set({ verificationCode: code }).where(eq(users.id, user.id));
    } catch (dbErr) {
      console.error('Error saving forgot code to DB:', dbErr);
    }

    try {
      const isReal = await sendEmail(email, 'Сброс пароля', `Ваш код для сброса пароля: <b>${code}</b>`);
      if (isReal) {
        res.json({ message: 'Код отправлен' });
      } else {
        res.json({ message: 'Код отправлен (Используйте демо-код)', code });
      }
    } catch (err) {
      res.status(500).json({ error: 'Ошибка почты' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    let { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ error: 'Все поля обязательны' });
    email = email.toLowerCase().trim();

    const stored = emailCodes.get(email);
    if (!stored || stored.code !== code || stored.expires < Date.now()) {
      return res.status(400).json({ error: 'Неверный или просроченный код' });
    }

    const user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));
    emailCodes.delete(email);

    res.json({ message: 'Success' });
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
      verificationCode: code,
      createdAt: new Date(),
    });

    await ensureStudentHasCurator(userId);

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7*24*60*60*1000, path: '/' });
    res.json({ message: 'Success' });
  });

  app.post('/api/auth/login', async (req, res) => {
    let { email, password } = req.body;
    email = email.toLowerCase().trim();
    const user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Неверный логин/пароль' });
    
    await ensureStudentHasCurator(user.id);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7*24*60*60*1000, path: '/' });
    res.json({ message: 'Success' });
  });

  // --- Dynamic Stats & Achievements Engine ---
  async function calculateUserStatsAndAchievements(userId: string) {
    try {
      // 1. Completed blocks
      const progressList = await db.select().from(userProgress).where(
        and(eq(userProgress.userId, userId), eq(userProgress.status, 'completed'))
      );
      const completedBlocksCount = progressList.length;

      // 2. Count courses where they completed all blocks
      const allCourses = await db.select().from(courses);
      const allBlocks = await db.select().from(courseBlocks);
      
      let completedCoursesCount = 0;
      const completedCourseIds: string[] = [];
      for (const c of allCourses) {
        const courseBlocksIn = allBlocks.filter(b => b.courseId === c.id);
        if (courseBlocksIn.length > 0) {
          let courseCompleted = true;
          for (const block of courseBlocksIn) {
            const blockProg = progressList.find(p => p.blockId === block.id);
            if (!blockProg || blockProg.status !== 'completed') {
              courseCompleted = false;
              break;
            }
            // Check if there are open homework tasks
            const blockTasks = await db.select().from(homeworks).where(
              and(eq(homeworks.blockId, block.id), eq(homeworks.type, 'open'))
            );
            if (blockTasks.length > 0 && blockProg.grade !== 'accepted') {
              courseCompleted = false;
              break;
            }
          }
          if (courseCompleted) {
            completedCoursesCount++;
            completedCourseIds.push(c.id);
          }
        }
      }

      // 3. Messages count
      const userMessages = await db.select().from(messages).where(
        or(eq(messages.senderId, userId), eq(messages.receiverId, userId))
      );

      // 4. Courses created by them
      const createdCoursesList = await db.select().from(courses).where(eq(courses.authorId, userId));
      const createdCoursesCount = createdCoursesList.length;

      // 5. Fetch user profile
      const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];

      // Evaluate achievements list
      const achievementsList = [
        {
          id: 'first_login',
          title: 'Первые шаги',
          description: 'Успешно зарегистрироваться в системе',
          icon: 'Shield',
          colorClass: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
          unlocked: true,
          unlockedAt: user?.createdAt || new Date()
        },
        {
          id: 'profile_filled',
          title: 'Личность',
          description: 'Установить аватар и заполнить биографию',
          icon: 'User',
          colorClass: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
          unlocked: !!user?.avatar && !!user?.bio && user.bio.trim().length > 0,
          unlockedAt: new Date()
        },
        {
          id: 'first_lesson',
          title: 'Первые знания',
          description: 'Успешно завершить первый урок',
          icon: 'Trophy',
          colorClass: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
          unlocked: completedBlocksCount >= 1,
          unlockedAt: progressList[0]?.updatedAt || new Date()
        },
        {
          id: 'three_lessons',
          title: 'Ученик',
          description: 'Успешно завершить 3 урока',
          icon: 'Activity',
          colorClass: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
          unlocked: completedBlocksCount >= 3,
          unlockedAt: progressList[2]?.updatedAt || new Date()
        },
        {
          id: 'five_lessons',
          title: 'Знаток',
          description: 'Пройти 5 уроков на платформе',
          icon: 'Globe',
          colorClass: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
          unlocked: completedBlocksCount >= 5,
          unlockedAt: new Date()
        },
        {
          id: 'course_creator',
          title: 'Наставник',
          description: 'Разместить свой собственный авторский курс',
          icon: 'Trophy',
          colorClass: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400',
          unlocked: createdCoursesCount >= 1,
          unlockedAt: createdCoursesList[0]?.createdAt || new Date()
        },
        {
          id: 'messaging',
          title: 'Собеседник',
          description: 'Отправить или получить хотя бы одно личное сообщение',
          icon: 'Activity',
          colorClass: 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400',
          unlocked: userMessages.length >= 1,
          unlockedAt: userMessages[0]?.createdAt || new Date()
        },
        {
          id: 'course_graduate',
          title: 'Выпускник',
          description: 'Полностью завершить хотя бы один курс',
          icon: 'Shield',
          colorClass: 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400',
          unlocked: completedCoursesCount >= 1,
          unlockedAt: new Date()
        },
        {
          id: 'golden_authority',
          title: 'Авторитет',
          description: 'Получить роль преподавателя, куратора или администратора',
          icon: 'User',
          colorClass: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400',
          unlocked: user?.role && ['curator', 'teacher', 'admin'].includes(user.role),
          unlockedAt: new Date()
        }
      ];

      return {
        completedCourses: completedCoursesCount,
        completedCourseIds,
        totalArticles: completedBlocksCount,
        createdCourses: createdCoursesCount,
        xp: (completedCoursesCount * 500) + (completedBlocksCount * 50) + (createdCoursesCount * 200),
        rank: user?.role === 'admin' ? 'Администратор' : user?.role === 'teacher' ? 'Преподаватель' : user?.role === 'curator' ? 'Куратор' : 'Студент',
        achievements: achievementsList
      };
    } catch (err) {
      console.error('Error calculating user stats:', err);
      return {
        completedCourses: 0,
        completedCourseIds: [],
        totalArticles: 0,
        createdCourses: 0,
        xp: 0,
        rank: 'Студент',
        achievements: []
      };
    }
  }

  app.get('/api/auth/me', authenticate, async (req: any, res) => {
    const user = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password: _, ...safeUser } = user;
    
    // Attach dynamically calculated stats and achievements
    const computedStats = await calculateUserStatsAndAchievements(req.userId);
    res.json({ ...safeUser, stats: computedStats });
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

  app.get('/api/users', authenticate, async (req: any, res) => {
    try {
      const search = req.query.search;
      let allUsers = [];
      if (search && typeof search === 'string' && search.trim() !== '') {
        const searchTerm = `%${search.trim()}%`;
        allUsers = await db.select().from(users).where(
          and(
            ne(users.id, req.userId),
            or(
              ilike(users.name, searchTerm),
              ilike(users.surname, searchTerm),
              ilike(users.email, searchTerm)
            )
          )
        ).limit(50);
      } else {
        allUsers = await db.select().from(users).where(ne(users.id, req.userId)).limit(20);
      }
      const safeUsers = allUsers.map(({ password: _, ...u }) => u);
      res.json(safeUsers);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to search users' });
    }
  });

  app.get('/api/users/:id', authenticate, async (req, res) => {
    const user = (await db.select().from(users).where(eq(users.id, req.params.id)).limit(1))[0];
    if (!user) return res.status(404).json({ error: 'Not found' });
    const { password: _, ...safeUser } = user;
    
    // Attach dynamically calculated stats for other users as well
    const computedStats = await calculateUserStatsAndAchievements(req.params.id);
    res.json({ ...safeUser, stats: computedStats });
  });

  // --- Profile Guestbook Comments ---
  app.get('/api/users/:id/comments', authenticate, async (req: any, res) => {
    try {
      const commentsList = await db.select().from(profileComments)
        .where(eq(profileComments.profileId, req.params.id))
        .orderBy(desc(profileComments.createdAt));
      res.json(commentsList);
    } catch (err) {
      console.error(err);
      res.status(500).json([]);
    }
  });

  app.post('/api/users/:id/comments', authenticate, async (req: any, res) => {
    try {
      const { content } = req.body;
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Комментарий не может быть пустым' });
      }
      const poster = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
      if (!poster) return res.status(404).json({ error: 'User not found' });

      const targetProfileId = req.params.id;
      await db.insert(profileComments).values({
        id: uuidv4(),
        profileId: targetProfileId,
        authorId: req.userId,
        authorName: `${poster.name} ${poster.surname}`,
        authorAvatar: poster.avatar,
        content: content.trim(),
        createdAt: new Date()
      });

      // Send notification to the profile owner if they aren't the poster
      if (targetProfileId !== req.userId) {
        await db.insert(notifications).values({
          id: uuidv4(),
          userId: targetProfileId,
          message: `${poster.name} ${poster.surname} оставил(а) новый отзыв в вашей гостевой книге!`,
          type: 'new_message',
          read: false,
          link: `/profile`,
          createdAt: new Date()
        });
      }

      res.json({ message: 'Комментарий успешно добавлен' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Ошибка сервера при публикации комментария' });
    }
  });

  // --- Course Block Discussions ---
  app.get('/api/blocks/:blockId/discussions', authenticate, async (req: any, res) => {
    try {
      const list = await db.select().from(blockDiscussions)
        .where(eq(blockDiscussions.blockId, req.params.blockId))
        .orderBy(asc(blockDiscussions.createdAt));
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json([]);
    }
  });

  app.post('/api/blocks/:blockId/discussions', authenticate, async (req: any, res) => {
    try {
      const { content } = req.body;
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Сообщение не может быть пустым' });
      }
      const poster = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
      if (!poster) return res.status(404).json({ error: 'User not found' });

      const newId = uuidv4();
      await db.insert(blockDiscussions).values({
        id: newId,
        blockId: req.params.blockId,
        authorId: req.userId,
        authorName: `${poster.name} ${poster.surname}`,
        authorAvatar: poster.avatar,
        content: content.trim(),
        createdAt: new Date()
      });

      res.json({ message: 'Успешно отправлено', commentId: newId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'ошибка сервера' });
    }
  });

  app.post('/api/comments/:id/like', authenticate, async (req: any, res) => {
    try {
      const commentId = req.params.id;
      const comment = (await db.select().from(profileComments).where(eq(profileComments.id, commentId)).limit(1))[0];
      if (!comment) return res.status(404).json({ error: 'Comment not found' });

      let likesList: string[] = [];
      if (comment.likes && Array.isArray(comment.likes)) {
        likesList = comment.likes as string[];
      } else if (typeof comment.likes === 'string') {
        try {
          likesList = JSON.parse(comment.likes);
        } catch (e) {}
      }

      const index = likesList.indexOf(req.userId);
      if (index > -1) {
        likesList.splice(index, 1);
      } else {
        likesList.push(req.userId);
        
        // Notify author about the like
        const liker = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
        if (liker && comment.authorId !== req.userId) {
          await db.insert(notifications).values({
            id: uuidv4(),
            userId: comment.authorId,
            message: `${liker.name} ${liker.surname} оценил(а) ваш отзыв в гостевой книге.`,
            type: 'success',
            read: false,
            link: `/profile/${comment.profileId}`,
            createdAt: new Date()
          });
        }
      }

      await db.update(profileComments).set({ likes: likesList }).where(eq(profileComments.id, commentId));
      res.json({ success: true, likes: likesList });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error liking comment' });
    }
  });

  app.post('/api/comments/:id/reply', authenticate, async (req: any, res) => {
    try {
      const commentId = req.params.id;
      const { content } = req.body;
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Ответ не может быть пустым' });
      }

      const comment = (await db.select().from(profileComments).where(eq(profileComments.id, commentId)).limit(1))[0];
      if (!comment) return res.status(404).json({ error: 'Comment not found' });

      const poster = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
      if (!poster) return res.status(404).json({ error: 'User not found' });

      let repliesList: any[] = [];
      if (comment.replies && Array.isArray(comment.replies)) {
        repliesList = comment.replies as any[];
      } else if (typeof comment.replies === 'string') {
        try {
          repliesList = JSON.parse(comment.replies);
        } catch (e) {}
      }

      const newReply = {
        id: uuidv4(),
        authorId: req.userId,
        authorName: `${poster.name} ${poster.surname}`,
        authorAvatar: poster.avatar,
        content: content.trim(),
        createdAt: new Date().toISOString()
      };

      repliesList.push(newReply);

      await db.update(profileComments).set({ replies: repliesList }).where(eq(profileComments.id, commentId));
      
      if (comment.authorId !== req.userId) {
        await db.insert(notifications).values({
          id: uuidv4(),
          userId: comment.authorId,
          message: `${poster.name} ${poster.surname} ответил(а) на ваш отзыв в гостевой книге.`,
          type: 'new_message',
          read: false,
          link: `/profile/${comment.profileId}`,
          createdAt: new Date()
        });
      }

      res.json({ success: true, replies: repliesList });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error replying to comment' });
    }
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

    const result = [];
    for (const c of allCourses) {
      const author = (await db.select().from(users).where(eq(users.id, c.authorId)).limit(1))[0];
      const authorObj = author ? {
        id: author.id,
        name: author.name,
        surname: author.surname,
        avatar: author.avatar
      } : {
        id: c.authorId,
        name: 'Преподаватель',
        surname: '',
        avatar: null
      };
      result.push({
        ...c,
        author: authorObj
      });
    }
    res.json(result);
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

    const author = (await db.select().from(users).where(eq(users.id, course.authorId)).limit(1))[0];
    const authorObj = author ? {
      id: author.id,
      name: author.name,
      surname: author.surname,
      avatar: author.avatar
    } : {
      id: course.authorId,
      name: 'Преподаватель',
      surname: '',
      avatar: null
    };

    const blocks = await db.select().from(courseBlocks).where(eq(courseBlocks.courseId, req.params.id)).orderBy(asc(courseBlocks.order));
    
    // Fetch homeworks for blocks
    const blocksWithHomework: any[] = [];
    for (const block of blocks) {
        const blockHomeworks = await db.select().from(homeworks).where(eq(homeworks.blockId, block.id));
        blocksWithHomework.push({ ...block, homeworks: blockHomeworks });
    }

    res.json({ ...course, author: authorObj, blocks: blocksWithHomework });
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

  app.post('/api/users/:id/ban', authenticate, async (req: any, res) => {
    try {
      const requester = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
      if (!requester || requester.role !== 'admin') {
         return res.status(403).json({ error: 'Доступ ограничен. Только администраторы могут блокировать пользователей.' });
      }

      if (req.params.id === req.userId) {
         return res.status(400).json({ error: 'Вы не можете заблокировать самого себя' });
      }

      const target = (await db.select().from(users).where(eq(users.id, req.params.id)).limit(1))[0];
      if (!target) {
         return res.status(404).json({ error: 'Пользователь не найден' });
      }

      const newBanStatus = !target.isBanned;
      await db.update(users).set({ isBanned: newBanStatus }).where(eq(users.id, req.params.id));

      res.json({ message: 'Success', isBanned: newBanStatus });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Ошибка сервера при блокировке' });
    }
  });

  // --- Messaging ---
  app.get('/api/messages-contacts', authenticate, async (req: any, res) => {
    try {
      // Find all messages involving the current user
      const userMsgs = await db.select().from(messages).where(
        or(eq(messages.senderId, req.userId), eq(messages.receiverId, req.userId))
      ).orderBy(desc(messages.createdAt));

      // Extract unique user IDs of partners
      const partnerIds: string[] = [];
      userMsgs.forEach(m => {
        const otherId = m.senderId === req.userId ? m.receiverId : m.senderId;
        if (otherId && !partnerIds.includes(otherId)) {
          partnerIds.push(otherId);
        }
      });

      // Ensure user's curator is in the list
      const me = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
      if (me && me.curatorId && !partnerIds.includes(me.curatorId)) {
        partnerIds.push(me.curatorId);
      }

      const partners = [];
      for (const pId of partnerIds) {
        if (pId === req.userId) continue;
        const u = (await db.select().from(users).where(eq(users.id, pId)).limit(1))[0];
        if (u) {
          const { password: _, ...safeU } = u;
          // Find the last message with this user
          const lastMsg = userMsgs.find(m => 
            (m.senderId === pId && m.receiverId === req.userId) || 
            (m.senderId === req.userId && m.receiverId === pId)
          );
          partners.push({
            ...safeU,
            lastMessage: lastMsg ? {
              content: lastMsg.content,
              createdAt: lastMsg.createdAt
            } : null
          });
        }
      }

      res.json(partners);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch contacts list' });
    }
  });

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
    const { receiverId, content, attachmentUrl, attachmentName } = req.body;
    const id = uuidv4();
    await db.insert(messages).values({ 
      id, 
      senderId: req.userId, 
      receiverId, 
      content, 
      attachmentUrl: attachmentUrl || null,
      attachmentName: attachmentName || null,
      createdAt: new Date() 
    });
    res.json({ id });
  });

  // --- Notifications ---
  app.get('/api/notifications', authenticate, async (req: any, res) => {
    const all = await db.select().from(notifications).where(eq(notifications.userId, req.userId)).orderBy(desc(notifications.createdAt));
    res.json(all);
  });

  app.post('/api/notifications/:id/read', authenticate, async (req: any, res) => {
    try {
      await db.update(notifications).set({ read: true }).where(and(eq(notifications.id, req.params.id), eq(notifications.userId, req.userId)));
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  app.post('/api/notifications/read-all', authenticate, async (req: any, res) => {
    try {
      await db.update(notifications).set({ read: true }).where(eq(notifications.userId, req.userId));
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
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

    // Check if block has any homework tasks
    const blockTasks = await db.select().from(homeworks).where(eq(homeworks.blockId, blockId));
    const hasHomework = blockTasks.length > 0;
    const initialStatus = hasHomework ? 'submitted' : 'completed';

    const existing = (await db.select().from(userProgress).where(
        and(eq(userProgress.userId, req.userId), eq(userProgress.blockId, blockId))
    ).limit(1))[0];

    if (existing) {
        await db.update(userProgress).set({
            homeworkResponse,
            status: initialStatus,
            grade: null,
            updatedAt: new Date()
        }).where(eq(userProgress.id, existing.id));
    } else {
        await db.insert(userProgress).values({
            id: uuidv4(),
            userId: req.userId,
            blockId,
            homeworkResponse,
            status: initialStatus,
            grade: null,
            updatedAt: new Date()
        });
    }
    res.json({ message: 'Success', status: initialStatus });
  });

  // --- Curator Endpoints ---
  app.get('/api/curator/submissions', authenticate, async (req: any, res) => {
    try {
      const curator = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
      if (!curator || !['curator', 'teacher', 'admin'].includes(curator.role)) {
        return res.status(403).json({ error: 'Доступ разрешен только кураторам, преподавателям и администраторам.' });
      }

      // Fetch students
      let students;
      if (curator.role === 'admin' || curator.role === 'teacher') {
        students = await db.select().from(users);
      } else {
        students = await db.select().from(users).where(eq(users.curatorId, req.userId));
      }

      if (students.length === 0) {
        return res.json([]);
      }

      const studentIds = students.map(s => s.id);
      
      // Get all userProgress records for these students
      const progressRecords = await db.select().from(userProgress).where(
        or(...studentIds.map(sid => eq(userProgress.userId, sid)))
      );

      const results: any[] = [];
      for (const record of progressRecords) {
        if (!record.homeworkResponse || Object.keys(record.homeworkResponse).length === 0) {
          continue;
        }

        const student = students.find(s => s.id === record.userId);
        const block = (await db.select().from(courseBlocks).where(eq(courseBlocks.id, record.blockId)).limit(1))[0];
        if (!block) continue;

        const course = (await db.select().from(courses).where(eq(courses.id, block.courseId)).limit(1))[0];
        if (!course) continue;

        // Fetch homework tasks for this block
        const tasks = await db.select().from(homeworks).where(eq(homeworks.blockId, block.id));
        
        results.push({
          progressId: record.id,
          user: student ? { id: student.id, name: student.name, surname: student.surname, email: student.email, avatar: student.avatar } : null,
          block: { id: block.id, title: block.title },
          course: { id: course.id, title: course.title },
          homeworkResponse: record.homeworkResponse,
          grade: record.grade,
          feedback: record.feedback,
          tasks,
          updatedAt: record.updatedAt
        });
      }

      results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      res.json(results);
    } catch (err) {
      console.error('Error fetching curator submissions:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

  app.post('/api/curator/submissions/:id/grade', authenticate, async (req: any, res) => {
    try {
      const curator = (await db.select().from(users).where(eq(users.id, req.userId)).limit(1))[0];
      if (!curator || !['curator', 'teacher', 'admin'].includes(curator.role)) {
        return res.status(403).json({ error: 'Доступ ограничен' });
      }

      const { grade, feedback } = req.body;
      if (!['accepted', 'rejected', 'needs_revision'].includes(grade)) {
        return res.status(400).json({ error: 'Неверная оценка' });
      }

      const submission = (await db.select().from(userProgress).where(eq(userProgress.id, req.params.id)).limit(1))[0];
      if (!submission) return res.status(404).json({ error: 'Работа не найдена' });

      await db.update(userProgress).set({
        grade,
        feedback,
        status: grade === 'accepted' ? 'completed' : 'submitted',
        updatedAt: new Date()
      }).where(eq(userProgress.id, req.params.id));

      const block = (await db.select().from(courseBlocks).where(eq(courseBlocks.id, submission.blockId)).limit(1))[0];
      const blockTitle = block ? block.title : 'уроку';

      let statusText = '';
      if (grade === 'accepted') statusText = 'принято и зачтено! 🎉';
      else if (grade === 'rejected') statusText = 'отклонено куратором. ❌';
      else if (grade === 'needs_revision') statusText = 'отправлено на доработку. Она требует исправлений перед зачетом. ⚠️';

      await db.insert(notifications).values({
        id: uuidv4(),
        userId: submission.userId,
        message: `Ваше задание по теме "${blockTitle}" было проверено куратором: ${statusText}${feedback ? ` Замечания куратора: "${feedback}"` : ''}`,
        type: grade === 'accepted' ? 'success' : 'warning',
        read: false,
        link: `/courses/${block.courseId}?blockId=${block.id}`,
        createdAt: new Date()
      });

      res.json({ message: 'Success' });
    } catch (err) {
      console.error('Error grading submission:', err);
      res.status(500).json({ error: 'Ошибка сервера при оценке задания' });
    }
  });

  // --- Certificates ---
  app.get('/api/certificates', authenticate, async (req: any, res) => {
    try {
      const list = await db.select().from(certificates).where(eq(certificates.userId, req.userId));
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json([]);
    }
  });

  app.get('/api/users/:id/certificates', async (req, res) => {
    try {
      const list = await db.select().from(certificates).where(eq(certificates.userId, req.params.id));
      res.json(list);
    } catch (err) {
      console.error(err);
      res.status(500).json([]);
    }
  });

  app.post('/api/certificates', authenticate, async (req: any, res) => {
    try {
      const stats = await calculateUserStatsAndAchievements(req.userId);
      if (stats.completedCourses === 0) {
        return res.status(400).json({ error: 'Вы не завершили полностью ни одного курса! Пожалуйста, убедитесь, что куратор проверил и одобрил все ваши домашние задания.' });
      }

      // Automatically construct the list of completed course titles server-side
      const completedCourseTitles: string[] = [];
      const completedIds = stats.completedCourseIds || [];
      for (const cId of completedIds) {
        const c = (await db.select().from(courses).where(eq(courses.id, cId)).limit(1))[0];
        if (c) {
          completedCourseTitles.push(c.title);
        }
      }

      if (completedCourseTitles.length === 0) {
        return res.status(400).json({ error: 'У вас нет полностью завершенных курсов.' });
      }

      const shareId = uuidv4().substring(0, 8);
      const certId = uuidv4();

      await db.insert(certificates).values({
        id: certId,
        userId: req.userId,
        courseIds: JSON.stringify(completedCourseTitles),
        shareId,
        createdAt: new Date()
      });

      res.status(201).json({ message: 'Certificate created successfully', shareId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'ошибка сервера при генерации сертификата' });
    }
  });

  app.get('/api/verify-certificate/:shareId', async (req, res) => {
    const cert = (await db.select().from(certificates).where(eq(certificates.shareId, req.params.shareId)).limit(1))[0];
    if (!cert) return res.status(404).json({ error: 'Not found' });

    const user = (await db.select().from(users).where(eq(users.id, cert.userId)).limit(1))[0];
    res.json({ cert, user: user ? { name: user.name, surname: user.surname } : null });
  });

  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.post('/api/upload', authenticate, async (req: any, res) => {
    try {
      const { fileName, fileType, base64Data } = req.body;
      if (!fileName || !base64Data) {
        return res.status(400).json({ error: 'Missing fileName or base64Data' });
      }

      // Convert base64 back to binary buffer
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Clean filename
      const safeName = `${Date.now()}_${path.basename(fileName).replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const filePath = path.join(uploadsDir, safeName);
      
      // Write file to disk
      fs.writeFileSync(filePath, buffer);
      
      const fileUrl = `/uploads/${safeName}`;
      res.json({ message: 'Success', fileUrl, fileName: safeName });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });

  // Serve uploads folder
  app.use('/uploads', express.static(uploadsDir));

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
