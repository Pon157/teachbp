export type UserRole = 'student' | 'curator' | 'teacher' | 'admin';

export interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
  avatar?: string;
  bio?: string;
  role: UserRole;
  curatorId?: string;
  theme: 'light' | 'dark';
  language: string;
  stats?: any; // JSON object
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  authorId: string;
  status: 'draft' | 'pending' | 'published';
  estimatedTime?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface CourseBlock {
  id: string;
  courseId: string;
  title: string;
  content: string;
  order: number;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}
