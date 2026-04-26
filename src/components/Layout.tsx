import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Bell, 
  MessageSquare, 
  User, 
  LogOut, 
  LayoutDashboard, 
  PenTool, 
  ShieldAlert, 
  Search,
  ChevronDown,
  Moon,
  Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Notification } from '../types';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [theme, setTheme] = useState(user?.theme || 'light');

  useEffect(() => {
    if (user) {
        fetch('/api/notifications')
            .then(res => res.json())
            .then(setNotifications);
    }
    // Update theme logic here
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [user, theme]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: newTheme })
    });
  };

  const navItems = [
    { label: 'Панель', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Сообщения', path: '/messages', icon: MessageSquare },
  ];

  if (user?.role === 'teacher' || user?.role === 'admin') {
    navItems.push({ label: 'Редактор', path: '/editor', icon: PenTool });
  }
  if (user?.role === 'admin') {
    navItems.push({ label: 'Админ', path: '/admin', icon: ShieldAlert });
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={cn("min-h-screen transition-colors duration-300", theme === 'dark' ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900")}>
      {/* Top Sidebar / Navbar */}
      <nav className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
                <span className="text-white font-bold text-xl">B</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 hidden sm:block">BotSupport.Edu</h1>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                    location.pathname.startsWith(item.path) 
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300" 
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-1 border-r border-slate-200 dark:border-slate-800 pr-4">
                <button 
                  onClick={toggleTheme}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
                >
                  {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>

                {/* Notifications */}
                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 relative rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                    )}
                  </button>

                  <AnimatePresence>
                    {showNotifications && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50"
                        >
                          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100">Уведомления</h3>
                            <button className="text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white uppercase tracking-wider font-bold">Очистить</button>
                          </div>
                          <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                              <div className="p-8 text-center text-slate-500 text-sm italic">Нет новых уведомлений</div>
                            ) : (
                              notifications.map(n => (
                                <div key={n.id} className={cn("p-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer", !n.read && "bg-indigo-50/30 dark:bg-indigo-900/10")}>
                                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{n.message}</p>
                                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">{new Date(n.createdAt).toLocaleString()}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Profile Toggle */}
              <div className="relative">
                <div 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded-xl transition-colors group"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{user?.name} {user?.surname}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{user?.role}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                    {user?.avatar ? (
                      <img src={user.avatar} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white font-bold text-sm">
                        {user?.name[0]}
                      </div>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {showProfileMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 text-sm"
                      >
                        <div className="py-2">
                          <Link to="/profile" onClick={() => setShowProfileMenu(false)} className="flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 font-medium">
                            <User size={18} className="text-slate-400" />
                            <span>Профиль</span>
                          </Link>
                          <Link to="/messages" onClick={() => setShowProfileMenu(false)} className="flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 font-medium">
                            <MessageSquare size={18} className="text-slate-400" />
                            <span>Сообщения</span>
                          </Link>
                        </div>
                        <div className="py-2 border-t border-slate-100 dark:border-slate-800">
                          <button onClick={handleLogout} className="flex items-center space-x-3 px-4 py-3 w-full text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors font-medium">
                            <LogOut size={18} />
                            <span>Выйти</span>
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
