import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  User as UserIcon, 
  Settings, 
  Bell, 
  Globe, 
  Moon, 
  Sun, 
  Camera, 
  Shield, 
  Trophy,
  Activity,
  ChevronRight,
  RefreshCcw,
  MessageSquare,
  ArrowLeft,
  Calendar,
  Award,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>();
  const { user: currentUser, refreshUser } = useAuth();

  // Determine if this is the logged-in user's own profile
  const isOwnProfile = !userId || userId === currentUser?.id;

  const [profileUser, setProfileUser] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');

  // Edit states for own profile
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    bio: '',
    avatar: '',
    language: 'ru',
    theme: 'light'
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Guestbook comments
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Load profile user details (and fallback/refresh own user)
  const fetchProfileData = async () => {
    try {
      const targetId = userId && userId !== currentUser?.id ? userId : currentUser?.id;
      if (!targetId) return;

      const userRes = await fetch(`/api/users/${targetId}`);
      if (userRes.ok) {
        const userData = await userRes.json();
        setProfileUser(userData);
        if (isOwnProfile) {
          setFormData({
            name: userData.name || '',
            surname: userData.surname || '',
            bio: userData.bio || '',
            avatar: userData.avatar || '',
            language: userData.language || 'ru',
            theme: userData.theme || 'light'
          });
        }
      }

      // Load comments for the target profile
      const commentsRes = await fetch(`/api/users/${targetId}/comments`);
      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        setComments(commentsData);
      }
    } catch (err) {
      console.error('Error fetching profile data:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [userId, currentUser?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        await refreshUser();
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        // Reload details locally
        fetchProfileData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setCommentSubmitting(true);
    try {
      const targetId = userId && userId !== currentUser?.id ? userId : currentUser?.id;
      const res = await fetch(`/api/users/${targetId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      });
      if (res.ok) {
        setNewComment('');
        // Reload comments section
        const commentsRes = await fetch(`/api/users/${targetId}/comments`);
        if (commentsRes.ok) {
          setComments(await commentsRes.json());
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Ошибка при отправке сообщения');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommentSubmitting(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center font-mono text-xs uppercase tracking-widest text-slate-400">
        <RefreshCcw className="animate-spin mb-4 text-indigo-600" size={24} />
        <span>Загрузка профиля...</span>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="py-20 text-center space-y-6">
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Пользователь не найден</h2>
        <Link to="/dashboard" className="px-5 py-3 bg-indigo-600 text-white rounded-xl inline-flex items-center gap-2">
          <ArrowLeft size={16} /> На главную
        </Link>
      </div>
    );
  }

  // Statistics resolved from database integration
  const stats = profileUser.stats || {
    completedCourses: 0,
    totalArticles: 0,
    createdCourses: 0,
    xp: 0,
    rank: 'Студент',
    achievements: []
  };

  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case 'Shield': return Shield;
      case 'Trophy': return Trophy;
      case 'Activity': return Activity;
      case 'Globe': return Globe;
      case 'User': return UserIcon;
      default: return Trophy;
    }
  };

  return (
    <div className="space-y-10 pb-12">
      {/* Back button link when viewing external profile */}
      {!isOwnProfile && (
        <div className="flex items-center">
          <Link to="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-extrabold text-xs uppercase tracking-widest transition-colors">
            <ArrowLeft size={16} /> Вернуться на главную
          </Link>
        </div>
      )}

      {/* Profile Header Block inside custom eye-catching modern backdrop */}
      <div className="rounded-[3rem] bg-slate-900 border border-slate-800 text-white p-8 md:p-12 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px]" />
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 w-full">
          {/* Avatar Area with Local PC Upload logic */}
          <div className="relative group w-24 h-24 sm:w-32 sm:h-32 rounded-[2.5rem] overflow-hidden border-4 border-white/20 shadow-2xl bg-slate-800 flex-shrink-0">
             {isOwnProfile ? (
               <>
                 {formData.avatar ? (
                   <img src={formData.avatar} className="w-full h-full object-cover" />
                 ) : (
                   <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400">
                      <UserIcon size={48} />
                   </div>
                 )}
                 <label className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-all gap-1">
                   <Camera size={20} />
                   <span className="text-[9px] font-extrabold uppercase tracking-widest">Изменить</span>
                   <input 
                     type="file" 
                     accept="image/*" 
                     className="hidden" 
                     onChange={e => {
                       const file = e.target.files?.[0];
                       if (file) {
                         const reader = new FileReader();
                         reader.onloadend = () => {
                           setFormData({ ...formData, avatar: reader.result as string });
                         };
                         reader.readAsDataURL(file);
                       }
                     }}
                   />
                 </label>
               </>
             ) : (
               profileUser.avatar ? (
                 <img src={profileUser.avatar} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400">
                    <UserIcon size={48} />
                 </div>
               )
             )}
          </div>
          
          <div className="text-center md:text-left flex-1">
             <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
               <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">{profileUser.name} {profileUser.surname}</h1>
               <span className="inline-flex px-3 py-1 bg-white/10 backdrop-blur-md text-indigo-300 text-[10px] uppercase font-black tracking-[0.2em] rounded-lg border border-white/10">
                   {stats.rank}
               </span>
               <button 
                 onClick={() => {
                   const link = `${window.location.origin}/profile/${profileUser.id}`;
                   const textArea = document.createElement("textarea");
                   textArea.value = link;
                   textArea.style.position = "fixed";
                   textArea.style.opacity = "0";
                   document.body.appendChild(textArea);
                   textArea.select();
                   try {
                       document.execCommand('copy');
                       alert('Ссылка на профиль скопирована!');
                   } catch (err) {
                       try {
                           navigator.clipboard.writeText(link);
                           alert('Ссылка на профиль скопирована!');
                       } catch (e) {
                           prompt('Скопируйте ссылку вручную:', link);
                       }
                   }
                   document.body.removeChild(textArea);
                 }}
                 className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-black rounded-lg hover:bg-indigo-500/40 transition-all cursor-pointer border border-indigo-500/30"
               >
                 Поделиться профилем
               </button>
             </div>
             <p className="text-slate-400 text-base leading-relaxed max-w-lg mb-4">{profileUser.bio || 'Этот пользователь пока не оставил биографию о себе.'}</p>
             <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Дата регистрации: {new Date(profileUser.createdAt).toLocaleDateString()}</p>
          </div>

          <div className="flex md:flex-col gap-4">
            <div className="p-6 bg-white/5 border border-white/10 backdrop-blur-sm rounded-[1.5rem] text-center min-w-[130px]">
               <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mb-1">Опыт (XP)</p>
               <p className="text-2xl font-black tracking-tighter text-indigo-300">{stats.xp}</p>
            </div>
            <div className="p-6 bg-white/5 border border-white/10 backdrop-blur-sm rounded-[1.5rem] text-center min-w-[130px]">
               <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mb-1">Создано курсов</p>
               <p className="text-2xl font-black tracking-tighter text-emerald-300">{stats.createdCourses || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu (Only shown on own profile to toggle settings) */}
      {isOwnProfile && (
        <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-px">
          <button 
             onClick={() => setActiveTab('profile')}
             className={cn(
               "pb-4 px-6 text-xs font-black uppercase tracking-widest border-b-[3px] transition-all",
               activeTab === 'profile' 
                 ? "border-indigo-600 text-slate-900 dark:text-slate-100" 
                 : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
             )}
          >
             Обзор
          </button>
          <button 
             onClick={() => setActiveTab('settings')}
             className={cn(
               "pb-4 px-6 text-xs font-black uppercase tracking-widest border-b-[3px] transition-all",
               activeTab === 'settings' 
                 ? "border-indigo-600 text-slate-900 dark:text-slate-100" 
                 : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
             )}
          >
             Настройки аккаунта
          </button>
        </div>
      )}

      {/* Tab Panels */}
      <div>
        {(!isOwnProfile || activeTab === 'profile') ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
             {/* Left Column: Achievements Gallery with accurate integration */}
             <section className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 sm:p-10 rounded-[2.5rem] shadow-sm space-y-8">
                <div className="flex justify-between items-center pb-6 border-b border-slate-100 dark:border-slate-800">
                   <h3 className="text-xl font-black text-slate-950 dark:text-slate-50 flex items-center gap-3">
                      <Trophy size={20} className="text-indigo-600" />
                      <span>Система достижений</span>
                   </h3>
                   <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                      Получено: {stats.achievements ? stats.achievements.filter((a: any) => a.unlocked).length : 0} / {stats.achievements ? stats.achievements.length : 0}
                   </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                   {stats.achievements && stats.achievements.length > 0 ? (
                     stats.achievements.map((item: any) => {
                       const IconComp = getAchievementIcon(item.icon);
                       return (
                         <div 
                           key={item.id} 
                           className={cn(
                             "p-5 rounded-2xl border flex items-start gap-4 transition-all relative group",
                             item.unlocked 
                               ? "bg-slate-50/50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 hover:shadow-lg hover:shadow-slate-100 dark:hover:shadow-none" 
                               : "bg-slate-100/30 dark:bg-slate-950/20 border-slate-100 dark:border-slate-900/60 opacity-60"
                           )}
                         >
                           <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105", item.colorClass)}>
                               <IconComp size={24} />
                           </div>
                           <div className="flex-1 min-w-0 pr-2">
                               <p className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                 <span>{item.title}</span>
                                 {item.unlocked ? (
                                   <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                                 ) : (
                                   <Lock size={12} className="text-slate-400 dark:text-slate-600 flex-shrink-0" />
                                 )}
                               </p>
                               <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed mt-1">{item.description}</p>
                               {item.unlocked && item.unlockedAt && (
                                 <p className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider mt-2">Получено: {new Date(item.unlockedAt).toLocaleDateString()}</p>
                               )}
                           </div>
                         </div>
                       );
                     })
                   ) : (
                     <div className="col-span-full py-12 text-center text-slate-400 font-mono text-xs">Достижения отсутствуют.</div>
                   )}
                </div>
             </section>

             {/* Right Column: User Analytics */}
             <div className="lg:col-span-4 space-y-8">
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-sm">
                   <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                      <Activity size={18} className="text-indigo-600" />
                      <span>Статистика</span>
                   </h3>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center py-4 border-b border-slate-100 dark:border-slate-800">
                         <span className="text-[10px] text-slate-500 dark:text-slate-400 tracking-widest uppercase font-extrabold">Завершено курсов</span>
                         <span className="font-black text-lg text-slate-900 dark:text-slate-100">{stats.completedCourses}</span>
                      </div>
                      <div className="flex justify-between items-center py-4 border-b border-slate-100 dark:border-slate-800">
                         <span className="text-[10px] text-slate-500 dark:text-slate-400 tracking-widest uppercase font-extrabold">Уроков пройдено</span>
                         <span className="font-black text-lg text-slate-900 dark:text-slate-100">{stats.totalArticles}</span>
                      </div>
                      <div className="flex justify-between items-center py-4">
                         <span className="text-[10px] text-slate-500 dark:text-slate-400 tracking-widest uppercase font-extrabold">Текущий XP статус</span>
                         <span className="font-black text-lg text-emerald-500">{stats.xp} XP</span>
                      </div>
                   </div>
                </section>
             </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Личные данные</h4>
                      <div className="space-y-5">
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 ml-1">Имя</label>
                                  <input 
                                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/25 transition-all"
                                      value={formData.name}
                                      onChange={e => setFormData({...formData, name: e.target.value})}
                                  />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 ml-1">Фамилия</label>
                                  <input 
                                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/25 transition-all"
                                      value={formData.surname}
                                      onChange={e => setFormData({...formData, surname: e.target.value})}
                                  />
                              </div>
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 ml-1">Ссылка на аватар (опционально)</label>
                              <input 
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/25 transition-all"
                                  value={formData.avatar}
                                  onChange={e => setFormData({...formData, avatar: e.target.value})}
                                  placeholder="Или выберите файл непосредственно на фото выше!"
                              />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 ml-1">О себе (Био)</label>
                              <textarea 
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3 text-sm font-medium outline-none resize-none h-24 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/25 transition-all"
                                  value={formData.bio}
                                  onChange={e => setFormData({...formData, bio: e.target.value})}
                                  placeholder="Пара слов о вашем опыте и целях в образовании..."
                              />
                          </div>
                      </div>
                  </div>

                  <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Настройки системы</h4>
                      <div className="space-y-8 text-slate-900 dark:text-slate-100">
                          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    <Bell size={16} className="text-slate-400" />
                                  </div>
                                  <span className="text-sm font-bold">Push-уведомления</span>
                              </div>
                              <button className="w-12 h-6 bg-indigo-600 rounded-full relative shadow-inner">
                                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md" />
                              </button>
                          </div>
                          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    {formData.theme === 'light' ? <Sun size={16} className="text-slate-400" /> : <Moon size={16} className="text-slate-400" />}
                                  </div>
                                  <span className="text-sm font-bold">Тема интерфейса</span>
                              </div>
                              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                   <button 
                                      onClick={() => setFormData({...formData, theme: 'light'})}
                                      className={cn("p-1.5 rounded-lg transition-all", formData.theme === 'light' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                                   >
                                      <Sun size={14} />
                                   </button>
                                   <button 
                                      onClick={() => setFormData({...formData, theme: 'dark'})}
                                      className={cn("p-1.5 rounded-lg transition-all", formData.theme === 'dark' ? "bg-slate-700 text-indigo-400 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                                   >
                                      <Moon size={14} />
                                   </button>
                              </div>
                          </div>
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    <Globe size={16} className="text-slate-400" />
                                  </div>
                                  <span className="text-sm font-bold">Язык системы</span>
                              </div>
                              <select 
                                value={formData.language}
                                onChange={e => setFormData({...formData, language: e.target.value})}
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs font-bold"
                              >
                                <option value="ru">Русский (RU)</option>
                                <option value="en">English (EN)</option>
                              </select>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="flex justify-end pt-8 border-t border-slate-100 dark:border-slate-800">
                  <button 
                      onClick={handleSave}
                      disabled={saving}
                      className={cn(
                          "px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center space-x-3 disabled:opacity-50",
                          success ? "bg-emerald-500 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg"
                      )}
                  >
                      {saving ? <RefreshCcw size={16} className="animate-spin" /> : success ? <Shield className="animate-pulse" size={16} /> : null}
                      <span>{success ? 'Сохранено' : 'Сохранить настройки'}</span>
                      {!success && <ChevronRight size={16} />}
                  </button>
              </div>
          </div>
        )}
      </div>

      {/* Guestbook/Comments Section (Write something on the profile page) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 sm:p-10 rounded-[2.5rem] shadow-sm space-y-8">
        <div className="flex items-center gap-3 pb-6 border-b border-slate-100 dark:border-slate-800">
          <MessageSquare size={22} className="text-indigo-600" />
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-50">Книга отзывов & Гостевая книга</h3>
        </div>

        {/* Input comment editor box */}
        <form onSubmit={handlePostComment} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Напишите здесь ваше сообщение для {profileUser.name}</label>
            <textarea
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-sm font-medium outline-none resize-none h-28 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 transition-all text-slate-900 dark:text-slate-100 placeholder-slate-400"
              placeholder="Оставьте отзыв, слова поддержки или задайте публичный вопрос..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={commentSubmitting}
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-md"
            >
              {commentSubmitting ? <RefreshCcw size={14} className="animate-spin" /> : <MessageSquare size={14} />}
              <span>Отправить сообщение</span>
            </button>
          </div>
        </form>

        {/* Comments Feed List */}
        <div className="space-y-5 pt-4">
          {comments && comments.length > 0 ? (
            comments.map((comment: any) => (
              <div key={comment.id} className="p-6 bg-slate-50/60 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800/80 rounded-2xl flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 flex-shrink-0">
                  {comment.authorAvatar ? (
                    <img src={comment.authorAvatar} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <UserIcon size={18} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center flex-wrap gap-2 mb-2">
                    <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{comment.authorName}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">{new Date(comment.createdAt).toLocaleString()}</p>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-400 dark:text-slate-600 font-medium italic text-sm">
              Колонка пуста. Будьте первыми, кто оставит сообщение на странице {profileUser.name}!
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
