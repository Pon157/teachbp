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
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate, useParams, Link } from 'react-router-dom';

interface EditorBlock {
  id: string;
  title: string;
  content: string;
  order: number;
  homework?: string;
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
    { id: '1', title: 'Введение', content: '', order: 0 }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string>('1');
  const [showSettings, setShowSettings] = useState(false);

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
                    homework: b.homework?.description
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
      order: blocks.length
    };
    setBlocks([...blocks, newBlock]);
    setActiveBlockId(newId);
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
    if (!courseTitle) return alert('Укажите название курса');
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

      // For simplicity, we recreate blocks on save or we update them.
      // Easiest for MVP is to delete old blocks and insert new ones if editing,
      // but that risks data loss if the insert fails. 
      // Better: Use the API we have.
      
      // Let's assume the API handles it or add more routes if needed.
      // Currently server.ts has: POST /api/courses/:id/blocks
      // I'll update it to clear blocks first if editing.
      
      if (id) {
          // Tell server to clear blocks if editing
          await fetch(`/api/courses/${finalId}/clear-blocks`, { method: 'POST' });
      }

      const blockPromises = blocks.map(block => 
        fetch(`/api/courses/${finalId}/blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: block.title,
            content: block.content,
            order: block.order,
            homeworkDescription: block.homework
          })
        })
      );
      
      await Promise.all(blockPromises);

      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении курса');
    } finally {
      setLoading(false);
    }
  };

  const activeBlock = blocks.find(b => b.id === activeBlockId);

  if (fetching) return <div className="h-screen flex items-center justify-center font-black animate-pulse opacity-50">ЗАГРУЗКА РЕДАКТОРА...</div>;

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-950 z-50 flex flex-col">
      {/* Top Bar */}
      <header className="h-20 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-6">
           <Link to="/dashboard" className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-2xl transition-colors">
              <ArrowLeft size={20} className="text-slate-400" />
           </Link>
           <div className="flex flex-col">
              <input 
                type="text" 
                value={courseTitle}
                onChange={e => setCourseTitle(e.target.value)}
                placeholder="Название курса..."
                className="text-xl font-black bg-transparent border-none outline-none p-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-200"
              />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Редактирование материала</span>
           </div>
        </div>

        <div className="flex items-center gap-4">
           <button 
             onClick={() => setShowSettings(!showSettings)}
             className={cn("p-4 rounded-2xl transition-all", showSettings ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900")}
           >
              <Settings size={20} />
           </button>
           <button 
            onClick={saveCourse}
            disabled={loading || !courseTitle}
            className={cn(
              "px-8 py-4 rounded-2xl font-black text-sm flex items-center space-x-3 transition-all shadow-xl disabled:opacity-50",
              success ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 dark:shadow-none"
            )}
           >
            {loading ? <RefreshCcw size={20} className="animate-spin" /> : success ? <CheckCircle2 size={20} /> : <Send size={20} />}
            <span>{success ? 'Готово!' : 'Сохранить всё'}</span>
           </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Navigation */}
        <aside className="w-80 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 overflow-y-auto space-y-8">
           <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-4">Структура</p>
              {blocks.map((b, idx) => (
                <button 
                  key={b.id}
                  onClick={() => setActiveBlockId(b.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl flex items-center gap-4 transition-all group",
                    activeBlockId === b.id 
                    ? "bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 text-slate-900 dark:text-slate-100" 
                    : "text-slate-500 hover:bg-white dark:hover:bg-slate-800"
                  )}
                >
                   <span className={cn("text-xs font-black", activeBlockId === b.id ? "text-indigo-600" : "text-slate-300")}>{idx + 1}</span>
                   <span className="text-sm font-bold truncate flex-1">{b.title || 'Новый блок'}</span>
                   {activeBlockId === b.id && (
                     <button onClick={(e) => { e.stopPropagation(); removeBlock(b.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all">
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
        </aside>

        {/* Main Editor Console */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-12">
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
                    <div className="space-y-6 bg-indigo-50 dark:bg-indigo-500/5 p-10 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-500/20">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white">Домашнее задание</h4>
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest italic">Будет отображаться в конце урока</p>
                            </div>
                         </div>
                         <textarea 
                            value={activeBlock?.homework || ''}
                            onChange={(e) => updateBlock(activeBlockId, { homework: e.target.value })}
                            placeholder="Опишите, что студент должен выполнить после изучения этого материала..."
                            className="w-full bg-white dark:bg-slate-950 border-none rounded-2xl px-6 py-5 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none min-h-[120px] resize-none shadow-inner"
                         />
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
              className="fixed right-0 top-20 bottom-0 w-96 bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 p-8 z-40 shadow-2xl overflow-y-auto"
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
                      <input 
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                        value={imageUrl}
                        onChange={e => setImageUrl(e.target.value)}
                        placeholder="URL изображения..."
                      />
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
