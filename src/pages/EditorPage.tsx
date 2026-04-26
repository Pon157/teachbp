import { useState } from 'react';
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
  Image as ImageIcon,
  Clock,
  Send,
  RefreshCcw
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

interface EditorBlock {
  id: string;
  title: string;
  content: string;
  order: number;
}

export default function EditorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('30 мин');
  const [imageUrl, setImageUrl] = useState('');
  const [blocks, setBlocks] = useState<EditorBlock[]>([
    { id: '1', title: 'Введение', content: '', order: 0 }
  ]);
  const [loading, setLoading] = useState(false);

  const addBlock = () => {
    const newBlock: EditorBlock = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'Новый блок',
      content: '',
      order: blocks.length
    };
    setBlocks([...blocks, newBlock]);
  };

  const removeBlock = (id: string) => {
    if (blocks.length === 1) return;
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const updateBlock = (id: string, updates: Partial<EditorBlock>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const saveCourse = async () => {
    if (!courseTitle) return alert('Укажите название курса');
    setLoading(true);
    try {
      const courseRes = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: courseTitle,
          description: courseDesc,
          estimatedTime,
          imageUrl
        })
      });
      const courseData = await courseRes.json();

      // Save blocks
      for (const block of blocks) {
        await fetch(`/api/courses/${courseData.id}/blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: block.title,
            content: block.content,
            order: block.order
          })
        });
      }

      alert('Курс успешно сохранен как черновик!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении курса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2 text-slate-900 dark:text-slate-100">Конструктор обучения</h1>
          <p className="text-slate-500 font-medium italic">Создавайте контент, который вдохновляет на развитие.</p>
        </div>
        <div className="flex gap-4">
          <button className="px-8 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-extrabold text-sm flex items-center space-x-3 hover:bg-slate-50 transition-all shadow-sm">
            <Eye size={20} className="text-slate-400" />
            <span>Предпросмотр</span>
          </button>
          <button 
            onClick={saveCourse}
            disabled={loading || !courseTitle}
            className="px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black text-sm flex items-center space-x-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
          >
            {loading ? <RefreshCcw size={20} className="animate-spin" /> : <Send size={20} />}
            <span>Сохранить всё</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column - Meta Settings */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
             <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Основная информация</label>
                <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Название курса..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    value={courseTitle}
                    onChange={e => setCourseTitle(e.target.value)}
                  />
                  <textarea 
                    placeholder="Краткое описание для карточки..."
                    className="w-full h-28 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none shadow-inner"
                    value={courseDesc}
                    onChange={e => setCourseDesc(e.target.value)}
                  />
                </div>
             </div>
             <div className="grid grid-cols-1 gap-6">
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Время</label>
                    <div className="relative">
                        <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="30 мин"
                            className="w-full bg-slate-100 dark:bg-slate-950 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-black outline-none"
                            value={estimatedTime}
                            onChange={e => setEstimatedTime(e.target.value)}
                        />
                    </div>
                </div>
                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-1">URL обложки</label>
                    <div className="relative">
                        <ImageIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="https://images..."
                            className="w-full bg-slate-100 dark:bg-slate-950 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none"
                            value={imageUrl}
                            onChange={e => setImageUrl(e.target.value)}
                        />
                    </div>
                </div>
             </div>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl space-y-6">
            <h3 className="text-xs font-black flex items-center gap-3 uppercase tracking-[0.3em]">
                <Layout size={20} className="text-indigo-400" />
                <span>Навигация блоков</span>
            </h3>
            <div className="space-y-3">
                 {blocks.map((b, idx) => (
                    <div key={b.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-indigo-400 transition-colors group">
                        <div className="flex items-center gap-4">
                            <span className="text-indigo-400 font-black text-[10px]">{idx + 1}</span>
                            <span className="text-xs font-extrabold truncate w-40">{b.title || 'Без названия'}</span>
                        </div>
                        <button onClick={() => removeBlock(b.id)} className="text-white/20 hover:text-red-400 transition-colors">
                            <Trash2 size={16} />
                        </button>
                    </div>
                 ))}
                 <button 
                  onClick={addBlock}
                  className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-white/30 hover:text-white hover:border-indigo-500 transition-all flex items-center justify-center gap-2"
                 >
                    <Plus size={16} />
                    Добавить блок
                 </button>
            </div>
          </div>
        </div>

        {/* Right Column - Content Editor */}
        <div className="lg:col-span-2 space-y-12">
            {blocks.map((block, index) => (
                <motion.div 
                    layout
                    key={block.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 shadow-sm"
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                         <div className="flex items-center gap-6 flex-1">
                            <div className="w-16 h-16 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-3xl flex items-center justify-center text-2xl font-black shadow-xl">
                                0{index + 1}
                            </div>
                            <input 
                                type="text"
                                className="text-3xl font-black bg-transparent border-none outline-none focus:ring-0 p-0 text-slate-900 dark:text-slate-100 flex-1 placeholder:text-slate-200"
                                placeholder="Название обучающего блока..."
                                value={block.title}
                                onChange={e => updateBlock(block.id, { title: e.target.value })}
                            />
                         </div>
                         <div className="flex gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl">
                             <button className="p-3 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-all">
                                <ChevronUp size={20} />
                             </button>
                             <button className="p-3 hover:bg-white dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-all">
                                <ChevronDown size={20} />
                             </button>
                         </div>
                    </div>

                    <div className="editor-container overflow-hidden rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                        <ReactQuill 
                           theme="snow"
                           value={block.content}
                           onChange={(content) => updateBlock(block.id, { content })}
                           modules={{
                                toolbar: [
                                    [{ 'header': [1, 2, 3, false] }],
                                    ['bold', 'italic', 'underline', 'blockquote'],
                                    [{'list': 'ordered'}, {'list': 'bullet'}],
                                    ['link', 'image'],
                                    ['clean']
                                ],
                           }}
                           className="bg-white dark:bg-slate-950 min-h-[400px]"
                        />
                    </div>

                    <div className="mt-10 pt-10 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors">
                             <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                                <Plus size={20} />
                             </div>
                             <span className="text-[10px] uppercase tracking-widest font-black">Создать задание</span>
                        </div>
                        <div className="flex items-center gap-4">
                           <button onClick={() => removeBlock(block.id)} className="p-4 text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 size={20} />
                           </button>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
      </div>

      <style>{`
        .ql-toolbar.ql-snow {
            border: none !important;
            border-bottom: 1px solid #f1f5f9 !important;
            padding: 1.5rem !important;
            background: #fdfdfd !important;
        }
        .dark .ql-toolbar.ql-snow {
             background: #111 !important;
             border-color: #1e293b !important;
         }
        .ql-container.ql-snow {
            border: none !important;
            font-family: inherit !important;
            font-size: 1.1rem !important;
        }
        .ql-editor { padding: 2rem !important; }
        .dark .ql-snow .ql-stroke { stroke: #64748b !important; }
        .dark .ql-snow .ql-fill { fill: #64748b !important; }
        .dark .ql-snow .ql-picker { color: #64748b !important; }
      `}</style>
    </div>
  );
}
