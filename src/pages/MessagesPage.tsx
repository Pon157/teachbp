import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Send, 
  Search, 
  User as UserIcon, 
  Paperclip,
  Smile,
  MessageSquare,
  CheckCircle2,
  ChevronRight as ChevronRightIcon,
  RefreshCcw,
  ShieldAlert
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const isOnline = (userObj: any) => {
    if (!userObj || !userObj.lastActiveAt) return false;
    const activeTime = new Date(userObj.lastActiveAt).getTime();
    return Date.now() - activeTime < 35000;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);

  // Fetch active contacts list
  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/messages-contacts');
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setContactsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [urlUserId]);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Synchronized loading and real-time interval polling to update dialogues instantly without refreshing
  useEffect(() => {
    const idToChat = urlUserId || user?.curatorId;
    if (!idToChat) {
      setLoading(false);
      return;
    }

    const initChat = async () => {
      try {
        const [userRes, messagesRes] = await Promise.all([
          fetch(`/api/users/${idToChat}`),
          fetch(`/api/messages/${idToChat}`)
        ]);
        
        if (userRes.ok) {
          const userData = await userRes.json();
          setTargetUser(userData);
        }
        
        if (messagesRes.ok) {
          const messagesData = await messagesRes.json();
          setMessages(messagesData.reverse());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    initChat();

    // Setup 3 second polling interval for perfect message sync
    const interval = setInterval(async () => {
      try {
        const [messagesRes, contactsRes] = await Promise.all([
          fetch(`/api/messages/${idToChat}`),
          fetch('/api/messages-contacts')
        ]);

        if (messagesRes.ok) {
          const messagesData = await messagesRes.json();
          const reversed = messagesData.reverse();
          setMessages(prev => {
            if (prev.length !== reversed.length || (prev.length > 0 && prev[prev.length - 1].id !== reversed[reversed.length - 1].id)) {
              return reversed;
            }
            return prev;
          });
        }

        if (contactsRes.ok) {
          const contactsData = await contactsRes.json();
          setContacts(contactsData);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [urlUserId, user?.curatorId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !targetUser) return;

    let attachmentUrl = null;
    let attachmentName = null;

    if (selectedFile) {
      setUploadingFile(true);
      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(selectedFile);
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = error => reject(error);
        });

        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            base64Data
          })
        });

        if (upRes.ok) {
          const upData = await upRes.json();
          attachmentUrl = upData.fileUrl;
          attachmentName = selectedFile.name;
        } else {
          alert('Ошибка при загрузке прикрепленного файла');
          setUploadingFile(false);
          return;
        }
      } catch (err) {
        console.error(err);
        alert('Не удалось загрузить файл');
        setUploadingFile(false);
        return;
      } finally {
        setUploadingFile(false);
      }
    }

    const content = newMessage || `Отправил(а) файл: ${selectedFile?.name}`;
    setNewMessage('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          receiverId: targetUser.id, 
          content,
          attachmentUrl,
          attachmentName
        })
      });
      const data = await res.json();
      
      const newMsg: Message = {
        id: data.id,
        senderId: user!.id,
        receiverId: targetUser.id,
        content,
        attachmentUrl,
        attachmentName,
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
      <aside className={cn(
        "w-full md:w-80 border-r border-slate-100 dark:border-slate-800 flex flex-col shrink-0",
        urlUserId ? "hidden md:flex" : "flex"
      )}>
        <div className="p-8 border-b border-slate-50 dark:border-slate-800">
           <h2 className="text-xl font-black mb-6 tracking-tight text-slate-900 dark:text-slate-100">Сообщения</h2>
           <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Поиск пользователей..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100 dark:text-slate-100 transition-all placeholder-slate-400"
              />
           </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {searchQuery.trim() !== '' ? (
              <div className="space-y-3 text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-2">Найденные пользователи</p>
                {searching ? (
                  <div className="p-8 text-center text-xs font-mono text-slate-400 animate-pulse">Поиск...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-slate-400">Пользователи не найдены</div>
                ) : (
                  searchResults.map((u: User) => (
                    <div 
                      key={u.id}
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        navigate(`/messages/${u.id}`);
                      }}
                      className="flex items-center space-x-4 p-4 bg-slate-55/45 dark:bg-slate-900/10 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[1.5rem] cursor-pointer transition-all border border-transparent hover:border-slate-150/50"
                    >
                      <div className="w-11 h-11 rounded-xl bg-indigo-600 overflow-hidden shrink-0 shadow-sm relative">
                        {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-sm text-white">{u.name[0]}</div>}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-extrabold text-xs truncate text-slate-900 dark:text-slate-100">{u.name} {u.surname}</p>
                        <p className="text-[10px] text-slate-400 truncate font-mono">{u.email}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : contacts.length > 0 ? (
              <div className="space-y-2 text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-2 mb-1">Ваши собеседники</p>
                {contacts.map((contact: any) => {
                  const isActive = targetUser?.id === contact.id;
                  return (
                    <div 
                      key={contact.id}
                      onClick={() => navigate(`/messages/${contact.id}`)}
                      className={cn(
                        "flex items-center space-x-4 p-4 rounded-[1.5rem] cursor-pointer transition-all border text-left",
                        isActive 
                          ? "bg-slate-100 dark:bg-slate-800 border-transparent shadow-sm" 
                          : "bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/10"
                      )}
                    >
                      <div className="w-11 h-11 rounded-xl bg-indigo-600 overflow-hidden shrink-0 shadow-xs relative">
                        {contact.avatar ? <img src={contact.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-sm text-white">{contact.name[0]}</div>}
                        <div className={cn(
                          "absolute bottom-0 right-0 w-2.5 h-2.5 border border-white dark:border-slate-950 rounded-full",
                          isOnline(contact) ? "bg-emerald-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-extrabold text-xs truncate text-slate-900 dark:text-slate-100">{contact.name} {contact.surname}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase shrink-0">
                            {contact.id === user?.curatorId ? 'Куратор' : 'Диалог'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate font-medium">
                          {contact.lastMessage?.content || 'Нажмите, чтобы открыть диалог'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
                <div className="p-10 text-center">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare size={24} className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Нет активных чатов</p>
                </div>
            )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className={cn(
        "flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950/20",
        urlUserId ? "flex" : "hidden md:flex"
      )}>
        {targetUser ? (
            <>
                {/* Chat Header */}
                <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
                    <div className="flex items-center space-x-5">
                        <div className="md:hidden">
                            <Link to="/messages" className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><ChevronRightIcon size={24} className="rotate-180" /></Link>
                        </div>
                        <Link to={`/profile/${targetUser.id}`} className="flex items-center space-x-4 hover:opacity-90 group transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm relative group-hover:border-indigo-500 transition-colors">
                                 {targetUser.avatar ? <img src={targetUser.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-indigo-600">{targetUser.name[0]}</div>}
                                 <div className={cn(
                                   "absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-slate-900 rounded-full",
                                   isOnline(targetUser) ? "bg-emerald-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600"
                                 )} />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors underline decoration-indigo-200 decoration-2 underline-offset-4">{targetUser.name} {targetUser.surname}</h3>
                                {isOnline(targetUser) ? (
                                  <span className="text-[10px] text-emerald-500 font-extrabold uppercase tracking-widest flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    В сети
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                    Не в сети
                                  </span>
                                )}
                            </div>
                        </Link>
                    </div>
                    <div className="flex items-center space-x-3">
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
                                    {msg.attachmentUrl && (
                                        <div className="mt-3 p-1 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-sm">
                                            {msg.attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                                                <a href={msg.attachmentUrl} target="_blank" rel="referrer noopener">
                                                    <img 
                                                        src={msg.attachmentUrl} 
                                                        alt={msg.attachmentName || 'Изображение'} 
                                                        referrerPolicy="no-referrer"
                                                        className="max-h-48 rounded-lg object-cover w-full hover:opacity-95 transition-opacity" 
                                                    />
                                                </a>
                                            ) : (
                                                <a 
                                                    href={msg.attachmentUrl} 
                                                    download={msg.attachmentName} 
                                                    target="_blank"
                                                    rel="referrer noopener"
                                                    className="flex items-center gap-3 p-3 text-xs font-bold hover:underline text-indigo-600 dark:text-indigo-400"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-500">
                                                        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                                                        <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                                                    </svg>
                                                    <span className="truncate max-w-[180px]">{msg.attachmentName || 'Файл'}</span>
                                                </a>
                                            )}
                                        </div>
                                    )}
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
                    {/* Animated File Attachment Preview */}
                    {selectedFile && (
                        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-between border border-dashed border-indigo-200 dark:border-indigo-800">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-xl text-indigo-600 dark:text-indigo-400">
                                    <Paperclip size={16} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">{selectedFile.name}</p>
                                    <p className="text-[10px] text-slate-400 font-semibold uppercase">{Math.round(selectedFile.size / 1024)} KB</p>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => {
                                    setSelectedFile(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-white dark:hover:bg-slate-700 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6 6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                    )}

                    {uploadingFile && (
                        <div className="mb-3 text-xs font-bold text-indigo-600 animate-pulse flex items-center gap-2">
                             <RefreshCcw size={12} className="animate-spin" />
                             <span>Пожалуйста подождите, загружается файл...</span>
                        </div>
                    )}

                    <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
                         <input 
                             type="file" 
                             ref={fileInputRef} 
                             onChange={handleFileChange} 
                             className="hidden" 
                         />
                         <button 
                             type="button" 
                             onClick={() => fileInputRef.current?.click()}
                             className={cn(
                               "p-4 text-slate-400 hover:text-indigo-600 transition-colors rounded-2xl shrink-0",
                               selectedFile ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40" : "bg-slate-50 dark:bg-slate-800"
                             )}
                         >
                             <Paperclip size={24} />
                         </button>
                         <div className="flex-1 relative group">
                            <input 
                                type="text" 
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-3xl pl-14 pr-6 py-5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-inner placeholder-slate-400 dark:text-white"
                                placeholder={selectedFile ? "Добавьте комментарий к файлу..." : "Напишите ответ..."}
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                            />
                            <Smile size={24} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors" />
                         </div>
                         <button 
                            type="submit"
                            disabled={!newMessage.trim() && !selectedFile}
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
