import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  User, 
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
  RefreshCcw
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    surname: user?.surname || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '',
    language: user?.language || 'ru',
    theme: user?.theme || 'light'
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      await refreshUser();
      alert('Сохранено!');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const stats = typeof user?.stats === 'string' 
    ? JSON.parse(user.stats) 
    : (user?.stats || { completedCourses: 0, totalArticles: 0, rank: "Новичок" });

  const tabs = [
    { id: 'profile', label: 'Профиль', icon: User },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Profile Header */}
      <div className="bg-slate-900 text-white rounded-[3rem] p-8 md:p-14 relative overflow-hidden shadow-2xl shadow-slate-300 dark:shadow-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full" />
        
        <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
           <div className="relative group">
              <div className="w-40 h-40 rounded-[2.5rem] bg-slate-800 overflow-hidden border-4 border-slate-800 shadow-xl transition-all group-hover:border-indigo-500">
                {formData.avatar ? <img src={formData.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-5xl bg-indigo-600 shadow-inner">{user?.name[0]}</div>}
              </div>
              <button className="absolute -bottom-2 -right-2 p-3 bg-indigo-600 text-white rounded-2xl shadow-xl hover:bg-indigo-700 transition-all active:scale-95">
                <Camera size={20} />
              </button>
           </div>
           
           <div className="text-center md:text-left flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                <h1 className="text-4xl font-black tracking-tight">{user?.name} {user?.surname}</h1>
                <span className="inline-flex px-3 py-1 bg-white/10 backdrop-blur-md text-indigo-300 text-[10px] uppercase font-black tracking-[0.2em] rounded-lg border border-white/10">
                    {user?.role}
                </span>
              </div>
              <p className="text-slate-400 text-lg leading-relaxed font-medium max-w-lg">{user?.bio || 'Настройте свой профиль, чтобы кураторы и другие ученики могли узнать больше о вашем опыте и целях.'}</p>
           </div>

           <div className="flex md:flex-col gap-4">
             <div className="p-6 bg-white/5 border border-white/10 backdrop-blur-sm rounded-[1.5rem] text-center min-w-[120px]">
                <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mb-1">XP</p>
                <p className="text-2xl font-black tracking-tighter">1,240</p>
             </div>
             <div className="p-6 bg-white/5 border border-white/10 backdrop-blur-sm rounded-[1.5rem] text-center min-w-[120px]">
                <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest mb-1">Ранг</p>
                <p className="text-2xl font-black tracking-tighter">#42</p>
             </div>
           </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-12">
        {/* Navigation */}
        <aside className="w-full md:w-64 space-y-2">
          <div className="text-[10px] uppercase tracking-[0.3em] font-extrabold text-slate-400 ml-4 mb-4">Меню</div>
          {tabs.map(tab => (
            <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={cn(
                "w-full flex items-center space-x-4 px-6 py-4 rounded-2xl font-extrabold text-sm transition-all",
                activeTab === tab.id 
                  ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm border border-slate-100 dark:border-slate-800" 
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
               )}
            >
              <tab.icon size={20} className={cn(activeTab === tab.id ? "text-indigo-600" : "text-slate-400")} />
              <span>{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* Content */}
        <div className="flex-1 space-y-10">
          {activeTab === 'profile' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <section className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                    <Trophy className="text-indigo-600" size={16} />
                    <span>Достижения</span>
                  </h3>
                  <div className="space-y-6">
                    {[
                      { icon: Shield, label: 'Защитник ботов', desc: 'Первые 10 ответов', color: 'bg-indigo-50 text-indigo-600' },
                      { icon: Star, label: 'Лидер мнений', desc: 'Помощь коллегам', color: 'bg-amber-50 text-amber-600' },
                      { icon: Activity, label: 'Марафонец', desc: '7 дней активностей', color: 'bg-emerald-50 text-emerald-600' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-5 group cursor-default">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", item.color)}>
                            <item.icon size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{item.label}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 py-3 border border-indigo-100 rounded-xl transition-colors">Смотреть все</button>
               </section>

               <section className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                    <Activity className="text-indigo-600" size={16} />
                    <span>Аналитика</span>
                  </h3>
                  <div className="space-y-6">
                     <div className="flex justify-between items-center py-4 border-b border-slate-50 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 tracking-widest uppercase font-extrabold">Завершено курсов</span>
                        <span className="font-black text-lg text-slate-900 dark:text-slate-100">{stats.completedCourses}</span>
                     </div>
                     <div className="flex justify-between items-center py-4 border-b border-slate-50 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 tracking-widest uppercase font-extrabold">Уроков пройдено</span>
                        <span className="font-black text-lg text-slate-900 dark:text-slate-100">{stats.totalArticles}</span>
                     </div>
                     <div className="flex justify-between items-center py-4">
                        <span className="text-[10px] text-slate-400 tracking-widest uppercase font-extrabold">Средний прогресс</span>
                        <span className="font-black text-lg text-emerald-500">88%</span>
                     </div>
                  </div>
               </section>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Личные данные</h4>
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 ml-1">Имя</label>
                                <input 
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100 transition-all border-none"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 ml-1">Фамилия</label>
                                <input 
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100 transition-all border-none"
                                    value={formData.surname}
                                    onChange={e => setFormData({...formData, surname: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 ml-1">Био</label>
                                <textarea 
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-5 py-3 text-sm font-medium outline-none resize-none h-24 focus:ring-2 focus:ring-indigo-100 transition-all border-none"
                                    value={formData.bio}
                                    onChange={e => setFormData({...formData, bio: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Система</h4>
                        <div className="space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                      <Globe size={16} className="text-slate-400" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Язык интерфейса</span>
                                </div>
                                <select 
                                    className="bg-slate-100 dark:bg-slate-950 border-none rounded-xl px-4 py-2 text-xs font-bold font-mono outline-none cursor-pointer"
                                    value={formData.language}
                                    onChange={e => setFormData({...formData, language: e.target.value})}
                                >
                                    <option value="ru">RU</option>
                                    <option value="en">EN</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                      <Bell size={16} className="text-slate-400" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Push-уведомления</span>
                                </div>
                                <button className="w-12 h-6 bg-indigo-600 rounded-full relative shadow-inner">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md" />
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                      {formData.theme === 'light' ? <Sun size={16} className="text-slate-400" /> : <Moon size={16} className="text-slate-400" />}
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Цветовая тема</span>
                                </div>
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                                     <button 
                                        onClick={() => setFormData({...formData, theme: 'light'})}
                                        className={cn("p-1.5 rounded-xl transition-all", formData.theme === 'light' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                                     >
                                        <Sun size={16} />
                                     </button>
                                     <button 
                                        onClick={() => setFormData({...formData, theme: 'dark'})}
                                        className={cn("p-1.5 rounded-xl transition-all", formData.theme === 'dark' ? "bg-slate-700 text-indigo-400 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                                     >
                                        <Moon size={16} />
                                     </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-10 border-t border-slate-50 dark:border-slate-800">
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 active:scale-[0.98] transition-all flex items-center space-x-3 disabled:opacity-50"
                    >
                        {saving ? <RefreshCcw size={18} className="animate-spin" /> : <span>Сохранить всё</span>}
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Star({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
    )
}
