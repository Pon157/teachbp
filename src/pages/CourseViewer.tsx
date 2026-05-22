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

  useEffect(() => {
    const fetchCourse = async () => {
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
    fetchCourse();
  }, [id]);

  const handleCompleteBlock = async () => {
    setSubmitting(true);
    try {
      const block = course!.blocks[currentBlockIndex];
      await fetch('/api/progress/complete-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId: block.id, homeworkResponse: homeworkResponses })
      });
      
      setCompletedBlocks([...completedBlocks, block.id]);
      
      if (currentBlockIndex < course!.blocks.length - 1) {
        setCurrentBlockIndex(currentBlockIndex + 1);
        setHomeworkResponses({});
      } else {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f97316', '#ffffff', '#000000']
        });
        alert('Поздравляем! Вы прошли весь курс!');
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

  const currentBlock = course.blocks[currentBlockIndex];
  const progress = ((currentBlockIndex + 1) / course.blocks.length) * 100;
  const isLastBlock = currentBlockIndex === course.blocks.length - 1;
  const hasTasks = currentBlock.homeworks && currentBlock.homeworks.length > 0;
  const allTasksAnswered = !hasTasks || currentBlock.homeworks?.every(t => homeworkResponses[t.id]);

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
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm">
                    {author.avatar ? <img src={author.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-extrabold text-lg bg-indigo-50 text-indigo-600">{author.name[0]}</div>}
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest mb-0.5">Преподаватель</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 underline decoration-indigo-200 decoration-2 underline-offset-4">{author.name} {author.surname}</p>
                  </div>
                </div>
              )}
              <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-tighter">
                <CheckCircle2 size={16} className="text-emerald-500" />
                Сохранено в портфолио
              </div>
            </div>
          </div>

          {/* Article Content */}
          <div className="bg-white dark:bg-slate-900 p-8 md:p-14 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <article 
              className="prose prose-slate dark:prose-invert max-w-none break-words overflow-x-auto max-w-full
                prose-h2:text-3xl prose-h2:font-black prose-h2:tracking-tight 
                prose-p:text-xl prose-p:leading-relaxed prose-p:text-slate-900 dark:prose-p:text-slate-200
                prose-img:rounded-[2.5rem] prose-img:shadow-2xl prose-img:shadow-slate-100
                prose-blockquote:border-l-4 prose-blockquote:border-indigo-600 prose-blockquote:bg-slate-50 dark:prose-blockquote:bg-slate-800/50 prose-blockquote:p-8 prose-blockquote:rounded-r-2xl prose-blockquote:italic prose-blockquote:font-medium prose-blockquote:text-slate-800 dark:prose-blockquote:text-slate-200"
              dangerouslySetInnerHTML={{ __html: currentBlock?.content || '' }}
            />
          </div>

          {/* Homework Section */}
          <div className="bg-slate-900 rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl shadow-slate-300 dark:shadow-none">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <GraduationCap className="w-32 h-32" />
            </div>
            
            <div className="relative z-10 space-y-12">
              <h2 className="text-3xl font-black mb-8 flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white">
                  <Send size={20} />
                </div>
                <span>Практика</span>
              </h2>

              <div className="space-y-10">
                {currentBlock.homeworks?.map((task, idx) => (
                  <div key={task.id} className="space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">{idx + 1}</div>
                        <p className="text-xl font-medium text-slate-200">{task.description}</p>
                    </div>

                    {task.type === 'quiz' ? (
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-12">
                          {task.options?.map((opt: string) => (
                             <button 
                                key={opt}
                                onClick={() => setHomeworkResponses({ ...homeworkResponses, [task.id]: opt })}
                                className={cn(
                                   "p-5 rounded-2xl border text-left font-bold transition-all text-sm",
                                   homeworkResponses[task.id] === opt 
                                   ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-900/40" 
                                   : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                                )}
                             >
                                {opt}
                             </button>
                          ))}
                       </div>
                    ) : (
                        <textarea 
                            className="w-full min-h-[150px] bg-slate-800/50 border border-slate-700 rounded-[2rem] p-8 text-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none shadow-inner placeholder:text-slate-600 ml-12"
                            placeholder="Опишите свое решение здесь..."
                            value={homeworkResponses[task.id] || ''}
                            onChange={e => setHomeworkResponses({ ...homeworkResponses, [task.id]: e.target.value })}
                        />
                    )}
                  </div>
                ))}

                {!hasTasks && (
                  <div className="bg-white/5 border border-white/10 backdrop-blur-sm p-8 rounded-[2rem] italic text-slate-300 text-lg font-medium leading-relaxed">
                      "Для этого урока нет специальных заданий. Просто нажмите кнопку ниже, чтобы зафиксировать прогресс."
                      <div className="mt-4 text-sm font-bold text-indigo-400 uppercase tracking-widest">— Команда проекта</div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-10 border-t border-white/10">
                 <button className="px-8 py-5 rounded-2xl font-extrabold text-sm text-slate-400 hover:text-white transition-colors">Сохранить черновик</button>
                 <button 
                  onClick={handleCompleteBlock}
                  disabled={submitting || !allTasksAnswered}
                  className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-sm flex items-center justify-center space-x-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900 active:scale-95 disabled:opacity-50 disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none"
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
    </div>
  );
}
