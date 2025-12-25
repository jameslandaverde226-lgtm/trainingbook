// --- FILE: ./app/(main)/calendar/_components/EventDetailSheet.tsx ---
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Calendar, Clock, User, Shield, Target, Zap, Activity, 
  MessageSquare, Trash2, CheckCircle2, AlertCircle, 
  Terminal, Sparkles, Fingerprint, Crown, ArrowRight, Save,
  Quote, ShieldAlert, AlertTriangle, Info, Sticker,
  FileText, StickyNote 
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarEvent, getEventLabel, getTypeColor, STICKERS, StickerType } from "./types";
import { useAppStore } from "@/lib/store/useStore";
import { Badge } from "../../team/_components/Badge";

interface Props {
  event: CalendarEvent;
  onClose: () => void;
  onUpdate: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
}

const TRANSITION_SPRING = { type: "spring" as const, damping: 30, stiffness: 300, mass: 0.8 };

// --- CLEAN TACTICAL CONFIRMATION MODAL ---
function ConfirmationModal({ isOpen, onClose, onConfirm, title, message }: any) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                        onClick={onClose}
                    />
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden border border-white/20 p-8 flex flex-col items-center text-center"
                    >
                        {/* --- TOP RIGHT CLOSE BUTTON --- */}
                        <button 
                            onClick={onClose} 
                            className="absolute top-5 right-5 p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-full transition-all active:scale-90"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="w-16 h-16 rounded-3xl bg-red-50 flex items-center justify-center mb-6 relative shadow-inner">
                            <ShieldAlert className="w-8 h-8 text-[#E51636]" />
                        </div>

                        <div className="space-y-3 mb-8">
                            <span className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em]">Critical Action</span>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{title}</h3>
                            <p className="text-xs font-medium text-slate-500 leading-relaxed px-2">
                                {message}
                            </p>
                        </div>

                        <div className="w-full space-y-3">
                            <button 
                                onClick={onConfirm}
                                className="w-full py-4 bg-[#E51636] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                Confirm Decommission
                            </button>
                            <button 
                                onClick={onClose}
                                className="w-full py-4 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                            >
                                Abort Protocol
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default function EventDetailSheet({ event, onClose, onUpdate, onDelete }: Props) {
  const { team } = useAppStore();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Resolve Identities
  const leader = team.find(m => m.id === event.assignee);
  const participant = team.find(m => m.id === event.teamMemberId);

  const brandBg = event.type === 'Deadline' ? 'bg-[#E51636]' : 'bg-[#004F71]';

  // Toggle Sticker Handler
  const toggleSticker = (stickerId: StickerType) => {
      const currentStickers = event.stickers || [];
      const newStickers = currentStickers.includes(stickerId)
          ? currentStickers.filter(id => id !== stickerId)
          : [...currentStickers, stickerId];
      
      onUpdate(event.id, { stickers: newStickers });
  };

  // --- PARSE DOCUMENT LOGS ---
  const isDocumentLog = event.description?.startsWith("[DOCUMENT LOG:");
  let logType = "";
  let cleanDescription = event.description || "";

  if (isDocumentLog) {
      const match = event.description?.match(/\[DOCUMENT LOG: (.*?)\]\n\n([\s\S]*)/);
      if (match) {
          logType = match[1];
          cleanDescription = match[2];
      } else {
          // Fallback if regex fails but tag exists
          cleanDescription = event.description?.replace(/\[DOCUMENT LOG: .*?\]/, "").trim() || "";
      }
  }

  // Helper to get icon for log type
  const getLogIcon = (type: string) => {
      switch(type) {
          case 'Incident Report': return <ShieldAlert className="w-5 h-5 text-red-500" />;
          case 'Commendation': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
          case 'Performance Review': return <FileText className="w-5 h-5 text-blue-500" />;
          default: return <StickyNote className="w-5 h-5 text-amber-500" />;
      }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
        transition={TRANSITION_SPRING} 
        className="fixed inset-x-0 bottom-0 top-12 md:top-0 md:left-auto md:right-0 md:w-full md:max-w-2xl z-[110] bg-white shadow-2xl flex flex-col overflow-hidden rounded-t-[40px] md:rounded-l-[56px] md:rounded-tr-none md:h-full md:border-l border-white/20"
      >
        {/* --- HEADER --- */}
        <div className={cn("p-8 md:p-12 text-white relative shrink-0 overflow-hidden", brandBg)}>
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <Terminal className="absolute top-6 right-6 w-32 h-32 opacity-5 rotate-12 pointer-events-none" />
            
            <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="px-3 py-1.5 bg-white/10 rounded-full border border-white/20 backdrop-blur-md flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">Mission Brief</span>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-90 border border-white/10">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="space-y-3">
                    <h2 className="text-3xl md:text-5xl font-[1000] tracking-tighter leading-tight">{event.title}</h2>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="px-3 py-1 bg-white text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">
                            {getEventLabel(event.type)}
                        </div>
                        <div className="flex items-center gap-2 text-white/80 text-[10px] font-bold uppercase tracking-widest bg-black/20 px-3 py-1 rounded-lg border border-white/10">
                            <Clock className="w-3.5 h-3.5" /> 
                            {format(event.startDate, "MMM do")}
                            {event.endDate && !Object.is(event.startDate, event.endDate) && ` — ${format(event.endDate, "d")}`}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- CONTENT --- */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 space-y-8 md:space-y-12 bg-white relative">
            
            {/* Personnel Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="p-5 bg-slate-50 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg relative z-10", leader?.dept === 'FOH' ? 'bg-[#004F71]' : 'bg-[#E51636]')}>
                        {leader?.name.charAt(0) || "L"}
                    </div>
                    <div className="relative z-10">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Mission Lead</p>
                        <p className="text-sm font-bold text-slate-900">{event.assigneeName}</p>
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white/50 to-transparent pointer-events-none" />
                </div>

                <div className="p-5 bg-slate-50 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg relative z-10", participant ? (participant.dept === 'FOH' ? 'bg-[#004F71]' : 'bg-[#E51636]') : 'bg-slate-300')}>
                        {event.teamMemberName?.charAt(0) || '?'}
                    </div>
                    <div className="relative z-10">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Participant</p>
                        <p className="text-sm font-bold text-slate-900">{event.teamMemberName || "Unassigned"}</p>
                    </div>
                </div>
            </div>

            {/* Sticker Rack */}
            <div className="space-y-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                    <Sticker className="w-3.5 h-3.5" /> Tactical Markers
                </span>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {STICKERS.map(sticker => {
                        const isActive = event.stickers?.includes(sticker.id);
                        return (
                            <button
                                key={sticker.id}
                                onClick={() => toggleSticker(sticker.id)}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-1 min-w-[64px] h-16 rounded-2xl transition-all border-2 active:scale-95",
                                    isActive ? "bg-white border-[#E51636] shadow-md scale-105" : "bg-slate-50 border-transparent opacity-50 grayscale hover:grayscale-0 hover:opacity-100"
                                )}
                            >
                                <span className="text-xl drop-shadow-sm">{sticker.icon}</span>
                                <span className="text-[7px] font-black uppercase text-slate-500">{sticker.label}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Operational Intel (Includes Document Parsing) */}
            <div className="space-y-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5" /> Operational Intel
                </span>
                <div className="p-6 md:p-8 bg-slate-50/50 border border-slate-200 rounded-[32px] relative overflow-hidden group">
                    <Quote className="absolute top-4 right-4 w-10 h-10 text-slate-200 rotate-12" />
                    
                    {/* NEW: Document Log Header */}
                    {isDocumentLog && (
                        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200/60">
                            <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                                {getLogIcon(logType)}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Official Record</span>
                                <span className="text-sm font-bold text-slate-900">{logType}</span>
                            </div>
                        </div>
                    )}

                    <p className="text-sm md:text-base font-medium text-slate-600 leading-relaxed italic relative z-10 whitespace-pre-wrap">
                        {cleanDescription || "No specific operational context provided."}
                    </p>
                </div>
            </div>

            {/* Impact Analysis Grid */}
            <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-white border border-slate-100 rounded-2xl flex flex-col items-center gap-2 shadow-sm text-center">
                    <span className="text-[8px] font-black text-slate-300 uppercase">Priority</span>
                    <Badge color={event.priority === 'High' ? 'red' : 'blue'}>{event.priority}</Badge>
                </div>
                <div className="p-4 bg-white border border-slate-100 rounded-2xl flex flex-col items-center gap-2 shadow-sm text-center">
                    <span className="text-[8px] font-black text-slate-300 uppercase">Status</span>
                    <Badge color={event.status === 'Done' ? 'green' : 'slate'}>{event.status}</Badge>
                </div>
                <div className="p-4 bg-white border border-slate-100 rounded-2xl flex flex-col items-center gap-2 shadow-sm text-center">
                    <span className="text-[8px] font-black text-slate-300 uppercase">Sync</span>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase">Live</span>
                    </div>
                </div>
            </div>
        </div>

        {/* --- FOOTER ACTIONS --- */}
        <div className="p-6 md:p-10 border-t border-slate-100 bg-white flex items-center justify-between gap-4 shrink-0 pb-10 md:pb-10">
             <button 
                onClick={() => setIsConfirmOpen(true)}
                className="flex items-center gap-2 px-4 py-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95"
             >
                <Trash2 className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Decommission</span>
             </button>

             {event.status !== 'Done' && (
                <button 
                    onClick={() => onUpdate(event.id, { status: "Done" })}
                    className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-[#004F71] text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    <CheckCircle2 className="w-4 h-4" /> <span>Complete Mission</span>
                </button>
             )}
        </div>

        {/* --- RENDER CONFIRMATION --- */}
        <ConfirmationModal 
            isOpen={isConfirmOpen}
            onClose={() => setIsConfirmOpen(false)}
            onConfirm={() => { setIsConfirmOpen(false); onDelete(event.id); }}
            title="Terminate Mission"
            message="Confirm permanent decommissioning. This record will be erased from all logs."
        />
      </motion.div>
    </>
  );
}