import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  GraduationCap, 
  Clock, 
  ChevronRight, 
  Trophy,
  Users,
  Star
} from 'lucide-react';
import { motion } from 'motion/react';
import { Course, User } from '../types';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [curator, setCurator] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, curatorRes] = await Promise.all([
          fetch('/api/courses'),
          user?.curatorId ? fetch(`/api/users/${user.curatorId}`) : Promise.resolve(null)
        ]);
        
        const coursesData = await coursesRes.json();
        setCourses(coursesData);
        
        if (curatorRes) {
          const curatorData = await curatorRes.json();
          setCurator(curatorData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const stats = JSON.parse(user?.stats || '{"completedCourses": 0, "totalArticles": 0, "rank": "Новичок"}');

  const [generatingCert, setGeneratingCert] = useState(false);

  const generateCert = async () => {
    setGeneratingCert(true);
    try {
      const courseNames = courses.map(c => c.title);
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseIds: courseNames })
      });
      if (res.ok) {
        alert('Сертификат успешно создан! Его можно найти в вашем профиле.');
      }
    } finally {
      setGeneratingCert(false);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center font-mono opacity-50">SYNCING DATA...</div>;

  return (
    <div className="space-y-10 pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 dark:border-slate-800 pb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-slate-900 dark:text-slate-100">C возвращением, {user?.name}! 👋</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium italic">"Обучение — это путь, а не пункт назначения." Продолжай в том же духе.</p>
        </div>
        <div className="flex bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm min-w-[320px]">
          <div className="flex-1 px-6 py-3 text-center border-r border-slate-100 dark:border-slate-800">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold mb-1">Ваш статус</p>
            <p className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xl">{stats.rank}</p>
          </div>
          <div className="flex-1 px-6 py-3 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold mb-1">Прогресс</p>
            <p className="font-extrabold text-slate-900 dark:text-slate-100 text-xl">{stats.completedCourses} курсов</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Feed */}
        <div className="lg:col-span-8 space-y-12">
          {/* Active / Recommended Courses */}
          <section>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-extrabold flex items-center space-x-3 text-slate-900 dark:text-slate-100">
                <BookOpen size={24} className="text-indigo-600" />
                <span>Образовательные треки</span>
              </h2>
              <Link to="/courses" className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-[0.2em] underline decoration-indigo-200 underline-offset-4">Посмотреть всё</Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {courses.map((course, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={course.id}
                  className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden hover:shadow-2xl hover:shadow-indigo-100 dark:hover:shadow-none hover:-translate-y-1 transition-all"
                >
                  <div className="h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                    {course.imageUrl ? (
                      <img src={course.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200">
                        <Star size={64} fill="currentColor" />
                      </div>
                    )}
                    <div className="absolute top-5 left-5 bg-white/90 backdrop-blur-md text-slate-900 text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg border border-white/20 shadow-sm">
                      {course.estimatedTime || '45 мин'}
                    </div>
                  </div>
                  <div className="p-8">
                    <h3 className="font-extrabold text-xl mb-3 text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">{course.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-8 leading-relaxed font-medium">{course.description}</p>
                    <Link 
                      to={`/courses/${course.id}`}
                      className="w-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 py-4 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 group/btn transition-all hover:bg-indigo-600 dark:hover:bg-indigo-50 hover:text-white dark:hover:text-indigo-600 shadow-lg shadow-slate-200 dark:shadow-none"
                    >
                      <span>Начать изучение</span>
                      <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Achievements / Features */}
          <section className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl shadow-slate-300 dark:shadow-none">
            <Trophy size={160} className="absolute -bottom-10 -right-10 text-white/5 -rotate-12" />
            <div className="max-w-md relative z-10">
              <div className="text-indigo-400 font-bold uppercase tracking-[0.3em] text-[10px] mb-4">Ваша цель</div>
              <h2 className="text-4xl font-extrabold mb-6 tracking-tight">Подтвердите свою компетенцию</h2>
              <p className="text-slate-400 mb-10 leading-relaxed text-lg font-medium">После успешного завершения всех модулей вы получите персональный верифицируемый сертификат от BotSupport.Edu.</p>
              <button 
                onClick={generateCert}
                disabled={generatingCert || stats.completedCourses === 0}
                className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-extrabold hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-600 flex items-center space-x-3"
              >
                {generatingCert ? (
                  <RefreshCcw size={20} className="animate-spin" />
                ) : (
                  <>
                    <span>Получить сертификат</span>
                    <ChevronRight size={20} />
                  </>
                )}
              </button>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-10">
          {/* Curator Info */}
          <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs uppercase tracking-[0.3em] font-extrabold text-slate-400 mb-8 flex items-center space-x-2">
              <GraduationCap size={18} className="text-indigo-600" />
              <span>Куратор курса</span>
            </h3>
            {curator ? (
              <div className="space-y-8">
                <div className="flex items-center space-x-5">
                  <div className="w-20 h-20 rounded-3xl bg-slate-50 dark:bg-slate-800 overflow-hidden border-2 border-white dark:border-slate-800 shadow-md">
                    {curator.avatar ? (
                      <img src={curator.avatar} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-extrabold text-2xl text-indigo-600 bg-indigo-50">
                        {curator.name[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xl text-slate-900 dark:text-slate-100">{curator.name} {curator.surname}</h4>
                    <p className="text-emerald-500 text-[10px] uppercase font-extrabold tracking-widest mt-1">Онлайн</p>
                  </div>
                </div>
                <Link 
                  to={`/messages/${curator.id}`}
                  className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl text-center font-extrabold transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
                >
                  Задать вопрос
                </Link>
                <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">Обычно отвечает за 15 мин</p>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-400">Назначение куратора в процессе...</p>
              </div>
            )}
          </section>

          {/* Quick Stats */}
          <section className="space-y-6">
            <h3 className="text-[10px] uppercase tracking-[0.3em] font-extrabold text-slate-400 ml-4">Персональные инсайты</h3>
            <div className="grid grid-cols-1 gap-4">
              {[
                { label: 'База знаний', value: stats.totalArticles, sub: 'статей изучено', color: 'bg-indigo-500' },
                { label: 'Домашние задания', value: 2, sub: 'на проверке', color: 'bg-emerald-500' },
                { label: 'Дней в системе', value: 14, sub: 'непрерывного обучения', color: 'bg-amber-500' },
              ].map((item, i) => (
                <div key={i} className="group flex items-center justify-between p-6 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-200 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={cn("w-2 h-2 rounded-full", item.color)} />
                    <div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{item.label}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{item.sub}</p>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">{item.value}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
