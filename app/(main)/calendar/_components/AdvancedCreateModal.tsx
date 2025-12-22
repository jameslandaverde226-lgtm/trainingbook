"use client";

import { useState } from "react";
import { 
    format, startOfWeek, startOfMonth, endOfWeek, endOfMonth, 
    isSameMonth, isSameDay, subMonths, addMonths, eachDayOfInterval, 
    isWithinInterval, isBefore, differenceInDays 
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, ChevronLeft, ChevronRight, ChevronDown, Flag, Layers, 
  Clock, User, Save, Target, Activity, Shield, Users, Zap, AlignLeft, Check, Calendar as CalendarIcon,
  Plus, Crown, UserCircle, Sparkles, ArrowRight, PenTool, Terminal, Command, Type
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DraftEvent, TeamMember, EventType, PRIORITIES, getEventLabel, getTypeColor } from "./types";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (d: any) => void;
    teamMembers: TeamMember[];
}

const TRANSITION_SPRING = { type: "spring", damping: 30, stiffness: 300, mass: 0.8 } as const;

// --- REFINED DROPDOWN ---
function WebAppDropdown({ label, icon: Icon, options, selected, onSelect, placeholder }: any) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="relative space-y-1.5">
            <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2 px-1">
                <Icon className="w-3 h-3" /> {label}
            </label>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center justify-between px-4 py-3.5 bg-white border rounded-[20px] transition-all duration-300 shadow-sm",
                    isOpen ? "border-[#E51636] ring-4 ring-red-500/5 shadow-md" : "border-slate-200 hover:border-slate-300"
                )}
            >
                <div className="flex items-center gap-3 text-left overflow-hidden">
                    {selected ? (
                        <>
                            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                <img src={selected.image} className="w-full h-full object-cover" alt="" />
                            </div>
                            <span className="text-xs font-black text-slate-800 truncate">{selected.name}</span>
                        </>
                    ) : (
                        <span className="text-xs font-bold text-slate-400">{placeholder}</span>
                    )}
                </div>
                <ChevronDown className={cn("w-4 h-4 text-slate-300 transition-transform duration-300", isOpen && "rotate-180")} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.98 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden py-1 ring-1 ring-black/5"
                    >
                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                            {options.map((opt: TeamMember) => (
                                <button key={opt.id} onClick={() => { onSelect(opt); setIsOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50/30 transition-colors text-left border-b border-slate-50 last:border-0 group">
                                    <img src={opt.image} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-slate-700 group-hover:text-[#E51636] transition-colors">{opt.name}</span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">{opt.role}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// --- RANGE PICKER ---
function IntegratedRangePicker({ start, end, onChange }: { start: Date, end: Date, onChange: (s: Date, e: Date) => void }) {
    const [viewDate, setViewDate] = useState(start);
    const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(viewDate)), end: endOfWeek(endOfMonth(viewDate)) });

    const handleDateClick = (clickedDate: Date) => {
        if (isSameDay(start, end)) {
            if (isBefore(clickedDate, start)) onChange(clickedDate, clickedDate);
            else onChange(start, clickedDate);
        } else onChange(clickedDate, clickedDate);
    };

    return (
        <div className="w-full bg-white rounded-[32px] p-5 border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 px-1">
                <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1">Calendar</span>
                    <span className="text-[11px] font-black text-[#E51636] uppercase tracking-widest">{format(viewDate, "MMMM yyyy")}</span>
                </div>
                <div className="flex gap-1.5">
                    <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-all active:scale-90"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-all active:scale-90"><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
                {["S","M","T","W","T","F","S"].map((d, i) => (
                    <div key={`${d}-${i}`} className="h-6 flex items-center justify-center text-[9px] font-black text-slate-200 uppercase">{d}</div>
                ))}
                {days.map(d => {
                    const isStart = isSameDay(d, start);
                    const isEnd = isSameDay(d, end);
                    const inRange = isWithinInterval(d, { start, end });
                    const isCurrentMonth = isSameMonth(d, viewDate);
                    return (
                        <button key={d.toString()} onClick={() => handleDateClick(d)} 
                            className={cn(
                                "h-9 w-full flex items-center justify-center text-xs font-bold transition-all relative rounded-xl",
                                !isCurrentMonth && "opacity-5",
                                inRange && !isStart && !isEnd && "bg-red-50 text-[#E51636] rounded-none",
                                isStart && "bg-[#E51636] text-white shadow-lg z-10",
                                isEnd && "bg-[#E51636] text-white shadow-lg z-10",
                            )}
                        >
                            {format(d, "d")}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function AdvancedCreateModal({ isOpen, onClose, onCreate, teamMembers }: Props) {
    const [draft, setDraft] = useState<DraftEvent>({
        title: "", type: "Training", priority: "Medium", assignee: "", assigneeName: "",
        teamMemberId: "", teamMemberName: "", startDate: new Date(), endDate: new Date(),
        description: "", stickers: []
    });

    const [isBriefingFocused, setIsBriefingFocused] = useState(false);
    const [isTitleFocused, setIsTitleFocused] = useState(false);

    const categories: { id: EventType; icon: any }[] = [
        { id: "Training", icon: Shield }, { id: "Goal", icon: Target },
        { id: "Deadline", icon: Zap }, { id: "Operation", icon: Activity },
        { id: "OneOnOne", icon: Users },
    ];

    if (!isOpen) return null;

    const getPriorityStyles = (p: string, isSelected: boolean) => {
        if (!isSelected) return "text-slate-400 hover:text-slate-600 hover:bg-white";
        switch (p) {
            case "High": return "bg-[#E51636] text-white shadow-lg shadow-red-500/20";
            case "Medium": return "bg-amber-500 text-white shadow-lg shadow-amber-500/20";
            case "Low": return "bg-[#004F71] text-white shadow-lg shadow-blue-500/20";
            default: return "bg-slate-900 text-white shadow-lg";
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center">
            {/* BACKDROP */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            
            {/* MAIN CARD / SHEET */}
            <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} 
                transition={TRANSITION_SPRING}
                className="relative w-full md:w-[95%] md:max-w-4xl h-[92vh] md:h-auto md:max-h-[85vh] bg-white shadow-2xl flex flex-col overflow-hidden rounded-t-[40px] md:rounded-[48px] border border-white/20"
            >
                {/* --- HEADER --- */}
                <div className="bg-[#E51636] px-6 py-8 md:px-10 md:py-8 text-white relative shrink-0 overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12"><Command className="w-32 h-32 md:w-48 md:h-48" /></div>
                    
                    <div className="relative z-10 flex items-start justify-between gap-6">
                        <div className="flex-1 w-full">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="px-3 py-1 bg-white/10 rounded-full border border-white/20 backdrop-blur-xl flex items-center gap-2">
                                    <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white">Ops Command Center</span>
                                </div>
                                <Sparkles className="w-3 h-3 text-white/40 animate-pulse" />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-[1000] tracking-tighter leading-none">Deploy New Mission</h2>
                        </div>
                        <button onClick={onClose} className="shrink-0 p-2 md:p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-90 border border-white/10">
                            <X className="w-5 h-5 md:w-6 md:h-6 text-white" />
                        </button>
                    </div>
                </div>

                {/* --- CONTENT BODY --- */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-8 bg-[#F8FAFC] relative">
                    
                    {/* SECTION 1: MISSION OBJECTIVE (HERO) */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] px-2 flex items-center gap-2">
                            <Type className="w-3 h-3" /> Mission Objective
                        </label>
                        <div className={cn(
                            "bg-white rounded-[28px] border transition-all duration-300 overflow-hidden relative group",
                            isTitleFocused ? "border-[#E51636] shadow-xl shadow-red-500/10 ring-4 ring-red-500/5" : "border-slate-200 shadow-sm hover:border-slate-300"
                        )}>
                            <div className="absolute top-0 left-0 w-2 h-full bg-slate-100 group-hover:bg-[#E51636] transition-colors" />
                            <div className="p-5 pl-7 flex items-start gap-4">
                                <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 mt-1 shrink-0">
                                    <Terminal className="w-5 h-5" />
                                </div>
                                <textarea
                                    autoFocus
                                    rows={1}
                                    onFocus={() => setIsTitleFocused(true)}
                                    onBlur={() => setIsTitleFocused(false)}
                                    value={draft.title}
                                    onChange={e => setDraft({...draft, title: e.target.value})}
                                    className="w-full bg-transparent text-xl md:text-2xl font-[900] text-slate-800 placeholder:text-slate-300 outline-none resize-none leading-tight tracking-tight mt-1.5"
                                    placeholder="Enter directive..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: GRID LAYOUT (2-COL ON DESKTOP) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        {/* LEFT COLUMN: SCHEDULING + TYPE */}
                        <div className="space-y-6">
                            {/* TYPE */}
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] px-2 flex items-center gap-2"><Layers className="w-3 h-3" /> Classification</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {categories.map(cat => {
                                        const isSelected = draft.type === cat.id;
                                        const styles = getTypeColor(cat.id).split(' ');
                                        return (
                                            <button key={cat.id} onClick={() => setDraft({...draft, type: cat.id})} className={cn("px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 shadow-sm", isSelected ? `${styles[0]} ${styles[2]} ${styles[1]} ring-2 ring-white shadow-md` : "bg-white border-slate-200 text-slate-400 hover:border-slate-300")}>
                                                <cat.icon className="w-3 h-3" /> {getEventLabel(cat.id)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* SCHEDULING */}
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] px-2 flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Scheduling</label>
                                <IntegratedRangePicker start={draft.startDate} end={draft.endDate} onChange={(s, e) => setDraft({...draft, startDate: s, endDate: e})} />
                            </div>
                        </div>

                        {/* RIGHT COLUMN: LOGISTICS + INTEL */}
                        <div className="space-y-6">
                            
                            {/* LOGISTICS */}
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] px-2 flex items-center gap-2"><Activity className="w-3 h-3" /> Logistics</label>
                                <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                                    <WebAppDropdown label="Mission Lead" icon={Crown} placeholder="Select Leader..." options={teamMembers.filter(m => m.status === 'Director' || m.status === 'Assistant Director' || m.status === 'Team Leader')} selected={teamMembers.find(m => m.id === draft.assignee)} onSelect={(u: TeamMember) => setDraft({...draft, assignee: u.id, assigneeName: u.name})} />
                                    <WebAppDropdown label="Participant" icon={UserCircle} placeholder="Assign Member..." options={teamMembers} selected={teamMembers.find(m => m.id === draft.teamMemberId)} onSelect={(u: TeamMember) => setDraft({...draft, teamMemberId: u.id, teamMemberName: u.name})} />
                                    
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] block mb-2 px-1">Impact Level</label>
                                        <div className="flex gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-100">
                                            {PRIORITIES.map(p => {
                                                const isSelected = draft.priority === p;
                                                return (
                                                    <button key={p} onClick={() => setDraft({...draft, priority: p})} className={cn("flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1.5", getPriorityStyles(p, isSelected))}>
                                                        <Flag className={cn("w-2.5 h-2.5", isSelected ? "fill-white" : p === 'High' ? 'text-[#E51636]' : p === 'Medium' ? 'text-amber-500' : 'text-[#004F71]')} />
                                                        {p}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* MISSION BRIEFING */}
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] px-2 flex items-center gap-2"><Terminal className="w-3 h-3" /> Intel</label>
                                <div className={cn("relative bg-white border border-slate-200 rounded-[28px] overflow-hidden shadow-sm transition-all duration-300 group", isBriefingFocused && "border-[#E51636] shadow-md")}>
                                    <textarea onFocus={() => setIsBriefingFocused(true)} onBlur={() => setIsBriefingFocused(false)} value={draft.description} onChange={e => setDraft({...draft, description: e.target.value})} className="w-full h-32 p-5 bg-transparent text-sm font-medium outline-none resize-none placeholder:text-slate-300 leading-relaxed text-slate-700" placeholder="Add operational context..." />
                                    <div className="absolute bottom-3 right-4 pointer-events-none opacity-10"><PenTool className="w-5 h-5 text-[#E51636]" /></div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* --- FOOTER --- */}
                <div className="px-6 py-4 md:px-8 md:py-6 bg-white border-t border-slate-100 flex justify-between items-center shrink-0 z-20 pb-10 md:pb-6">
                    <button onClick={onClose} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#E51636] transition-all">Discard</button>
                    <button onClick={() => onCreate(draft)} className="px-8 md:px-10 py-3.5 bg-[#004F71] text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl shadow-blue-900/40 flex items-center gap-3 hover:scale-[1.03] active:scale-95 transition-all">
                        <Save className="w-4 h-4" /> Deploy
                    </button>
                </div>
            </motion.div>
        </div>
    );
}