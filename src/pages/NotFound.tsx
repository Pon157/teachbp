import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-12 rounded-[3rem] border border-slate-200 shadow-2xl text-center space-y-8"
      >
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto">
          <AlertTriangle size={40} />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">404: Пустой маршрут</h1>
        <p className="text-slate-500 font-medium leading-relaxed">К сожалению, страница которую вы ищете, не существует или была перемещена в другое место.</p>
        <Link 
          to="/dashboard" 
          className="inline-flex items-center space-x-3 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-100 active:scale-95"
        >
          <Home size={20} />
          <span>На главную</span>
        </Link>
      </motion.div>
    </div>
  );
}
