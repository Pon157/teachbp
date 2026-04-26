import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useParams, Link } from 'react-router-dom';
import { 
  Send, 
  Search, 
  User as UserIcon, 
  Phone, 
  Video, 
  MoreVertical,
  Paperclip,
  Smile,
  MessageSquare,
  CheckCircle2,
  ChevronRight as ChevronRightIcon,
  RefreshCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, User } from '../types';
import { cn } from '../lib/utils';

export default function MessagesPage() {
  const { user } = useAuth();
  const { userId: urlUserId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // In a real app we'd fetch contacts. Here we just fetch the curator or a target
  useEffect(() => {
    const initChat = async () => {
      const idToChat = urlUserId || user?.curatorId;
      if (!idToChat) {
        setLoading(false);
        return;
      }

      try {
        const [userRes, messagesRes] = await Promise.all([
          fetch(`/api/users/${idToChat}`),
          fetch(`/api/messages/${idToChat}`)
        ]);
        
        const userData = await userRes.json();
        setTargetUser(userData);
        
        const messagesData = await messagesRes.json();
        setMessages(messagesData.reverse());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initChat();
  }, [urlUserId, user?.curatorId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !targetUser) return;

    const content = newMessage;
    setNewMessage('');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: targetUser.id, content })
      });
      const data = await res.json();
      
      const newMsg: Message = {
        id: data.id,
        senderId: user!.id,
        receiverId: targetUser.id,
        content,
        createdAt: new Date().toISOString()
      };
      setMessages([...messages, newMsg]);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center font-mono opacity-50">SYNCING DATA...</div>;

  return (
    <div className="h-full bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 overflow-hidden flex shadow-2xl shadow-slate-200 dark:shadow-none">
      {/* Sidebar - Contacts */}
      <aside className="w-80 border-r border-slate-100 dark:border-slate-800 hidden md:flex flex-col">
        <div className="p-8 border-b border-slate-50 dark:border-slate-800">
           <h2 className="text-xl font-black mb-6 tracking-tight text-slate-900 dark:text-slate-100">Сообщения</h2>
           <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Поиск диалогов..."
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
              />
           </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {targetUser ? (
                <div className="flex items-center space-x-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-100 dark:border-transparent">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 overflow-hidden shrink-0 shadow-md">
                        {targetUser.avatar ? <img src={targetUser.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-lg text-white">{targetUser.name[0]}</div>}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-extrabold text-sm truncate text-slate-900 dark:text-slate-100">{targetUser.name} {targetUser.surname}</span>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase">12:45</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate font-medium">{messages[messages.length-1]?.content || 'Начните диалог с куратором'}</p>
                    </div>
                </div>
            ) : (
                <div className="p-10 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare size={24} className="text-slate-300" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Нет активных чатов</p>
                </div>
            )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950/20">
        {targetUser ? (
            <>
                {/* Chat Header */}
                <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
                    <div className="flex items-center space-x-5">
                        <div className="md:hidden">
                            <Link to="/messages" className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><ChevronRightIcon size={24} className="rotate-180" /></Link>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm relative">
                             {targetUser.avatar ? <img src={targetUser.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-indigo-600">{targetUser.name[0]}</div>}
                             <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-slate-900 dark:text-slate-100">{targetUser.name} {targetUser.surname}</h3>
                            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">В сети</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button className="p-3 text-slate-400 hover:text-indigo-600 transition-colors rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"><Phone size={20} /></button>
                        <button className="p-3 text-slate-400 hover:text-indigo-600 transition-colors rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"><Video size={20} /></button>
                        <button className="p-3 text-slate-400 hover:text-indigo-600 transition-colors rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"><MoreVertical size={20} /></button>
                    </div>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {messages.map((msg, i) => {
                        const isMe = msg.senderId === user?.id;
                        return (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                key={msg.id} 
                                className={cn("flex", isMe ? "justify-end" : "justify-start")}
                            >
                                <div className={cn(
                                    "max-w-[75%] p-5 rounded-[2rem] text-[15px] leading-relaxed shadow-sm",
                                    isMe 
                                        ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950 rounded-tr-none shadow-indigo-100/50" 
                                        : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-none"
                                )}>
                                    <p className="font-medium">{msg.content}</p>
                                    <div className={cn("flex items-center gap-1.5 mt-2.5 opacity-40", isMe ? "justify-end" : "justify-start")}>
                                        <span className="text-[10px] font-black tracking-widest uppercase">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {isMe && <CheckCircle2 size={10} className="text-emerald-400" />}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                    <div ref={scrollRef} />
                </div>

                {/* Input Area */}
                <div className="p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                    <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
                         <button type="button" className="p-4 text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 dark:bg-slate-800 rounded-2xl"><Paperclip size={24} /></button>
                         <div className="flex-1 relative group">
                            <input 
                                type="text" 
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-3xl pl-14 pr-6 py-5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-inner"
                                placeholder="Напишите ответ..."
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                            />
                            <Smile size={24} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors" />
                         </div>
                         <button 
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="p-5 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none disabled:bg-slate-200 dark:disabled:bg-slate-800"
                         >
                            <Send size={24} />
                         </button>
                    </form>
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl flex items-center justify-center">
                    <MessageSquare size={40} className="text-indigo-600" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Ваши сообщения</h3>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Выберите диалог, чтобы начать обучение</p>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m9 18 6-6-6-6"/>
        </svg>
    )
}
