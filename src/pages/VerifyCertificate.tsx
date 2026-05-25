import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  User as UserIcon, 
  Calendar, 
  ExternalLink,
  Award,
  BookOpen
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function VerifyCertificate() {
  const { shareId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/verify-certificate/${shareId}`)
        .then(res => res.json())
        .then(setData)
        .finally(() => setLoading(false));
  }, [shareId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 font-mono text-slate-400 dark:text-zinc-500 uppercase tracking-widest animate-pulse">Verifying ID...</div>;

  if (!data || data.error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950 p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500">
            <Award size={48} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Сертификат не найден</h1>
        <p className="text-slate-500 dark:text-zinc-500 max-w-sm">QR-код недействителен или сертификат был отозван администратором.</p>
        <Link to="/" className="px-8 py-4 bg-slate-900 dark:bg-zinc-100 text-white dark:text-black font-bold rounded-2xl hover:bg-slate-800 dark:hover:bg-white transition-all">Вернуться на главную</Link>
    </div>
  );

  const { cert, user } = data;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white flex flex-col items-center p-8 md:p-16 transition-colors duration-300">
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          #certificate-print-area {
            border: 4px solid #10b981 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 3rem !important;
            width: 100% !important;
            height: auto !important;
            border-radius: 2rem !important;
          }
          .print\\:text-black {
            color: #000000 !important;
          }
          .print\\:text-zinc-650 {
            color: #52525b !important;
          }
          .print\\:border-zinc-300 {
            border-color: #d4d4d8 !important;
          }
          .print\\:bg-zinc-100 {
            background-color: #f4f4f5 !important;
          }
        }
      `}</style>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full"
      >
        <div className="flex justify-center mb-12 no-print">
            <div className="w-12 h-12 bg-slate-900 dark:bg-zinc-100 rounded-xl flex items-center justify-center text-white dark:text-black font-bold text-2xl shadow-md">Э</div>
        </div>

        <div id="certificate-print-area" className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-slate-200 dark:border-zinc-800 p-8 md:p-12 shadow-2xl relative overflow-hidden print:text-black">
            {/* Stamp BG */}
            <ShieldCheck size={280} className="absolute -top-12 -right-12 text-emerald-500/5 rotate-12 no-print" />
            
            <div className="relative z-10 space-y-10">
                <div className="flex items-center space-x-3 text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-full w-fit print:bg-emerald-50 print:text-emerald-700">
                    <ShieldCheck size={18} />
                    <span className="text-xs font-bold uppercase tracking-widest">Сертификат подтвержден</span>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight text-slate-900 dark:text-white print:text-black">Подтверждение Квалификации</h1>
                    <p className="text-slate-500 dark:text-zinc-400 leading-relaxed font-medium print:text-zinc-650">Этот документ подтверждает успешное прохождение образовательных блоков на платформе Эмппати курс.</p>
                </div>

                <div className="grid grid-cols-2 gap-8 py-8 border-y border-slate-150 dark:border-zinc-800 print:border-zinc-300">
                    <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold tracking-widest print:text-zinc-650">Выпускник</p>
                        <p className="font-bold text-lg text-slate-900 dark:text-white print:text-black">{user.name} {user.surname}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold tracking-widest print:text-zinc-650">Дата выдачи</p>
                        <p className="font-bold text-lg text-slate-900 dark:text-white print:text-black">{new Date(cert.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold tracking-widest print:text-zinc-650">ID Документа</p>
                        <p className="font-mono text-xs opacity-55 tracking-tighter truncate text-slate-900 dark:text-white print:text-black">{cert.id}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold tracking-widest print:text-zinc-650">Лицензия</p>
                        <p className="font-bold text-sm text-emerald-600 dark:text-emerald-500 print:text-emerald-700">EMP-PRO-2026</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xs font-bold font-mono uppercase tracking-[0.25em] text-slate-400 dark:text-zinc-500 print:text-zinc-650">Освоенные блоки:</h3>
                    <div className="flex flex-wrap gap-2">
                        {JSON.parse(cert.courseIds || '[]').map((name: string, i: number) => (
                            <span key={i} className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold rounded-lg border border-slate-200 dark:border-zinc-700 print:bg-zinc-100 print:text-black print:border-zinc-300">{name}</span>
                        ))}
                    </div>
                </div>

                <div className="flex pt-6 no-print">
                    <button 
                      onClick={() => window.print()}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-black py-4 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-md"
                    >
                      Скачать PDF оригинал
                    </button>
                </div>
            </div>
        </div>

        <p className="mt-12 text-center text-slate-400 dark:text-zinc-600 text-xs uppercase tracking-widest font-bold no-print">
            Образовательная платформа Эмппати курс
        </p>
      </motion.div>
    </div>
  );
}
