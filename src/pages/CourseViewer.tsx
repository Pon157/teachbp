import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Send,
  User as UserIcon,
  MessageSquare,
  RefreshCcw,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Course, CourseBlock, User } from '../types';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

export default function CourseViewer() {
  const { id } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course & { blocks: CourseBlock[] } | null>(null);
  const [author, setAuthor] = useState<User | null>(null);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [homeworkResponses, setHomeworkResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [completedBlocks, setCompletedBlocks] = useState<string[]>([]);
  const [progressList, setProgressList] = useState<any[]>([]);

  const fetchCourseData = async () => {
    try {
        const [courseRes, progressRes] = await Promise.all([
          fetch(`/api/courses/${id}`),
          fetch(`/api/progress/${id}`)
        ]);
        
        const data = await courseRes.json();
        const progressData = await progressRes.json();
        
        if (!courseRes.ok) {
          setError(data.error || 'Ошибка при загрузке курса');
          setLoading(false);
          return;
        }

        setCourse(data);
        setProgressList(progressData);
        setCompletedBlocks(progressData.filter((p: any) => p.status === 'completed').map((p: any) => p.blockId));
        
        if (data.authorId) {
          const authorRes = await fetch(`/api/users/${data.authorId}`);
          const authorData = await authorRes.json();
          setAuthor(authorData);
        }
    } catch (err) {
        setError('Сетевая ошибка');
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseData();
  }, [id]);

  // Sync previous homework response if exists
  useEffect(() => {
    if (course?.blocks && course.blocks[currentBlockIndex]) {
      const block = course.blocks[currentBlockIndex];
      const prog = progressList.find((p: any) => p.blockId === block.id);
      if (prog && prog.homeworkResponse) {
        setHomeworkResponses(prog.homeworkResponse);
      } else {
        setHomeworkResponses({});
      }
    }
  }, [currentBlockIndex, course, progressList]);

  const handleCompleteBlock = async () => {
    setSubmitting(true);
    try {
      const block = course!.blocks[currentBlockIndex];
      const res = await fetch('/api/progress/complete-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId: block.id, homeworkResponse: homeworkResponses })
      });
      
      await fetchCourseData(); // Reload stats and achievements progress lists!
      
      if (currentBlockIndex < course!.blocks.length - 1) {
        setCurrentBlockIndex(currentBlockIndex + 1);
      } else {
        const hasPendingHomework = course!.blocks.some(b => {
          const prog = progressList.find((p: any) => p.blockId === b.id);
          const hasHomework = b.homeworks && b.homeworks.length > 0;
          if (b.id === block.id) {
            return hasHomework;
          }
          return hasHomework && (!prog || prog.grade !== 'accepted');
        });

        if (hasPendingHomework) {
          alert('Поздравляем! Вы изучили все темы курса. Курс будет отмечен как пройденный, когда куратор проверит и примет все ваши домашние задания.');
        } else {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#f97316', '#ffffff', '#000000']
          });
          alert('Поздравляем! Вы успешно прошли весь курс!');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center font-mono opacity-50 uppercase tracking-widest text-[10px]">Decrypting Educational Data...</div>;
  if (error) return (
    <div className="h-full flex flex-col items-center justify-center p-10 text-center space-y-6">
       <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-3xl flex items-center justify-center">
          <GraduationCap size={40} className="text-red-500" />
       </div>
       <h1 className="text-2xl font-black text-slate-900 dark:text-white">Доступ ограничен</h1>
       <p className="text-slate-500 max-w-sm font-medium">{error}</p>
       <Link to="/dashboard" className="px-8 py-4 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-2xl font-black text-sm transition-all hover:-translate-y-1">
          Вернуться на главную
       </Link>
    </div>
  );
  if (!course) return <div className="h-full flex items-center justify-center text-red-500">Курс не найден</div>;

  if (!course.blocks || course.blocks.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-24 text-center space-y-6">
         <div className="w-20 h-20 mx-auto bg-indigo-50 dark:bg-indigo-500/10 rounded-3xl flex items-center justify-center">
            <GraduationCap size={40} className="text-indigo-600 dark:text-indigo-400" />
         </div>
         <h1 className="text-3xl font-black text-slate-900 dark:text-white">В этом курсе еще нет уроков</h1>
         <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">Автор курса пока не добавил ни одного учебного материала.</p>
         <Link to="/dashboard" className="inline-block px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm transition-all hover:bg-indigo-700 hover:-translate-y-1">
            Вернуться на главную
         </Link>
      </div>
    );
  }

  const currentBlock = course.blocks[currentBlockIndex];
  const progress = ((currentBlockIndex + 1) / course.blocks.length) * 100;
  const isLastBlock = currentBlockIndex === course.blocks.length - 1;
  const hasTasks = currentBlock.homeworks && currentBlock.homeworks.length > 0;
  
  const allTasksAnswered = !hasTasks || currentBlock.homeworks?.every(t => {
    if (t.type === 'quiz' && t.correctAnswer) {
      return homeworkResponses[t.id] === t.correctAnswer;
    }
    return !!homeworkResponses[t.id];
  });

  const currentProg = progressList?.find((p: any) => p.blockId === currentBlock?.id);
  const blockGrade = currentProg?.grade;
  const curatorFeedback = currentProg?.feedback;

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-14 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center space-x-3 text-slate-500 hover:text-indigo-600 transition-colors group">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-indigo-50">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold">Главная / Курс</span>
        </Link>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-bold">
            <Clock size={16} />
            <span>{course.estimatedTime || '30 мин'}</span>
          </div>
          <div className="flex items-center space-x-3">
             <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-emerald-500" 
              />
            </div>
            <span className="text-xs font-extrabold text-emerald-600">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentBlock?.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-16"
        >
          {/* Article Identity */}
          <div className="space-y-8">
            <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-[10px] uppercase tracking-[0.3em]">
              <span>Модуль {currentBlockIndex + 1}</span>
              <span className="text-slate-300">/</span>
              <span>{course.title}</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-tight text-slate-900 dark:text-slate-100 break-words">{currentBlock?.title}</h1>
            <div className="flex items-center space-x-6">
              {author && (
                <Link to={`/profile/${author.id}`} className="flex items-center space-x-4 hover:opacity-90 group transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm group-hover:border-indigo-500 transition-colors">
                    {author.avatar ? <img src={author.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-extrabold text-lg bg-indigo-50 text-indigo-600">{author.name[0]}</div>}
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest mb-0.5">Преподаватель</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 underline decoration-indigo-200 decoration-2 underline-offset-4 group-hover:text-indigo-600 transition-colors">{author.name} {author.surname}</p>
                  </div>
                </Link>
              )}
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-tighter">
                <CheckCircle2 size={16} className="text-emerald-500" />
                Сохранено в портфолио
              </div>
            </div>
          </div>

          {/* Article Content */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-8 md:p-14 rounded-2xl sm:rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <article 
              lang="ru"
              className="course-content-article max-w-none break-words overflow-x-auto max-w-full"
              dangerouslySetInnerHTML={{ __html: currentBlock?.content || '' }}
            />
          </div>

          {/* Homework Section */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-[3rem] p-4 sm:p-10 md:p-16 text-slate-900 dark:text-white relative overflow-hidden shadow-xl border border-slate-200 dark:border-zinc-800">
            <div className="absolute top-0 right-0 p-8 opacity-5 dark:opacity-10 pointer-events-none">
                <GraduationCap className="w-32 h-32 text-indigo-500" />
            </div>
            
            <div className="relative z-10 space-y-12">
              <h2 className="text-2xl sm:text-3xl font-black mb-8 flex items-center gap-4 text-slate-900 dark:text-white">
                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white bg-indigo-600">
                  <Send size={20} />
                </div>
                <span>Практика</span>
              </h2>

              {/* Curator Feedback Card */}
              {currentProg && (blockGrade || curatorFeedback) && (
                <div className={cn(
                  "p-8 rounded-[2rem] border relative overflow-hidden mb-8",
                  blockGrade === 'accepted' ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200" :
                  blockGrade === 'needs_revision' ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200" :
                  "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200"
                )}>
                  <div className="flex items-center gap-3 mb-3 font-bold text-lg">
                    <span>Решение проверено куратором:</span>
                    <span className={cn(
                      "px-3 py-1 rounded text-xs font-black uppercase tracking-wide",
                      blockGrade === 'accepted' ? "bg-emerald-500 text-slate-900" :
                      blockGrade === 'needs_revision' ? "bg-amber-500 text-slate-900" :
                      "bg-rose-500 text-white"
                    )}>
                      {blockGrade === 'accepted' ? 'Принято 🎉' :
                       blockGrade === 'needs_revision' ? 'На доработку ⚠️' :
                       'Отклонено ❌'}
                    </span>
                  </div>
                  {curatorFeedback && (
                    <div className="bg-slate-100/60 dark:bg-white/5 p-4 rounded-xl text-slate-700 dark:text-slate-300 italic max-w-full font-medium mt-1 leading-relaxed border border-slate-200 dark:border-white/5">
                      "{curatorFeedback}"
                    </div>
                  )}
                  {blockGrade === 'needs_revision' && (
                    <div className="text-amber-600 dark:text-amber-400 text-xs mt-3 font-black flex items-center gap-1">
                      <span>Пожалуйста, исправьте указанные ошибки и отправьте решение повторно!</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-10">
                {currentBlock.homeworks?.map((task, idx) => (
                  <div key={task.id} className="space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">{idx + 1}</div>
                        <p className="text-xl font-semibold text-slate-800 dark:text-slate-200">{task.description}</p>
                    </div>

                    {task.type === 'quiz' ? (
                       <div className="space-y-4 pl-4 sm:pl-12">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             {(() => {
                               const opts = typeof task.options === 'string'
                                 ? (() => { try { return JSON.parse(task.options); } catch { return []; } })()
                                 : (Array.isArray(task.options) ? task.options : []);

                               return opts.map((opt: string) => {
                                 const isSelected = homeworkResponses[task.id] === opt;
                                 const isCorrect = task.correctAnswer ? opt === task.correctAnswer : true;

                                 let btnClasses = "bg-slate-50 hover:bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300";
                                 if (isSelected) {
                                   if (task.correctAnswer) {
                                     btnClasses = isCorrect 
                                       ? "bg-emerald-50 dark:bg-emerald-600/30 border-emerald-400 dark:border-emerald-500 text-emerald-800 dark:text-emerald-250 shadow-md"
                                       : "bg-rose-50 dark:bg-rose-600/30 border-rose-400 dark:border-rose-500 text-rose-800 dark:text-rose-250 shadow-md";
                                   } else {
                                     btnClasses = "bg-indigo-600 border-indigo-600 text-white shadow-lg";
                                   }
                                 }

                                 return (
                                   <button 
                                      key={opt}
                                      type="button"
                                      onClick={() => setHomeworkResponses({ ...homeworkResponses, [task.id]: opt })}
                                      className={cn(
                                         "p-5 rounded-2xl border text-left font-bold transition-all text-sm flex items-center justify-between",
                                         btnClasses
                                      )}
                                   >
                                      <span>{opt}</span>
                                      {isSelected && task.correctAnswer && (
                                        <span className={cn(
                                          "text-[10px] font-black uppercase px-2 py-0.5 rounded",
                                          isCorrect ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-350" : "bg-rose-500/20 text-rose-600 dark:text-rose-350"
                                        )}>
                                          {isCorrect ? '✓ Верно' : '✗ Неверно'}
                                        </span>
                                      )}
                                   </button>
                                 );
                               });
                             })()}
                          </div>
                          {task.correctAnswer && homeworkResponses[task.id] && homeworkResponses[task.id] !== task.correctAnswer && (
                            <p className="text-rose-600 dark:text-rose-400 text-xs font-bold leading-none">
                              Выбран неверный вариант ответа. Обдумайте решение и выберите другой вариант!
                            </p>
                          )}
                       </div>
                    ) : (
                        <div className="pl-4 sm:pl-12 w-full">
                            <textarea 
                                className="w-full min-h-[140px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 text-sm sm:text-base text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                placeholder="Опишите свое решение здесь..."
                                value={homeworkResponses[task.id] || ''}
                                onChange={e => setHomeworkResponses({ ...homeworkResponses, [task.id]: e.target.value })}
                            />
                        </div>
                    )}
                  </div>
                ))}

                {!hasTasks && (
                  <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-sm p-8 rounded-[2rem] italic text-slate-600 dark:text-slate-300 text-lg font-medium leading-relaxed">
                      "Для этого урока нет специальных заданий. Просто нажмите кнопку ниже, чтобы зафиксировать прогресс."
                      <div className="mt-4 text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">— Команда проекта</div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-10 border-t border-slate-200 dark:border-white/10">
                 <button className="px-8 py-5 rounded-2xl font-extrabold text-sm text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">Сохранить черновик</button>
                 <button 
                  onClick={handleCompleteBlock}
                  disabled={submitting || !allTasksAnswered}
                  className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-sm flex items-center justify-center space-x-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-indigo-900 active:scale-95 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:shadow-none"
                 >
                   {submitting ? <RefreshCcw className="animate-spin" /> : (
                     <>
                      <span>{isLastBlock ? 'Завершить обучение' : 'Перейти далее'}</span>
                      <ChevronRight size={20} />
                     </>
                   )}
                 </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Floating Action Bar */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center space-x-3 bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 p-3 rounded-[2rem] shadow-2xl z-50">
          <div className="flex items-center space-x-1.5 px-2">
            {course.blocks.map((_, i) => (
              <button 
                key={i}
                onClick={() => setCurrentBlockIndex(i)}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all",
                  currentBlockIndex === i 
                    ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-lg" 
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
          <button className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
            <MessageSquare size={20} />
          </button>
      </div>

      <style>{`
        .course-content-article {
          font-size: 1.125rem;
          line-height: 1.85;
          color: #334155;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: normal;
          hyphens: none;
          -webkit-hyphens: none;
          -ms-hyphens: none;
        }
        .dark .course-content-article {
          color: #cbd5e1;
        }

        .course-content-article h1,
        .course-content-article h2,
        .course-content-article h3,
        .course-content-article h4 {
          color: #0f172a;
          font-weight: 850;
          letter-spacing: -0.025em;
          line-height: 1.25;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }
        .dark .course-content-article h1,
        .dark .course-content-article h2,
        .dark .course-content-article h3,
        .dark .course-content-article h4 {
          color: #f8fafc;
        }

        .course-content-article h1 { font-size: 2.25rem; }
        .course-content-article h2 { font-size: 1.875rem; }
        .course-content-article h3 { font-size: 1.5rem; }
        .course-content-article h4 { font-size: 1.25rem; }

        .course-content-article p {
          margin-top: 0;
          margin-bottom: 1.5rem;
          font-size: 1.125rem;
          line-height: 1.85;
          color: #334155;
        }
        .dark .course-content-article p {
          color: #cbd5e1;
        }

        .course-content-article blockquote {
          border-left: 4px solid #4f46e5;
          background-color: #f8fafc;
          padding: 1.5rem 2rem;
          margin: 2rem 0;
          border-radius: 0 1.5rem 1.5rem 0;
          font-style: italic;
          font-weight: 500;
          color: #1e293b;
        }
        .dark .course-content-article blockquote {
          background-color: rgba(30, 41, 59, 0.4);
          color: #f1f5f9;
          border-left-color: #6366f1;
        }

        .course-content-article ul,
        .course-content-article ol {
          margin-top: 0;
          margin-bottom: 1.5rem;
          padding-left: 1.75rem;
        }
        .course-content-article ul {
          list-style-type: disc;
        }
        .course-content-article ol {
          list-style-type: decimal;
        }
        .course-content-article li {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .course-content-article a {
          color: #4f46e5;
          text-decoration: underline;
          font-weight: 600;
          transition: color 0.15s ease-in-out;
        }
        .course-content-article a:hover {
          color: #4338ca;
        }
        .dark .course-content-article a {
          color: #818cf8;
        }
        .dark .course-content-article a:hover {
          color: #a5b4fc;
        }

        .course-content-article strong,
        .course-content-article b {
          font-weight: 700;
          color: #0f172a;
        }
        .dark .course-content-article strong,
        .dark .course-content-article b {
          color: #ffffff;
        }

        .course-content-article img {
          border-radius: 2rem;
          max-width: 100%;
          height: auto;
          margin: 2.5rem auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
      `}</style>
    </div>
  );
}
