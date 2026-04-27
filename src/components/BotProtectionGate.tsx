import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Loader2, Cpu } from 'lucide-react';

export default function BotProtectionGate({ children }: { children: React.ReactNode }) {
  const [isVerified, setIsVerified] = useState(false);
  const [status, setStatus] = useState('Анализ параметров браузера...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Check if recently verified to avoid annoying users on refresh within same session
    const verified = sessionStorage.getItem('browser_verified');
    if (verified === 'true') {
      setIsVerified(true);
      return;
    }

    const runChallenge = async () => {
      // Phase 1: Artificial delay + Progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 1;
        });
      }, 25); // ~2.5 seconds total

      // Phase 2: Actual heavy JS work (Proof of Work) 
      // This ensures it's a real JS engine and not a simple curl script
      setTimeout(async () => {
        setStatus('Выполнение проверочного вычисления...');
        
        // Proof of Work simulation
        const salt = Math.random().toString(36);
        let nonce = 0;
        const start = Date.now();
        
        while (Date.now() - start < 1500 || nonce < 5000) {
          const str = salt + nonce;
          if (window.crypto && window.crypto.subtle) {
            const buffer = new TextEncoder().encode(str);
            await window.crypto.subtle.digest('SHA-256', buffer);
          } else {
            // Fallback for browsers without subtle crypto (simulated delay)
            await new Promise(r => setTimeout(r, 1));
          }
          nonce++;
          if (nonce % 1000 === 0) await new Promise(r => setTimeout(r, 0));
        }

        setStatus('Верификация завершена');
        setTimeout(() => {
          sessionStorage.setItem('browser_verified', 'true');
          setIsVerified(true);
        }, 500);
      }, 1000);

      return () => clearInterval(interval);
    };

    runChallenge();
  }, []);

  if (isVerified) return <>{children}</>;

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 z-[9999] font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl"
      >
        {/* Decorative background elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/20 blur-[100px] rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-600/20 blur-[100px] rounded-full" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mb-8 border border-white/5 shadow-inner">
            <AnimatePresence mode="wait">
              {progress < 100 ? (
                <motion.div
                  key="loading"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                >
                  <Cpu className="text-indigo-400" size={32} />
                </motion.div>
              ) : (
                <motion.div
                  key="done"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-emerald-500/20 p-4 rounded-2xl"
                >
                  <ShieldCheck className="text-emerald-400" size={32} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <h2 className="text-xl font-black text-white mb-2 tracking-tight">BotSupport Protection</h2>
          <p className="text-slate-400 text-sm font-medium text-center mb-8 h-10">
            {status}
          </p>

          <div className="w-full bg-slate-800 h-2 rounded-full mb-4 overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear" }}
            />
          </div>
          
          <div className="flex justify-between w-full text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span>Проверка...</span>
            <span>{progress}%</span>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-center space-x-3 opacity-30">
          <Loader2 size={12} className="animate-spin text-slate-400" />
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Secure Browser Environment</span>
        </div>
      </motion.div>
      
      <p className="mt-8 text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">
        Ожидание верификации
      </p>
    </div>
  );
}
