"use client";

import { motion } from "framer-motion";
import { CalendarEvent } from "./types";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import { ArrowRight, ArrowLeftRight, CalendarClock, Scissors, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  source: CalendarEvent;
  target: CalendarEvent;
  onResolve: (action: 'push' | 'swap' | 'sever') => void;
  onClose: () => void;
}

export default function ConflictResolutionModal({ source, target, onResolve, onClose }: Props) {
  // INTELLIGENCE: Calculate the perfect "Safe Date" (Source End + 1 Day)
  const safeDate = addDays(source.endDate, 1);
  const shiftAmount = differenceInCalendarDays(safeDate, target.startDate);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ scale: 0.9, y: 20, opacity: 0 }} 
        animate={{ scale: 1, y: 0, opacity: 1 }} 
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden border border-white/20 relative z-10"
      >
        {/* HEADER: Critical State */}
        <div className="bg-[#7f1d1d] p-8 pb-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10"><AlertTriangle className="w-32 h-32 text-white" /></div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="px-3 py-1 bg-black/30 rounded-full border border-white/10 flex items-center gap-2 backdrop-blur-md">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white">Temporal Paradox Detected</span>
                    </div>
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight leading-none mb-2">Resolve Conflict</h2>
                <p className="text-red-200 text-xs font-medium">
                    Mission <span className="font-bold text-white">"{target.title}"</span> attempts to start before <span className="font-bold text-white">"{source.title}"</span> concludes.
                </p>
            </div>
        </div>

        {/* BODY: The Solutions */}
        <div className="p-8 -mt-6 bg-white rounded-t-[40px] relative space-y-4">
            
            {/* OPTION 1: TIME WARP (Smart Reschedule) */}
            <button 
                onClick={() => onResolve('push')}
                className="w-full group p-5 rounded-[28px] border-2 border-slate-100 hover:border-[#004F71] bg-slate-50 hover:bg-blue-50/50 transition-all flex items-center gap-5 text-left relative overflow-hidden"
            >
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform">
                    <CalendarClock className="w-6 h-6 text-[#004F71]" />
                </div>
                <div className="flex-1 relative z-10">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-1">Time Shift (Recommended)</h4>
                    <p className="text-xs text-slate-500 font-medium">
                        Push <strong>{target.title}</strong> forward {shiftAmount} days to start on <strong>{format(safeDate, "MMM do")}</strong>.
                    </p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-[#004F71] group-hover:translate-x-1 transition-all" />
            </button>

            {/* OPTION 2: REVERSE POLARITY */}
            <button 
                onClick={() => onResolve('swap')}
                className="w-full group p-5 rounded-[28px] border-2 border-slate-100 hover:border-amber-400 bg-white hover:bg-amber-50/50 transition-all flex items-center gap-5 text-left"
            >
                <div className="w-12 h-12 rounded-2xl bg-amber-100/50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                    <ArrowLeftRight className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-1">Reverse Direction</h4>
                    <p className="text-xs text-slate-500 font-medium">
                        Make <strong>{target.title}</strong> the source (Parent) instead.
                    </p>
                </div>
            </button>

            {/* OPTION 3: SEVER */}
            <button 
                onClick={() => onResolve('sever')}
                className="w-full group p-4 rounded-[24px] border border-transparent hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest mt-2"
            >
                <Scissors className="w-4 h-4" /> Sever Connection
            </button>

        </div>
      </motion.div>
    </div>
  );
}