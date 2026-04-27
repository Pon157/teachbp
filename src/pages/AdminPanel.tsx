import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  Users, 
  Shield, 
  UserPlus, 
  CheckCircle, 
  AlertCircle,
  Search,
  MoreHorizontal,
  ChevronRight,
  UserCheck,
  BookOpen,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { User, Course } from '../types';
import { cn } from '../lib/utils';

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'courses'>('users');
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, coursesRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/courses') // For courses we need a special admin endpoint usually, but I'll adapt the current one or just use it
      ]);
      setUsers(await usersRes.json());
      // For demo, I'll fetch and filter if I can, or just mock some pending courses
      setCourses(await coursesRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const assignRole = async (userId: string, role: string) => {
    try {
        const res = await fetch('/api/admin/assign-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, role })
        });
        if (res.ok) fetchData();
    } catch (err) {
        console.error(err);
    }
  };

  const assignCurator = async (studentId: string, curatorId: string) => {
    try {
        const res = await fetch('/api/admin/assign-curator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, curatorId })
        });
        if (res.ok) fetchData();
    } catch (err) {
        console.error(err);
    }
  };

  const deleteCourse = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот курс?')) return;
    try {
        const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
        if (res.ok) fetchData();
    } catch (err) {
        console.error(err);
    }
  };

  const publishCourse = async (id: string) => {
    try {
        const res = await fetch(`/api/courses/${id}/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) fetchData();
        else {
            const err = await res.json();
            alert(err.error || 'Ошибка при публикации');
        }
    } catch (err) {
        console.error(err);
    }
  };

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="h-full flex items-center justify-center font-mono opacity-50">FETCHING CLOUD DATA...</div>;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter mb-2">Админ-панель 🛡️</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Управление пользователями, ролями и контентом системы.</p>
        </div>
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('users')}
            className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all", activeTab === 'users' ? "bg-white dark:bg-zinc-700 shadow-sm" : "text-zinc-500")}
          >
            Пользователи
          </button>
          <button 
            onClick={() => setActiveTab('courses')}
            className={cn("px-6 py-2.5 rounded-xl text-sm font-bold transition-all", activeTab === 'courses' ? "bg-white dark:bg-zinc-700 shadow-sm" : "text-zinc-500")}
          >
            Курсы
          </button>
        </div>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-6">
          <div className="relative max-w-md">
             <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
             <input 
                type="text" 
                placeholder="Поиск по имени или email..."
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-700 transition-all shadow-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
             />
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xl">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Пользователь</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Роль</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Куратор</th>
                      <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Действия</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                   {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                         <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                                  {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold">{u.name[0]}</div>}
                               </div>
                               <div>
                                  <p className="font-bold text-sm">{u.name} {u.surname}</p>
                                  <p className="text-xs text-zinc-500 font-mono tracking-tighter">{u.email}</p>
                               </div>
                            </div>
                         </td>
                         <td className="px-8 py-6">
                            <select 
                                value={u.role}
                                onChange={(e) => assignRole(u.id, e.target.value)}
                                className={cn(
                                    "px-3 py-1 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none",
                                    u.role === 'admin' ? "text-red-500" : u.role === 'teacher' ? "text-purple-500" : "text-zinc-500"
                                )}
                            >
                                <option value="student">Студент</option>
                                <option value="curator">Куратор</option>
                                <option value="teacher">Учитель</option>
                                <option value="admin">Админ</option>
                            </select>
                         </td>
                         <td className="px-8 py-6">
                            {u.role === 'student' && (
                                <select 
                                    className="px-3 py-1 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none"
                                    value={u.curatorId || ''}
                                    onChange={(e) => assignCurator(u.id, e.target.value)}
                                >
                                    <option value="">Назначить...</option>
                                    {users.filter(cur => cur.role === 'curator').map(cur => (
                                        <option key={cur.id} value={cur.id}>{cur.name} {cur.surname}</option>
                                    ))}
                                </select>
                            )}
                         </td>
                         <td className="px-8 py-6">
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"><UserCheck size={18} /></button>
                                <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"><MoreHorizontal size={18} /></button>
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {courses.map(course => (
              <div key={course.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm group">
                  <div className="flex justify-between items-start mb-4">
                     <div className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest", course.status === 'published' ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500")}>
                        {course.status}
                     </div>
                     <button className="text-zinc-300 group-hover:text-zinc-500"><MoreHorizontal size={20}/></button>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{course.title}</h3>
                  <div className="flex items-center gap-2 mb-6 text-zinc-500 text-xs font-medium">
                     <BookOpen size={14} />
                     <span>Автор: {users.find(u => u.id === course.authorId)?.name || 'Неизвестно'}</span>
                  </div>
                  <div className="flex gap-2">
                     <button 
                        onClick={() => publishCourse(course.id)}
                        disabled={course.status === 'published'}
                        className="flex-1 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:bg-emerald-500 dark:hover:bg-emerald-500 hover:text-white"
                     >
                        {course.status === 'published' ? 'Одобрено' : 'Одобрить'}
                     </button>
                     <Link 
                        to={`/editor/${course.id}`}
                        className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-400 hover:text-indigo-500 transition-colors"
                     >
                        <BookOpen size={18}/>
                     </Link>
                     <button 
                        onClick={() => deleteCourse(course.id)}
                        className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-400 hover:text-red-500 transition-colors"
                     >
                        <Trash2 size={18}/>
                     </button>
                  </div>
              </div>
           ))}
        </div>
      )}
    </div>
  );
}
