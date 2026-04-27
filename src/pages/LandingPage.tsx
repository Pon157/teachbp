import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCcw, ArrowRight, ShieldCheck, UserPlus, LogIn } from 'lucide-react';
import { cn } from '../lib/utils';

export default function LandingPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [captcha, setCaptcha] = useState<{ id: string; question: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    code: '',
    captchaAnswer: '',
    newPassword: ''
  });
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) navigate('/dashboard');
    refreshCaptcha();
  }, [user]);

  const refreshCaptcha = async () => {
    try {
      const res = await fetch('/api/captcha');
      const data = await res.json();
      setCaptcha(data);
    } catch (err) {
      console.error('Captcha refresh failed', err);
    }
  };

  const sendCode = async () => {
    if (!formData.email) return setError('Введите email');
    setLoading(true);
    setSuccess('');
    try {
      const cRes = await fetch('/api/auth/challenge');
      const cData = await cRes.json();
      
      async function solvePoW(salt: string, diff: number) {
        const prefix = '0'.repeat(diff);
        let nonce = 0;
        while (true) {
          const str = salt + nonce;
          const msgUint8 = new TextEncoder().encode(str);
          const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
          const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
          if (hashHex.startsWith(prefix)) return nonce.toString();
          nonce++;
          if (nonce % 2000 === 0) await new Promise(r => setTimeout(r, 0));
        }
      }
      const challengeNonce = await solvePoW(cData.salt, cData.difficulty);

      const endpoint = isForgotPassword ? '/api/auth/forgot-password' : '/api/auth/send-code';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email,
          challengeId: cData.id,
          challengeNonce
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCodeSent(true);
        setError('');
        setSuccess(data.message || 'Код отправлен');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isForgotPassword) {
        if (!codeSent) {
          await sendCode();
          return;
        }
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            code: formData.code,
            newPassword: formData.newPassword
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to reset password');
        setSuccess('Пароль успешно изменен. Теперь вы можете войти.');
        setIsForgotPassword(false);
        setIsLogin(true);
        setCodeSent(false);
        return;
      }

      if (isLogin) {
        console.log('Attempting login for:', formData.email);
        await login({ 
          email: formData.email, 
          password: formData.password,
          captchaId: captcha?.id,
          captchaAnswer: formData.captchaAnswer
        });
        navigate('/dashboard');
      } else {
        if (!codeSent) {
          await sendCode();
          setLoading(false);
          return;
        }
        console.log('Attempting registration for:', formData.email);
        // JS Challenge for Register
        const cRes = await fetch('/api/auth/challenge');
        const cData = await cRes.json();
        
        async function solvePoW(salt: string, diff: number) {
          const prefix = '0'.repeat(diff);
          let nonce = 0;
          while (true) {
            const str = salt + nonce;
            const msgUint8 = new TextEncoder().encode(str);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            if (hashHex.startsWith(prefix)) return nonce.toString();
            nonce++;
            if (nonce % 2000 === 0) await new Promise(r => setTimeout(r, 0));
          }
        }
        
        const challengeNonce = await solvePoW(cData.salt, cData.difficulty);

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            captchaId: captcha?.id,
            challengeId: cData.id,
            challengeNonce
          })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Registration failed');
        }
        await login({ email: formData.email, password: formData.password });
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message);
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden font-sans text-slate-900">
      {/* Left side - Info */}
      <div className="md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-white border-r border-slate-200">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md"
        >
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl mb-10 flex items-center justify-center shadow-xl shadow-indigo-200">
            <span className="text-white font-bold text-3xl">B</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-8 tracking-tighter text-slate-900">
            BotSupport<span className="text-indigo-600">.Edu</span>
          </h1>
          <p className="text-slate-500 text-xl mb-12 leading-relaxed font-medium">
            Профессиональная экосистема для развития навыков кураторства и проектирования диалоговых систем.
          </p>
          <div className="space-y-4">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center space-x-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Официальный сертификат</p>
                <p className="text-xs text-slate-500 font-medium tracking-tight">Подтверждение квалификации после курса</p>
              </div>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center space-x-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                <UserPlus size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Личный наставник</p>
                <p className="text-xs text-slate-500 font-medium tracking-tight">Прямая связь с куратором 24/7</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right side - Form */}
      <div className="md:w-1/2 p-8 md:p-16 flex items-center justify-center bg-slate-50 relative">
        {/* Decorative elements */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl relative z-10"
        >
          <div className="flex justify-center mb-10">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full">
              <button 
                onClick={() => { setIsLogin(true); setIsForgotPassword(false); setCodeSent(false); }}
                className={cn("flex-1 py-3 rounded-xl text-sm font-bold transition-all", isLogin && !isForgotPassword ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600")}
              >
                Вход
              </button>
              <button 
                onClick={() => { setIsLogin(false); setIsForgotPassword(false); setCodeSent(false); }}
                className={cn("flex-1 py-3 rounded-xl text-sm font-bold transition-all", !isLogin && !isForgotPassword ? "bg-white text-indigo-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600")}
              >
                Регистрация
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={isForgotPassword ? 'forgot' : (isLogin ? 'login' : 'register')}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                {isForgotPassword ? (
                  <>
                    <h2 className="text-xl font-black text-slate-800 mb-2">Сброс пароля</h2>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Электронная почта</label>
                      <input 
                        required 
                        type="email" 
                        placeholder="example@edu.ru"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all outline-none" 
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    {codeSent && (
                      <>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Код из письма</label>
                          <input 
                            required 
                            type="text" 
                            placeholder="6-значный код"
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all outline-none" 
                            value={formData.code}
                            onChange={e => setFormData({...formData, code: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Новый пароль</label>
                          <input 
                            required 
                            type="password" 
                            placeholder="••••••••"
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all outline-none" 
                            value={formData.newPassword}
                            onChange={e => setFormData({...formData, newPassword: e.target.value})}
                          />
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {!isLogin && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Имя</label>
                          <input 
                            required 
                            type="text" 
                            placeholder="Иван"
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all outline-none" 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Фамилия</label>
                          <input 
                            required 
                            type="text" 
                            placeholder="Иванов"
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all outline-none" 
                            value={formData.surname}
                            onChange={e => setFormData({...formData, surname: e.target.value})}
                          />
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Электронная почта</label>
                      <input 
                        required 
                        type="email" 
                        placeholder="example@edu.ru"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all outline-none" 
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Пароль</label>
                        {isLogin && (
                          <button 
                            type="button" 
                            onClick={() => { setIsForgotPassword(true); setCodeSent(false); setError(''); setSuccess(''); }}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-tight"
                          >
                            Забыли?
                          </button>
                        )}
                      </div>
                      <input 
                        required 
                        type="password" 
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all outline-none" 
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                      />
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {!isForgotPassword && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Капча: {captcha?.question}</span>
                  <button type="button" onClick={refreshCaptcha} className="text-slate-400 hover:text-indigo-600 transition-colors">
                    <RefreshCcw size={14} />
                  </button>
                </div>
                <input 
                  required 
                  type="text" 
                  placeholder="Ответ"
                  className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-sm font-medium focus:ring-1 focus:ring-indigo-600 outline-none shadow-inner" 
                  value={formData.captchaAnswer}
                  onChange={e => setFormData({...formData, captchaAnswer: e.target.value})}
                />
              </div>
            )}

            {!isLogin && !isForgotPassword && (
              <div className="pt-2">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Код из почты</span>
                    <button 
                      type="button" 
                      onClick={sendCode} 
                      disabled={loading || !formData.email}
                      className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                    >
                      {codeSent ? 'Отправить еще раз' : 'Получить код'}
                    </button>
                  </div>
                  <input 
                    required 
                    type="text" 
                    placeholder="6-значный код"
                    className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-sm font-medium focus:ring-1 focus:ring-indigo-600 outline-none shadow-inner" 
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                  />
                </div>
              </div>
            )}

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-xs text-center font-bold uppercase tracking-tight bg-red-50 py-2 rounded-lg">{error}</motion.p>
            )}

            {success && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-600 text-xs text-center font-bold uppercase tracking-tight bg-emerald-50 py-2 rounded-lg">{success}</motion.p>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-3 group transition-all shadow-lg shadow-indigo-100 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <RefreshCcw size={20} className="animate-spin" /> : (
                <>
                  <span>
                    {isForgotPassword 
                      ? (codeSent ? 'Сбросить пароль' : 'Получить код сброса') 
                      : (isLogin ? 'Войти в систему' : 'Присоединиться')}
                  </span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {isForgotPassword && (
            <button 
              onClick={() => { setIsForgotPassword(false); setIsLogin(true); setCodeSent(false); setError(''); setSuccess(''); }}
              className="w-full mt-4 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest"
            >
              Вернуться ко входу
            </button>
          )}

          <p className="mt-8 text-center text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">
            © 2026 BotSupport Platform
          </p>
        </motion.div>
      </div>
    </div>
  );
}
