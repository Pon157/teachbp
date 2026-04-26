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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-zinc-950 font-mono text-zinc-500 uppercase tracking-widest animate-pulse">Verifying ID...</div>;

  if (!data || data.error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500">
            <Award size={48} />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Сертификат не найден</h1>
        <p className="text-zinc-500 max-w-sm">QR-код недействителен или сертификат был отозван администратором.</p>
        <Link to="/" className="px-8 py-4 bg-zinc-100 text-black font-bold rounded-2xl hover:bg-white transition-all">Вернуться на главную</Link>
    </div>
  );

  const { cert, user } = data;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center p-8 md:p-16">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full"
      >
        <div className="flex justify-center mb-12">
            <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center text-black font-bold text-2xl">B</div>
        </div>

        <div className="bg-zinc-900 rounded-[3rem] border border-zinc-800 p-8 md:p-12 shadow-2xl relative overflow-hidden">
            {/* Stamp BG */}
            <ShieldCheck size={280} className="absolute -top-12 -right-12 text-emerald-500/5 rotate-12" />
            
            <div className="relative z-10 space-y-10">
                <div className="flex items-center space-x-3 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-full w-fit">
                    <ShieldCheck size={18} />
                    <span className="text-xs font-bold uppercase tracking-widest">Сертификат подтвержден</span>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight">Подтверждение Квалификации</h1>
                    <p className="text-zinc-500 leading-relaxed font-medium">Этот документ подтверждает успешное прохождение образовательных блоков на платформе BotSupport.</p>
                </div>

                <div className="grid grid-cols-2 gap-8 py-8 border-y border-zinc-800">
                    <div className="space-y-1">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Выпускник</p>
                        <p className="font-bold text-lg">{user.name} {user.surname}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Дата выдачи</p>
                        <p className="font-bold text-lg">{new Date(cert.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">ID Документа</p>
                        <p className="font-mono text-xs opacity-50 tracking-tighter truncate">{cert.id}</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Лицензия</p>
                        <p className="font-bold text-sm text-emerald-500">BS-PRO-2026</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xs font-bold font-mono uppercase tracking-[0.25em] text-zinc-500">Освоенные блоки:</h3>
                    <div className="flex flex-wrap gap-2">
                        {JSON.parse(cert.courseIds || '[]').map((name: string, i: number) => (
                            <span key={i} className="px-3 py-1.5 bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-700">{name}</span>
                        ))}
                    </div>
                </div>

                <div className="flex pt-6">
                    <button className="flex-1 bg-zinc-100 text-black py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-white transition-all">Скачать PDF оригинал</button>
                </div>
            </div>
        </div>

        <p className="mt-12 text-center text-zinc-600 text-xs uppercase tracking-widest font-bold">
            BotSupport Mastery Education Center
        </p>
      </motion.div>
    </div>
  );
}
