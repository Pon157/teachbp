import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useAuth } from '../hooks/useAuth';
import { 
  Plus, 
  Trash2, 
  Eye, 
  Layout, 
  ChevronDown, 
  ChevronUp,
  ChevronRight,
  Image as ImageIcon,
  Clock,
  Send,
  RefreshCcw,
  ArrowLeft,
  Settings,
  FileText,
  CheckCircle2,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate, useParams, Link } from 'react-router-dom';

interface Task {
  id: string;
  type: 'open' | 'quiz' | 'multiple';
  description: string;
  options: string[];
  correctAnswer: string;
}

interface EditorBlock {
  id: string;
  title: string;
  content: string;
  order: number;
  tasks: Task[];
}

export default function EditorPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('30 мин');
  const [imageUrl, setImageUrl] = useState('');
  const [blocks, setBlocks] = useState<EditorBlock[]>([
    { id: '1', title: 'Введение', content: '', order: 0, tasks: [] }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string>('1');

  const showError = (msg: string) => {
    setErrorText(msg);
    setTimeout(() => setErrorText(null), 4000);
  };
  const [showSettings, setShowSettings] = useState(false);
  const [showBlocksMenu, setShowBlocksMenu] = useState(false);

  const renderSidebarContent = () => (
    <div className="space-y-2">
       <div className="flex justify-between items-center ml-4 mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Структура</p>
          <button onClick={() => setShowBlocksMenu(false)} className="md:hidden p-1.5 text-slate-400 hover:text-slate-600">
             <X size={16} />
          </button>
       </div>
       {blocks.map((b, idx) => (
         <button 
           key={b.id}
           onClick={() => {
             setActiveBlockId(b.id);
             setShowBlocksMenu(false);
           }}
           className={cn(
             "w-full text-left p-4 rounded-2xl flex items-center gap-4 transition-all group",
             activeBlockId === b.id 
             ? "bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 text-slate-900 dark:text-slate-100" 
             : "text-slate-500 hover:bg-white dark:hover:bg-slate-800"
           )}
         >
            <span className={cn("text-xs font-black", activeBlockId === b.id ? "text-indigo-600" : "text-slate-300")}>{idx + 1}</span>
            <span className="text-sm font-bold truncate flex-1">{b.title || 'Новый блок'}</span>
            {activeBlockId === b.id && blocks.length > 1 && (
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  removeBlock(b.id); 
                }} 
                className="p-1 hover:text-red-500 transition-all ml-auto self-center"
              >
                 <Trash2 size={14} />
              </button>
            )}
         </button>
       ))}
       <button 
         onClick={addBlock}
         className="w-full mt-4 py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center gap-2"
       >
          <Plus size={16} />
          Добавить блок
       </button>
    </div>
  );

  useEffect(() => {
    if (id) {
       setFetching(true);
       fetch(`/api/courses/${id}`)
        .then(res => res.json())
        .then(data => {
            setCourseTitle(data.title);
            setCourseDesc(data.description);
            setEstimatedTime(data.estimatedTime);
            setImageUrl(data.imageUrl);
            if (data.blocks && data.blocks.length > 0) {
                setBlocks(data.blocks.map((b: any) => ({
                    id: b.id,
                    title: b.title,
                    content: b.content,
                    order: b.order,
                    tasks: b.homeworks?.map((h: any) => ({
                        id: h.id,
                        type: h.type,
                        description: h.description,
                        options: h.options || [],
                        correctAnswer: h.correctAnswer || ''
                    })) || []
                })));
                setActiveBlockId(data.blocks[0].id);
            }
        })
        .finally(() => setFetching(false));
    }
  }, [id]);

  const addBlock = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newBlock: EditorBlock = {
      id: newId,
      title: 'Новый блок',
      content: '',
      order: blocks.length,
      tasks: []
    };
    setBlocks([...blocks, newBlock]);
    setActiveBlockId(newId);
  };

  const addTask = (blockId: string) => {
    setBlocks(blocks.map(b => {
        if (b.id !== blockId) return b;
        return {
            ...b,
            tasks: [...b.tasks, {
                id: Math.random().toString(36).substr(2, 9),
                type: 'open',
                description: '',
                options: [],
                correctAnswer: ''
            }]
        };
    }));
  };

  const removeTask = (blockId: string, taskId: string) => {
    setBlocks(blocks.map(b => {
        if (b.id !== blockId) return b;
        return { ...b, tasks: b.tasks.filter(t => t.id !== taskId) };
    }));
  };

  const updateTask = (blockId: string, taskId: string, updates: Partial<Task>) => {
    setBlocks(blocks.map(b => {
        if (b.id !== blockId) return b;
        return {
            ...b,
            tasks: b.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
        };
    }));
  };

  const removeBlock = (blockId: string) => {
    if (blocks.length === 1) return;
    const newBlocks = blocks.filter(b => b.id !== blockId);
    setBlocks(newBlocks);
    if (activeBlockId === blockId) {
        setActiveBlockId(newBlocks[0].id);
    }
  };

  const updateBlock = (blockId: string, updates: Partial<EditorBlock>) => {
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, ...updates } : b));
  };

  const saveCourse = async () => {
    if (!courseTitle) return showError('Укажите название курса');
    setLoading(true);
    setSuccess(false);
    try {
      const url = id ? `/api/courses/${id}` : '/api/courses';
      const method = id ? 'PUT' : 'POST';

      const courseRes = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: courseTitle,
          description: courseDesc,
          estimatedTime,
          imageUrl
        })
      });
      
      if (!courseRes.ok) throw new Error('Failed to save course');
      const courseData = await courseRes.json();
      const finalId = id || courseData.id;

      if (id) {
          // Tell server to clear blocks if editing
          const clearRes = await fetch(`/api/courses/${finalId}/clear-blocks`, { method: 'POST' });
          if (!clearRes.ok) throw new Error('Failed to clear old course blocks');
      }

      // Save blocks sequentially to prevent SQLite/Postgres write overlaps or lock errors
      for (const block of blocks) {
        const blockRes = await fetch(`/api/courses/${finalId}/blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: block.title,
            content: block.content,
            order: block.order,
            tasks: block.tasks
          })
        });
        if (!blockRes.ok) {
          throw new Error(`Failed to save block: ${block.title}`);
        }
      }

      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      console.error(err);
      showError('Ошибка при сохранении курса. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const activeBlock = blocks.find(b => b.id === activeBlockId);

  if (fetching) return <div className="h-screen flex items-center justify-center font-black animate-pulse opacity-50">ЗАГРУЗКА РЕДАКТОРА...</div>;

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-950 z-50 flex flex-col overflow-hidden">
      {/* Absolute Error Notification */}
      <AnimatePresence>
        {errorText && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] bg-rose-500 text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-rose-400"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
            <span>{errorText}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Top Bar */}
      <header className="h-20 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 shrink-0 bg-white dark:bg-slate-950">
        <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
           <Link to="/dashboard" className="p-2 sm:p-3 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl transition-colors">
              <ArrowLeft size={18} className="text-slate-400" />
           </Link>
           <button 
             onClick={() => setShowBlocksMenu(!showBlocksMenu)} 
             className="md:hidden p-2 sm:p-3 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl text-slate-400 flex items-center justify-center shrink-0"
             title="Открыть разделы"
           >
              <Menu size={18} />
           </button>
           <div className="flex flex-col min-w-0">
              <input 
                type="text" 
                value={courseTitle}
                onChange={e => setCourseTitle(e.target.value)}
                placeholder="Название курса..."
                className="text-base sm:text-xl font-black bg-transparent border-none outline-none p-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-200 truncate max-w-[120px] sm:max-w-xs md:max-w-xl"
              />
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 truncate">Редактирование</span>
           </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
           <button 
             onClick={() => setShowSettings(!showSettings)}
             className={cn("p-2.5 sm:p-4 rounded-2xl transition-all", showSettings ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900")}
           >
              <Settings size={18} />
           </button>
           <button 
            onClick={saveCourse}
            disabled={loading || !courseTitle}
            className={cn(
              "px-4 sm:px-8 py-2.5 sm:py-4 rounded-2xl font-black text-xs sm:text-sm flex items-center space-x-2 sm:space-x-3 transition-all shadow-xl disabled:opacity-50",
              success ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 dark:shadow-none"
            )}
           >
            {loading ? <RefreshCcw size={16} className="animate-spin" /> : success ? <CheckCircle2 size={16} /> : <Send size={16} />}
            <span className="hidden xs:inline">{success ? 'Готово!' : 'Сохранить'}</span>
            <span className="xs:hidden">{success ? '✓' : 'Сохр.'}</span>
           </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Navigation (Desktop only) */}
        <aside className="w-80 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 overflow-y-auto space-y-8 hidden md:block select-none">
           {renderSidebarContent()}
        </aside>

        {/* Left Sidebar mobile sliding menu */}
        <AnimatePresence>
          {showBlocksMenu && (
            <>
              <div className="fixed inset-0 top-20 bg-slate-950/20 dark:bg-slate-950/50 backdrop-blur-sm z-30 md:hidden" onClick={() => setShowBlocksMenu(false)} />
              <motion.aside
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed left-0 top-20 bottom-0 w-80 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 p-6 z-40 overflow-y-auto space-y-8 md:hidden shadow-2xl"
              >
                 {renderSidebarContent()}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Editor Console */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 md:p-12">
            <AnimatePresence mode="wait">
                <motion.div 
                    key={activeBlockId}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="max-w-[800px] mx-auto space-y-12 pb-40"
                >
                    {/* Block Title Input */}
                    <div className="space-y-4">
                        <input 
                            type="text"
                            value={activeBlock?.title || ''}
                            onChange={(e) => updateBlock(activeBlockId, { title: e.target.value })}
                            placeholder="Заголовок блока..."
                            className="w-full text-5xl font-black bg-transparent border-none outline-none p-0 text-slate-900 dark:text-white placeholder:text-slate-100"
                        />
                        <div className="h-1.5 w-20 bg-indigo-600 rounded-full" />
                    </div>

                    {/* Quill Editor */}
                    <div className="editor-surface bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[600px]">
                        <ReactQuill 
                           theme="snow"
                           value={activeBlock?.content || ''}
                           onChange={(content) => updateBlock(activeBlockId, { content })}
                           modules={{
                                toolbar: [
                                    [{ 'header': [1, 2, 3, false] }],
                                    ['bold', 'italic', 'underline', 'blockquote'],
                                    [{'list': 'ordered'}, {'list': 'bullet'}],
                                    ['link', 'image'],
                                    ['clean']
                                ],
                           }}
                           className="h-full"
                        />
                    </div>

                    {/* Task Section */}
                    <div className="space-y-8 bg-indigo-50 dark:bg-indigo-500/5 p-10 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-500/20">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white">Практические задания</h4>
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest italic">Студент должен выполнить их для прохождения</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => addTask(activeBlockId)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-[10px] uppercase font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                            >
                                <Plus size={14} />
                                Добавить задание
                            </button>
                         </div>

                         <div className="space-y-6">
                            {activeBlock?.tasks.map((task, tIdx) => (
                                <div key={task.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black text-indigo-500">#{tIdx + 1}</span>
                                            <select 
                                                value={task.type}
                                                onChange={e => updateTask(activeBlockId, task.id, { type: e.target.value as any })}
                                                className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-black tracking-widest px-3 py-1.5 rounded-lg outline-none"
                                            >
                                                <option value="open">Текст (Куратор)</option>
                                                <option value="quiz">Квиз (Авто)</option>
                                            </select>
                                        </div>
                                        <button 
                                            onClick={() => removeTask(activeBlockId, task.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <textarea 
                                        value={task.description}
                                        onChange={(e) => updateTask(activeBlockId, task.id, { description: e.target.value })}
                                        placeholder="Описание задания..."
                                        className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none h-20 resize-none shadow-inner"
                                    />

                                    {task.type === 'quiz' && (
                                        <div className="space-y-4 pt-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black uppercase text-slate-400">Варианты ответов</label>
                                                <button 
                                                    onClick={() => updateTask(activeBlockId, task.id, { options: [...task.options, ''] })}
                                                    className="text-[10px] font-black text-indigo-500"
                                                >
                                                    + Добавить
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {task.options.map((opt, oIdx) => (
                                                    <div key={oIdx} className="flex items-center gap-2">
                                                        <input 
                                                            type="radio" 
                                                            name={`correct-${task.id}`}
                                                            checked={task.correctAnswer === opt && opt !== ''}
                                                            onChange={() => updateTask(activeBlockId, task.id, { correctAnswer: opt })}
                                                            className="text-indigo-600"
                                                        />
                                                        <input 
                                                            className="flex-1 bg-slate-50 dark:bg-slate-950 border-none rounded-lg px-3 py-2 text-xs font-medium outline-none"
                                                            value={opt}
                                                            onChange={e => {
                                                                const newOpts = [...task.options];
                                                                newOpts[oIdx] = e.target.value;
                                                                updateTask(activeBlockId, task.id, { options: newOpts });
                                                            }}
                                                            placeholder={`Вариант ${oIdx + 1}`}
                                                        />
                                                        <button 
                                                            onClick={() => {
                                                                const newOpts = task.options.filter((_, idx) => idx !== oIdx);
                                                                updateTask(activeBlockId, task.id, { options: newOpts });
                                                            }}
                                                            className="text-slate-300 hover:text-red-500"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            {task.options.length > 0 && (
                                                <p className="text-[9px] text-slate-400 italic">Выберите правильный вариант, отметив кружок слева</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {activeBlock?.tasks.length === 0 && (
                                <div className="text-center py-10 opacity-30 border-2 border-dashed border-indigo-200 dark:border-indigo-900 rounded-3xl">
                                    <p className="text-xs font-bold">Нет заданий. Студент сможет просто нажать "Прочел"</p>
                                </div>
                            )}
                         </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </main>

        {/* Right Sidebar - Global Settings Side Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.aside 
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="fixed right-0 top-20 bottom-0 w-full sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 p-6 sm:p-8 z-40 shadow-2xl overflow-y-auto"
            >
               <div className="flex items-center justify-between mb-10">
                  <h3 className="font-black text-xl">Настройки курса</h3>
                  <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl">
                      <ChevronRight size={20} />
                  </button>
               </div>

               <div className="space-y-8">
                  <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Обложка</label>
                      <div className="relative aspect-video rounded-3xl bg-slate-50 dark:bg-slate-800 overflow-hidden border border-slate-100 dark:border-slate-800 mb-2">
                         {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={40} className="text-slate-200" /></div>}
                      </div>
                      <div className="flex gap-2">
                         <input 
                           className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold outline-none font-sans"
                           value={imageUrl}
                           onChange={e => setImageUrl(e.target.value)}
                           placeholder="URL изображения..."
                         />
                         <label className="bg-indigo-600 text-white px-4.5 py-3 rounded-xl text-xs font-black cursor-pointer hover:bg-indigo-700 transition-all flex items-center justify-center gap-1 shrink-0">
                            <span>Загрузить</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                 const file = e.target.files?.[0];
                                 if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                       if (typeof reader.result === 'string') {
                                          setImageUrl(reader.result);
                                       }
                                    };
                                    reader.readAsDataURL(file);
                                 }
                              }}
                            />
                         </label>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Описание</label>
                      <textarea 
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-4 text-sm font-medium outline-none resize-none h-32"
                        value={courseDesc}
                        onChange={e => setCourseDesc(e.target.value)}
                        placeholder="О чем этот курс?"
                      />
                  </div>

                  <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Время прохождения</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl pl-12 pr-4 py-3 text-xs font-black outline-none"
                            value={estimatedTime}
                            onChange={e => setEstimatedTime(e.target.value)}
                            placeholder="30 мин"
                        />
                      </div>
                  </div>
               </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .ql-toolbar.ql-snow {
            border: none !important;
            border-bottom: 1px solid #f1f5f9 !important;
            padding: 1.5rem !important;
            background: #fff !important;
        }
        .dark .ql-toolbar.ql-snow {
             background: #0f172a !important;
             border-color: #1e293b !important;
         }
        .ql-container.ql-snow {
            border: none !important;
            font-family: inherit !important;
            font-size: 1.25rem !important;
            background: transparent !important;
            color: inherit !important;
        }
        .dark .ql-editor { color: #f1f5f9 !important; }
        .ql-editor { padding: 3rem !important; min-height: 500px; }
        .dark .ql-snow .ql-stroke { stroke: #94a3b8 !important; }
        .dark .ql-snow .ql-fill { fill: #94a3b8 !important; }
        .dark .ql-snow .ql-picker { color: #94a3b8 !important; }
        .dark .ql-snow .ql-picker-options { background-color: #1e293b !important; color: #f1f5f9 !important; border: none !important; }
        .ql-editor.ql-blank::before { color: #cbd5e1 !important; font-style: italic !important; }
        .dark .ql-editor.ql-blank::before { color: #334155 !important; }
      `}</style>
    </div>
  );
}
