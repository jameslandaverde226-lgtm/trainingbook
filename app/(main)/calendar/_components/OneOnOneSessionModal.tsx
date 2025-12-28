"use client";

import { useState, useEffect } from "react";
import { format, differenceInMinutes, addWeeks } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CalendarEvent, Subtask } from "./types";
import { useAppStore } from "@/lib/store/useStore";
import { 
  X, Save, Trash2, PenLine, CheckSquare, 
  MessageSquare, User, Target, 
  ListTodo, ArrowUp, Flag, RefreshCcw,
  Zap, Clock, Timer, Calendar
} from "lucide-react";
import ClientPortal from "@/components/core/ClientPortal";

interface Props {
  event: CalendarEvent;
  onClose: () => void;
  onUpdate: (updatedEvent: CalendarEvent) => void;
}

// Added 'as const' to fix TypeScript type inference for Framer Motion
const TRANSITION_SPRING = { type: "spring", damping: 30, stiffness: 300, mass: 0.8 } as const;

export default function OneOnOneSessionModal({ event, onClose, onUpdate }: Props) {
  const { team } = useAppStore();
  const sessionUser = team.find(u => u.id === event.assignee);
  const sessionDuration = differenceInMinutes(event.endDate, event.startDate);

  // Lock body scroll on mount
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const [sessionNotes, setSessionNotes] = useState(() => {
      return event.description?.split(/\[SESSION SUMMARY\]|\[KEY OUTCOMES\]|\[FOLLOW UP SCHEDULED:/)[0].trim() || "";
  });
  
  const [keyTakeaways, setKeyTakeaways] = useState(() => {
      let match = event.description?.match(/\[SESSION SUMMARY\]([\s\S]*?)(?=\[FOLLOW UP|$)/);
      if (!match) {
          match = event.description?.match(/\[KEY OUTCOMES\]([\s\S]*?)(?=\[FOLLOW UP|$)/);
      }
      return match ? match[1].trim() : "";
  });

  const [nextSteps, setNextSteps] = useState<Subtask[]>(event.subtasks || []);
  const [newStepText, setNewStepText] = useState("");
  
  const [followUpDate, setFollowUpDate] = useState<Date | null>(null);
  const [isUrgentFollowUp, setIsUrgentFollowUp] = useState(false);

  const handleAddStep = () => {
      if (!newStepText.trim()) return;
      const newStep: Subtask = { id: Math.random().toString(36).substr(2, 9), label: newStepText, isCompleted: false };
      setNextSteps([...nextSteps, newStep]);
      setNewStepText("");
  };

  const handleToggleStep = (id: string) => {
      setNextSteps(nextSteps.map(s => s.id === id ? { ...s, isCompleted: !s.isCompleted } : s));
  };

  const handleCompleteSession = () => {
      let finalDescription = sessionNotes;
      if (keyTakeaways) {
          finalDescription += `\n\n[SESSION SUMMARY]\n${keyTakeaways}`;
      }
      if (followUpDate) {
          finalDescription += `\n\n[FOLLOW UP SCHEDULED: ${format(followUpDate, 'MMM do')}]`;
      }

      const updatedEvent: CalendarEvent = {
          ...event,
          status: "Done",
          description: finalDescription,
          subtasks: nextSteps,
      };
      onUpdate(updatedEvent);
      onClose();
  };

  // FIX: Helper to safely check image validity
  const hasValidImage = sessionUser?.image && sessionUser.image.trim() !== "";

  return (
    <ClientPortal>
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center md:p-6 p-0">
            {/* BACKDROP */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#0F172A]/90 backdrop-blur-md" onClick={onClose} />
            
            {/* MAIN MODAL CARD */}
            <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={TRANSITION_SPRING}
                className="bg-white w-full h-[92vh] md:h-[85vh] md:max-w-5xl rounded-t-[40px] md:rounded-[48px] shadow-2xl relative overflow-hidden flex flex-col border border-white/20"
            >
                {/* --- HEADER (Fixed Height) --- */}
                <div className="bg-[#E51636] relative shrink-0 overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="absolute top-0 right-0 p-8 opacity-10"><MessageSquare className="w-64 h-64 rotate-12" /></div>
                    
                    <div className="relative z-10 px-6 pt-8 pb-8 md:px-10 md:pt-10 md:pb-10">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 pr-4">
                                <div className="flex items-center gap-3 mb-3 md:mb-4">
                                    <div className="px-3 py-1 bg-white/10 rounded-full border border-white/20 backdrop-blur-xl flex items-center gap-2">
                                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white">Session Intelligence</span>
                                    </div>
                                </div>
                                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none mb-2">{event.title}</h2>
                                <p className="text-white/60 text-xs md:text-sm font-medium">Recorded for {sessionUser?.role || "Team Member"}</p>
                            </div>
                            
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-[20px] md:rounded-[28px] bg-white p-1 shadow-xl rotate-3 shrink-0">
                                    {hasValidImage ? (
                                        <img src={sessionUser!.image} className="w-full h-full rounded-[16px] md:rounded-[24px] object-cover" alt="" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-100 rounded-[16px] md:rounded-[24px] flex items-center justify-center font-black text-slate-300 text-2xl">
                                            {sessionUser?.name.charAt(0) || <User className="w-8 h-8 text-slate-300" />}
                                        </div>
                                    )}
                                </div>
                                <span className="px-2 py-0.5 md:px-3 md:py-1 bg-white text-[#E51636] rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest shadow-lg -mt-3 md:-mt-4 relative z-10">
                                    {sessionUser?.name.split(" ")[0]}
                                </span>
                            </div>
                        </div>
                        
                        {/* Close Button */}
                        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white active:scale-90 border border-white/10">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* --- SCROLLABLE CONTENT BODY --- */}
                {/* Added min-h-0 to allow flex container to shrink and show scrollbar */}
                <div className="flex-1 bg-[#F8FAFC] overflow-y-auto custom-scrollbar flex flex-col md:flex-row relative min-h-0">
                    
                    {/* LEFT COLUMN: Notes & Summary */}
                    <div className="flex-1 p-6 md:p-10 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col gap-6 md:gap-8 bg-white md:bg-transparent">
                        
                        {/* 1. 1-on-1 Goal */}
                        <div className="flex flex-col min-h-[160px] md:min-h-[200px]">
                            <div className="flex items-center gap-2 text-slate-400 mb-3 md:mb-4">
                                <PenLine className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                <span className="text-[9px] font-black uppercase tracking-[0.2em]">1-on-1 Goal</span>
                            </div>
                            <textarea 
                                value={sessionNotes} 
                                onChange={e => setSessionNotes(e.target.value)}
                                className="w-full flex-1 bg-transparent text-xl md:text-2xl font-medium text-slate-800 outline-none resize-none placeholder:text-slate-300 leading-relaxed p-0 tracking-tight" 
                                placeholder="What is the primary objective or observation for this session?" 
                            />
                        </div>

                        {/* 2. Key Outcomes */}
                        <div className="pt-6 md:pt-8 border-t border-slate-100">
                                <div className="flex items-center justify-between mb-3 md:mb-4">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Key Outcomes</span>
                                </div>
                                </div>

                                <div className="bg-slate-50/50 rounded-[24px] p-4 md:p-6 border border-slate-200/60 shadow-inner flex flex-col gap-3 group focus-within:bg-white focus-within:shadow-md transition-all">
                                    <div className="flex items-center gap-3 text-slate-700">
                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 shadow-sm">
                                            <Target className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wide text-slate-900">Session Summary</p>
                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">What went down?</p>
                                        </div>
                                    </div>
                                    
                                    <textarea 
                                    value={keyTakeaways}
                                    onChange={e => setKeyTakeaways(e.target.value)}
                                    className="w-full bg-transparent text-sm font-medium text-slate-600 outline-none resize-none placeholder:text-slate-400 mt-2 min-h-[80px] leading-relaxed"
                                    placeholder="Summarize the outcome, decisions made, or key feedback delivered..."
                                    />
                                </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Tasks & Follow Up */}
                    <div className="w-full md:w-[420px] bg-slate-50 p-6 md:p-10 flex flex-col border-l border-white shadow-[inset_4px_0_24px_rgba(0,0,0,0.02)]">
                        
                        {/* 1. Tactical Directives */}
                        <div className="flex items-center gap-2 text-slate-400 mb-4 md:mb-6">
                            <ListTodo className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Tactical Directives</span>
                        </div>

                        <div className="space-y-3 md:space-y-3 flex-1 overflow-y-auto max-h-[300px] no-scrollbar">
                            <AnimatePresence mode="popLayout">
                                {nextSteps.map((step) => (
                                    <motion.div 
                                        layout
                                        key={step.id} 
                                        onClick={() => handleToggleStep(step.id)}
                                        className={cn(
                                            "group flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden shadow-sm active:scale-[0.98]",
                                            step.isCompleted 
                                                ? "bg-emerald-50/50 border-emerald-100 opacity-60" 
                                                : "bg-white border-slate-200 hover:border-[#004F71]/30"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors duration-300", 
                                            step.isCompleted 
                                                ? "bg-emerald-500 border-emerald-500 shadow-md shadow-emerald-500/20" 
                                                : "border-slate-300 bg-slate-50 group-hover:border-[#004F71] group-hover:bg-white"
                                        )}>
                                            <CheckSquare className={cn("w-3 h-3 text-white transition-transform", step.isCompleted ? "scale-100" : "scale-0")} />
                                        </div>
                                        <span className={cn("text-xs font-bold leading-snug select-none flex-1 break-words", step.isCompleted ? "text-emerald-700 line-through" : "text-slate-700")}>
                                            {step.label}
                                        </span>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setNextSteps(nextSteps.filter(s => s.id !== step.id)); }}
                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg md:opacity-0 md:group-hover:opacity-100 transition-all active:scale-90"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            
                            {nextSteps.length === 0 && (
                                <div className="py-6 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-[20px]">
                                    <Target className="w-6 h-6 mb-2 opacity-50" />
                                    <p className="text-[9px] font-bold uppercase tracking-widest">No directives set</p>
                                </div>
                            )}

                            {/* Input Bubble */}
                            <div className="relative group mt-2">
                                <input 
                                    value={newStepText} onChange={e => setNewStepText(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddStep()}
                                    className="w-full pl-5 pr-12 py-3 bg-white border border-slate-200 rounded-full text-xs font-bold outline-none focus:border-[#004F71] focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm focus:shadow-md placeholder:text-slate-300" 
                                    placeholder="Add directive..." 
                                />
                                <button 
                                    onClick={handleAddStep} 
                                    className="absolute right-1 top-1 bottom-1 aspect-square bg-[#004F71] text-white rounded-full shadow-md active:scale-95 transition-all flex items-center justify-center"
                                >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* 2. Follow-Up Protocol */}
                        <div className="mt-8 pt-8 border-t border-slate-200/60">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-slate-400">
                                    <RefreshCcw className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Follow-Up Protocol</span>
                                </div>
                                {followUpDate && <span className="text-[9px] font-bold text-[#004F71] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">Active</span>}
                            </div>

                            <div className={cn(
                                "bg-white p-4 rounded-[20px] border transition-all duration-300 shadow-sm group",
                                followUpDate ? "border-[#004F71] ring-4 ring-blue-50" : "border-slate-200 hover:border-slate-300"
                            )}>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">Next Sync</p>
                                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                                            {followUpDate ? format(followUpDate, "MMMM do, yyyy") : "Not scheduled"}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => setIsUrgentFollowUp(!isUrgentFollowUp)}
                                        className={cn(
                                            "p-2 rounded-xl transition-all border",
                                            isUrgentFollowUp 
                                                ? "bg-red-50 text-[#E51636] border-red-100 shadow-sm" 
                                                : "bg-slate-50 text-slate-300 border-transparent hover:bg-slate-100"
                                        )}
                                    >
                                        <Flag className="w-4 h-4 fill-current" />
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    {[1, 2, 4].map(weeks => (
                                        <button 
                                            key={weeks}
                                            onClick={() => setFollowUpDate(addWeeks(new Date(), weeks))}
                                            className={cn(
                                                "py-2 rounded-lg text-[9px] font-bold uppercase tracking-wide border transition-all",
                                                followUpDate && differenceInMinutes(followUpDate, addWeeks(new Date(), weeks)) < 60 // fuzzy match
                                                    ? "bg-[#004F71] text-white border-[#004F71]"
                                                    : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-white hover:border-slate-300 hover:shadow-sm"
                                            )}
                                        >
                                            {weeks} {weeks === 1 ? 'Week' : 'Weeks'}
                                        </button>
                                    ))}
                                    <button 
                                        onClick={() => setFollowUpDate(null)}
                                        className="py-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wide border border-transparent text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER - Fixed Height */}
                <div className="shrink-0 p-6 md:p-8 bg-white border-t border-slate-100 flex justify-between items-center z-20">
                    <button onClick={onClose} className="px-6 py-4 text-xs font-black uppercase text-slate-400 hover:text-slate-600 transition-all">Discard</button>
                    <button 
                        onClick={handleCompleteSession}
                        className="px-8 md:px-12 py-4 bg-[#E51636] text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-red-900/20 flex items-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <Save className="w-4 h-4" /> Save Record
                    </button>
                </div>
            </motion.div>
        </div>
    </ClientPortal>
  );
}