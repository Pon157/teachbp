import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
  CheckCircle2,
  ExternalLink,
  Heart,
  CornerDownRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AnimatePresence, motion } from 'motion/react';

export default function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>();
  const { user: currentUser, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Determine if this is the logged-in user's own profile
  const isOwnProfile = !userId || userId === currentUser?.id;

  const [profileUser, setProfileUser] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'notifications'>('profile');

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Guestbook comments
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Replies & Likes Maps
  const [replyInputMap, setReplyInputMap] = useState<Record<string, string>>({});
  const [replySubmittingMap, setReplySubmittingMap] = useState<Record<string, boolean>>({});

  // Notifications Hub
  const [notifications, setProfileNotifications] = useState<any[]>([]);

  // Certificates
  const [certs, setCerts] = useState<any[]>([]);

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

      // Load certificates for the target profile
      const certsRes = await fetch(`/api/users/${targetId}/certificates`);
      if (certsRes.ok) {
        const certsData = await certsRes.json();
        setCerts(certsData);
      }

      // Load own notification center list if viewing own profile
      if (isOwnProfile) {
        const notificationsRes = await fetch('/api/notifications');
        if (notificationsRes.ok) {
          setProfileNotifications(await notificationsRes.json());
        }
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
        showToast(err.error || 'Ошибка при отправке сообщения');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/like`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, likes: data.likes } : c));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostReply = async (commentId: string) => {
    const text = replyInputMap[commentId]?.trim();
    if (!text) return;

    setReplySubmittingMap(prev => ({ ...prev, [commentId]: true }));
    try {
      const res = await fetch(`/api/comments/${commentId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      });
      if (res.ok) {
        const data = await res.json();
        setReplyInputMap(prev => ({ ...prev, [commentId]: '' }));
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, replies: data.replies } : c));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReplySubmittingMap(prev => ({ ...prev, [commentId]: false }));
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
                       showToast('Ссылка на профиль скопирована!');
                   } catch (err) {
                       try {
                           navigator.clipboard.writeText(link);
                           showToast('Ссылка на профиль скопирована!');
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

          <div className="grid grid-cols-2 md:flex md:flex-col gap-4 w-full md:w-auto shrink-0">
            <div className="p-4 sm:p-6 bg-white/5 border border-white/10 backdrop-blur-md rounded-[1.5rem] text-center min-w-[110px] sm:min-w-[130px]">
               <p className="text-[9px] sm:text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1 font-sans">Опыт (XP)</p>
               <p className="text-xl sm:text-2xl font-black tracking-tighter text-indigo-300 font-mono">{stats.xp}</p>
            </div>
            <div className="p-4 sm:p-6 bg-white/5 border border-white/10 backdrop-blur-md rounded-[1.5rem] text-center min-w-[110px] sm:min-w-[130px]">
               <p className="text-[9px] sm:text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1 font-sans">Создано курсов</p>
               <p className="text-xl sm:text-2xl font-black tracking-tighter text-emerald-300 font-mono">{stats.createdCourses || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu (Only shown on own profile to toggle settings) */}
      {isOwnProfile && (
        <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-px overflow-x-auto whitespace-nowrap scrollbar-none [mask-image:linear-gradient(to_right,white_85%,transparent)] md:[mask-image:none]">
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
             onClick={() => setActiveTab('notifications')}
             className={cn(
               "pb-4 px-6 text-xs font-black uppercase tracking-widest border-b-[3px] transition-all flex items-center gap-2",
               activeTab === 'notifications' 
                 ? "border-indigo-600 text-slate-900 dark:text-slate-100" 
                 : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
             )}
          >
             <span>Уведомления</span>
             {notifications.filter(n => !n.read).length > 0 && (
               <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[9px] font-black animate-pulse">
                 {notifications.filter(n => !n.read).length}
               </span>
             )}
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
        {(!isOwnProfile || activeTab === 'profile') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
             {/* Left Column: Achievements Gallery & Certificates */}
             <div className="lg:col-span-8 space-y-8">
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 sm:p-10 rounded-[2.5rem] shadow-sm space-y-8">
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

                {/* Certificates Section */}
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 sm:p-10 rounded-[2.5rem] shadow-sm space-y-6">
                   <div className="flex justify-between items-center pb-6 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="text-xl font-black text-slate-950 dark:text-slate-50 flex items-center gap-3">
                         <Award size={22} className="text-indigo-600" />
                         <span>Полученные сертификаты</span>
                      </h3>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                         Всего: {certs.length}
                      </span>
                   </div>

                   {certs.length > 0 ? (
                     <div className="space-y-6">
                       {certs.map((cert) => {
                         const courseNames = JSON.parse(cert.courseIds || '[]');
                         const verificationUrl = `${window.location.origin}/verify/${cert.shareId}`;
                         return (
                           <div key={cert.id} className="p-6 bg-slate-50/50 dark:bg-slate-800/10 border border-slate-200 dark:border-slate-800 rounded-[1.8rem] flex flex-col md:flex-row gap-6 items-start md:items-center justify-between hover:shadow-md transition-all">
                             <div className="flex items-start gap-4 flex-1">
                               <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold">
                                 <Award size={26} />
                               </div>
                               <div className="space-y-1 min-w-0 flex-1">
                                 <h4 className="font-extrabold text-base text-slate-950 dark:text-slate-50 tracking-tight flex items-center gap-2">
                                   <span>Сертификат Специалиста</span>
                                   <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-md shrink-0">Подтвержден</span>
                                 </h4>
                                 <p className="text-xs text-slate-505 dark:text-slate-400 font-medium">
                                   ID Документа: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">{cert.shareId}</span> • Дата: {new Date(cert.createdAt).toLocaleDateString()}
                                 </p>
                                 <div className="flex flex-wrap gap-1.5 mt-2">
                                   {courseNames.map((name: string, i: number) => (
                                     <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                                       {name}
                                     </span>
                                   ))}
                                 </div>
                               </div>
                             </div>

                             <div className="flex gap-2 w-full md:w-auto self-stretch md:self-auto justify-end">
                               <Link 
                                 to={`/verify/${cert.shareId}`}
                                 className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest text-center transition-all inline-flex items-center justify-center gap-1.5"
                               >
                                 <span>Открыть</span>
                                 <ExternalLink size={13} />
                               </Link>
                               <button
                                 onClick={() => {
                                   try {
                                     navigator.clipboard.writeText(verificationUrl);
                                     showToast('Ссылка скопирована!');
                                   } catch (e) {
                                     const textArea = document.createElement("textarea");
                                     textArea.value = verificationUrl;
                                     textArea.style.position = "fixed";
                                     textArea.style.opacity = "0";
                                     document.body.appendChild(textArea);
                                     textArea.select();
                                     document.execCommand('copy');
                                     document.body.removeChild(textArea);
                                     showToast('Ссылка скопирована!');
                                   }
                                 }}
                                 className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest text-center transition-all border border-slate-200 dark:border-slate-750"
                               >
                                 Ссылка
                               </button>
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   ) : (
                     <div className="py-12 text-center text-slate-400 dark:text-slate-500 font-medium italic text-sm border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                       У этого пользователя пока нет сгенерированных сертификатов.
                     </div>
                   )}
                </section>
             </div>

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
        )}

        {isOwnProfile && activeTab === 'settings' && (
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
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/25 transition-all resize-none h-24"
                                  value={formData.bio}
                                  onChange={e => setFormData({...formData, bio: e.target.value})}
                                  placeholder="Пара слов о вашем опыте и целях в образовании..."
                              />
                          </div>
                      </div>
                  </div>

                  <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Настройки среды</h4>
                      <div className="space-y-5">
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
                                      className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", formData.theme === 'light' ? "bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-slate-100" : "text-slate-400")}
                                   >
                                      <Sun size={14} />
                                   </button>
                                   <button 
                                      onClick={() => setFormData({...formData, theme: 'dark'})}
                                      className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", formData.theme === 'dark' ? "bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-slate-100" : "text-slate-400")}
                                   >
                                      <Moon size={14} />
                                   </button>
                              </div>
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

        {isOwnProfile && activeTab === 'notifications' && (
          <div className="bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
             <div className="flex justify-between items-center pb-6 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-4">
                <h3 className="text-xl font-black text-slate-950 dark:text-slate-50 flex items-center gap-3">
                   <Bell size={22} className="text-indigo-600" />
                   <span>Центр Уведомлений</span>
                </h3>
                {notifications.length > 0 && (
                  <button 
                    onClick={async () => {
                       await fetch('/api/notifications/read-all', { method: 'POST' });
                       setProfileNotifications(prev => prev.map(item => ({ ...item, read: true })));
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 uppercase tracking-wider font-extrabold cursor-pointer"
                  >
                     Отметить все как прочитанные
                  </button>
                )}
             </div>

             <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 font-mono text-xs italic">У вас пока нет уведомлений.</div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      className={cn(
                        "p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left",
                        n.read 
                          ? "bg-slate-50/20 dark:bg-slate-800/10 border-slate-200/60 dark:border-slate-800/80" 
                          : "bg-indigo-50/15 dark:bg-indigo-950/10 border-indigo-100/40 dark:border-indigo-900/40 shadow-sm"
                      )}
                    >
                      <div className="space-y-1">
                         <p className={cn("text-sm font-extrabold", n.read ? "text-slate-500 dark:text-slate-400" : "text-slate-800 dark:text-slate-100")}>{n.message}</p>
                         <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{new Date(n.createdAt).toLocaleString('ru-RU')}</p>
                      </div>
                      <div className="flex gap-2 self-end sm:self-auto shrink-0">
                         {!n.read && (
                           <button 
                             onClick={async () => {
                                await fetch(`/api/notifications/${n.id}/read`, { method: 'POST' });
                                setProfileNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
                             }}
                             className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 rounded-lg text-xs font-bold tracking-wider uppercase transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                           >
                              Прочитано
                           </button>
                         )}
                         {n.link && (
                           <Link 
                             to={n.link}
                             onClick={async () => {
                                if (!n.read) {
                                  await fetch(`/api/notifications/${n.id}/read`, { method: 'POST' });
                                  setProfileNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
                                }
                             }}
                             className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                           >
                              <span>Перейти</span>
                              <ChevronRight size={14} />
                           </Link>
                         )}
                      </div>
                    </div>
                  ))
                )}
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

                  {/* Action buttons + Likes */}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                    <button
                      onClick={() => handleLikeComment(comment.id)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer",
                        (Array.isArray(comment.likes) && comment.likes.includes(currentUser?.id))
                          ? "text-rose-500"
                          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      )}
                    >
                      <Heart size={14} className="shrink-0" fill={(Array.isArray(comment.likes) && comment.likes.includes(currentUser?.id)) ? "currentColor" : "none"} />
                      <span>{Array.isArray(comment.likes) ? comment.likes.length : 0} Лайков</span>
                    </button>
                  </div>

                  {/* Replies thread */}
                  <div className="mt-4 space-y-3 pl-4 border-l-2 border-slate-100 dark:border-slate-800">
                    {Array.isArray(comment.replies) && comment.replies.map((reply: any) => (
                      <div key={reply.id} className="text-left bg-slate-50/50 dark:bg-slate-900/40 rounded-xl p-3 border border-slate-150/60 dark:border-slate-800/40">
                         <div className="flex gap-2 items-start">
                            <div className="w-6 h-6 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0">
                               {reply.authorAvatar ? (
                                 <img src={reply.authorAvatar} className="w-full h-full object-cover" />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center text-slate-400">
                                   <UserIcon size={12} />
                                 </div>
                               )}
                            </div>
                            <div className="flex-1 min-w-0 font-sans">
                               <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                                  <p className="text-[11px] font-black text-slate-800 dark:text-slate-200">{reply.authorName}</p>
                                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">{new Date(reply.createdAt).toLocaleString()}</p>
                               </div>
                               <p className="text-xs font-medium text-slate-600 dark:text-slate-350">{reply.content}</p>
                            </div>
                         </div>
                      </div>
                    ))}

                    {/* Reply Form */}
                    <div className="flex gap-2 items-center pt-2">
                       <input 
                         type="text"
                         placeholder="Ответить в гостевой книге..."
                         value={replyInputMap[comment.id] || ''}
                         className="flex-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-505 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400"
                         onChange={e => setReplyInputMap({ ...replyInputMap, [comment.id]: e.target.value })}
                         onKeyDown={e => {
                            if (e.key === 'Enter') {
                              handlePostReply(comment.id);
                            }
                         }}
                       />
                       <button
                         onClick={() => handlePostReply(comment.id)}
                         disabled={replySubmittingMap[comment.id]}
                         className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black uppercase text-[9px] tracking-widest rounded-lg transition-all cursor-pointer"
                       >
                          {replySubmittingMap[comment.id] ? <RefreshCcw size={10} className="animate-spin" /> : 'Ответ'}
                       </button>
                    </div>
                  </div>
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

      {/* Floating Action Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-50 bg-indigo-900 border border-indigo-700 text-white font-black tracking-wide text-xs px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md bg-opacity-95"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
