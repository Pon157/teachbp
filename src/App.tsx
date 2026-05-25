import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import CourseViewer from './pages/CourseViewer';
import EditorPage from './pages/EditorPage';
import AdminPanel from './pages/AdminPanel';
import MessagesPage from './pages/MessagesPage';
import CuratorPanel from './pages/CuratorPanel';
import VerifyCertificate from './pages/VerifyCertificate';
import NotFound from './pages/NotFound';

function ProtectedRoute({ children, roles }: { children: React.ReactNode, roles?: string[] }) {
  const { user, loading, logout } = useAuth();
  
  if (loading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="w-16 h-16 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
      <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Booting System...</div>
    </div>
  );
  if (!user) return <Navigate to="/" />;

  if (user.isBanned) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.08),transparent)] pointer-events-none" />
        <div className="max-w-md text-center space-y-8 relative z-10">
          <div className="w-24 h-24 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-rose-500/10 animate-bounce">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black tracking-tight text-rose-500">Допуск заблокирован</h1>
            <p className="text-slate-450 text-sm font-medium leading-relaxed">
              Ваш аккаунт на платформе <strong>BotSupport.Edu</strong> был временно заблокирован администратором или уполномоченным куратором.
            </p>
          </div>
          <button 
            onClick={logout}
            className="w-full bg-rose-650 hover:bg-rose-700 bg-rose-600 text-white py-4 rounded-2xl font-extrabold text-sm transition-all shadow-lg active:scale-95"
          >
            Выйти из аккаунта
          </button>
        </div>
      </div>
    );
  }
  
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/verify/:shareId" element={<VerifyCertificate />} />
          
          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/courses/:id" element={<CourseViewer />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:userId" element={<MessagesPage />} />
            
            <Route path="/editor" element={
              <ProtectedRoute roles={['teacher', 'admin']}>
                <EditorPage />
              </ProtectedRoute>
            } />
            <Route path="/editor/:id" element={
              <ProtectedRoute roles={['teacher', 'admin']}>
                <EditorPage />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute roles={['admin']}>
                <AdminPanel />
              </ProtectedRoute>
            } />
            <Route path="/curator" element={
              <ProtectedRoute roles={['curator', 'teacher', 'admin']}>
                <CuratorPanel />
              </ProtectedRoute>
            } />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
