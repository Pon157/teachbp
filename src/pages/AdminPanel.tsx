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
  Trash2,
  MessageSquare,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { User, Course } from '../types';
import { cn } from '../lib/utils';

export default function AdminPanel() {
  const { user } = useAuth();
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
        fetch('/api/courses')
      ]);
      const usersData = await usersRes.json();
      const coursesData = await coursesRes.json();
      setUsers(Array.isArray(usersData) ? usersData : []);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (err) {
      console.error(err);
      setUsers([]);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const deleteUser = async (userId: string) => {
    if (userId === user?.id) {
      alert("Вы не можете удалить свою собственную учётную запись");
      return;
    }
    if (!confirm("Вы уверены, что хотите удалить этого пользователя и все связанные с ним данные? Действие необратимо!")) return;
    try {
        const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
        if (res.ok) {
            await fetchData();
            alert('Пользователь успешно удален');
        } else {
            const err = await res.json();
            alert(err.error || 'Ошибка удаления');
        }
    } catch (err) {
        console.error(err);
        alert('Сетевая ошибка');
    }
  };

  const toggleBanUser = async (userId: string, isBanned: boolean) => {
    if (userId === user?.id) {
      alert("Вы не можете заблокировать самого себя");
      return;
    }
    const actionText = isBanned ? 'разблокировать' : 'заблокировать';
    if (!confirm(`Вы уверены, что хотите ${actionText} этого пользователя?`)) return;
    try {
      const res = await fetch(`/api/users/${userId}/ban`, { method: 'POST' });
      if (res.ok) {
        await fetchData();
        alert(isBanned ? 'Пользователь успешно разблокирован' : 'Пользователь успешно заблокирован');
      } else {
        const err = await res.json();
        alert(err.error || 'Ошибка при изменении статуса блокировки');
      }
    } catch (err) {
      console.error(err);
      alert('Сетевая ошибка');
    }
  };

  const assignRole = async (userId: string, role: string) => {
    try {
        const res = await fetch('/api/admin/assign-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, role })
        });
        if (res.ok) {
            await fetchData();
            alert('Роль успешно обновлена');
        } else {
            const err = await res.json();
            alert(err.error || 'Ошибка доступа');
        }
    } catch (err) {
        console.error(err);
        alert('Сетевая ошибка');
    }
  };

  const assignCurator = async (studentId: string, curatorId: string) => {
    try {
        const res = await fetch('/api/admin/assign-curator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, curatorId })
        });
        if (res.ok) {
            await fetchData();
            alert('Куратор успешно назначен');
        } else {
            const err = await res.json();
            alert(err.error || 'Ошибка назначения');
        }
    } catch (err) {
        console.error(err);
        alert('Сетевая ошибка');
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

  if (user?.role !== 'admin') {
    return (
      <div className="py-20 max-w-lg mx-auto text-center space-y-6">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-3xl flex items-center justify-center mx-auto animate-pulse">
          <Shield size={32} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Доступ ограничен</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
          Этот раздел предназначен исключительно для Администраторов образовательной платформы. Ваш текущий уровень доступа: <span className="font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest text-xs bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded">{user?.role === 'teacher' ? 'Преподаватель' : user?.role === 'curator' ? 'Куратор' : 'Студент'}</span>
        </p>
        <div>
          <Link to="/dashboard" className="inline-flex px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">
            Вернуться на главную
          </Link>
        </div>
      </div>
    );
  }

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

          {/* Mobile adaptive grid of users */}
          <div className="block md:hidden space-y-4">
             {filteredUsers.length === 0 ? (
                <div className="p-10 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl italic text-zinc-500">Пользователи не найдены</div>
             ) : filteredUsers.map(u => (
                <div key={u.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-sm">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                         {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold">{u.name[0]}</div>}
                      </div>
                      <div className="min-w-0 flex-1">
                         <div className="flex items-center gap-2">
                            <p className="font-bold text-sm truncate">{u.name} {u.surname}</p>
                            {u.isBanned && (
                              <span className="bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-rose-500/20 shrink-0">
                                 Блок
                              </span>
                            )}
                         </div>
                         <p className="text-xs text-zinc-500 font-mono tracking-tighter truncate">{u.email}</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <div>
                         <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Роль</p>
                         <select 
                             value={u.role}
                             onChange={(e) => assignRole(u.id, e.target.value)}
                             className={cn(
                                 "w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none",
                                 u.role === 'admin' ? "text-red-500" : u.role === 'teacher' ? "text-purple-500" : "text-zinc-500"
                             )}
                         >
                             <option value="student">Студент</option>
                             <option value="curator">Куратор</option>
                             <option value="teacher">Учитель</option>
                             <option value="admin">Админ</option>
                         </select>
                      </div>
                      {u.role === 'student' && (
                         <div>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Куратор</p>
                            <select 
                                className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 outline-none"
                                value={u.curatorId || ''}
                                onChange={(e) => assignCurator(u.id, e.target.value)}
                            >
                                <option value="">Назначить...</option>
                                {users.filter(cur => cur.role === 'curator').map(cur => (
                                    <option key={cur.id} value={cur.id}>{cur.name} {cur.surname}</option>
                                ))}
                            </select>
                         </div>
                      )}
                   </div>
                   <div className="flex justify-end gap-2 pt-3 border-t border-zinc-150 dark:border-zinc-800">
                      <Link 
                          to={`/messages/${u.id}`}
                          title="Написать сообщение"
                          className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-indigo-500 transition-colors flex items-center gap-1.5 text-xs font-bold"
                      >
                          <MessageSquare size={14} />
                          <span>Чат</span>
                      </Link>
                      {u.id !== user?.id && (
                          <button 
                              type="button"
                              onClick={() => toggleBanUser(u.id, !!u.isBanned)}
                              className={cn(
                                  "px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold",
                                  u.isBanned 
                                      ? "bg-rose-500 text-white hover:bg-rose-600" 
                                      : "bg-amber-100 hover:bg-rose-50 text-amber-800 hover:text-rose-600 dark:bg-zinc-800 dark:text-amber-300 dark:hover:bg-rose-950/20"
                              )}
                          >
                              <ShieldAlert size={14} />
                              <span>{u.isBanned ? 'Разблокировать' : 'Бан'}</span>
                          </button>
                      )}
                      {u.id !== user?.id && (
                          <button 
                              onClick={() => deleteUser(u.id)}
                              className="px-3 py-1.5 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 rounded-lg text-red-500 transition-colors flex items-center gap-1.5 text-xs font-bold"
                          >
                              <Trash2 size={14} />
                              <span>Удалить</span>
                          </button>
                      )}
                   </div>
                </div>
             ))}
          </div>

          {/* Desktop Table view of users */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xl">
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
                                  <div className="flex items-center gap-2">
                                     <p className="font-bold text-sm">{u.name} {u.surname}</p>
                                     {u.isBanned && (
                                       <span className="bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-rose-500/20 shrink-0">
                                          Блок
                                       </span>
                                     )}
                                  </div>
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
                                <Link 
                                    to={`/messages/${u.id}`}
                                    title="Написать сообщение"
                                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-indigo-500 transition-colors"
                                >
                                    <MessageSquare size={18} />
                                </Link>
                                {u.id !== user?.id && (
                                    <button 
                                        type="button"
                                        onClick={() => toggleBanUser(u.id, !!u.isBanned)}
                                        title={u.isBanned ? "Разблокировать пользователя" : "Заблокировать пользователя"}
                                        className={cn(
                                          "p-2 rounded-lg transition-colors",
                                          u.isBanned 
                                            ? "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/25 animate-pulse" 
                                            : "text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                        )}
                                    >
                                        <ShieldAlert size={18} />
                                    </button>
                                )}
                                {u.id !== user?.id && (
                                    <button 
                                        onClick={() => deleteUser(u.id)}
                                        title="Удалить пользователя"
                                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
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
