import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  Users, 
  CheckCircle, 
  AlertCircle,
  XCircle,
  MessageSquare,
  Search,
  BookOpen,
  Calendar,
  Sparkles,
  ClipboardList,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

interface Submission {
  progressId: string;
  user: {
    id: string;
    name: string;
    surname: string;
    email: string;
    avatar?: string;
  } | null;
  block: {
    id: string;
    title: string;
  };
  course: {
    id: string;
    title: string;
  };
  homeworkResponse: Record<string, string>;
  grade: 'accepted' | 'rejected' | 'needs_revision' | null;
  feedback?: string | null;
  tasks: {
    id: string;
    type: string;
    description: string;
    options?: any;
    correctAnswer?: string;
  }[];
  updatedAt: string;
}

export default function CuratorPanel() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingGrade, setSubmittingGrade] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'revision'>('pending');
  const [search, setSearch] = useState('');

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/curator/submissions');
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleGrade = async (progressId: string, grade: 'accepted' | 'rejected' | 'needs_revision') => {
    setSubmittingGrade(true);
    try {
      const res = await fetch(`/api/curator/submissions/${progressId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade, feedback: feedbackText })
      });
      
      if (res.ok) {
        alert('Задание успешно оценено!');
         setActiveSubmission(null);
         setFeedbackText('');
         fetchSubmissions();
      } else {
        const err = await res.json();
        alert(err.error || 'Ошибка сохранения оценки');
      }
    } catch (err) {
      console.error(err);
      alert('Сетевая ошибка');
    } finally {
      setSubmittingGrade(false);
    }
  };

  // Selection handler
  const selectSubmission = (sub: Submission) => {
    setActiveSubmission(sub);
    setFeedbackText(sub.feedback || '');
  };

  // Filtering submissions
  const filteredSubmissions = submissions.filter(s => {
    const userName = `${s.user?.name || ''} ${s.user?.surname || ''}`.toLowerCase();
    const courseName = s.course.title.toLowerCase();
    const blockName = s.block.title.toLowerCase();
    const matchesSearch = userName.includes(search.toLowerCase()) || 
                          courseName.includes(search.toLowerCase()) || 
                          blockName.includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return s.grade === null;
    if (statusFilter === 'accepted') return s.grade === 'accepted';
    if (statusFilter === 'revision') return s.grade === 'needs_revision';
    return true;
  });

  if (loading) {
    return <div className="h-full flex items-center justify-center font-mono opacity-50 uppercase tracking-widest text-[10px]">Encrypting Curator Records...</div>;
  }

  if (user?.role !== 'curator' && user?.role !== 'teacher' && user?.role !== 'admin') {
    return (
      <div className="py-24 max-w-lg mx-auto text-center space-y-6">
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Доступ ограничен</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          Этот кабинет предназначен исключительно для кураторов, учителей и администраторов.
        </p>
        <Link to="/dashboard" className="inline-block px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm transition-all hover:bg-indigo-700 hover:-translate-y-1 shadow-lg shadow-indigo-900/20">
          Вернуться на главную
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Curator Header Banner */}
      <div className="rounded-[3rem] bg-indigo-950 text-white p-8 md:p-14 relative overflow-hidden shadow-2xl border border-indigo-900/60">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <GraduationCap className="w-56 h-56" />
        </div>
        
        <div className="relative z-10 space-y-4 max-w-xl">
          <div className="flex items-center space-x-2 text-indigo-300 font-black text-[10px] uppercase tracking-[0.3em]">
            <Sparkles size={14} />
            <span>Кабинет Куратора</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none">Проверка домашних работ</h1>
          <p className="text-indigo-200/80 font-medium leading-relaxed">
            Приветствуем на рабочем месте, <span className="font-extrabold text-white">{user.name}</span>. Здесь вы можете просмотреть практические работы закрепленных за вами студентов, написать свои замечания, отправить задания на доработку или принять их.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Submissions Section */}
        <div className={cn("space-y-6 col-span-1", activeSubmission ? "lg:col-span-5" : "lg:col-span-12")}>
          {/* Controls bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Status tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'pending', label: 'Не проверено', count: submissions.filter(s => s.grade === null).length },
                { id: 'accepted', label: 'Зачтено', count: submissions.filter(s => s.grade === 'accepted').length },
                { id: 'revision', label: 'На доработке', count: submissions.filter(s => s.grade === 'needs_revision').length },
                { id: 'all', label: 'Все работы', count: submissions.length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2",
                    statusFilter === tab.id
                      ? "bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-md"
                      : "bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  )}
                >
                  <span>{tab.label}</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-black",
                    statusFilter === tab.id ? "bg-white/20 dark:bg-slate-950/10 text-white dark:text-slate-950" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative md:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Поиск по студенту, теме..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Submissions list container */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredSubmissions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white dark:bg-slate-900 text-center py-16 px-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center space-y-4"
                >
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-950 text-slate-400 rounded-2xl flex items-center justify-center">
                    <ClipboardList size={22} />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Здесь пока ничего нет</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs max-w-xs font-medium">Кажется, нет верифицированных работ по выбранному фильтру.</p>
                </motion.div>
              ) : (
                filteredSubmissions.map(sub => {
                  const isSelected = activeSubmission?.progressId === sub.progressId;
                  
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={sub.progressId}
                      onClick={() => selectSubmission(sub)}
                      className={cn(
                        "p-6 bg-white dark:bg-slate-900 border rounded-[2rem] shadow-sm cursor-pointer transition-all hover:translate-x-1 flex flex-col md:flex-row md:items-center justify-between gap-6",
                        isSelected 
                          ? "border-indigo-600 ring-2 ring-indigo-500/20 shadow-indigo-100 dark:shadow-none" 
                          : "border-slate-200 dark:border-slate-800"
                      )}
                    >
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-extrabold text-[15px]">
                            {sub.user?.avatar ? (
                              <img src={sub.user.avatar} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              <span>{sub.user?.name[0] || 'С'}</span>
                            )}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{sub.user ? `${sub.user.name} ${sub.user.surname}` : 'Анонимный Студент'}</h4>
                            <p className="text-[10px] text-slate-400 font-bold">{sub.user?.email}</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center text-xs gap-1.5 font-bold text-slate-500 dark:text-slate-400">
                             <BookOpen size={14} className="text-slate-400 shrink-0" />
                             <span className="truncate">{sub.course.title}</span>
                          </div>
                          <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 pl-5">
                             {sub.block.title}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4">
                        <div className="text-right hidden md:block">
                          <div className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider mb-1 flex items-center gap-1 justify-end">
                            <Calendar size={10} />
                            <span>{new Date(sub.updatedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold">
                            Всего задач: {sub.tasks.length}
                          </div>
                        </div>

                        <div>
                          {sub.grade === 'accepted' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-lg border border-emerald-200/30">
                              <CheckCircle size={12} />
                              Зачтено
                            </span>
                          ) : sub.grade === 'needs_revision' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-lg border border-amber-200/30">
                              <AlertCircle size={12} />
                              Доработка
                            </span>
                          ) : sub.grade === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider rounded-lg border border-rose-200/30">
                              <XCircle size={12} />
                              Отколнено
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wide rounded-lg border border-indigo-200/30 animate-pulse">
                              Ждет проверки
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Evaluation Side Panel */}
        <AnimatePresence>
          {activeSubmission && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="col-span-1 lg:col-span-7 space-y-6"
            >
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-sm relative overflow-hidden">
                {/* Header info */}
                <div className="flex items-start justify-between pb-6 border-b border-slate-150 dark:border-slate-800 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black tracking-widest text-indigo-600 uppercase">Оценка решения</span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white capitalize truncate">{activeSubmission.user ? `${activeSubmission.user.name} ${activeSubmission.user.surname}` : 'Студент'}</h3>
                    <p className="text-xs text-slate-500 font-bold leading-relaxed">{activeSubmission.course.title} / {activeSubmission.block.title}</p>
                  </div>
                  <button 
                    onClick={() => setActiveSubmission(null)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all font-black text-xs text-slate-400"
                  >
                    Закрыть
                  </button>
                </div>

                {/* Submissions comparison list */}
                <div className="py-8 space-y-8 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {activeSubmission.tasks.map((task, oIdx) => {
                    const studentAns = activeSubmission.homeworkResponse[task.id] || '(Нет ответа)';
                    return (
                      <div key={task.id} className="space-y-4 border-b border-dashed border-slate-150 dark:border-slate-800/60 pb-6 last:border-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 shrink-0 bg-indigo-500/10 text-indigo-500 rounded flex items-center justify-center font-bold text-xs">{oIdx + 1}</span>
                          <div>
                            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{task.description}</p>
                            {task.type === 'quiz' && task.correctAnswer && (
                              <p className="text-[10px] text-emerald-500 font-black uppercase tracking-wider mt-1 block">
                                Правильный ответ: "{task.correctAnswer}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="p-5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 rounded-2xl space-y-1.5 ml-9">
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Ответ студента:</p>
                          <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{studentAns}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Grade Evaluation Form */}
                <div className="pt-6 border-t border-slate-150 dark:border-slate-800 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Замечания и рецензия (feedback)</label>
                    <textarea
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none min-h-[120px] placeholder:text-slate-400 font-bold"
                      placeholder="Напишите подробный разбор работы, укажите на допущенные ошибки или дайте совет..."
                      value={feedbackText}
                      onChange={e => setFeedbackText(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Re-assessment Actions */}
                    <button 
                      type="button"
                      disabled={submittingGrade}
                      onClick={() => handleGrade(activeSubmission.progressId, 'needs_revision')}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/10"
                    >
                      <AlertCircle size={14} />
                      На доработку
                    </button>
                    
                    <button 
                      type="button"
                      disabled={submittingGrade}
                      onClick={() => handleGrade(activeSubmission.progressId, 'rejected')}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/10"
                    >
                      <XCircle size={14} />
                      Отклонить
                    </button>

                    <button 
                      type="button"
                      disabled={submittingGrade}
                      onClick={() => handleGrade(activeSubmission.progressId, 'accepted')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/30"
                    >
                      <CheckCircle size={14} />
                      Принять зачет
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
