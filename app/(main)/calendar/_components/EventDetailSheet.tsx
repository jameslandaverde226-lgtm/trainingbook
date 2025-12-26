"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Calendar, Clock, User, Shield, Target, Zap, Activity, 
  MessageSquare, Trash2, CheckCircle2, ShieldAlert, 
  Terminal, Sparkles, Quote, Trophy, Vote, Medal, Sticker, Flag, Lock
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarEvent, getEventLabel, STICKERS, StickerType } from "./types";
import { useAppStore } from "@/lib/store/useStore";
import ClientPortal from "@/components/core/ClientPortal";

interface Props {
  event: CalendarEvent;
  onClose: () => void;
  onUpdate: (id: string, updates: any) => void;
  onDelete?: (id: string) => void; // Made optional
  isSystemEvent?: boolean;        // Added prop
}

const TRANSITION_SPRING = { type: "spring" as const, damping: 30, stiffness: 300, mass: 0.8 };

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
                        <button onClick={onClose} className="absolute top-5 right-5 p-2 text-slate-300 hover:text-slate-500 hover:bg-slate-50 rounded-full transition-all active:scale-90"><X className="w-5 h-5" /></button>
                        <div className="w-16 h-16 rounded-3xl bg-red-50 flex items-center justify-center mb-6 relative shadow-inner"><ShieldAlert className="w-8 h-8 text-[#E51636]" /></div>
                        <div className="space-y-3 mb-8">
                            <span className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em]">Critical Action</span>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{title}</h3>
                            <p className="text-xs font-medium text-slate-500 leading-relaxed px-2">{message}</p>
                        </div>
                        <div className="w-full space-y-3">
                            <button onClick={onConfirm} className="w-full py-4 bg-[#E51636] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all">Confirm Decommission</button>
                            <button onClick={onClose} className="w-full py-4 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all active:scale-95">Abort Protocol</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default function EventDetailSheet({ event, onClose, onUpdate, onDelete, isSystemEvent }: Props) {
  const { team } = useAppStore();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, []);

  const leader = team.find(m => m.id === event.assignee);
  const participant = team.find(m => m.id === event.teamMemberId);

  // --- STYLE RESOLVER ---
  let brandBg = 'bg-[#004F71]';
  let HeaderIcon = Terminal; 
  let headerPattern = "[radial-gradient(#fff_1px,transparent_1px)]";

  if (event.type === 'Deadline') { brandBg = 'bg-[#E51636]'; HeaderIcon = Zap; }
  else if (event.type === 'Award') { brandBg = 'bg-amber-500'; HeaderIcon = Trophy; headerPattern = "[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0,transparent_100%)]"; }
  else if (event.type === 'Vote') { brandBg = 'bg-slate-800'; HeaderIcon = Vote; }
  else if (event.type === 'Goal') { brandBg = 'bg-emerald-600'; HeaderIcon = Target; }

  // --- PARSE INTELLIGENT LOGS ---
  const isSystemLog = event.description?.startsWith("[SYSTEM LOG:") || event.description?.startsWith("[OFFICIAL ANNOUNCEMENT]") || event.type === 'Award' || event.type === 'Vote';
  const isDocLog = event.description?.startsWith("[DOCUMENT LOG:");
  const isSystemAgent = event.assigneeName === "System" || isSystemEvent; // Check if assigned to System
  
  // DETERMINE IMMUTABILITY (Cannot Delete)
  // Awards, Votes, Promotions, Assignments, Transfers, System Logs are permanent.
  const isImmutable = isSystemLog || isDocLog || isSystemAgent;

  let logTitle = "Operational Context";
  let cleanDescription = event.description || "";

  if (isSystemLog) {
      logTitle = event.description?.split(']')[0].replace('[SYSTEM LOG: ', '').replace('[', '') || "System Event";
      let rawBody = event.description?.split(']').slice(1).join(']').trim() || "";
      cleanDescription = rawBody.replace(/Module ID:.*$/gm, "").trim();
  } else if (isDocLog) {
      logTitle = event.description?.split(']')[0].replace('[DOCUMENT LOG: ', '').replace(']', '') || "Document";
      cleanDescription = event.description?.split(']').slice(1).join(']').trim() || "";
  }

  const toggleSticker = (stickerId: StickerType) => {
      const currentStickers = event.stickers || [];
      const newStickers = currentStickers.includes(stickerId) ? currentStickers.filter(id => id !== stickerId) : [...currentStickers, stickerId];
      onUpdate(event.id, { stickers: newStickers });
  };

  const getPriorityBadge = (p: string) => {
     if (p === 'High') return <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-[#E51636] font-black text-[9px] uppercase tracking-wider"><Flag className="w-3 h-3 fill-current" /> High</div>;
     if (p === 'Medium') return <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg text-amber-600 font-black text-[9px] uppercase tracking-wider"><Flag className="w-3 h-3 fill-current" /> Medium</div>;
     return <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-[#004F71] font-black text-[9px] uppercase tracking-wider"><Flag className="w-3 h-3 fill-current" /> Low</div>;
  };

  return (
    <ClientPortal>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
        transition={TRANSITION_SPRING} 
        className="fixed inset-x-0 bottom-0 top-12 md:top-0 md:left-auto md:right-0 md:w-full md:max-w-2xl z-[110] bg-white shadow-2xl flex flex-col overflow-hidden rounded-t-[40px] md:rounded-l-[56px] md:rounded-tr-none md:h-full md:border-l border-white/20"
      >
        {/* --- HEADER --- */}
        <div className={cn("p-8 md:p-12 text-white relative shrink-0 overflow-hidden transition-colors duration-500", brandBg)}>
            <div className={cn("absolute inset-0 opacity-10", headerPattern)} style={{ backgroundSize: '20px 20px' }} />
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            
            <HeaderIcon className="absolute top-6 right-6 w-32 h-32 opacity-10 rotate-12 pointer-events-none" />
            
            <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="px-3 py-1.5 bg-white/10 rounded-full border border-white/20 backdrop-blur-md flex items-center gap-2">
                        {isImmutable ? (
                             <Lock className="w-3 h-3 text-white/80" />
                        ) : (
                             <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        )}
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]">
                            {isImmutable ? "Permanent Record" : "Mission Brief"}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-90 border border-white/10"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="space-y-3">
                    <h2 className="text-3xl md:text-5xl font-[1000] tracking-tighter leading-tight">{event.title}</h2>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="px-3 py-1 bg-white text-slate-900 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">{getEventLabel(event.type)}</div>
                        <div className="flex items-center gap-2 text-white/80 text-[10px] font-bold uppercase tracking-widest bg-black/20 px-3 py-1 rounded-lg border border-white/10">
                            <Clock className="w-3.5 h-3.5" /> 
                            {format(event.startDate, "MMM do")} {event.endDate && `— ${format(event.endDate, "d")}`}
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
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg relative z-10", leader?.dept === 'FOH' ? 'bg-[#004F71]' : event.type === 'Award' ? 'bg-amber-500' : 'bg-[#E51636]')}>
                        {leader?.name.charAt(0) || "S"}
                    </div>
                    <div className="relative z-10">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Mission Lead</p>
                        <p className="text-sm font-bold text-slate-900">{event.assigneeName}</p>
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white/50 to-transparent pointer-events-none" />
                </div>

                <div className="p-5 bg-slate-50 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden group">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg relative z-10", participant ? (participant.dept === 'FOH' ? 'bg-[#004F71]' : 'bg-[#E51636]') : (event.type === 'Award' ? 'bg-amber-500' : 'bg-slate-300'))}>
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

            {/* Intel Card */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5" /> Operational Intel</span>
                    {getPriorityBadge(event.priority)}
                </div>
                
                <div className="p-6 md:p-8 bg-slate-50/50 border border-slate-200 rounded-[32px] relative overflow-hidden group min-h-[160px]">
                    <Quote className="absolute top-4 right-4 w-10 h-10 text-slate-200 rotate-12" />
                    
                    {/* Log Header */}
                    {(isSystemLog || isDocLog || isSystemAgent) && (
                        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200/60">
                            <div className={cn("p-2 rounded-xl shadow-sm border", isSystemLog ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-white border-slate-100")}>
                                {isSystemLog ? <Medal className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5 text-red-500" />}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">{isSystemLog ? "SYSTEM LOG" : isSystemAgent ? "SYSTEM RECORD" : "OFFICIAL RECORD"}</span>
                                <span className="text-sm font-bold text-slate-900">{logTitle}</span>
                            </div>
                        </div>
                    )}

                    <p className="text-sm md:text-base font-medium text-slate-600 leading-relaxed whitespace-pre-wrap relative z-10">
                        {cleanDescription || "No specific operational context provided."}
                    </p>
                </div>
            </div>
        </div>

        {/* --- FOOTER ACTIONS (INTELLIGENT) --- */}
        <div className="p-6 md:p-10 border-t border-slate-100 bg-white flex items-center justify-between gap-4 shrink-0 pb-10 md:pb-10">
             
             {/* If IMMUTABLE: Show 'Protected' Badge. Else: Show Delete Button */}
             {isImmutable ? (
                 <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 text-slate-400 rounded-xl border border-slate-100 cursor-not-allowed opacity-60">
                    <Lock className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-widest hidden md:inline">Log Locked</span>
                 </div>
             ) : (
                 onDelete && (
                    <button onClick={() => setIsConfirmOpen(true)} className="flex items-center gap-2 px-4 py-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95">
                        <Trash2 className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Decommission</span>
                    </button>
                 )
             )}

             {event.status !== 'Done' && (
                <button onClick={() => onUpdate(event.id, { status: "Done" })} className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-[#004F71] text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all">
                    <CheckCircle2 className="w-4 h-4" /> <span>Complete Mission</span>
                </button>
             )}
        </div>

        <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={() => { setIsConfirmOpen(false); if(onDelete) onDelete(event.id); }} title="Terminate Mission" message="Confirm permanent decommissioning." />
      </motion.div>
    </ClientPortal>
  );
}